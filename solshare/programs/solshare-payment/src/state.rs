use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub fee_basis_points: u16, // 200 = 2%
    pub fee_recipient: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CreatorVault {
    pub creator: Pubkey,
    pub total_earned: u64,
    pub withdrawn: u64,
    pub subscribers: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TipRecord {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub post: Option<Pubkey>,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub amount_per_month: u64,
    pub last_payment: i64,
    pub started_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl PlatformConfig {
    pub const FEE_BASIS_POINTS_DEFAULT: u16 = 200; // 2%
}
