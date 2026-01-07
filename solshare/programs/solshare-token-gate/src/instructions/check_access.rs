use anchor_lang::prelude::*;
use crate::state::{AccessControl, AccessVerification, GateType};
use crate::error::TokenGateError;

#[derive(Accounts)]
pub struct CheckAccess<'info> {
    #[account(
        seeds = [b"access", access_control.post.as_ref()],
        bump = access_control.bump
    )]
    pub access_control: Account<'info, AccessControl>,
    
    #[account(
        seeds = [b"verification", user.key().as_ref(), access_control.post.as_ref()],
        bump = verification.bump,
        has_one = user
    )]
    pub verification: Account<'info, AccessVerification>,
    
    pub user: Signer<'info>,
}

pub fn handler(ctx: Context<CheckAccess>) -> Result<bool> {
    let access_control = &ctx.accounts.access_control;
    let verification = &ctx.accounts.verification;
    let clock = Clock::get()?;

    // Explicitly verify based on gate type for defense in depth
    // This ensures GateType::Both requires BOTH verifications, not just one
    match access_control.gate_type {
        GateType::Token => {
            require!(verification.token_verified, TokenGateError::NotVerified);
        }
        GateType::Nft => {
            require!(verification.nft_verified, TokenGateError::NotVerified);
        }
        GateType::Both => {
            require!(verification.token_verified, TokenGateError::NotVerified);
            require!(verification.nft_verified, TokenGateError::NotVerified);
        }
    }

    // Check expiration if set
    if let Some(expires_at) = verification.expires_at {
        require!(
            clock.unix_timestamp < expires_at,
            TokenGateError::VerificationExpired
        );
    }

    Ok(true)
}
