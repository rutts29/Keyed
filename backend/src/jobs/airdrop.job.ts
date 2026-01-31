import { Job } from 'bullmq';
import { Keypair } from '@solana/web3.js';
import { supabase } from '../config/supabase.js';
import { airdropService } from '../services/airdrop.service.js';
import { addJob } from './queues.js';
import { logger } from '../utils/logger.js';

interface AirdropJobData {
  campaignId: string;
  creatorWallet: string;
}

export async function processAirdrop(job: Job<AirdropJobData>) {
  const { campaignId, creatorWallet } = job.data;

  logger.info({ campaignId }, 'Processing airdrop campaign');

  // Fetch campaign
  const { data: campaign } = await supabase
    .from('airdrop_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    logger.error({ campaignId }, 'Campaign not found');
    return { success: false, error: 'Campaign not found' };
  }

  if (campaign.status !== 'processing') {
    logger.warn({ campaignId, status: campaign.status }, 'Campaign not in processing status');
    return { success: false, error: 'Campaign not in processing status' };
  }

  // Fetch pending recipients
  const { data: pendingRecipients } = await supabase
    .from('airdrop_recipients')
    .select('wallet')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (!pendingRecipients || pendingRecipients.length === 0) {
    // All recipients processed
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);

    logger.info({ campaignId }, 'Airdrop campaign completed - no pending recipients');
    return { success: true, completed: true };
  }

  const batchSize = airdropService.getBatchSize();
  let totalSuccessful = campaign.successful_transfers || 0;
  let totalFailed = campaign.failed_transfers || 0;

  // Process in batches
  for (let i = 0; i < pendingRecipients.length; i += batchSize) {
    const batch = pendingRecipients.slice(i, i + batchSize).map(r => r.wallet);

    if (campaign.type === 'spl_token' && campaign.token_mint && campaign.amount_per_recipient) {
      // For SPL token distribution, we need the escrow keypair
      // In production, this would be loaded from secure storage
      // For now, we'll use a placeholder that would be replaced with proper key management
      if (!campaign.escrow_secret) {
        logger.error({ campaignId }, 'Campaign missing escrow secret key');
        // Mark all pending as failed
        await supabase.from('airdrop_recipients')
          .update({ status: 'failed', error_message: 'Missing escrow secret key' })
          .eq('campaign_id', campaignId).eq('status', 'pending');
        totalFailed += batch.length;
        continue;
      }
      const escrowKeypair = Keypair.fromSecretKey(
        Buffer.from(campaign.escrow_secret, 'base64')
      );

      const result = await airdropService.executeDistributionBatch(
        campaignId,
        batch,
        campaign.token_mint,
        campaign.amount_per_recipient,
        escrowKeypair
      );

      totalSuccessful += result.successful.length;
      totalFailed += result.failed.length;

      // Send notifications for successful transfers
      for (const wallet of result.successful) {
        await addJob('notification', {
          type: 'airdrop_received',
          targetWallet: wallet,
          fromWallet: creatorWallet,
          campaignName: campaign.name,
          airdropType: campaign.type,
        });
      }
    } else if (campaign.type === 'cnft') {
      // CNFT distribution not yet implemented — mark recipients as failed
      for (const wallet of batch) {
        await supabase.from('airdrop_recipients')
          .update({ status: 'failed', error_message: 'CNFT distribution not yet implemented' })
          .eq('campaign_id', campaignId).eq('wallet', wallet);
      }
      totalFailed += batch.length;
    }

    // Update campaign counts
    await supabase
      .from('airdrop_campaigns')
      .update({
        successful_transfers: totalSuccessful,
        failed_transfers: totalFailed,
      })
      .eq('id', campaignId);

    // Report progress
    await job.updateProgress(
      Math.round(((i + batch.length) / pendingRecipients.length) * 100)
    );
  }

  // Final status update
  const finalStatus = totalFailed > 0 && totalSuccessful === 0 ? 'failed' : 'completed';
  await supabase
    .from('airdrop_campaigns')
    .update({
      status: finalStatus,
      successful_transfers: totalSuccessful,
      failed_transfers: totalFailed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  logger.info(
    { campaignId, totalSuccessful, totalFailed, status: finalStatus },
    'Airdrop campaign processing finished'
  );

  return { success: true, totalSuccessful, totalFailed, status: finalStatus };
}
