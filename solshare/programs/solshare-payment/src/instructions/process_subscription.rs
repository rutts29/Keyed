use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::error::PaymentError;
use crate::state::{CreatorVault, Subscription};

/// Seconds in 30 days (approximate month)
pub const SUBSCRIPTION_PERIOD_SECONDS: i64 = 30 * 24 * 60 * 60;

/// Processes a recurring subscription payment (crank operation)
///
/// This function can be called by anyone (permissionless crank) to process
/// due subscription payments. It transfers the monthly amount from subscriber
/// to creator if the subscription is active and the payment period has elapsed.
///
/// # Security
/// The `creator` account is validated against `creator_vault.creator` (line 36)
/// to ensure funds go to the legitimate vault owner.
pub fn process_subscription(ctx: Context<ProcessSubscription>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let clock = Clock::get()?;

    // Verify subscription is active
    require!(subscription.is_active, PaymentError::SubscriptionNotActive);

    // Verify payment is due (30 days since last payment)
    let time_since_last_payment = clock
        .unix_timestamp
        .checked_sub(subscription.last_payment)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    require!(
        time_since_last_payment >= SUBSCRIPTION_PERIOD_SECONDS,
        PaymentError::SubscriptionNotDue
    );

    // Transfer monthly payment from subscriber to creator
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.subscriber.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        ),
        subscription.amount_per_month,
    )?;

    // Update creator vault earnings
    let vault = &mut ctx.accounts.creator_vault;
    vault.total_earned = vault
        .total_earned
        .checked_add(subscription.amount_per_month)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    // Update subscription last payment timestamp
    let subscription = &mut ctx.accounts.subscription;
    subscription.last_payment = clock.unix_timestamp;

    emit!(SubscriptionPaymentProcessed {
        subscriber: ctx.accounts.subscriber.key(),
        creator: ctx.accounts.creator.key(),
        amount: subscription.amount_per_month,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ProcessSubscription<'info> {
    /// The subscriber whose payment is being processed
    /// Must have sufficient SOL for the subscription payment
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// The creator receiving the subscription payment
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// an attacker from redirecting subscription payments to their own wallet
    #[account(
        mut,
        address = creator_vault.creator @ PaymentError::InvalidCreatorAccount
    )]
    pub creator: SystemAccount<'info>,

    /// The creator's vault for tracking earnings
    #[account(
        mut,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump = creator_vault.bump,
    )]
    pub creator_vault: Account<'info, CreatorVault>,

    /// The subscription being processed
    #[account(
        mut,
        seeds = [
            Subscription::SEED_PREFIX,
            subscriber.key().as_ref(),
            creator.key().as_ref()
        ],
        bump = subscription.bump,
        constraint = subscription.subscriber == subscriber.key(),
        constraint = subscription.creator == creator.key(),
    )]
    pub subscription: Account<'info, Subscription>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct SubscriptionPaymentProcessed {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
