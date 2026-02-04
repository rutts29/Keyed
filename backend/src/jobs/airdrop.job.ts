import { Job } from 'bullmq';
import { Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { supabase } from '../config/supabase.js';
import { connection } from '../config/solana.js';
import { airdropService } from '../services/airdrop.service.js';
import { addJob } from './queues.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

interface AirdropJobData {
  campaignId: string;
  creatorWallet: string;
}

/**
 * Load the crank authority keypair from environment
 * This keypair is authorized to sign distribute_batch transactions
 */
function getCrankKeypair(): Keypair {
  if (!env.AIRDROP_CRANK_PRIVATE_KEY) {
    throw new Error('AIRDROP_CRANK_PRIVATE_KEY not configured');
  }
  const secretKey = bs58.decode(env.AIRDROP_CRANK_PRIVATE_KEY);
  return Keypair.fromSecretKey(secretKey);
}

export async function processAirdrop(job: Job<AirdropJobData>) {
  const { campaignId, creatorWallet } = job.data;

  logger.info({ campaignId }, 'Processing airdrop campaign');

  // Check if airdrop program is available
  if (!airdropService.isProgramAvailable()) {
    logger.error({ campaignId }, 'Airdrop program not available');
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);
    return { success: false, error: 'Airdrop program not available' };
  }

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

  // Verify campaign has on-chain PDA (new flow)
  if (!campaign.campaign_pda) {
    logger.error({ campaignId }, 'Campaign missing on-chain PDA - using legacy flow');
    return await processAirdropLegacy(job, campaign, creatorWallet);
  }

  // Get crank keypair
  let crankKeypair: Keypair;
  try {
    crankKeypair = getCrankKeypair();
  } catch (error) {
    logger.error({ campaignId, error }, 'Failed to load crank keypair');
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);
    return { success: false, error: 'Crank authority not configured' };
  }

  // Verify on-chain campaign state
  const onChainState = await airdropService.getCampaignState(campaign.campaign_pda);
  if (!onChainState) {
    logger.error({ campaignId, pda: campaign.campaign_pda }, 'On-chain campaign not found');
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);
    return { success: false, error: 'On-chain campaign not found' };
  }

  // Verify on-chain status is funded or processing
  const statusKey = Object.keys(onChainState.status)[0];
  if (statusKey !== 'funded' && statusKey !== 'processing') {
    logger.error({ campaignId, onChainStatus: statusKey }, 'On-chain campaign not in distributable status');
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);
    return { success: false, error: `On-chain status is ${statusKey}, expected funded or processing` };
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

  // Process in batches using program's distribute_batch
  for (let i = 0; i < pendingRecipients.length; i += batchSize) {
    const batch = pendingRecipients.slice(i, i + batchSize).map(r => r.wallet);

    try {
      // Build distribute transaction
      const { transaction: txBase64 } = await airdropService.buildDistributeBatchTx(
        crankKeypair.publicKey.toBase58(),
        campaign.campaign_pda,
        campaign.token_mint,
        batch
      );

      // Deserialize, sign, and send
      const txBuffer = Buffer.from(txBase64, 'base64');
      const tx = Transaction.from(txBuffer);
      tx.sign(crankKeypair);

      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      logger.info({ campaignId, signature, batchSize: batch.length }, 'Batch distribution successful');

      // Update recipient statuses
      for (const wallet of batch) {
        await supabase
          .from('airdrop_recipients')
          .update({ status: 'sent', tx_signature: signature })
          .eq('campaign_id', campaignId)
          .eq('wallet', wallet);

        // Send notification
        await addJob('notification', {
          type: 'airdrop_received',
          targetWallet: wallet,
          fromWallet: creatorWallet,
          campaignName: campaign.name,
          airdropType: campaign.type,
        });
      }

      totalSuccessful += batch.length;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ campaignId, error: errMsg, batch }, 'Batch distribution failed');

      // Mark batch as failed
      for (const wallet of batch) {
        await supabase
          .from('airdrop_recipients')
          .update({ status: 'failed', error_message: errMsg })
          .eq('campaign_id', campaignId)
          .eq('wallet', wallet);
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

/**
 * Legacy processing for campaigns created before program integration
 * Uses raw escrow keypair stored in database (deprecated)
 */
async function processAirdropLegacy(
  job: Job<AirdropJobData>,
  campaign: Record<string, unknown>,
  creatorWallet: string
) {
  const campaignId = campaign.id as string;
  logger.warn({ campaignId }, 'Using legacy airdrop processing (deprecated)');

  // Fetch pending recipients
  const { data: pendingRecipients } = await supabase
    .from('airdrop_recipients')
    .select('wallet')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  if (!pendingRecipients || pendingRecipients.length === 0) {
    await supabase
      .from('airdrop_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);

    logger.info({ campaignId }, 'Legacy airdrop completed - no pending recipients');
    return { success: true, completed: true };
  }

  const batchSize = airdropService.getBatchSize();
  let totalSuccessful = (campaign.successful_transfers as number) || 0;
  let totalFailed = (campaign.failed_transfers as number) || 0;

  for (let i = 0; i < pendingRecipients.length; i += batchSize) {
    const batch = pendingRecipients.slice(i, i + batchSize).map(r => r.wallet);

    if (campaign.type === 'spl_token' && campaign.token_mint && campaign.amount_per_recipient) {
      if (!campaign.escrow_secret) {
        logger.error({ campaignId }, 'Legacy campaign missing escrow secret key');
        await supabase.from('airdrop_recipients')
          .update({ status: 'failed', error_message: 'Missing escrow secret key' })
          .eq('campaign_id', campaignId).eq('status', 'pending');
        totalFailed += batch.length;
        continue;
      }

      const escrowKeypair = Keypair.fromSecretKey(
        Buffer.from(campaign.escrow_secret as string, 'base64')
      );

      const result = await airdropService.executeDistributionBatch(
        campaignId,
        batch,
        campaign.token_mint as string,
        campaign.amount_per_recipient as number,
        escrowKeypair
      );

      totalSuccessful += result.successful.length;
      totalFailed += result.failed.length;

      for (const wallet of result.successful) {
        await addJob('notification', {
          type: 'airdrop_received',
          targetWallet: wallet,
          fromWallet: creatorWallet,
          campaignName: campaign.name as string,
          airdropType: campaign.type as string,
        });
      }
    } else if (campaign.type === 'cnft') {
      for (const wallet of batch) {
        await supabase.from('airdrop_recipients')
          .update({ status: 'failed', error_message: 'CNFT distribution not yet implemented' })
          .eq('campaign_id', campaignId).eq('wallet', wallet);
      }
      totalFailed += batch.length;
    }

    await supabase
      .from('airdrop_campaigns')
      .update({
        successful_transfers: totalSuccessful,
        failed_transfers: totalFailed,
      })
      .eq('id', campaignId);

    await job.updateProgress(
      Math.round(((i + batch.length) / pendingRecipients.length) * 100)
    );
  }

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
    'Legacy airdrop processing finished'
  );

  return { success: true, totalSuccessful, totalFailed, status: finalStatus };
}
