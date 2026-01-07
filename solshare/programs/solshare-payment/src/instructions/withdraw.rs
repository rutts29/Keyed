use anchor_lang::prelude::*;

use crate::error::PaymentError;
use crate::state::CreatorVault;

/// Withdraws earnings from the creator vault
///
/// Only the creator who owns the vault can withdraw funds.
/// Withdrawals are instant with no lockup period.
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(amount > 0, PaymentError::InvalidWithdrawalAmount);

    let vault = &ctx.accounts.creator_vault;
    let available_balance = vault
        .total_earned
        .checked_sub(vault.withdrawn)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    require!(amount <= available_balance, PaymentError::InsufficientBalance);

    // Transfer SOL from vault PDA to creator
    // The vault PDA holds the rent, but we need to track withdrawals
    // In practice, funds go directly to creator in tip/subscribe, so this
    // is primarily for tracking purposes
    let vault = &mut ctx.accounts.creator_vault;
    vault.withdrawn = vault
        .withdrawn
        .checked_add(amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    emit!(Withdrawal {
        creator: ctx.accounts.creator.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// The creator withdrawing from their vault
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The creator's vault
    #[account(
        mut,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump = creator_vault.bump,
        constraint = creator_vault.creator == creator.key() @ PaymentError::Unauthorized,
    )]
    pub creator_vault: Account<'info, CreatorVault>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct Withdrawal {
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
