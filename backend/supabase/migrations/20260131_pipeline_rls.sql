-- Enable RLS on pipeline tables
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_action_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_feedback ENABLE ROW LEVEL SECURITY;

-- Pipeline metrics: only the backend service role can insert/read
-- (internal observability data, not user-facing)
CREATE POLICY "Service role full access on pipeline_metrics"
    ON pipeline_metrics FOR ALL
    USING (auth.role() = 'service_role');

-- User action weights: users can view their own, service role manages
CREATE POLICY "Users can view own action weights"
    ON user_action_weights FOR SELECT
    USING (user_wallet = jwt_wallet());

CREATE POLICY "Service role full access on user_action_weights"
    ON user_action_weights FOR ALL
    USING (auth.role() = 'service_role');

-- Engagement feedback: users can view own, service role manages
CREATE POLICY "Users can view own engagement feedback"
    ON engagement_feedback FOR SELECT
    USING (user_wallet = jwt_wallet());

CREATE POLICY "Service role full access on engagement_feedback"
    ON engagement_feedback FOR ALL
    USING (auth.role() = 'service_role');
