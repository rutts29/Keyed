use anchor_lang::prelude::*;

#[error_code]
pub enum SocialError {
    #[msg("Username must be 32 characters or less")]
    UsernameTooLong,
    #[msg("Bio must be 256 characters or less")]
    BioTooLong,
    #[msg("Caption must be 2000 characters or less")]
    CaptionTooLong,
    #[msg("Comment must be 500 characters or less")]
    CommentTooLong,
    #[msg("Profile image URI must be 200 characters or less")]
    ProfileImageUriTooLong,
    #[msg("Content URI must be 200 characters or less")]
    ContentUriTooLong,
    #[msg("Cannot follow yourself")]
    CannotFollowSelf,
    #[msg("Cannot like your own post")]
    CannotLikeOwnPost,
    #[msg("Already following this user")]
    AlreadyFollowing,
    #[msg("Not following this user")]
    NotFollowing,
    #[msg("Already liked this post")]
    AlreadyLiked,
    #[msg("Not liked this post")]
    NotLiked,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Username cannot be empty")]
    UsernameEmpty,
}
