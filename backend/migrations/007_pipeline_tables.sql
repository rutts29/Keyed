-- Pipeline metrics and scoring tables
-- Supports the x-algorithm-inspired recommendation pipeline.
-- Stores per-request pipeline execution metrics and per-user action weight overrides.
--
-- @see https://github.com/xai-org/x-algorithm

-- Pipeline execution metrics for monitoring and tuning
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      TEXT NOT NULL,
    user_wallet     TEXT NOT NULL REFERENCES users(wallet),
    total_ms        INTEGER NOT NULL,
    sourced_count   INTEGER NOT NULL DEFAULT 0,
    filtered_count  INTEGER NOT NULL DEFAULT 0,
    selected_count  INTEGER NOT NULL DEFAULT 0,
    source_breakdown JSONB DEFAULT '{}',
    stage_metrics    JSONB DEFAULT '{}',
    avg_score       DOUBLE PRECISION DEFAULT 0,
    pipeline_name   TEXT NOT NULL DEFAULT 'ForYouFeedPipeline',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying metrics by user and time
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_user_time
    ON pipeline_metrics (user_wallet, created_at DESC);

-- Index for monitoring pipeline performance over time
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_created
    ON pipeline_metrics (created_at DESC);

-- Index for querying by pipeline name (useful when multiple pipelines exist)
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_pipeline
    ON pipeline_metrics (pipeline_name, created_at DESC);

-- Auto-cleanup: remove metrics older than 30 days
-- Run via pg_cron or application-level scheduled job
-- DELETE FROM pipeline_metrics WHERE created_at < NOW() - INTERVAL '30 days';

-- Custom action weights per user (allows A/B testing and personalization)
CREATE TABLE IF NOT EXISTS user_action_weights (
    user_wallet     TEXT PRIMARY KEY REFERENCES users(wallet),
    weights         JSONB NOT NULL DEFAULT '{}',
    experiment_id   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_action_weights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_action_weights ON user_action_weights;
CREATE TRIGGER trigger_update_action_weights
    BEFORE UPDATE ON user_action_weights
    FOR EACH ROW
    EXECUTE FUNCTION update_action_weights_timestamp();

-- Engagement feedback tracking for future model training
-- Stores actual user actions on pipeline-served posts so we can compare
-- predicted vs actual engagement and improve the scorer over time.
CREATE TABLE IF NOT EXISTS engagement_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet     TEXT NOT NULL REFERENCES users(wallet),
    post_id         TEXT NOT NULL REFERENCES posts(id),
    action_type     TEXT NOT NULL,
    predicted_score DOUBLE PRECISION,
    pipeline_request_id TEXT,
    source          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_wallet, post_id, action_type)
);

-- Index for computing prediction accuracy per action type
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_action
    ON engagement_feedback (action_type, created_at DESC);

-- Index for per-user feedback analysis
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_user
    ON engagement_feedback (user_wallet, created_at DESC);

-- Index for joining back to pipeline requests
CREATE INDEX IF NOT EXISTS idx_engagement_feedback_request
    ON engagement_feedback (pipeline_request_id);
