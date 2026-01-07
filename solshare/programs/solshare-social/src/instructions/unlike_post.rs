use anchor_lang::prelude::*;
use crate::state::{Post, Like};
use crate::events::PostUnliked;

#[derive(Accounts)]
pub struct UnlikePost<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,
    
    #[account(
        mut,
        close = user,
        seeds = [b"like", post.key().as_ref(), user.key().as_ref()],
        bump = like.bump,
        has_one = user,
        has_one = post
    )]
    pub like: Account<'info, Like>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

pub fn handler(ctx: Context<UnlikePost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let clock = Clock::get()?;

    post.likes = post.likes.saturating_sub(1);

    emit!(PostUnliked {
        post: post.key(),
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
