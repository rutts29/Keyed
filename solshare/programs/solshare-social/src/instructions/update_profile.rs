use anchor_lang::prelude::*;
use crate::state::UserProfile;
use crate::error::SocialError;
use crate::events::ProfileUpdated;

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump = profile.bump,
        has_one = authority @ SocialError::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    
    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateProfile>,
    bio: Option<String>,
    profile_image_uri: Option<String>,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;

    if let Some(new_bio) = bio {
        require!(new_bio.len() <= 256, SocialError::BioTooLong);
        profile.bio = new_bio;
    }

    if let Some(new_uri) = profile_image_uri {
        require!(new_uri.len() <= 200, SocialError::ProfileImageUriTooLong);
        profile.profile_image_uri = new_uri;
    }

    emit!(ProfileUpdated {
        authority: profile.authority,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
