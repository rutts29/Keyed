use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub authority: Pubkey,
    #[max_len(32)]
    pub username: String,
    #[max_len(256)]
    pub bio: String,
    #[max_len(200)]
    pub profile_image_uri: String,
    pub follower_count: u64,
    pub following_count: u64,
    pub post_count: u64,
    pub created_at: i64,
    pub is_verified: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ContentType {
    Image,
    Video,
    Text,
    Multi,
}

#[account]
#[derive(InitSpace)]
pub struct Post {
    pub creator: Pubkey,
    #[max_len(200)]
    pub content_uri: String,
    pub content_type: ContentType,
    #[max_len(2000)]
    pub caption: String,
    pub timestamp: i64,
    pub likes: u64,
    pub comments: u64,
    pub tips_received: u64,
    pub is_token_gated: bool,
    pub required_token: Option<Pubkey>,
    pub post_index: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Follow {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Like {
    pub user: Pubkey,
    pub post: Pubkey,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Comment {
    pub post: Pubkey,
    pub commenter: Pubkey,
    #[max_len(500)]
    pub text: String,
    pub timestamp: i64,
    pub comment_index: u64,
    pub bump: u8,
}
