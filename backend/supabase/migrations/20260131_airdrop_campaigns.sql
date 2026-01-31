-- Creator-initiated token/NFT airdrop campaigns with on-chain escrow
CREATE TABLE airdrop_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('spl_token', 'cnft')),
  token_mint VARCHAR(44),
  amount_per_recipient BIGINT,
  metadata_uri TEXT,
  collection_mint VARCHAR(44),
  audience_type VARCHAR(20) NOT NULL
    CHECK (audience_type IN ('followers', 'tippers', 'subscribers', 'token_holders', 'custom')),
  audience_filter JSONB,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'funded', 'processing', 'completed', 'failed', 'cancelled')),
  total_recipients INTEGER DEFAULT 0,
  successful_transfers INTEGER DEFAULT 0,
  failed_transfers INTEGER DEFAULT 0,
  escrow_pubkey VARCHAR(44),
  fund_tx_signature VARCHAR(88),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_airdrop_campaigns_creator ON airdrop_campaigns(creator_wallet);
CREATE INDEX idx_airdrop_campaigns_status ON airdrop_campaigns(status);

-- Individual recipient status tracking for airdrop campaigns
CREATE TABLE airdrop_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES airdrop_campaigns(id) ON DELETE CASCADE,
  wallet VARCHAR(44) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  tx_signature VARCHAR(88),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_airdrop_recipients_campaign ON airdrop_recipients(campaign_id, status);
CREATE INDEX idx_airdrop_recipients_wallet ON airdrop_recipients(wallet);

-- RLS
ALTER TABLE airdrop_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_recipients ENABLE ROW LEVEL SECURITY;

-- Airdrop campaigns: anyone can view, creators manage own
CREATE POLICY "Anyone can view campaigns"
  ON airdrop_campaigns FOR SELECT
  USING (TRUE);

CREATE POLICY "Creators can insert own campaigns"
  ON airdrop_campaigns FOR INSERT
  WITH CHECK (creator_wallet = public.jwt_wallet());

CREATE POLICY "Creators can update own campaigns"
  ON airdrop_campaigns FOR UPDATE
  USING (creator_wallet = public.jwt_wallet());

CREATE POLICY "Creators can delete own campaigns"
  ON airdrop_campaigns FOR DELETE
  USING (creator_wallet = public.jwt_wallet());

-- Airdrop recipients: recipients can view own drops
CREATE POLICY "Recipients can view own drops"
  ON airdrop_recipients FOR SELECT
  USING (wallet = public.jwt_wallet());

-- Creators can view recipients of their campaigns
CREATE POLICY "Creators can view campaign recipients"
  ON airdrop_recipients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM airdrop_campaigns
    WHERE airdrop_campaigns.id = airdrop_recipients.campaign_id
      AND airdrop_campaigns.creator_wallet = public.jwt_wallet()
  ));

COMMENT ON TABLE airdrop_campaigns IS 'Creator-initiated token/NFT airdrop campaigns with on-chain escrow';
COMMENT ON TABLE airdrop_recipients IS 'Individual recipient status tracking for airdrop campaigns';
