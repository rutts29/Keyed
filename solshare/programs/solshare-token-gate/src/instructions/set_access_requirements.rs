use anchor_lang::prelude::*;
use crate::state::{AccessControl, GateType};
use crate::error::TokenGateError;
use crate::events::AccessControlCreated;

const SOCIAL_PROGRAM_ID: Pubkey = pubkey!("sGLNkcQKvfTVYvhJX8KVo4RrzEZL32UTo8ruwpFEHmG");

#[derive(Accounts)]
#[instruction(post: Pubkey, required_token: Option<Pubkey>, minimum_balance: u64, required_nft_collection: Option<Pubkey>, post_index: u64)]
pub struct SetAccessRequirements<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + AccessControl::INIT_SPACE,
        seeds = [b"access", post.as_ref()],
        bump
    )]
    pub access_control: Account<'info, AccessControl>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SetAccessRequirements>,
    post: Pubkey,
    required_token: Option<Pubkey>,
    minimum_balance: u64,
    required_nft_collection: Option<Pubkey>,
    post_index: u64,
) -> Result<()> {
    // Verify creator owns this post by checking the PDA derivation against the social program
    let (expected_post_pda, _) = Pubkey::find_program_address(
        &[
            b"post",
            ctx.accounts.creator.key().as_ref(),
            &post_index.to_le_bytes(),
        ],
        &SOCIAL_PROGRAM_ID,
    );
    require!(post == expected_post_pda, TokenGateError::Unauthorized);

    require!(
        required_token.is_some() || required_nft_collection.is_some(),
        TokenGateError::InvalidGateConfig
    );

    let access_control = &mut ctx.accounts.access_control;
    let clock = Clock::get()?;

    let gate_type = match (required_token.is_some(), required_nft_collection.is_some()) {
        (true, true) => GateType::Both,
        (true, false) => GateType::Token,
        (false, true) => GateType::Nft,
        (false, false) => return Err(TokenGateError::InvalidGateConfig.into()),
    };

    access_control.post = post;
    access_control.creator = ctx.accounts.creator.key();
    access_control.required_token = required_token;
    access_control.minimum_balance = minimum_balance;
    access_control.required_nft_collection = required_nft_collection;
    access_control.gate_type = gate_type;
    access_control.created_at = clock.unix_timestamp;
    access_control.bump = ctx.bumps.access_control;

    emit!(AccessControlCreated {
        post,
        creator: access_control.creator,
        required_token,
        minimum_balance,
        required_nft_collection,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
