use anchor_lang::prelude::*;
use crate::state::{Post, Comment};
use crate::error::SocialError;
use crate::events::PostCommented;

#[derive(Accounts)]
pub struct CommentPost<'info> {
    #[account(mut)]
    pub post: Account<'info, Post>,
    
    #[account(
        init,
        payer = commenter,
        space = 8 + Comment::INIT_SPACE,
        seeds = [b"comment", post.key().as_ref(), post.comments.to_le_bytes().as_ref()],
        bump
    )]
    pub comment: Account<'info, Comment>,
    
    #[account(mut)]
    pub commenter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CommentPost>, comment_text: String) -> Result<()> {
    require!(comment_text.len() <= 500, SocialError::CommentTooLong);

    let post = &mut ctx.accounts.post;
    let comment = &mut ctx.accounts.comment;
    let clock = Clock::get()?;

    comment.post = post.key();
    comment.commenter = ctx.accounts.commenter.key();
    comment.text = comment_text;
    comment.timestamp = clock.unix_timestamp;
    comment.comment_index = post.comments;
    comment.bump = ctx.bumps.comment;

    post.comments = post.comments.checked_add(1).unwrap();

    emit!(PostCommented {
        post: post.key(),
        commenter: comment.commenter,
        comment: comment.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
