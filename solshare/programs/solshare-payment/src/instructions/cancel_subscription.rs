use anchor_lang::prelude::*;

use crate::error::PaymentError;
use crate::state::{CreatorVault, Subscription};

/// Cancels an active subscription
///
/// Only the subscriber can cancel their own subscription. The subscription
/// account is closed and rent is returned to the subscriber.
pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;

    require!(subscription.is_active, PaymentError::SubscriptionNotActive);

    // Decrease subscriber count in vault
    let vault = &mut ctx.accounts.creator_vault;
    vault.subscribers = vault.subscribers.saturating_sub(1);

    emit!(SubscriptionCancelled {
        subscriber: ctx.accounts.subscriber.key(),
        creator: subscription.creator,
        timestamp: Clock::get()?.unix_timestamp,
    });

    // Account will be closed and rent returned to subscriber
    Ok(())
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    /// The subscriber cancelling their subscription
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// The creator whose subscription is being cancelled
    /// CHECK: Only used for PDA derivation, validated by subscription constraint
    pub creator: UncheckedAccount<'info>,

    /// The creator's vault to update subscriber count
    #[account(
        mut,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump = creator_vault.bump,
    )]
    pub creator_vault: Account<'info, CreatorVault>,

    /// The subscription being cancelled
    #[account(
        mut,
        close = subscriber,
        seeds = [
            Subscription::SEED_PREFIX,
            subscriber.key().as_ref(),
            creator.key().as_ref()
        ],
        bump = subscription.bump,
        constraint = subscription.subscriber == subscriber.key(),
    )]
    pub subscription: Account<'info, Subscription>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}
