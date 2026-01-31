import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CandidatePipeline } from '../../src/pipeline/candidate-pipeline.js';
import type { CandidatePipelineConfig } from '../../src/pipeline/candidate-pipeline.js';
import type {
  QueryHydrator,
  Source,
  Hydrator,
  Filter,
  Scorer,
  Selector,
  SideEffect,
} from '../../src/pipeline/interfaces.js';

// Simple query/candidate types for testing the framework

interface TestQuery {
  requestId: string;
  userId: string;
  contextData?: string;
}

interface TestCandidate {
  id: string;
  score: number;
  tag?: string;
}

// --- Mock component factories ---

function makeQueryHydrator(
  name: string,
  result: Partial<TestQuery>,
  shouldFail = false,
): QueryHydrator<TestQuery> {
  return {
    name,
    enable: () => true,
    hydrate: shouldFail
      ? () => Promise.reject(new Error(`${name} failed`))
      : () => Promise.resolve(result),
  };
}

function makeSource(
  name: string,
  candidates: TestCandidate[],
  shouldFail = false,
  enabled = true,
): Source<TestQuery, TestCandidate> {
  return {
    name,
    enable: () => enabled,
    getCandidates: shouldFail
      ? () => Promise.reject(new Error(`${name} failed`))
      : () => Promise.resolve(candidates),
  };
}

function makeFilter(
  name: string,
  filterFn: (q: TestQuery, c: TestCandidate[]) => { kept: TestCandidate[]; removed: TestCandidate[] },
  shouldFail = false,
): Filter<TestQuery, TestCandidate> {
  return {
    name,
    enable: () => true,
    filter: shouldFail
      ? () => Promise.reject(new Error(`${name} failed`))
      : (q, c) => Promise.resolve(filterFn(q, c)),
  };
}

function makeScorer(
  name: string,
  scoreFn: (c: TestCandidate[]) => TestCandidate[],
  shouldFail = false,
): Scorer<TestQuery, TestCandidate> {
  return {
    name,
    enable: () => true,
    score: shouldFail
      ? () => Promise.reject(new Error(`${name} failed`))
      : (_q, c) => Promise.resolve(scoreFn(c)),
  };
}

function makeSelector(top: number): Selector<TestQuery, TestCandidate> {
  return {
    name: 'TestSelector',
    enable: () => true,
    select: (_q, c) => [...c].sort((a, b) => b.score - a.score).slice(0, top),
  };
}

function makeSideEffect(name: string, fn?: () => void): SideEffect<TestQuery, TestCandidate> {
  return {
    name,
    enable: () => true,
    run: async () => { fn?.(); },
  };
}

function buildConfig(
  overrides: Partial<CandidatePipelineConfig<TestQuery, TestCandidate>> = {},
): CandidatePipelineConfig<TestQuery, TestCandidate> {
  return {
    name: 'TestPipeline',
    resultSize: 10,
    queryHydrators: [],
    sources: [
      makeSource('Source1', [
        { id: 'a', score: 0 },
        { id: 'b', score: 0 },
        { id: 'c', score: 0 },
      ]),
    ],
    hydrators: [],
    filters: [],
    scorers: [
      makeScorer('Scorer1', (c) =>
        c.map((x, i) => ({ ...x, score: (c.length - i) * 10 })),
      ),
    ],
    selector: makeSelector(10),
    postSelectionFilters: [],
    sideEffects: [],
    ...overrides,
  };
}

describe('CandidatePipeline', () => {
  describe('Full execution flow', () => {
    it('should execute all pipeline stages in correct order', async () => {
      const executionLog: string[] = [];

      const config = buildConfig({
        queryHydrators: [
          {
            name: 'QH1',
            enable: () => true,
            hydrate: async (q) => { executionLog.push('hydrate_query'); return {}; },
          },
        ],
        sources: [
          {
            name: 'S1',
            enable: () => true,
            getCandidates: async () => {
              executionLog.push('source');
              return [{ id: 'a', score: 0 }, { id: 'b', score: 0 }];
            },
          },
        ],
        hydrators: [
          {
            name: 'H1',
            enable: () => true,
            hydrate: async (_q, c) => { executionLog.push('hydrate'); return c; },
          },
        ],
        filters: [
          {
            name: 'F1',
            enable: () => true,
            filter: async (_q, c) => {
              executionLog.push('filter');
              return { kept: c, removed: [] };
            },
          },
        ],
        scorers: [
          {
            name: 'SC1',
            enable: () => true,
            score: async (_q, c) => {
              executionLog.push('score');
              return c.map((x) => ({ ...x, score: 1 }));
            },
          },
        ],
        selector: {
          name: 'SEL',
          enable: () => true,
          select: (_q, c) => { executionLog.push('select'); return c; },
        },
        postSelectionFilters: [
          {
            name: 'PSF1',
            enable: () => true,
            filter: async (_q, c) => {
              executionLog.push('post_filter');
              return { kept: c, removed: [] };
            },
          },
        ],
        sideEffects: [
          {
            name: 'SE1',
            enable: () => true,
            run: async () => { executionLog.push('side_effect'); },
          },
        ],
      });

      const pipeline = new CandidatePipeline(config);
      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });

      // Verify execution order
      expect(executionLog[0]).toBe('hydrate_query');
      expect(executionLog[1]).toBe('source');
      expect(executionLog[2]).toBe('hydrate');
      expect(executionLog[3]).toBe('filter');
      expect(executionLog[4]).toBe('score');
      expect(executionLog[5]).toBe('select');
      expect(executionLog[6]).toBe('post_filter');
      // Side effects are fire-and-forget, may log after return
    });

    it('should return pipeline result with metrics', async () => {
      const pipeline = new CandidatePipeline(buildConfig());
      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });

      expect(result.query).toBeDefined();
      expect(result.query.requestId).toBe('test');
      expect(result.retrievedCandidates).toBeInstanceOf(Array);
      expect(result.filteredCandidates).toBeInstanceOf(Array);
      expect(result.selectedCandidates).toBeInstanceOf(Array);
      expect(result.pipelineMetrics).toBeDefined();
      expect(result.pipelineMetrics.totalMs).toBeGreaterThanOrEqual(0);
      expect(result.pipelineMetrics.stageMetrics).toBeDefined();
    });
  });

  describe('Query hydration', () => {
    it('should merge hydrator results into query', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          queryHydrators: [
            makeQueryHydrator('QH1', { contextData: 'hydrated' }),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.query.contextData).toBe('hydrated');
    });

    it('should continue when a query hydrator fails', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          queryHydrators: [
            makeQueryHydrator('QH_fail', {}, true),
            makeQueryHydrator('QH_ok', { contextData: 'ok' }),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.query.contextData).toBe('ok');
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
    });
  });

  describe('Source fetching', () => {
    it('should merge candidates from multiple sources', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [
            makeSource('S1', [{ id: 'a', score: 0 }]),
            makeSource('S2', [{ id: 'b', score: 0 }]),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.retrievedCandidates).toHaveLength(2);
    });

    it('should skip disabled sources', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [
            makeSource('S1', [{ id: 'a', score: 0 }], false, true),
            makeSource('S2_disabled', [{ id: 'b', score: 0 }], false, false),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.retrievedCandidates).toHaveLength(1);
    });

    it('should continue when a source fails', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [
            makeSource('S_fail', [], true),
            makeSource('S_ok', [{ id: 'a', score: 0 }]),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.retrievedCandidates).toHaveLength(1);
    });
  });

  describe('Filtering', () => {
    it('should apply filters sequentially', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [
            makeSource('S', [
              { id: 'a', score: 0, tag: 'keep' },
              { id: 'b', score: 0, tag: 'remove_first' },
              { id: 'c', score: 0, tag: 'remove_second' },
              { id: 'd', score: 0, tag: 'keep' },
            ]),
          ],
          filters: [
            makeFilter('F1', (_q, c) => ({
              kept: c.filter((x) => x.tag !== 'remove_first'),
              removed: c.filter((x) => x.tag === 'remove_first'),
            })),
            makeFilter('F2', (_q, c) => ({
              kept: c.filter((x) => x.tag !== 'remove_second'),
              removed: c.filter((x) => x.tag === 'remove_second'),
            })),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.filteredCandidates).toHaveLength(2);
      expect(result.selectedCandidates.every((c) => c.tag === 'keep')).toBe(true);
    });

    it('should recover from filter failure (keep original candidates)', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S', [{ id: 'a', score: 0 }])],
          filters: [makeFilter('F_fail', () => ({ kept: [], removed: [] }), true)],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      // Filter failed — candidates preserved
      expect(result.selectedCandidates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scoring', () => {
    it('should apply scorers sequentially', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S', [{ id: 'a', score: 0 }])],
          scorers: [
            makeScorer('SC1', (c) => c.map((x) => ({ ...x, score: x.score + 10 }))),
            makeScorer('SC2', (c) => c.map((x) => ({ ...x, score: x.score * 2 }))),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates[0].score).toBe(20); // (0 + 10) * 2
    });

    it('should skip scorer with mismatched output length', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S', [{ id: 'a', score: 5 }, { id: 'b', score: 5 }])],
          scorers: [
            makeScorer('SC_bad', (c) => [c[0]]), // Returns 1 instead of 2
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      // Scorer skipped, scores unchanged
      expect(result.selectedCandidates[0].score).toBe(5);
    });

    it('should continue when a scorer fails', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S', [{ id: 'a', score: 0 }])],
          scorers: [
            makeScorer('SC_fail', () => [], true),
            makeScorer('SC_ok', (c) => c.map((x) => ({ ...x, score: 42 }))),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates[0].score).toBe(42);
    });
  });

  describe('Selection', () => {
    it('should select top-K by score', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          resultSize: 2,
          sources: [
            makeSource('S', [
              { id: 'a', score: 0 },
              { id: 'b', score: 0 },
              { id: 'c', score: 0 },
            ]),
          ],
          scorers: [
            makeScorer('SC', (c) =>
              c.map((x, i) => ({ ...x, score: (i + 1) * 10 })),
            ),
          ],
          selector: makeSelector(2),
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates).toHaveLength(2);
      expect(result.selectedCandidates[0].score).toBe(30);
      expect(result.selectedCandidates[1].score).toBe(20);
    });
  });

  describe('Result size enforcement', () => {
    it('should truncate to resultSize', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          resultSize: 1,
          sources: [makeSource('S', [{ id: 'a', score: 10 }, { id: 'b', score: 5 }])],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates).toHaveLength(1);
    });
  });

  describe('Side effects', () => {
    it('should fire side effects without blocking', async () => {
      let sideEffectRan = false;
      const pipeline = new CandidatePipeline(
        buildConfig({
          sideEffects: [makeSideEffect('SE1', () => { sideEffectRan = true; })],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates.length).toBeGreaterThan(0);
      // Side effect fires asynchronously — give it a tick
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(sideEffectRan).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle pipeline with no candidates from sources', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S_empty', [])],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates).toHaveLength(0);
      expect(result.retrievedCandidates).toHaveLength(0);
    });

    it('should handle pipeline with all candidates filtered', async () => {
      const pipeline = new CandidatePipeline(
        buildConfig({
          sources: [makeSource('S', [{ id: 'a', score: 0 }])],
          filters: [
            makeFilter('RemoveAll', () => ({
              kept: [],
              removed: [{ id: 'a', score: 0 }],
            })),
          ],
        }),
      );

      const result = await pipeline.execute({ requestId: 'test', userId: 'u1' });
      expect(result.selectedCandidates).toHaveLength(0);
      expect(result.filteredCandidates).toHaveLength(1);
    });
  });
});
