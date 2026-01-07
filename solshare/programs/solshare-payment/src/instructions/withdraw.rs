use anchor_lang::prelude::*;
use crate::state::CreatorVault;
use crate::error::PaymentError;
use crate::events::Withdrawal;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", creator.key().as_ref()],
        bump = vault.bump,
        has_one = creator @ PaymentError::Unauthorized
    )]
    pub vault: Account<'info, CreatorVault>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(amount > 0, PaymentError::InvalidAmount);

    let available = vault.total_earned
        .checked_sub(vault.withdrawn)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    require!(amount <= available, PaymentError::WithdrawalExceedsBalance);

    vault.withdrawn = vault.withdrawn
        .checked_add(amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    // Note: The SOL is already in the creator's wallet from tips/subscriptions
    // This just tracks the accounting. The vault account itself doesn't hold SOL.
    
    emit!(Withdrawal {
        creator: vault.creator,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
