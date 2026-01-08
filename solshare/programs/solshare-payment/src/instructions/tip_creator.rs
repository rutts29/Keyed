use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::{PlatformConfig, CreatorVault, TipRecord};
use crate::error::PaymentError;
use crate::events::TipSent;

#[derive(Accounts)]
#[instruction(amount: u64, post: Option<Pubkey>, tip_index: u64)]
pub struct TipCreator<'info> {
    #[account(
        seeds = [b"platform_config"],
        bump = config.bump
    )]
    pub config: Account<'info, PlatformConfig>,
    
    #[account(
        mut,
        seeds = [b"vault", creator_vault.creator.as_ref()],
        bump = creator_vault.bump
    )]
    pub creator_vault: Account<'info, CreatorVault>,
    
    #[account(
        init,
        payer = tipper,
        space = 8 + TipRecord::INIT_SPACE,
        seeds = [b"tip", tipper.key().as_ref(), tip_index.to_le_bytes().as_ref()],
        bump
    )]
    pub tip_record: Account<'info, TipRecord>,
    
    #[account(mut)]
    pub tipper: Signer<'info>,
    
    /// Creator wallet to receive tip
    /// SECURITY: This MUST be validated against creator_vault.creator to prevent
    /// funds from being sent to an attacker's wallet while crediting a different vault
    #[account(
        mut,
        address = creator_vault.creator @ PaymentError::InvalidCreatorAccount
    )]
    pub creator: SystemAccount<'info>,
    
    /// CHECK: Fee recipient
    #[account(mut, address = config.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TipCreator>, amount: u64, post: Option<Pubkey>, _tip_index: u64) -> Result<()> {
    require!(amount > 0, PaymentError::InvalidAmount);
    require!(
        ctx.accounts.tipper.key() != ctx.accounts.creator_vault.creator,
        PaymentError::CannotTipSelf
    );

    let config = &ctx.accounts.config;
    let vault = &mut ctx.accounts.creator_vault;
    let tip_record = &mut ctx.accounts.tip_record;
    let clock = Clock::get()?;

    let fee = amount
        .checked_mul(config.fee_basis_points as u64)
        .ok_or(PaymentError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(PaymentError::ArithmeticOverflow)?;
    
    let creator_amount = amount.checked_sub(fee).ok_or(PaymentError::ArithmeticOverflow)?;

    // Transfer fee to platform
    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.tipper.to_account_info(),
                    to: ctx.accounts.fee_recipient.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // Transfer to creator
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.tipper.to_account_info(),
                to: ctx.accounts.creator.to_account_info(),
            },
        ),
        creator_amount,
    )?;

    // Update vault stats - tracks net amount received by creator
    vault.total_earned = vault.total_earned
        .checked_add(creator_amount)
        .ok_or(PaymentError::ArithmeticOverflow)?;

    // Record tip with net amount (after fee) for consistency with vault accounting
    // Note: The TipSent event below includes both gross amount and fee for full audit trail
    tip_record.from = ctx.accounts.tipper.key();
    tip_record.to = vault.creator;
    tip_record.amount = creator_amount;  // Store net amount to match vault.total_earned
    tip_record.post = post;
    tip_record.timestamp = clock.unix_timestamp;
    tip_record.bump = ctx.bumps.tip_record;

    emit!(TipSent {
        from: tip_record.from,
        to: tip_record.to,
        amount,
        fee,
        post,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
