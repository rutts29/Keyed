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

    // Verify vault PDA has enough lamports (accounting for rent-exempt minimum)
    let vault_info = vault.to_account_info();
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(vault_info.data_len());
    let vault_lamports = vault_info.lamports();
    let available_lamports = vault_lamports
        .checked_sub(min_balance)
        .ok_or(PaymentError::InsufficientFunds)?;
    require!(amount <= available_lamports, PaymentError::InsufficientFunds);

    // Transfer SOL from vault PDA to creator
    let creator_info = ctx.accounts.creator.to_account_info();
    **vault_info.try_borrow_mut_lamports()? -= amount;
    **creator_info.try_borrow_mut_lamports()? += amount;

    vault.withdrawn = vault.withdrawn
        .checked_add(amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    emit!(Withdrawal {
        creator: vault.creator,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
