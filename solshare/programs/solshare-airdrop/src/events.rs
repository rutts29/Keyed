use anchor_lang::prelude::*;

#[event]
pub struct CampaignCreated {
    pub creator: Pubkey,
    pub campaign_id: [u8; 16],
    pub token_mint: Pubkey,
    pub amount_per_recipient: u64,
    pub crank_authority: Pubkey,
}

#[event]
pub struct CampaignFunded {
    pub creator: Pubkey,
    pub campaign_id: [u8; 16],
    pub amount: u64,
}

#[event]
pub struct BatchDistributed {
    pub campaign_id: [u8; 16],
    pub recipient_count: u32,
    pub total_distributed: u64,
}

#[event]
pub struct CampaignRefunded {
    pub creator: Pubkey,
    pub campaign_id: [u8; 16],
    pub refund_amount: u64,
}
