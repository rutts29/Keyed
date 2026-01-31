/**
 * CandidatePipeline — the core orchestrator.
 *
 * TypeScript port of x-algorithm's candidate_pipeline.rs.
 * Executes the full pipeline: hydrate query -> source -> hydrate -> filter ->
 * score -> select -> post-filter -> side effects.
 *
 * Key design decisions carried over from x-algorithm:
 *   1. Sources and query hydrators run in parallel (Promise.allSettled).
 *   2. Filters run sequentially so each sees the prior filter's output.
 *   3. Scorers run sequentially so later scorers can use earlier scores.
 *   4. Side effects are fire-and-forget (not awaited).
 *   5. Errors in individual components are logged but don't crash the pipeline.
 *
 * @see https://github.com/xai-org/x-algorithm/blob/main/candidate-pipeline/candidate_pipeline.rs
 */

import { logger } from '../utils/logger.js';
import type {
  QueryHydrator,
  Source,
  Hydrator,
  Filter,
  Scorer,
  Selector,
  SideEffect,
} from './interfaces.js';
import { PipelineStage } from './types.js';
import type { FilterResult, PipelineResult, PipelineMetrics } from './types.js';

export interface CandidatePipelineConfig<Q, C> {
  name: string;
  resultSize: number;
  queryHydrators: QueryHydrator<Q>[];
  sources: Source<Q, C>[];
  hydrators: Hydrator<Q, C>[];
  filters: Filter<Q, C>[];
  scorers: Scorer<Q, C>[];
  selector: Selector<Q, C>;
  postSelectionFilters: Filter<Q, C>[];
  sideEffects: SideEffect<Q, C>[];
}

export class CandidatePipeline<Q extends { requestId: string }, C> {
  private config: CandidatePipelineConfig<Q, C>;

  constructor(config: CandidatePipelineConfig<Q, C>) {
    this.config = config;
  }

  /**
   * Execute the full pipeline. Mirrors the execute() method in candidate_pipeline.rs.
   */
  async execute(query: Q): Promise<PipelineResult<Q, C>> {
    const pipelineStart = Date.now();
    const stageMetrics: PipelineMetrics['stageMetrics'] = {};
    const requestId = query.requestId;

    // 1. Hydrate query (parallel)
    const hydrateStart = Date.now();
    const hydratedQuery = await this.hydrateQuery(query);
    stageMetrics[PipelineStage.QueryHydrator] = {
      durationMs: Date.now() - hydrateStart,
      candidateCount: 0,
    };

    // 2. Fetch candidates from all sources (parallel)
    const sourceStart = Date.now();
    const candidates = await this.fetchCandidates(hydratedQuery);
    stageMetrics[PipelineStage.Source] = {
      durationMs: Date.now() - sourceStart,
      candidateCount: candidates.length,
    };
    logger.debug({ requestId, count: candidates.length }, 'Pipeline: sourced candidates');

    // 3. Hydrate candidates
    const hydStart = Date.now();
    const hydratedCandidates = await this.hydrateCandidates(hydratedQuery, candidates);
    stageMetrics[PipelineStage.Hydrator] = {
      durationMs: Date.now() - hydStart,
      candidateCount: hydratedCandidates.length,
    };

    // 4. Filter (sequential)
    const filterStart = Date.now();
    const { kept, removed } = await this.runFilters(
      hydratedQuery,
      hydratedCandidates,
      this.config.filters,
    );
    stageMetrics[PipelineStage.Filter] = {
      durationMs: Date.now() - filterStart,
      candidateCount: kept.length,
    };
    logger.debug(
      { requestId, kept: kept.length, removed: removed.length },
      'Pipeline: filtered candidates',
    );

    // 5. Score (sequential)
    const scoreStart = Date.now();
    const scored = await this.scoreCandidates(hydratedQuery, kept);
    stageMetrics[PipelineStage.Scorer] = {
      durationMs: Date.now() - scoreStart,
      candidateCount: scored.length,
    };

    // 6. Select top-K
    const selectStart = Date.now();
    let selected = this.selectCandidates(hydratedQuery, scored);
    stageMetrics[PipelineStage.Selector] = {
      durationMs: Date.now() - selectStart,
      candidateCount: selected.length,
    };

    // 7. Post-selection filters
    const postFilterStart = Date.now();
    const postFiltered = await this.runFilters(
      hydratedQuery,
      selected,
      this.config.postSelectionFilters,
    );
    selected = postFiltered.kept;
    stageMetrics[PipelineStage.PostSelectionFilter] = {
      durationMs: Date.now() - postFilterStart,
      candidateCount: selected.length,
    };

    // 8. Truncate to result size
    selected = selected.slice(0, this.config.resultSize);

    // 9. Fire-and-forget side effects
    this.runSideEffects(hydratedQuery, selected);

    const totalMs = Date.now() - pipelineStart;
    logger.info(
      { requestId, totalMs, finalCount: selected.length, pipeline: this.config.name },
      'Pipeline: execution complete',
    );

    return {
      query: hydratedQuery,
      retrievedCandidates: hydratedCandidates,
      filteredCandidates: removed,
      selectedCandidates: selected,
      pipelineMetrics: { totalMs, stageMetrics },
    };
  }

  // --- Private stage methods (mirror candidate_pipeline.rs methods) ---

  private async hydrateQuery(query: Q): Promise<Q> {
    const enabled = this.config.queryHydrators.filter((h) => h.enable(query));
    const results = await Promise.allSettled(enabled.map((h) => h.hydrate(query)));

    let hydrated = { ...query };
    for (let i = 0; i < enabled.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        hydrated = { ...hydrated, ...result.value };
      } else {
        logger.error(
          { requestId: query.requestId, component: enabled[i].name, error: result.reason },
          'Pipeline: query hydrator failed',
        );
      }
    }
    return hydrated;
  }

  private async fetchCandidates(query: Q): Promise<C[]> {
    const enabled = this.config.sources.filter((s) => s.enable(query));
    const results = await Promise.allSettled(enabled.map((s) => s.getCandidates(query)));

    const collected: C[] = [];
    for (let i = 0; i < enabled.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        logger.debug(
          {
            requestId: query.requestId,
            source: enabled[i].name,
            count: result.value.length,
          },
          'Pipeline: source fetched candidates',
        );
        collected.push(...result.value);
      } else {
        logger.error(
          { requestId: query.requestId, component: enabled[i].name, error: result.reason },
          'Pipeline: source failed',
        );
      }
    }
    return collected;
  }

  private async hydrateCandidates(query: Q, candidates: C[]): Promise<C[]> {
    let current = candidates;
    for (const hydrator of this.config.hydrators.filter((h) => h.enable(query))) {
      try {
        const hydrated = await hydrator.hydrate(query, current);
        if (hydrated.length === current.length) {
          current = hydrated;
        } else {
          logger.warn(
            {
              requestId: query.requestId,
              component: hydrator.name,
              expected: current.length,
              got: hydrated.length,
            },
            'Pipeline: hydrator skipped (length mismatch)',
          );
        }
      } catch (error) {
        logger.error(
          { requestId: query.requestId, component: hydrator.name, error },
          'Pipeline: hydrator failed',
        );
      }
    }
    return current;
  }

  private async runFilters(
    query: Q,
    candidates: C[],
    filters: Filter<Q, C>[],
  ): Promise<FilterResult<C>> {
    let current = candidates;
    const allRemoved: C[] = [];

    for (const filter of filters.filter((f) => f.enable(query))) {
      const backup = [...current];
      try {
        const result = await filter.filter(query, current);
        current = result.kept;
        allRemoved.push(...result.removed);
      } catch (error) {
        logger.error(
          { requestId: query.requestId, component: filter.name, error },
          'Pipeline: filter failed, keeping candidates',
        );
        current = backup;
      }
    }

    return { kept: current, removed: allRemoved };
  }

  private async scoreCandidates(query: Q, candidates: C[]): Promise<C[]> {
    let current = candidates;
    for (const scorer of this.config.scorers.filter((s) => s.enable(query))) {
      try {
        const scored = await scorer.score(query, current);
        if (scored.length === current.length) {
          current = scored;
        } else {
          logger.warn(
            {
              requestId: query.requestId,
              component: scorer.name,
              expected: current.length,
              got: scored.length,
            },
            'Pipeline: scorer skipped (length mismatch)',
          );
        }
      } catch (error) {
        logger.error(
          { requestId: query.requestId, component: scorer.name, error },
          'Pipeline: scorer failed',
        );
      }
    }
    return current;
  }

  private selectCandidates(query: Q, candidates: C[]): C[] {
    const selector = this.config.selector;
    if (selector.enable(query)) {
      return selector.select(query, candidates);
    }
    return candidates;
  }

  private runSideEffects(query: Q, selected: C[]): void {
    const enabled = this.config.sideEffects.filter((se) => se.enable(query));
    // Fire-and-forget — mirrors x-algorithm's tokio::spawn
    Promise.allSettled(enabled.map((se) => se.run(query, selected))).catch((err) => {
      logger.error({ error: err }, 'Pipeline: side effect error');
    });
  }
}
