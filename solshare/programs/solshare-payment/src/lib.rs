pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t");

#[program]
pub mod solshare_payment {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, fee_basis_points: u16) -> Result<()> {
        initialize_platform::handler(ctx, fee_basis_points)
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        initialize_vault::handler(ctx)
    }

    pub fn tip_creator(ctx: Context<TipCreator>, amount: u64, post: Option<Pubkey>, tip_index: u64) -> Result<()> {
        tip_creator::handler(ctx, amount, post, tip_index)
    }

    pub fn subscribe(ctx: Context<Subscribe>, amount_per_month: u64) -> Result<()> {
        subscribe::handler(ctx, amount_per_month)
    }

    pub fn process_subscription(ctx: Context<ProcessSubscription>) -> Result<()> {
        process_subscription::handler(ctx)
    }

    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        cancel_subscription::handler(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw::handler(ctx, amount)
    }
}
