use anchor_lang::prelude::*;

#[error_code]
pub enum PaymentError {
    #[msg("Insufficient funds for this operation")]
    InsufficientFunds,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Subscription is not active")]
    SubscriptionNotActive,
    #[msg("Subscription payment not yet due")]
    PaymentNotDue,
    #[msg("Cannot tip yourself")]
    CannotTipSelf,
    #[msg("Cannot subscribe to yourself")]
    CannotSubscribeToSelf,
    #[msg("Already subscribed to this creator")]
    AlreadySubscribed,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Fee basis points cannot exceed 10000 (100%)")]
    InvalidFeeBasisPoints,
    #[msg("Withdrawal amount exceeds available balance")]
    WithdrawalExceedsBalance,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Invalid creator account - does not match vault owner")]
    InvalidCreatorAccount,
}
