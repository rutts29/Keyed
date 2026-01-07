use anchor_lang::prelude::*;
use crate::state::UserProfile;
use crate::error::SocialError;
use crate::events::ProfileCreated;

#[derive(Accounts)]
#[instruction(username: String)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProfile>,
    username: String,
    bio: String,
    profile_image_uri: String,
) -> Result<()> {
    require!(!username.is_empty(), SocialError::UsernameEmpty);
    require!(username.len() <= 32, SocialError::UsernameTooLong);
    require!(bio.len() <= 256, SocialError::BioTooLong);
    require!(profile_image_uri.len() <= 200, SocialError::ProfileImageUriTooLong);

    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    profile.authority = ctx.accounts.authority.key();
    profile.username = username.clone();
    profile.bio = bio;
    profile.profile_image_uri = profile_image_uri;
    profile.follower_count = 0;
    profile.following_count = 0;
    profile.post_count = 0;
    profile.created_at = clock.unix_timestamp;
    profile.is_verified = false;
    profile.bump = ctx.bumps.profile;

    emit!(ProfileCreated {
        authority: profile.authority,
        username,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
