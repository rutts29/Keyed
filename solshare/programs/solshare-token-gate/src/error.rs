use anchor_lang::prelude::*;

#[error_code]
pub enum TokenGateError {
    #[msg("Insufficient token balance for access")]
    InsufficientTokenBalance,
    #[msg("User does not own required NFT")]
    NftNotOwned,
    #[msg("Invalid NFT collection")]
    InvalidNftCollection,
    #[msg("Access already verified")]
    AlreadyVerified,
    #[msg("Access verification expired")]
    VerificationExpired,
    #[msg("Access not verified")]
    NotVerified,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Invalid gate configuration - must specify at least one requirement")]
    InvalidGateConfig,
    #[msg("Required token mint not specified")]
    TokenMintRequired,
    #[msg("Required NFT collection not specified")]
    NftCollectionRequired,
    #[msg("Token account owner mismatch")]
    TokenAccountOwnerMismatch,
    #[msg("Token account mint mismatch")]
    TokenAccountMintMismatch,
}
