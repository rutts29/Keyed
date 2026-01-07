use anchor_lang::prelude::*;
use crate::state::{UserProfile, Follow};
use crate::error::SocialError;
use crate::events::UserFollowed;

#[derive(Accounts)]
pub struct FollowUser<'info> {
    #[account(
        init,
        payer = follower,
        space = 8 + Follow::INIT_SPACE,
        seeds = [b"follow", follower.key().as_ref(), following_profile.authority.as_ref()],
        bump
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
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FollowUser>) -> Result<()> {
    let follower_key = ctx.accounts.follower.key();
    let following_key = ctx.accounts.following_profile.authority;
    
    require!(follower_key != following_key, SocialError::CannotFollowSelf);

    let follow = &mut ctx.accounts.follow;
    let follower_profile = &mut ctx.accounts.follower_profile;
    let following_profile = &mut ctx.accounts.following_profile;
    let clock = Clock::get()?;

    follow.follower = follower_key;
    follow.following = following_key;
    follow.timestamp = clock.unix_timestamp;
    follow.bump = ctx.bumps.follow;

    follower_profile.following_count = follower_profile.following_count.checked_add(1).unwrap();
    following_profile.follower_count = following_profile.follower_count.checked_add(1).unwrap();

    emit!(UserFollowed {
        follower: follower_key,
        following: following_key,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
