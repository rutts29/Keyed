-- Privacy Tables (client-side Privacy Cash SDK architecture)
--
-- Shield, withdraw, and balance operations are handled entirely client-side
-- via the Privacy Cash SDK. The backend only handles:
--   - Tip logging (DB records for creator dashboards)
--   - Privacy settings (user preferences)

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

COMMENT ON TABLE private_tips IS 'Private tips received by creators. Tipper identity is NOT stored to preserve anonymity via Privacy Cash.';
COMMENT ON TABLE user_privacy_settings IS 'User preferences for privacy features like default private tipping.';

-- Function to update privacy settings timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Trigger for privacy settings updates
CREATE TRIGGER privacy_settings_update_timestamp
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_settings_timestamp();

-- RLS policies
ALTER TABLE private_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view received private tips"
  ON private_tips FOR SELECT
  USING (creator_wallet = public.jwt_wallet());

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings FOR SELECT
  USING (wallet = public.jwt_wallet());

CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings FOR UPDATE
  USING (wallet = public.jwt_wallet());

CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings FOR INSERT
  WITH CHECK (wallet = public.jwt_wallet());
