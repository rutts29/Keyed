use anchor_lang::prelude::*;
use crate::state::{UserProfile, Post, ContentType};
use crate::error::SocialError;
use crate::events::PostCreated;

#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Post::INIT_SPACE,
        seeds = [b"post", authority.key().as_ref(), profile.post_count.to_le_bytes().as_ref()],
        bump
    )]
    pub post: Account<'info, Post>,
    
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ SocialError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreatePost>,
    content_uri: String,
    content_type: ContentType,
    caption: String,
    is_token_gated: bool,
    required_token: Option<Pubkey>,
) -> Result<()> {
    require!(content_uri.len() <= 200, SocialError::ContentUriTooLong);
    require!(caption.len() <= 2000, SocialError::CaptionTooLong);

    let post = &mut ctx.accounts.post;
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    post.creator = ctx.accounts.authority.key();
    post.content_uri = content_uri.clone();
    post.content_type = content_type;
    post.caption = caption;
    post.timestamp = clock.unix_timestamp;
    post.likes = 0;
    post.comments = 0;
    post.tips_received = 0;
    post.is_token_gated = is_token_gated;
    post.required_token = required_token;
    post.post_index = profile.post_count;
    post.bump = ctx.bumps.post;

    profile.post_count = profile.post_count.checked_add(1).unwrap();

    emit!(PostCreated {
        post: post.key(),
        creator: post.creator,
        content_uri,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
