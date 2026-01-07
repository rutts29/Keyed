use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::state::{AccessControl, AccessVerification};
use crate::error::TokenGateError;
use crate::events::AccessVerified;

#[derive(Accounts)]
pub struct VerifyTokenAccess<'info> {
    #[account(
        seeds = [b"access", access_control.post.as_ref()],
        bump = access_control.bump
    )]
    pub access_control: Account<'info, AccessControl>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + AccessVerification::INIT_SPACE,
        seeds = [b"verification", user.key().as_ref(), access_control.post.as_ref()],
        bump
    )]
    pub verification: Account<'info, AccessVerification>,
    
    #[account(
        constraint = user_token_account.owner == user.key() @ TokenGateError::TokenAccountOwnerMismatch,
        constraint = Some(user_token_account.mint) == access_control.required_token @ TokenGateError::TokenAccountMintMismatch
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VerifyTokenAccess>) -> Result<()> {
    let access_control = &ctx.accounts.access_control;
    let verification = &mut ctx.accounts.verification;
    let user_token_account = &ctx.accounts.user_token_account;
    let clock = Clock::get()?;

    require!(
        access_control.requires_token(),
        TokenGateError::InvalidGateConfig
    );
    require!(
        access_control.required_token.is_some(),
        TokenGateError::TokenMintRequired
    );

    require!(
        user_token_account.amount >= access_control.minimum_balance,
        TokenGateError::InsufficientTokenBalance
    );

    verification.user = ctx.accounts.user.key();
    verification.post = access_control.post;
    verification.token_verified = true;
    verification.verified_at = clock.unix_timestamp;
    verification.expires_at = None; // Token access doesn't expire by default
    verification.bump = ctx.bumps.verification;

    // For GateType::Both, only set verified=true if both token AND NFT are verified
    // For GateType::Token, token verification alone is sufficient
    verification.verified = match access_control.gate_type {
        crate::state::GateType::Token => true,
        crate::state::GateType::Both => verification.token_verified && verification.nft_verified,
        crate::state::GateType::Nft => verification.nft_verified, // Should not reach here due to requires_token check
    };

    emit!(AccessVerified {
        user: verification.user,
        post: verification.post,
        verification_type: "token".to_string(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
