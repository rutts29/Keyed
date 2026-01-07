use anchor_lang::prelude::*;

use crate::state::CreatorVault;

/// Initializes a new creator vault for managing earnings
///
/// Each creator can only have one vault, derived from their wallet address.
/// The vault tracks total earnings, withdrawals, and subscriber count.
pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.creator_vault;
    vault.creator = ctx.accounts.creator.key();
    vault.total_earned = 0;
    vault.withdrawn = 0;
    vault.subscribers = 0;
    vault.bump = ctx.bumps.creator_vault;

    emit!(VaultCreated {
        creator: ctx.accounts.creator.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    /// The creator initializing their vault
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The creator's vault account
    #[account(
        init,
        payer = creator,
        space = 8 + CreatorVault::INIT_SPACE,
        seeds = [CreatorVault::SEED_PREFIX, creator.key().as_ref()],
        bump,
    )]
    pub creator_vault: Account<'info, CreatorVault>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct VaultCreated {
    pub creator: Pubkey,
    pub timestamp: i64,
}
