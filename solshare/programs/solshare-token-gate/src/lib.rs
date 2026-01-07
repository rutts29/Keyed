pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi");

#[program]
pub mod solshare_token_gate {
    use super::*;

    pub fn set_access_requirements(
        ctx: Context<SetAccessRequirements>,
        post: Pubkey,
        required_token: Option<Pubkey>,
        minimum_balance: u64,
        required_nft_collection: Option<Pubkey>,
    ) -> Result<()> {
        set_access_requirements::handler(ctx, post, required_token, minimum_balance, required_nft_collection)
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
