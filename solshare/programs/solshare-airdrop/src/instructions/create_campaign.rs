use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::{CampaignState, CampaignStatus};
use crate::events::CampaignCreated;

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 16], amount_per_recipient: u64, crank_authority: Pubkey)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = CampaignState::SIZE,
        seeds = [b"campaign", creator.key().as_ref(), &campaign_id],
        bump,
    )]
    pub campaign: Account<'info, CampaignState>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = token_mint,
        associated_token::authority = campaign,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<CreateCampaign>,
    campaign_id: [u8; 16],
    amount_per_recipient: u64,
    crank_authority: Pubkey,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    campaign.creator = ctx.accounts.creator.key();
    campaign.campaign_id = campaign_id;
    campaign.token_mint = ctx.accounts.token_mint.key();
    campaign.escrow_ata = ctx.accounts.escrow_ata.key();
    campaign.amount_per_recipient = amount_per_recipient;
    campaign.total_amount = 0;
    campaign.distributed_amount = 0;
    campaign.total_recipients = 0;
    campaign.distributed_count = 0;
    campaign.status = CampaignStatus::Draft;
    campaign.crank_authority = crank_authority;
    campaign.bump = ctx.bumps.campaign;

    emit!(CampaignCreated {
        creator: campaign.creator,
        campaign_id,
        token_mint: campaign.token_mint,
        amount_per_recipient,
        crank_authority,
    });

    Ok(())
}
