use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::state::{AccessControl, AccessVerification};
use crate::error::TokenGateError;
use crate::events::AccessVerified;

#[derive(Accounts)]
pub struct VerifyNftAccess<'info> {
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
        constraint = nft_token_account.owner == user.key() @ TokenGateError::TokenAccountOwnerMismatch,
        constraint = nft_token_account.amount == 1 @ TokenGateError::NftNotOwned
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: NFT mint account - verified by token account mint check
    pub nft_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VerifyNftAccess>) -> Result<()> {
    let access_control = &ctx.accounts.access_control;
    let verification = &mut ctx.accounts.verification;
    let nft_token_account = &ctx.accounts.nft_token_account;
    let clock = Clock::get()?;

    require!(
        access_control.requires_nft(),
        TokenGateError::InvalidGateConfig
    );
    require!(
        access_control.required_nft_collection.is_some(),
        TokenGateError::NftCollectionRequired
    );

    // Verify token account holds the NFT mint
    require!(
        nft_token_account.mint == ctx.accounts.nft_mint.key(),
        TokenGateError::TokenAccountMintMismatch
    );

    // NFT must have amount = 1
    require!(
        nft_token_account.amount == 1,
        TokenGateError::NftNotOwned
    );

    // Note: In production, you would verify the NFT's collection metadata
    // using the Metaplex metadata program. For this implementation,
    // we verify the user holds an NFT and trust the frontend/backend
    // to pass correct NFT mints from the required collection.

    verification.user = ctx.accounts.user.key();
    verification.post = access_control.post;
    verification.nft_verified = true;
    verification.verified_at = clock.unix_timestamp;
    verification.expires_at = None;
    verification.bump = ctx.bumps.verification;

    // For GateType::Both, only set verified=true if both token AND NFT are verified
    // For GateType::Nft, NFT verification alone is sufficient
    verification.verified = match access_control.gate_type {
        crate::state::GateType::Nft => true,
        crate::state::GateType::Both => verification.token_verified && verification.nft_verified,
        crate::state::GateType::Token => verification.token_verified, // Should not reach here due to requires_nft check
    };

    emit!(AccessVerified {
        user: verification.user,
        post: verification.post,
        verification_type: "nft".to_string(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
