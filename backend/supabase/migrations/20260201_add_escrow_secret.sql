-- Add escrow_secret column for storing the escrow keypair's secret key
ALTER TABLE airdrop_campaigns ADD COLUMN escrow_secret TEXT;

COMMENT ON COLUMN airdrop_campaigns.escrow_secret IS 'Base64-encoded secret key of the escrow keypair for token distribution';
