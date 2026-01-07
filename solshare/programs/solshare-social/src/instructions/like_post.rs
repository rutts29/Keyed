use anchor_lang::prelude::*;
use crate::state::{Post, Like};
use crate::error::SocialError;
use crate::events::PostLiked;

#[derive(Accounts)]
pub struct LikePost<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Like::INIT_SPACE,
        seeds = [b"like", post.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub like: Account<'info, Like>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<LikePost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let like = &mut ctx.accounts.like;
    let clock = Clock::get()?;

    require!(post.creator != ctx.accounts.user.key(), SocialError::CannotLikeOwnPost);

    like.user = ctx.accounts.user.key();
    like.post = post.key();
    like.timestamp = clock.unix_timestamp;
    like.bump = ctx.bumps.like;

    post.likes = post.likes.checked_add(1).unwrap();

    emit!(PostLiked {
        post: post.key(),
        user: like.user,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
