use anchor_lang::prelude::*;

#[account]
pub struct CampaignState {
    pub creator: Pubkey,
    pub campaign_id: [u8; 16],
    pub token_mint: Pubkey,
    pub escrow_ata: Pubkey,
    pub amount_per_recipient: u64,
    pub total_amount: u64,
    pub distributed_amount: u64,
    pub total_recipients: u32,
    pub distributed_count: u32,
    pub status: CampaignStatus,
    pub crank_authority: Pubkey,
    pub bump: u8,
}

impl CampaignState {
    pub const SIZE: usize = 8  // discriminator
        + 32  // creator
        + 16  // campaign_id
        + 32  // token_mint
        + 32  // escrow_ata
        + 8   // amount_per_recipient
        + 8   // total_amount
        + 8   // distributed_amount
        + 4   // total_recipients
        + 4   // distributed_count
        + 1   // status
        + 32  // crank_authority
        + 1;  // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CampaignStatus {
    Draft,
    Funded,
    Processing,
    Completed,
    Cancelled,
}
