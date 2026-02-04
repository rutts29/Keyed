-- Migration: Add on-chain campaign tracking columns
-- These columns link DB records to on-chain Solana program state

-- campaign_id_bytes: 16-byte unique identifier used in PDA derivation
-- campaign_pda: The derived program address for this campaign on-chain
-- create_tx_signature: Signature of the createCampaign transaction
-- Note: escrow_pubkey and escrow_secret are DEPRECATED and will be removed

ALTER TABLE airdrop_campaigns
ADD COLUMN IF NOT EXISTS campaign_id_bytes BYTEA,
ADD COLUMN IF NOT EXISTS campaign_pda VARCHAR(44),
ADD COLUMN IF NOT EXISTS create_tx_signature VARCHAR(88);

-- Add index for campaign_pda lookups
CREATE INDEX IF NOT EXISTS idx_airdrop_campaigns_pda ON airdrop_campaigns(campaign_pda);

-- Add comment explaining the migration
COMMENT ON COLUMN airdrop_campaigns.campaign_id_bytes IS '16-byte campaign ID used in on-chain PDA derivation';
COMMENT ON COLUMN airdrop_campaigns.campaign_pda IS 'On-chain campaign PDA address';
COMMENT ON COLUMN airdrop_campaigns.create_tx_signature IS 'Signature of the createCampaign transaction';
COMMENT ON COLUMN airdrop_campaigns.escrow_pubkey IS 'DEPRECATED: Use campaign_pda instead';
COMMENT ON COLUMN airdrop_campaigns.escrow_secret IS 'DEPRECATED: No longer needed with program-based escrow';
