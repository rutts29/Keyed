-- Privacy Tips Table
-- Stores private tips received by creators
-- NOTE: This table does NOT store the tipper wallet to preserve anonymity
-- Creator can see they received a tip, but not from whom
CREATE TABLE private_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    amount BIGINT NOT NULL,           -- Tip amount in lamports
    tx_signature VARCHAR(88) NOT NULL, -- Transaction signature
    post_id VARCHAR(44) REFERENCES posts(id), -- Optional: tip on specific post
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Index for creator to query their private tips
CREATE INDEX idx_private_tips_creator ON private_tips(creator_wallet, timestamp DESC);

-- Index for post-specific private tips
CREATE INDEX idx_private_tips_post ON private_tips(post_id) WHERE post_id IS NOT NULL;

-- Index for transaction signature lookup
CREATE INDEX idx_private_tips_signature ON private_tips(tx_signature);

-- User Privacy Settings Table
-- Stores user preferences for privacy features
CREATE TABLE user_privacy_settings (
    wallet VARCHAR(44) PRIMARY KEY REFERENCES users(wallet),
    default_private_tips BOOLEAN DEFAULT FALSE, -- Auto-enable private tips
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Shield Commitments Table (optional - for tracking user's shielded state)
-- This table can be used to cache user's shielded balance from Privacy Cash
-- NOTE: The source of truth is on-chain in Privacy Cash program
CREATE TABLE privacy_shield_cache (
    wallet VARCHAR(44) PRIMARY KEY REFERENCES users(wallet),
    shielded_balance BIGINT DEFAULT 0,  -- Cached shielded balance in lamports
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_balance CHECK (shielded_balance >= 0)
);

-- Index for balance cache updates
CREATE INDEX idx_privacy_shield_updated ON privacy_shield_cache(last_updated);

-- Privacy Activity Log (for analytics, privacy-preserving)
-- Tracks aggregate privacy feature usage without revealing user identities
CREATE TABLE privacy_activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(20) NOT NULL, -- 'shield', 'private_tip', 'balance_query'
    amount BIGINT,                      -- Amount involved (if applicable)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_activity_type CHECK (activity_type IN ('shield', 'private_tip', 'balance_query'))
);

-- Index for analytics queries
CREATE INDEX idx_privacy_activity_type ON privacy_activity_log(activity_type, timestamp DESC);

-- Add helpful comments
COMMENT ON TABLE private_tips IS 'Private tips received by creators. Tipper identity is NOT stored to preserve anonymity via Privacy Cash.';
COMMENT ON TABLE user_privacy_settings IS 'User preferences for privacy features like default private tipping.';
COMMENT ON TABLE privacy_shield_cache IS 'Cache of user shielded balances from Privacy Cash program. Source of truth is on-chain.';
COMMENT ON TABLE privacy_activity_log IS 'Aggregate privacy feature usage for analytics. Does not contain personally identifiable information.';

-- Function to update privacy settings timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for privacy settings updates
CREATE TRIGGER privacy_settings_update_timestamp
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_settings_timestamp();
