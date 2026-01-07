use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::error::PaymentError;
use crate::state::{CreatorVault, Subscription};

/// Creates a new subscription and makes the first payment
///
/// # Security
/// The `creator` account MUST match `creator_vault.creator` to prevent
/// an attacker from passing any wallet as `creator` while using a legitimate
/// vault, which would cause subscription payments to transfer to the attacker
/// while the vault tracks earnings for the legitimate creator.
pub fn subscribe(ctx: Context<Subscribe>, amount_per_month: u64) -> Result<()> {
    require!(
        amount_per_month > 0,
        PaymentError::InvalidSubscriptionAmount
    );
    require!(
        ctx.accounts.subscriber.key() != ctx.accounts.creator.key(),
        PaymentError::CannotSubscribeToSelf
    );

    let clock = Clock::get()?;

    // Transfer first month's payment from subscriber to creator
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.subscriber.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        ),
        amount_per_month,
    )?;

    // Update creator vault
    let vault = &mut ctx.accounts.creator_vault;
    vault.total_earned = vault
        .total_earned
        .checked_add(amount_per_month)
        .ok_or(PaymentError::ArithmeticOverflow)?;
    vault.subscribers = vault
        .subscribers
        .checked_add(1)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    // Initialize subscription
    let subscription = &mut ctx.accounts.subscription;
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.creator = ctx.accounts.creator.key();
    subscription.amount_per_month = amount_per_month;
    subscription.last_payment = clock.unix_timestamp;
    subscription.started_at = clock.unix_timestamp;
    subscription.is_active = true;
    subscription.bump = ctx.bumps.subscription;

    emit!(SubscriptionCreated {
        subscriber: ctx.accounts.subscriber.key(),
        creator: ctx.accounts.creator.key(),
        amount_per_month,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Subscribe<'info> {
    /// The user subscribing to the creator
    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// The creator being subscribed to
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// subscription payments from being sent to an attacker's wallet while
    /// crediting a different vault
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

    /// The subscription record
    #[account(
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [
            Subscription::SEED_PREFIX,
            subscriber.key().as_ref(),
            creator.key().as_ref()
        ],
        bump,
    )]
    pub subscription: Account<'info, Subscription>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct SubscriptionCreated {
    pub subscriber: Pubkey,
    pub creator: Pubkey,
    pub amount_per_month: u64,
    pub timestamp: i64,
}
