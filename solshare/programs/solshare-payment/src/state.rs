use anchor_lang::prelude::*;

/// Creator vault for managing earnings from tips and subscriptions
#[account]
#[derive(InitSpace)]
pub struct CreatorVault {
    /// The creator's wallet address - owner of this vault
    pub creator: Pubkey,
    /// Total lifetime earnings in lamports
    pub total_earned: u64,
    /// Total amount withdrawn in lamports
    pub withdrawn: u64,
    /// Number of active subscribers
    pub subscribers: u64,
    /// PDA bump seed
    pub bump: u8,
}

/// Record of a tip transaction
#[account]
#[derive(InitSpace)]
pub struct TipRecord {
    /// Wallet that sent the tip
    pub from: Pubkey,
    /// Wallet that received the tip (creator)
    pub to: Pubkey,
    /// Amount tipped in lamports
    pub amount: u64,
    /// Optional post that was tipped
    pub post: Option<Pubkey>,
    /// Timestamp of the tip
    pub timestamp: i64,
    /// PDA bump seed
    pub bump: u8,
}

/// Subscription record between subscriber and creator
#[account]
#[derive(InitSpace)]
pub struct Subscription {
    /// Wallet of the subscriber
    pub subscriber: Pubkey,
    /// Wallet of the creator being subscribed to
    pub creator: Pubkey,
    /// Monthly subscription amount in lamports
    pub amount_per_month: u64,
    /// Timestamp of last payment
    pub last_payment: i64,
    /// Timestamp when subscription started
    pub started_at: i64,
    /// Whether subscription is currently active
    pub is_active: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// Program configuration for fees and admin settings
#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Platform fee in basis points (e.g., 200 = 2%)
    pub platform_fee_bps: u16,
    /// Fee collection wallet
    pub fee_wallet: Pubkey,
    /// PDA bump seed
    pub bump: u8,
}

impl CreatorVault {
    pub const SEED_PREFIX: &'static [u8] = b"vault";
}

impl TipRecord {
    pub const SEED_PREFIX: &'static [u8] = b"tip";
}

impl Subscription {
    pub const SEED_PREFIX: &'static [u8] = b"subscription";
}

impl ProgramConfig {
    pub const SEED_PREFIX: &'static [u8] = b"config";
}
