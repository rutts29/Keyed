use anchor_lang::prelude::*;
use crate::state::{CreatorVault, Subscription};
use crate::error::PaymentError;
use crate::events::SubscriptionCancelled;

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(
        mut,
        seeds = [b"vault", creator_vault.creator.as_ref()],
        bump = creator_vault.bump
    )]
    pub creator_vault: Account<'info, CreatorVault>,
    
    #[account(
        mut,
        seeds = [b"subscription", subscriber.key().as_ref(), creator_vault.creator.as_ref()],
        bump = subscription.bump,
        has_one = subscriber
    )]
    pub subscription: Account<'info, Subscription>,
    
    pub subscriber: Signer<'info>,
}

pub fn handler(ctx: Context<CancelSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let vault = &mut ctx.accounts.creator_vault;
    let clock = Clock::get()?;

    require!(subscription.is_active, PaymentError::SubscriptionNotActive);

    subscription.is_active = false;
    vault.subscribers = vault.subscribers.saturating_sub(1);

    emit!(SubscriptionCancelled {
        subscriber: subscription.subscriber,
        creator: subscription.creator,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
