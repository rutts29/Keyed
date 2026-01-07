use anchor_lang::prelude::*;
use crate::state::{UserProfile, Follow};
use crate::error::SocialError;
use crate::events::UserUnfollowed;

#[derive(Accounts)]
pub struct UnfollowUser<'info> {
    #[account(
        mut,
        close = follower,
        seeds = [b"follow", follower.key().as_ref(), following_profile.authority.as_ref()],
        bump = follow.bump,
        has_one = follower
    )]
    pub follow: Account<'info, Follow>,
    
    #[account(
        mut,
        seeds = [b"profile", follower.key().as_ref()],
        bump = follower_profile.bump,
        has_one = authority @ SocialError::Unauthorized,
    )]
    pub follower_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"profile", following_profile.authority.as_ref()],
        bump = following_profile.bump
    )]
    pub following_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub follower: Signer<'info>,
    
    /// CHECK: We only need this for authority constraint
    pub authority: AccountInfo<'info>,
}

pub fn handler(ctx: Context<UnfollowUser>) -> Result<()> {
    let follower_profile = &mut ctx.accounts.follower_profile;
    let following_profile = &mut ctx.accounts.following_profile;
    let clock = Clock::get()?;

    follower_profile.following_count = follower_profile.following_count.saturating_sub(1);
    following_profile.follower_count = following_profile.follower_count.saturating_sub(1);

    emit!(UserUnfollowed {
        follower: ctx.accounts.follower.key(),
        following: following_profile.authority,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
