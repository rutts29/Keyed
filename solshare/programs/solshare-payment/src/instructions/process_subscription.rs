use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{PlatformConfig, CreatorVault, Subscription};
use crate::error::PaymentError;
use crate::events::SubscriptionProcessed;

const SECONDS_PER_MONTH: i64 = 30 * 24 * 60 * 60; // 30 days

#[derive(Accounts)]
pub struct ProcessSubscription<'info> {
    #[account(
        seeds = [b"platform_config"],
        bump = config.bump
    )]
    pub config: Account<'info, PlatformConfig>,
    
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
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    /// Creator wallet to receive subscription payment
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// an attacker from redirecting subscription payments to their own wallet
    #[account(
        mut,
        address = creator_vault.creator @ PaymentError::InvalidCreatorAccount
    )]
    pub creator: SystemAccount<'info>,
    
    /// CHECK: Fee recipient
    #[account(mut, address = config.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ProcessSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let vault = &mut ctx.accounts.creator_vault;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    require!(subscription.is_active, PaymentError::SubscriptionNotActive);
    
    let time_since_last = clock.unix_timestamp - subscription.last_payment;
    require!(time_since_last >= SECONDS_PER_MONTH, PaymentError::PaymentNotDue);

    let amount = subscription.amount_per_month;
    let fee = amount
        .checked_mul(config.fee_basis_points as u64)
        .ok_or(PaymentError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(PaymentError::ArithmeticOverflow)?;
    
    let creator_amount = amount.checked_sub(fee).ok_or(PaymentError::ArithmeticOverflow)?;

    // Transfer fee
    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.subscriber.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // Transfer to creator
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.subscriber.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        ),
        creator_amount,
    )?;

    vault.total_earned = vault.total_earned
        .checked_add(creator_amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    subscription.last_payment = clock.unix_timestamp;

    emit!(SubscriptionProcessed {
        subscriber: subscription.subscriber,
        creator: subscription.creator,
        amount,
        fee,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
