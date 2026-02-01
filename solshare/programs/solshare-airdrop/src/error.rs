use anchor_lang::prelude::*;

#[error_code]
pub enum AirdropError {
    #[msg("Campaign is not in the expected status")]
    InvalidStatus,
    #[msg("Insufficient funds in escrow")]
    InsufficientFunds,
    #[msg("Too many recipients in a single batch")]
    BatchTooLarge,
    #[msg("Unauthorized crank authority")]
    UnauthorizedCrank,
    #[msg("Campaign already completed")]
    AlreadyCompleted,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Recipient ATA has incorrect mint")]
    InvalidRecipientMint,
}
