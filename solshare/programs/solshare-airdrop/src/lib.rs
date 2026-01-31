pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("AirD1111111111111111111111111111111111111111");

#[program]
pub mod solshare_airdrop {
    use super::*;

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: [u8; 16],
        amount_per_recipient: u64,
        crank_authority: Pubkey,
    ) -> Result<()> {
        create_campaign::handler(ctx, campaign_id, amount_per_recipient, crank_authority)
    }

    pub fn fund_campaign(ctx: Context<FundCampaign>, amount: u64) -> Result<()> {
        fund_campaign::handler(ctx, amount)
    }

    pub fn distribute_batch<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeBatch<'info>>,
        recipient_count: u32,
    ) -> Result<()> {
        distribute_batch::handler(ctx, recipient_count)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        refund::handler(ctx)
    }
}
