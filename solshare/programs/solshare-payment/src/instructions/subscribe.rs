use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{PlatformConfig, CreatorVault, Subscription};
use crate::error::PaymentError;
use crate::events::SubscriptionCreated;

#[derive(Accounts)]
pub struct Subscribe<'info> {
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
        init,
        payer = subscriber,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [b"subscription", subscriber.key().as_ref(), creator_vault.creator.as_ref()],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    
    #[account(mut)]
    pub subscriber: Signer<'info>,
    
    /// Creator wallet to receive subscription payment
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// subscription payments from being sent to an attacker's wallet while
    /// crediting a different vault
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

pub fn handler(ctx: Context<Subscribe>, amount_per_month: u64) -> Result<()> {
    require!(amount_per_month > 0, PaymentError::InvalidAmount);
    require!(
        ctx.accounts.subscriber.key() != ctx.accounts.creator_vault.creator,
        PaymentError::CannotSubscribeToSelf
    );

    let config = &ctx.accounts.config;
    let vault = &mut ctx.accounts.creator_vault;
    let subscription = &mut ctx.accounts.subscription;
    let clock = Clock::get()?;

    let fee = amount_per_month
        .checked_mul(config.fee_basis_points as u64)
        .ok_or(PaymentError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(PaymentError::ArithmeticOverflow)?;
    
    let creator_amount = amount_per_month.checked_sub(fee).ok_or(PaymentError::ArithmeticOverflow)?;

    // Transfer first month's fee
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

    // Transfer first month's payment to creator
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
    vault.subscribers = vault.subscribers.checked_add(1).ok_or(PaymentError::ArithmeticOverflow)?;

    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.creator = vault.creator;
    subscription.amount_per_month = amount_per_month;
    subscription.last_payment = clock.unix_timestamp;
    subscription.started_at = clock.unix_timestamp;
    subscription.is_active = true;
    subscription.bump = ctx.bumps.subscription;

    emit!(SubscriptionCreated {
        subscriber: subscription.subscriber,
        creator: subscription.creator,
        amount_per_month,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
