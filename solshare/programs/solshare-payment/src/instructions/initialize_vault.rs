use anchor_lang::prelude::*;
use crate::state::CreatorVault;
use crate::events::VaultInitialized;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + CreatorVault::INIT_SPACE,
        seeds = [b"vault", creator.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, CreatorVault>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    vault.creator = ctx.accounts.creator.key();
    vault.total_earned = 0;
    vault.withdrawn = 0;
    vault.subscribers = 0;
    vault.bump = ctx.bumps.vault;

    emit!(VaultInitialized {
        creator: vault.creator,
        vault: vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
