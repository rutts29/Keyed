import { Response } from 'express';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { airdropService } from '../services/airdrop.service.js';
import { addJob } from '../jobs/queues.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// Get crank authority public key from env
function getCrankAuthority(): string {
  if (!env.AIRDROP_CRANK_PRIVATE_KEY) {
    throw new AppError(500, 'CONFIG_ERROR', 'Airdrop crank authority not configured');
  }
  // Decode base58 private key and derive public key
  const secretKey = bs58.decode(env.AIRDROP_CRANK_PRIVATE_KEY);
  const keypair = Keypair.fromSecretKey(secretKey);
  return keypair.publicKey.toBase58();
}

export const airdropController = {
  /**
   * Create a new campaign (DB only, on-chain creation happens in prepare)
   */
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

    // Validate inputs
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

    // Check if airdrop program is available
    if (!airdropService.isProgramAvailable()) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Airdrop program not available');
    }

    // Generate campaign ID for on-chain use
    const campaignIdBytes = airdropService.generateCampaignId();

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
        campaign_id_bytes: '\\x' + campaignIdBytes.toString('hex'),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create airdrop campaign');
      throw new AppError(500, 'CREATE_FAILED', 'Failed to create campaign');
    }

    res.json({ success: true, data: campaign });
  },

  /**
   * Get all campaigns for the authenticated user
   */
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

  /**
   * Get airdrops received by the authenticated user
   */
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

  /**
   * Get a single campaign by ID
   */
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

  /**
   * Update a draft campaign
   */
  async updateCampaign(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { id } = req.params;
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
      throw new AppError(400, 'INVALID_STATUS', 'Only draft campaigns can be edited');
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new AppError(400, 'INVALID_INPUT', 'Campaign name cannot be empty');
      }
      updates.name = name.trim();
    }
    if (description !== undefined) updates.description = description || null;
    if (type !== undefined) {
      if (!['spl_token', 'cnft'].includes(type)) {
        throw new AppError(400, 'INVALID_INPUT', 'Type must be spl_token or cnft');
      }
      updates.type = type;
    }
    if (tokenMint !== undefined) updates.token_mint = tokenMint || null;
    if (amountPerRecipient !== undefined) {
      if (amountPerRecipient !== null && amountPerRecipient <= 0) {
        throw new AppError(400, 'INVALID_INPUT', 'Amount per recipient must be positive');
      }
      updates.amount_per_recipient = amountPerRecipient;
    }
    if (metadataUri !== undefined) updates.metadata_uri = metadataUri || null;
    if (collectionMint !== undefined) updates.collection_mint = collectionMint || null;
    if (audienceType !== undefined) {
      if (!['followers', 'tippers', 'subscribers', 'token_holders', 'custom'].includes(audienceType)) {
        throw new AppError(400, 'INVALID_INPUT', 'Invalid audience type');
      }
      updates.audience_type = audienceType;
    }
    if (audienceFilter !== undefined) updates.audience_filter = audienceFilter || null;

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'No fields to update');
    }

    // Clear any previously prepared recipients when campaign is edited
    await supabase.from('airdrop_recipients').delete().eq('campaign_id', id);
    updates.total_recipients = 0;
    updates.campaign_pda = null; // Reset on-chain link

    const { data: updated, error } = await supabase
      .from('airdrop_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to update campaign');
      throw new AppError(500, 'UPDATE_FAILED', 'Failed to update campaign');
    }

    res.json({ success: true, data: updated });
  },

  /**
   * Prepare campaign: resolve audience, validate balance, return createCampaignTx
   */
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

    if (campaign.type === 'cnft') {
      throw new AppError(400, 'NOT_IMPLEMENTED', 'cNFT airdrops not yet implemented');
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
    const totalTokensNeeded = campaign.amount_per_recipient * recipientWallets.length;
    const estimatedFeeSOL = airdropService.estimateFees(recipientWallets.length);

    // Check creator's token balance
    let creatorBalance = 0;
    let hasSufficientBalance = true;
    if (campaign.token_mint) {
      creatorBalance = await airdropService.getTokenBalance(wallet, campaign.token_mint);
      hasSufficientBalance = creatorBalance >= totalTokensNeeded;
    }

    // Get campaign ID bytes from DB (Supabase returns bytea as '\x...' string)
    const rawBytes = campaign.campaign_id_bytes as string;
    const hexString = rawBytes.startsWith('\\x') ? rawBytes.slice(2) : rawBytes;
    const campaignIdBytes = Buffer.from(hexString, 'hex');

    // Get crank authority
    const crankAuthority = getCrankAuthority();

    // Build createCampaign transaction
    const { transaction: createCampaignTx, campaignPda, escrowAta } = await airdropService.buildCreateCampaignTx(
      wallet,
      campaignIdBytes,
      campaign.token_mint,
      campaign.amount_per_recipient,
      recipientWallets.length,
      crankAuthority
    );

    // Store campaign_pda for later verification
    await supabase
      .from('airdrop_campaigns')
      .update({ campaign_pda: campaignPda })
      .eq('id', id);

    res.json({
      success: true,
      data: {
        recipientCount: recipientWallets.length,
        totalTokensNeeded,
        estimatedFeeSOL,
        creatorBalance,
        hasSufficientBalance,
        createCampaignTx,
        campaignPda,
        escrowAta,
      },
    });
  },

  /**
   * Confirm on-chain campaign creation after user signs tx
   */
  async confirmCreate(req: AuthenticatedRequest, res: Response) {
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
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be in draft status');
    }

    if (!campaign.campaign_pda) {
      throw new AppError(400, 'NOT_PREPARED', 'Campaign must be prepared first');
    }

    // Verify on-chain campaign exists
    const onChainState = await airdropService.getCampaignState(campaign.campaign_pda);
    if (!onChainState) {
      throw new AppError(400, 'NOT_FOUND_ONCHAIN', 'Campaign not found on-chain. Transaction may have failed.');
    }

    // Update status to 'created' (on-chain campaign exists, ready for funding)
    const { error } = await supabase
      .from('airdrop_campaigns')
      .update({
        status: 'created',
        create_tx_signature: txSignature,
      })
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to update campaign status');
      throw new AppError(500, 'UPDATE_FAILED', 'Failed to update campaign');
    }

    res.json({ success: true, data: { created: true, campaignPda: campaign.campaign_pda } });
  },

  /**
   * Build fund transaction for user to sign
   */
  async buildFundTx(req: AuthenticatedRequest, res: Response) {
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

    if (campaign.status !== 'created') {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be in created status to fund');
    }

    if (!campaign.campaign_pda) {
      throw new AppError(400, 'NOT_CREATED', 'Campaign not created on-chain');
    }

    const totalAmount = campaign.amount_per_recipient * campaign.total_recipients;

    const { transaction: fundTx } = await airdropService.buildFundCampaignTx(
      wallet,
      campaign.campaign_pda,
      campaign.token_mint,
      totalAmount
    );

    res.json({
      success: true,
      data: {
        fundTx,
        totalAmount,
      },
    });
  },

  /**
   * Confirm funding after user signs tx
   */
  async confirmFund(req: AuthenticatedRequest, res: Response) {
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

    if (campaign.status !== 'created') {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign must be in created status');
    }

    // Verify on-chain campaign is funded
    const onChainState = await airdropService.getCampaignState(campaign.campaign_pda);
    if (!onChainState) {
      throw new AppError(400, 'NOT_FOUND_ONCHAIN', 'Campaign not found on-chain');
    }

    // Check if status is Funded (on-chain)
    const isFunded = 'funded' in onChainState.status;
    if (!isFunded) {
      throw new AppError(400, 'NOT_FUNDED', 'Campaign not funded on-chain. Transaction may have failed.');
    }

    // Update status to 'funded'
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

  /**
   * Start the airdrop distribution
   */
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

  /**
   * Build refund transaction for user to sign (cancel campaign)
   */
  async buildRefundTx(req: AuthenticatedRequest, res: Response) {
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

    // Can only cancel if created or funded (not processing/completed/cancelled)
    if (!['created', 'funded'].includes(campaign.status)) {
      throw new AppError(400, 'INVALID_STATUS', 'Campaign cannot be cancelled in current status');
    }

    if (!campaign.campaign_pda) {
      throw new AppError(400, 'NOT_CREATED', 'Campaign not created on-chain');
    }

    const { transaction: refundTx } = await airdropService.buildRefundTx(
      wallet,
      campaign.campaign_pda,
      campaign.token_mint
    );

    res.json({
      success: true,
      data: { refundTx },
    });
  },

  /**
   * Confirm refund/cancellation after user signs tx
   */
  async confirmCancel(req: AuthenticatedRequest, res: Response) {
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

    // Verify on-chain campaign is cancelled
    const onChainState = await airdropService.getCampaignState(campaign.campaign_pda);
    if (onChainState) {
      const isCancelled = 'cancelled' in onChainState.status;
      if (!isCancelled) {
        throw new AppError(400, 'NOT_CANCELLED', 'Campaign not cancelled on-chain. Transaction may have failed.');
      }
    }

    // Update status to 'cancelled'
    const { error } = await supabase
      .from('airdrop_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      logger.error({ error }, 'Failed to update campaign status');
      throw new AppError(500, 'UPDATE_FAILED', 'Failed to update campaign');
    }

    res.json({ success: true, data: { cancelled: true } });
  },

  /**
   * Delete a draft or cancelled campaign
   */
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

    // Only allow deleting draft or cancelled campaigns
    if (campaign.status !== 'draft' && campaign.status !== 'cancelled') {
      throw new AppError(400, 'INVALID_STATUS', 'Only draft or cancelled campaigns can be deleted. Cancel first if funded.');
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

  // ============================================================
  // DEPRECATED: Legacy endpoints for backward compatibility
  // These will be removed in next major version
  // ============================================================

  /**
   * @deprecated Use confirmFund instead
   */
  async fundCampaign(req: AuthenticatedRequest, res: Response) {
    // Redirect to new flow
    return this.confirmFund(req, res);
  },

  /**
   * @deprecated Use buildRefundTx + confirmCancel instead
   */
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

    // For legacy campaigns without on-chain state, just update DB
    if (!campaign.campaign_pda) {
      const { error } = await supabase
        .from('airdrop_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        logger.error({ error }, 'Failed to cancel campaign');
        throw new AppError(500, 'CANCEL_FAILED', 'Failed to cancel campaign');
      }

      res.json({ success: true, data: { cancelled: true } });
      return;
    }

    // For on-chain campaigns, return refund tx for user to sign
    throw new AppError(400, 'REQUIRES_SIGNATURE', 'On-chain campaigns require user signature for refund. Use /refund-tx endpoint.');
  },
};
