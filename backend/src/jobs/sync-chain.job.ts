import { Job } from 'bullmq';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

interface SyncChainData {
  type: 'transaction' | 'profile' | 'post';
  signature?: string;
  wallet?: string;
  postId?: string;
}

export async function processSyncChain(job: Job<SyncChainData>) {
  const { type, signature, wallet, postId } = job.data;

  logger.info({ type, signature, wallet, postId }, 'Syncing on-chain data');

  // Only transaction sync is currently implemented.
  // Profile and post sync are no-ops until Solana programs are deployed.
  if (type === 'transaction' && signature) {
    await supabase
      .from('transactions')
      .update({ status: 'confirmed' })
      .eq('signature', signature);
  }

  return { success: true, type };
}
