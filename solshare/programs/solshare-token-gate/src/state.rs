use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GateType {
    Token,
    Nft,
    Both,
}

#[account]
#[derive(InitSpace)]
pub struct AccessControl {
    pub post: Pubkey,
    pub creator: Pubkey,
    pub required_token: Option<Pubkey>,
    pub minimum_balance: u64,
    pub required_nft_collection: Option<Pubkey>,
    pub gate_type: GateType,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AccessVerification {
    pub user: Pubkey,
    pub post: Pubkey,
    pub verified: bool,
    pub token_verified: bool,  // Tracks token verification separately
    pub nft_verified: bool,    // Tracks NFT verification separately
    pub verified_at: i64,
    pub expires_at: Option<i64>,
    pub bump: u8,
}

impl AccessControl {
    pub fn requires_token(&self) -> bool {
        matches!(self.gate_type, GateType::Token | GateType::Both)
    }

    pub fn requires_nft(&self) -> bool {
        matches!(self.gate_type, GateType::Nft | GateType::Both)
    }
}
