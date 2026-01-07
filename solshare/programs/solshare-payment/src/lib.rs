use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("PAYMNtxvPjEFQqjksKJhYmSmkWTTxK5bjk1vRAATQ2Y");

/// SolShare Payment Program
///
/// Handles all payment-related functionality for the SolShare platform:
/// - Creator vault management
/// - Tips from users to creators
/// - Subscription payments (monthly recurring)
/// - Withdrawal of earnings
///
/// # Security Considerations
///
/// All instructions that transfer funds to a creator validate that the
/// `creator` account matches `creator_vault.creator`. This prevents an
/// attack where an attacker could pass any wallet as `creator` while using
/// a legitimate vault, causing funds to transfer to the attacker while
/// the vault tracks earnings for the legitimate creator.
///
/// See `tip_creator.rs` and `subscribe.rs` for the security constraint implementation.
#[program]
pub mod solshare_payment {
    use super::*;

    /// Initialize a new creator vault
    ///
    /// Creates a vault for tracking creator earnings, withdrawals, and subscribers.
    /// Each creator can only have one vault.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize_vault::initialize_vault(ctx)
    }

    /// Tip a creator with SOL
    ///
    /// Transfers SOL from tipper to creator and records the tip.
    /// Optionally associates the tip with a specific post.
    ///
    /// # Security
    /// Validates that `creator` matches `creator_vault.creator` to prevent
    /// funds from being misdirected while vault tracks wrong earnings.
    pub fn tip_creator(
        ctx: Context<TipCreator>,
        amount: u64,
        post: Option<Pubkey>,
    ) -> Result<()> {
        instructions::tip_creator::tip_creator(ctx, amount, post)
    }

    /// Subscribe to a creator
    ///
    /// Creates a new subscription and makes the first monthly payment.
    ///
    /// # Security
    /// Validates that `creator` matches `creator_vault.creator` to prevent
    /// subscription payments from being misdirected.
    pub fn subscribe(ctx: Context<Subscribe>, amount_per_month: u64) -> Result<()> {
        instructions::subscribe::subscribe(ctx, amount_per_month)
    }

    /// Process a recurring subscription payment
    ///
    /// Permissionless crank that processes due subscription payments.
    /// Can be called by anyone when a subscription payment is due (30 days).
    ///
    /// # Security
    /// Validates that `creator` matches `creator_vault.creator`.
    pub fn process_subscription(ctx: Context<ProcessSubscription>) -> Result<()> {
        instructions::process_subscription::process_subscription(ctx)
    }

    /// Cancel a subscription
    ///
    /// Deactivates a subscription and returns account rent to subscriber.
    /// Only the subscriber can cancel their own subscription.
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        instructions::cancel_subscription::cancel_subscription(ctx)
    }

    /// Withdraw earnings from vault
    ///
    /// Allows creator to withdraw their accumulated earnings.
    /// Only the vault owner can withdraw.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount)
    }
}
