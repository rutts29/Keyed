use anchor_lang::prelude::*;

#[event]
pub struct AccessControlCreated {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub required_token: Option<Pubkey>,
    pub minimum_balance: u64,
    pub required_nft_collection: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct AccessControlUpdated {
    pub post: Pubkey,
    pub required_token: Option<Pubkey>,
    pub minimum_balance: u64,
    pub required_nft_collection: Option<Pubkey>,
    pub timestamp: i64,
}

#[event]
pub struct AccessVerified {
    pub user: Pubkey,
    pub post: Pubkey,
    pub verification_type: String,
    pub timestamp: i64,
}

#[event]
pub struct AccessRevoked {
    pub user: Pubkey,
    pub post: Pubkey,
    pub timestamp: i64,
}
