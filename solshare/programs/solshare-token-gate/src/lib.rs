pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("EeK73A5QDEmBCGVntKgRNYEtPRbKCkHAi2yfBLuMTQAz");

#[program]
pub mod solshare_token_gate {
    use super::*;

    pub fn set_access_requirements(
        ctx: Context<SetAccessRequirements>,
        post: Pubkey,
        required_token: Option<Pubkey>,
        minimum_balance: u64,
        required_nft_collection: Option<Pubkey>,
        post_index: u64,
    ) -> Result<()> {
        set_access_requirements::handler(ctx, post, required_token, minimum_balance, required_nft_collection, post_index)
    }

    pub fn verify_token_access(ctx: Context<VerifyTokenAccess>) -> Result<()> {
        verify_token_access::handler(ctx)
    }

    pub fn verify_nft_access(ctx: Context<VerifyNftAccess>) -> Result<()> {
        verify_nft_access::handler(ctx)
    }

    pub fn check_access(ctx: Context<CheckAccess>) -> Result<bool> {
        check_access::handler(ctx)
    }
}
