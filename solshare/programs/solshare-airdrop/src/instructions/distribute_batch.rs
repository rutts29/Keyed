use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{CampaignState, CampaignStatus};
use crate::error::AirdropError;
use crate::events::BatchDistributed;

#[derive(Accounts)]
pub struct DistributeBatch<'info> {
    #[account(mut)]
    pub crank_authority: Signer<'info>,

    #[account(
        mut,
        constraint = campaign.crank_authority == crank_authority.key() @ AirdropError::UnauthorizedCrank,
        constraint = campaign.status == CampaignStatus::Funded || campaign.status == CampaignStatus::Processing @ AirdropError::InvalidStatus,
    )]
    pub campaign: Account<'info, CampaignState>,

    #[account(
        mut,
        constraint = escrow_ata.key() == campaign.escrow_ata,
    )]
    pub escrow_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    // Remaining accounts: pairs of (recipient_ata: TokenAccount) for each recipient
}

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, DistributeBatch<'info>>,
    recipient_count: u32,
) -> Result<()> {
    let campaign = &ctx.accounts.campaign;
    let amount_per = campaign.amount_per_recipient;

    let total_needed = (amount_per as u128)
        .checked_mul(recipient_count as u128)
        .ok_or(AirdropError::Overflow)?;

    let remaining = campaign
        .total_amount
        .checked_sub(campaign.distributed_amount)
        .ok_or(AirdropError::InsufficientFunds)?;

    require!(remaining as u128 >= total_needed, AirdropError::InsufficientFunds);
    require!(recipient_count as usize <= ctx.remaining_accounts.len(), AirdropError::BatchTooLarge);

    // PDA signer seeds
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

    let mut distributed_this_batch: u64 = 0;

    for i in 0..recipient_count as usize {
        let recipient_ata_info = &ctx.remaining_accounts[i];

        // Validate recipient ATA has correct mint
        let recipient_ata_data = TokenAccount::try_deserialize(
            &mut &recipient_ata_info.data.borrow()[..]
        ).map_err(|_| AirdropError::InvalidRecipientMint)?;
        require!(
            recipient_ata_data.mint == campaign.token_mint,
            AirdropError::InvalidRecipientMint
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_ata.to_account_info(),
            to: recipient_ata_info.to_account_info(),
            authority: ctx.accounts.campaign.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount_per)?;

        distributed_this_batch = distributed_this_batch
            .checked_add(amount_per)
            .ok_or(AirdropError::Overflow)?;
    }

    let campaign = &mut ctx.accounts.campaign;
    campaign.distributed_amount = campaign
        .distributed_amount
        .checked_add(distributed_this_batch)
        .ok_or(AirdropError::Overflow)?;
    campaign.distributed_count = campaign
        .distributed_count
        .checked_add(recipient_count)
        .ok_or(AirdropError::Overflow)?;
    campaign.status = CampaignStatus::Processing;

    // Check if all recipients have been distributed to
    if campaign.distributed_count >= campaign.total_recipients && campaign.total_recipients > 0 {
        campaign.status = CampaignStatus::Completed;
    }

    emit!(BatchDistributed {
        campaign_id: campaign.campaign_id,
        recipient_count,
        total_distributed: campaign.distributed_amount,
    });

    Ok(())
}
