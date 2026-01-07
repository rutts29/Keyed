-- Content violations log
CREATE TABLE content_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet VARCHAR(44) NOT NULL,
    violation_type VARCHAR(20) NOT NULL,
    severity_score FLOAT NOT NULL,
    image_hash VARCHAR(64),
    explanation TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    appeal_status VARCHAR(20) DEFAULT 'none',
    appeal_reason TEXT,
    reviewed_by VARCHAR(44),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_violations_wallet ON content_violations(wallet, timestamp DESC);
CREATE INDEX idx_violations_type ON content_violations(violation_type);
CREATE INDEX idx_violations_appeal ON content_violations(appeal_status) WHERE appeal_status = 'pending';

-- Blocked content hashes (instant block list)
CREATE TABLE blocked_content_hashes (
    image_hash VARCHAR(64) PRIMARY KEY,
    reason VARCHAR(20) NOT NULL,
    original_violation_id UUID REFERENCES content_violations(id),
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by VARCHAR(20) DEFAULT 'system'
);

-- Wallet restrictions (repeat offenders)
CREATE TABLE wallet_restrictions (
    wallet VARCHAR(44) PRIMARY KEY,
    restriction_level INTEGER DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP WITH TIME ZONE,
    restriction_until TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reports
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_wallet VARCHAR(44) NOT NULL,
    reported_content_id VARCHAR(44),
    reported_wallet VARCHAR(44),
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON user_reports(status) WHERE status = 'pending';
CREATE INDEX idx_reports_content ON user_reports(reported_content_id);
