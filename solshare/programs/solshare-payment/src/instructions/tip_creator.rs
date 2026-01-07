use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::error::PaymentError;
use crate::state::{CreatorVault, TipRecord};

/// Tips a creator with SOL
///
/// # Security
/// The `creator` account MUST match `creator_vault.creator` to prevent
/// an attacker from passing any wallet as `creator` while using a legitimate
/// vault, which would cause funds to transfer to the attacker while the
/// vault tracks earnings for the legitimate creator.
pub fn tip_creator(ctx: Context<TipCreator>, amount: u64, post: Option<Pubkey>) -> Result<()> {
    require!(amount > 0, PaymentError::InvalidTipAmount);
    require!(
        ctx.accounts.tipper.key() != ctx.accounts.creator.key(),
        PaymentError::CannotTipSelf
    );

    let clock = Clock::get()?;

    // Transfer SOL from tipper to creator
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.tipper.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update creator vault earnings
    let vault = &mut ctx.accounts.creator_vault;
    vault.total_earned = vault
        .total_earned
        .checked_add(amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    // Initialize tip record
    let tip_record = &mut ctx.accounts.tip_record;
    tip_record.from = ctx.accounts.tipper.key();
    tip_record.to = ctx.accounts.creator.key();
    tip_record.amount = amount;
    tip_record.post = post;
    tip_record.timestamp = clock.unix_timestamp;
    tip_record.bump = ctx.bumps.tip_record;

    emit!(TipSent {
        from: ctx.accounts.tipper.key(),
        to: ctx.accounts.creator.key(),
        amount,
        post,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct TipCreator<'info> {
    /// The user sending the tip
    #[account(mut)]
    pub tipper: Signer<'info>,

    /// The creator receiving the tip
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// funds from being sent to an attacker's wallet while crediting a different vault
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

    /// Record of this tip transaction
    #[account(
        init,
        payer = tipper,
        space = 8 + TipRecord::INIT_SPACE,
        seeds = [
            TipRecord::SEED_PREFIX,
            tipper.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump,
    )]
    pub tip_record: Account<'info, TipRecord>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct TipSent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub post: Option<Pubkey>,
    pub timestamp: i64,
}
