use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::state::{CampaignState, CampaignStatus};
use crate::error::AirdropError;
use crate::events::CampaignRefunded;

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator,
        constraint = campaign.status != CampaignStatus::Completed @ AirdropError::AlreadyCompleted,
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

pub fn handler(ctx: Context<Refund>) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    let refund_amount = ctx.accounts.escrow_ata.amount;

    if refund_amount > 0 {
        let creator = campaign.creator;
        let campaign_id = campaign.campaign_id;
        let bump = campaign.bump;
        let seeds = &[
            b"campaign".as_ref(),
            creator.as_ref(),
            campaign_id.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer remaining tokens back to creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_ata.to_account_info(),
            to: ctx.accounts.creator_ata.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, refund_amount)?;

        // Close escrow ATA
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_ata.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            close_accounts,
            signer_seeds,
        );
        token::close_account(close_ctx)?;
    }

    let campaign = &mut ctx.accounts.campaign;
    campaign.status = CampaignStatus::Cancelled;

    emit!(CampaignRefunded {
        creator: campaign.creator,
        campaign_id: campaign.campaign_id,
        refund_amount,
    });

    Ok(())
}
