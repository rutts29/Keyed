import { Response } from 'express';
import { Keypair } from '@solana/web3.js';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { airdropService } from '../services/airdrop.service.js';
import { addJob } from '../jobs/queues.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const airdropController = {
  async createCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const {
      name,
      description,
      type,
      tokenMint,
      amountPerRecipient,
      metadataUri,
      collectionMint,
      audienceType,
      audienceFilter,
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Campaign name is required');
    }

    if (!type || !['spl_token', 'cnft'].includes(type)) {
      throw new AppError(400, 'INVALID_INPUT', 'Type must be spl_token or cnft');
    }

    if (!audienceType || !['followers', 'tippers', 'subscribers', 'token_holders', 'custom'].includes(audienceType)) {
      throw new AppError(400, 'INVALID_INPUT', 'Invalid audience type');
    }

    if (type === 'spl_token' && !tokenMint) {
      throw new AppError(400, 'INVALID_INPUT', 'Token mint is required for SPL token airdrops');
    }

    if (type === 'spl_token' && (!amountPerRecipient || amountPerRecipient <= 0)) {
      throw new AppError(400, 'INVALID_INPUT', 'Amount per recipient must be positive');
    }

    const { data: campaign, error } = await supabase
      .from('airdrop_campaigns')
      .insert({
        creator_wallet: wallet,
        name: name.trim(),
        description: description || null,
        type,
        token_mint: tokenMint || null,
        amount_per_recipient: amountPerRecipient || null,
        metadata_uri: metadataUri || null,
        collection_mint: collectionMint || null,
        audience_type: audienceType,
        audience_filter: audienceFilter || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create airdrop campaign');
      throw new AppError(500, 'CREATE_FAILED', 'Failed to create campaign');
    }

    res.json({ success: true, data: campaign });
  },

  async getMyCampaigns(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const { data: campaigns, error } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('creator_wallet', wallet)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch campaigns');
      throw new AppError(500, 'FETCH_FAILED', 'Failed to fetch campaigns');
    }

    res.json({ success: true, data: { campaigns: campaigns || [] } });
  },

  async getReceivedDrops(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;

    const { data: drops, error } = await supabase
      .from('airdrop_recipients')
      .select('*, airdrop_campaigns(*)')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch received drops');
      throw new AppError(500, 'FETCH_FAILED', 'Failed to fetch received drops');
    }

    res.json({ success: true, data: { drops: drops || [] } });
  },

  async getCampaign(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const { data: campaign, error } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    // Get recipient breakdown
    const { data: recipients } = await supabase
      .from('airdrop_recipients')
      .select('status')
      .eq('campaign_id', id);

    const breakdown = { pending: 0, sent: 0, failed: 0 };
    for (const r of recipients || []) {
      if (r.status === 'pending') breakdown.pending++;
      else if (r.status === 'sent') breakdown.sent++;
      else if (r.status === 'failed') breakdown.failed++;
    }

    res.json({ success: true, data: { ...campaign, breakdown } });
  },

  async prepareCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const { data: campaign } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    if (campaign.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the campaign owner');
    }

    if (campaign.status !== 'draft') {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be in draft status to prepare');
    }

    // Resolve audience
    const recipientWallets = await airdropService.resolveAudience(
      wallet,
      campaign.audience_type,
      campaign.audience_filter
    );

    if (recipientWallets.length === 0) {
      throw new AppError(400, 'NO_RECIPIENTS', 'No recipients found for the selected audience');
    }

    // Insert recipients
    const recipientRows = recipientWallets.map(w => ({
      campaign_id: id,
      wallet: w,
      status: 'pending' as const,
    }));

    await supabase.from('airdrop_recipients').delete().eq('campaign_id', id);
    await supabase.from('airdrop_recipients').insert(recipientRows);

    // Update campaign recipient count
    await supabase
      .from('airdrop_campaigns')
      .update({ total_recipients: recipientWallets.length })
      .eq('id', id);

    // Calculate costs
    const totalTokensNeeded = campaign.amount_per_recipient
      ? campaign.amount_per_recipient * recipientWallets.length
      : 0;
    const estimatedFeeSOL = airdropService.estimateFees(recipientWallets.length);

    // Generate escrow keypair and build fund tx
    const escrowKeypair = Keypair.generate();
    const escrowPubkey = escrowKeypair.publicKey.toBase58();
    const escrowSecret = Buffer.from(escrowKeypair.secretKey).toString('base64');

    // Store escrow pubkey and secret for later use by the airdrop job
    await supabase
      .from('airdrop_campaigns')
      .update({ escrow_pubkey: escrowPubkey, escrow_secret: escrowSecret })
      .eq('id', id);

    let fundTransaction: string | null = null;
    if (campaign.type === 'spl_token' && campaign.token_mint) {
      const txData = await airdropService.buildFundEscrowTx(
        wallet,
        campaign.token_mint,
        totalTokensNeeded,
        escrowPubkey
      );
      fundTransaction = txData.transaction;
    }

    res.json({
      success: true,
      data: {
        recipientCount: recipientWallets.length,
        totalTokensNeeded,
        estimatedFeeSOL,
        fundTransaction,
      },
    });
  },

  async fundCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;
    const { txSignature } = req.body;

    if (!txSignature) {
      throw new AppError(400, 'INVALID_INPUT', 'Transaction signature is required');
    }

    const { data: campaign } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    if (campaign.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the campaign owner');
    }

    if (campaign.status !== 'draft') {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be in draft status to fund');
    }

    // Update campaign status to funded
    const { error } = await supabase
      .from('airdrop_campaigns')
      .update({
        status: 'funded',
        fund_tx_signature: txSignature,
      })
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to update campaign status');
      throw new AppError(500, 'UPDATE_FAILED', 'Failed to update campaign');
    }

    res.json({ success: true, data: { funded: true } });
  },

  async startCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const { data: campaign } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    if (campaign.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the campaign owner');
    }

    if (campaign.status !== 'funded') {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be funded before starting');
    }

    // Update status to processing
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'processing' })
      .eq('id', id);

    // Queue airdrop job
    await addJob('airdrop', {
      campaignId: id,
      creatorWallet: wallet,
    });

    res.json({
      success: true,
      data: { started: true, recipientCount: campaign.total_recipients },
    });
  },

  async cancelCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const { data: campaign } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    if (campaign.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the campaign owner');
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      throw new AppError(400, 'INVALID_STATUS', 'Cannot cancel a completed or already cancelled campaign');
    }

    // Update status to cancelled
    const { error } = await supabase
      .from('airdrop_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to cancel campaign');
      throw new AppError(500, 'CANCEL_FAILED', 'Failed to cancel campaign');
    }

    res.json({ success: true, data: { cancelled: true } });
  },

  async deleteCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;

    const { data: campaign } = await supabase
      .from('airdrop_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (!campaign) {
      throw new AppError(404, 'NOT_FOUND', 'Campaign not found');
    }

    if (campaign.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the campaign owner');
    }

    // Only allow deleting draft campaigns
    if (campaign.status !== 'draft') {
      throw new AppError(400, 'INVALID_STATUS', 'Only draft campaigns can be deleted');
    }

    // Delete recipients first (foreign key constraint)
    await supabase.from('airdrop_recipients').delete().eq('campaign_id', id);

    // Delete the campaign
    const { error } = await supabase
      .from('airdrop_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to delete campaign');
      throw new AppError(500, 'DELETE_FAILED', 'Failed to delete campaign');
    }

    res.json({ success: true, data: { deleted: true } });
  },
};
