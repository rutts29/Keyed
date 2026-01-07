use anchor_lang::prelude::*;

#[event]
pub struct VaultInitialized {
    pub creator: Pubkey,
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TipSent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub post: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCreated {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub amount_per_month: u64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionProcessed {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct Withdrawal {
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PlatformConfigUpdated {
    pub authority: Pubkey,
    pub fee_basis_points: u16,
    pub timestamp: i64,
}
