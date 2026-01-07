use anchor_lang::prelude::*;
use crate::state::PlatformConfig;
use crate::error::PaymentError;
use crate::events::PlatformConfigUpdated;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"platform_config"],
        bump
    )]
    pub config: Account<'info, PlatformConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Fee recipient wallet
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>, fee_basis_points: u16) -> Result<()> {
    require!(fee_basis_points <= 10000, PaymentError::InvalidFeeBasisPoints);

    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;
    
    config.authority = ctx.accounts.authority.key();
    config.fee_basis_points = fee_basis_points;
    config.fee_recipient = ctx.accounts.fee_recipient.key();
    config.bump = ctx.bumps.config;

    emit!(PlatformConfigUpdated {
        authority: config.authority,
        fee_basis_points,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
