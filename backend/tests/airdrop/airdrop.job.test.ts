import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Job } from 'bullmq';

// ── Mocks (must be before imports) ──────────────────────────────────

vi.mock('../../src/config/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../../src/services/airdrop.service.js', () => ({
  airdropService: {
    executeDistributionBatch: vi.fn(),
    getBatchSize: vi.fn().mockReturnValue(8),
  },
}));

vi.mock('../../src/jobs/queues.js', () => ({
  addJob: vi.fn(),
}));

const mockKeypair = {
  publicKey: { toBase58: () => 'escrowPubkey123' },
  secretKey: new Uint8Array(64),
};

vi.mock('@solana/web3.js', () => ({
  Keypair: {
    generate: vi.fn(() => mockKeypair),
    fromSecretKey: vi.fn((_secret: Uint8Array) => mockKeypair),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { processAirdrop } from '../../src/jobs/airdrop.job.js';
import { supabase } from '../../src/config/supabase.js';
import { airdropService } from '../../src/services/airdrop.service.js';
import { addJob } from '../../src/jobs/queues.js';
import { Keypair } from '@solana/web3.js';

// ── Helpers ─────────────────────────────────────────────────────────

function createChain(terminalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'lt', 'gte', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.then = (resolve: Function) => resolve(terminalResult);
  return chain;
}

function createMockJob(data: { campaignId: string; creatorWallet: string }) {
  return {
    data,
    updateProgress: vi.fn(),
  } as unknown as Job<{ campaignId: string; creatorWallet: string }>;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('processAirdrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(airdropService.getBatchSize).mockReturnValue(8);
  });

  // 1. Campaign not found
  it('should return error when campaign not found', async () => {
    const campaignChain = createChain({ data: null });
    vi.mocked(supabase.from).mockReturnValue(campaignChain as any);

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result).toEqual({ success: false, error: 'Campaign not found' });
  });

  // 2. Campaign not in processing status
  it('should return error when campaign not in processing status', async () => {
    const campaignChain = createChain({
      data: { id: 'c1', status: 'draft', type: 'spl_token' },
    });
    vi.mocked(supabase.from).mockReturnValue(campaignChain as any);

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result).toEqual({ success: false, error: 'Campaign not in processing status' });
  });

  // 3. Mark completed when no pending recipients
  it('should mark completed when no pending recipients', async () => {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'airdrop_campaigns' && callCount === 0) {
        callCount++;
        return createChain({
          data: { id: 'c1', status: 'processing', type: 'spl_token' },
        }) as any;
      }
      if (table === 'airdrop_recipients') {
        return createChain({ data: [] }) as any;
      }
      // update campaign to completed
      return createChain({ data: null }) as any;
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result).toEqual({ success: true, completed: true });
  });

  // 4. Load escrow keypair from campaign.escrow_secret (Bug Fix #1)
  it('should load escrow keypair from campaign.escrow_secret', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) {
        // fetch campaign
        return createChain({ data: campaign }) as any;
      }
      if (fromCallIdx === 2) {
        // fetch recipients
        return createChain({ data: [{ wallet: 'w1' }] }) as any;
      }
      // subsequent update calls
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1'], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    expect(Keypair.fromSecretKey).toHaveBeenCalledWith(
      Buffer.from(escrowSecret, 'base64')
    );
    expect(Keypair.generate).not.toHaveBeenCalled();
  });

  // 5. Fail when escrow_secret is missing (Bug Fix #1)
  it('should fail when escrow_secret is missing', async () => {
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: null,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }] }) as any;
      return createChain({ data: null }) as any;
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    // Should not call executeDistributionBatch
    expect(airdropService.executeDistributionBatch).not.toHaveBeenCalled();
    // All should be counted as failed
    expect(result.totalFailed).toBe(1);
  });

  // 6. Process spl_token batches with correct escrow keypair
  it('should process spl_token batches with correct escrow keypair', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1', 'w2'], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    expect(airdropService.executeDistributionBatch).toHaveBeenCalledWith(
      'c1', ['w1', 'w2'], 'mint1', 100, mockKeypair
    );
  });

  // 7. Update successful/failed counts after each batch
  it('should update successful/failed counts after each batch', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    const updateChains: any[] = [];
    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      const chain = createChain({ data: null });
      updateChains.push(chain);
      return chain as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1'], failed: [{ wallet: 'w2', error: 'fail' }],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    // At least one update chain should have been called with counts
    const updateCalls = updateChains.filter(c => c.update.mock.calls.length > 0);
    expect(updateCalls.length).toBeGreaterThan(0);
    // Check the batch-level update includes the counts
    const batchUpdate = updateCalls.find(c =>
      c.update.mock.calls.some((call: any[]) =>
        call[0]?.successful_transfers !== undefined && call[0]?.failed_transfers !== undefined
      )
    );
    expect(batchUpdate).toBeDefined();
  });

  // 8. Send notification jobs for successful transfers
  it('should send notification jobs for successful transfers', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'TestCampaign',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1', 'w2'], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    expect(addJob).toHaveBeenCalledTimes(2);
    expect(addJob).toHaveBeenCalledWith('notification', expect.objectContaining({
      type: 'airdrop_received',
      targetWallet: 'w1',
      fromWallet: 'wallet1',
      campaignName: 'TestCampaign',
    }));
    expect(addJob).toHaveBeenCalledWith('notification', expect.objectContaining({
      type: 'airdrop_received',
      targetWallet: 'w2',
    }));
  });

  // 9. Report progress via job.updateProgress
  it('should report progress via job.updateProgress', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }] }) as any;
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1'], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  // 10. Set status to 'failed' when all transfers fail
  it('should set status to failed when all transfers fail', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    const updateChains: any[] = [];
    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      const chain = createChain({ data: null });
      updateChains.push(chain);
      return chain as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: [], failed: [{ wallet: 'w1', error: 'fail' }, { wallet: 'w2', error: 'fail' }],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result.status).toBe('failed');
    expect(result.totalFailed).toBe(2);
    expect(result.totalSuccessful).toBe(0);
  });

  // 11. Set status to 'completed' when some succeed
  it('should set status to completed when some succeed', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1'], failed: [{ wallet: 'w2', error: 'fail' }],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result.status).toBe('completed');
    expect(result.totalSuccessful).toBe(1);
    expect(result.totalFailed).toBe(1);
  });

  // 12. Process recipients in batches of 8
  it('should process recipients in batches of 8', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    // 10 recipients => 2 batches (8 + 2)
    const recipients = Array.from({ length: 10 }, (_, i) => ({ wallet: `w${i}` }));

    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: recipients }) as any;
      return createChain({ data: null }) as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: [], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    // Should be called twice: once with 8 wallets, once with 2
    expect(airdropService.executeDistributionBatch).toHaveBeenCalledTimes(2);
    const firstCall = vi.mocked(airdropService.executeDistributionBatch).mock.calls[0];
    const secondCall = vi.mocked(airdropService.executeDistributionBatch).mock.calls[1];
    expect(firstCall[1].length).toBe(8);
    expect(secondCall[1].length).toBe(2);
  });

  // 13. Mark CNFT recipients as failed with not-implemented message (Bug Fix #2)
  it('should mark CNFT recipients as failed with not-implemented message', async () => {
    const campaign = {
      id: 'c1', status: 'processing', type: 'cnft',
      token_mint: null, amount_per_recipient: null,
      escrow_secret: null,
      successful_transfers: 0, failed_transfers: 0, name: 'CNFT Drop',
    };

    const updateChains: any[] = [];
    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }, { wallet: 'w2' }] }) as any;
      const chain = createChain({ data: null });
      updateChains.push(chain);
      return chain as any;
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    const result = await processAirdrop(job);

    expect(result.totalFailed).toBe(2);
    expect(result.totalSuccessful).toBe(0);
    // Verify recipients were updated with the not-implemented error
    const recipientUpdates = updateChains.filter(c =>
      c.update.mock.calls.some((call: any[]) =>
        call[0]?.status === 'failed' && call[0]?.error_message?.includes('not yet implemented')
      )
    );
    expect(recipientUpdates.length).toBeGreaterThan(0);
  });

  // 14. Set completed_at timestamp on completion
  it('should set completed_at timestamp on completion', async () => {
    const escrowSecret = Buffer.from(new Uint8Array(64)).toString('base64');
    const campaign = {
      id: 'c1', status: 'processing', type: 'spl_token',
      token_mint: 'mint1', amount_per_recipient: 100,
      escrow_secret: escrowSecret,
      successful_transfers: 0, failed_transfers: 0, name: 'Test',
    };

    const updateChains: any[] = [];
    let fromCallIdx = 0;
    vi.mocked(supabase.from).mockImplementation((_table: string) => {
      fromCallIdx++;
      if (fromCallIdx === 1) return createChain({ data: campaign }) as any;
      if (fromCallIdx === 2) return createChain({ data: [{ wallet: 'w1' }] }) as any;
      const chain = createChain({ data: null });
      updateChains.push(chain);
      return chain as any;
    });

    vi.mocked(airdropService.executeDistributionBatch).mockResolvedValue({
      successful: ['w1'], failed: [],
    });

    const job = createMockJob({ campaignId: 'c1', creatorWallet: 'wallet1' });
    await processAirdrop(job);

    // The final update should include completed_at
    const finalUpdate = updateChains.find(c =>
      c.update.mock.calls.some((call: any[]) =>
        call[0]?.completed_at !== undefined && call[0]?.status !== undefined
      )
    );
    expect(finalUpdate).toBeDefined();
    const completedAtArg = finalUpdate.update.mock.calls.find(
      (call: any[]) => call[0]?.completed_at
    )[0].completed_at;
    expect(typeof completedAtArg).toBe('string');
    // Should be a valid ISO date string
    expect(new Date(completedAtArg).toISOString()).toBe(completedAtArg);
  });
});
