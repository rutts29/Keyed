pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::ContentType;

declare_id!("G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L");

#[program]
pub mod solshare_social {
    use super::*;

    pub fn create_profile(
        ctx: Context<CreateProfile>,
        username: String,
        bio: String,
        profile_image_uri: String,
    ) -> Result<()> {
        create_profile::handler(ctx, username, bio, profile_image_uri)
    }

    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        bio: Option<String>,
        profile_image_uri: Option<String>,
    ) -> Result<()> {
        update_profile::handler(ctx, bio, profile_image_uri)
    }

    pub fn create_post(
        ctx: Context<CreatePost>,
        content_uri: String,
        content_type: ContentType,
        caption: String,
        is_token_gated: bool,
        required_token: Option<Pubkey>,
    ) -> Result<()> {
        create_post::handler(ctx, content_uri, content_type, caption, is_token_gated, required_token)
    }

    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        like_post::handler(ctx)
    }

    pub fn unlike_post(ctx: Context<UnlikePost>) -> Result<()> {
        unlike_post::handler(ctx)
    }

    pub fn follow_user(ctx: Context<FollowUser>) -> Result<()> {
        follow_user::handler(ctx)
    }

    pub fn unfollow_user(ctx: Context<UnfollowUser>) -> Result<()> {
        unfollow_user::handler(ctx)
    }

    pub fn comment_post(ctx: Context<CommentPost>, comment_text: String) -> Result<()> {
        comment_post::handler(ctx, comment_text)
    }
}
