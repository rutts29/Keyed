use anchor_lang::prelude::*;

#[error_code]
pub enum PaymentError {
    #[msg("Tip amount must be greater than zero")]
    InvalidTipAmount,

    #[msg("Subscription amount must be greater than zero")]
    InvalidSubscriptionAmount,

    #[msg("Withdrawal amount exceeds available balance")]
    InsufficientBalance,

    #[msg("Withdrawal amount must be greater than zero")]
    InvalidWithdrawalAmount,

    #[msg("Subscription is not active")]
    SubscriptionNotActive,

    #[msg("Subscription is already active")]
    SubscriptionAlreadyActive,

    #[msg("Subscription payment is not yet due")]
    SubscriptionNotDue,

    #[msg("Cannot tip yourself")]
    CannotTipSelf,

    #[msg("Cannot subscribe to yourself")]
    CannotSubscribeToSelf,

    #[msg("Unauthorized - you are not the owner of this vault")]
    Unauthorized,

    #[msg("Invalid creator account - does not match vault owner")]
    InvalidCreatorAccount,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
