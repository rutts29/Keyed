use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{CampaignState, CampaignStatus};
use crate::error::AirdropError;
use crate::events::CampaignFunded;

#[derive(Accounts)]
pub struct FundCampaign<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator,
        constraint = campaign.status == CampaignStatus::Draft @ AirdropError::InvalidStatus,
    )]
    pub campaign: Account<'info, CampaignState>,

    #[account(
        mut,
        constraint = creator_ata.mint == campaign.token_mint,
        constraint = creator_ata.owner == creator.key(),
    )]
    pub creator_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = escrow_ata.key() == campaign.escrow_ata,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FundCampaign>, amount: u64) -> Result<()> {
    // Transfer tokens from creator to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.creator_ata.to_account_info(),
        to: ctx.accounts.escrow_ata.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let campaign = &mut ctx.accounts.campaign;
    campaign.total_amount = campaign
        .total_amount
        .checked_add(amount)
        .ok_or(AirdropError::Overflow)?;
    campaign.status = CampaignStatus::Funded;

    emit!(CampaignFunded {
        creator: campaign.creator,
        campaign_id: campaign.campaign_id,
        amount,
    });

    Ok(())
}
