use anchor_lang::prelude::*;

#[event]
pub struct ProfileCreated {
    pub authority: Pubkey,
    pub username: String,
    pub timestamp: i64,
}

#[event]
pub struct ProfileUpdated {
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PostCreated {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub content_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct PostLiked {
    pub post: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PostUnliked {
    pub post: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserFollowed {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserUnfollowed {
    pub follower: Pubkey,
    pub following: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PostCommented {
    pub post: Pubkey,
    pub commenter: Pubkey,
    pub comment: Pubkey,
    pub timestamp: i64,
}
