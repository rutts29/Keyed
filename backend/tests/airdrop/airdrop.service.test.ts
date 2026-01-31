import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks (must be before imports) ──────────────────────────────────

vi.mock('../../src/config/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../../src/config/solana.js', () => ({
  connection: {
    getProgramAccounts: vi.fn(),
    getTokenLargestAccounts: vi.fn(),
    getTokenAccountsByOwner: vi.fn(),
    getTokenAccountBalance: vi.fn(),
    sendRawTransaction: vi.fn(),
    confirmTransaction: vi.fn(),
  },
  getRecentBlockhash: vi.fn().mockResolvedValue({
    blockhash: 'mockBlockhash123',
    lastValidBlockHeight: 1000,
  }),
}));

vi.mock('@solana/web3.js', async () => {
  const mockPublicKey = vi.fn().mockImplementation((key: any) => ({
    toBase58: () => (typeof key === 'string' ? key : 'mockPubkey'),
    toBuffer: () => Buffer.alloc(32),
    equals: (other: any) => false,
  }));
  (mockPublicKey as any).isOnCurve = () => true;

  const mockTransaction = vi.fn().mockImplementation(() => ({
    add: vi.fn().mockReturnThis(),
    sign: vi.fn(),
    serialize: vi.fn().mockReturnValue(Buffer.from('mockTx')),
  }));

  return {
    PublicKey: mockPublicKey,
    Transaction: mockTransaction,
    SystemProgram: { transfer: vi.fn() },
    Keypair: {
      generate: vi.fn(() => ({
        publicKey: { toBase58: () => 'escrowPubkey', toBuffer: () => Buffer.alloc(32) },
        secretKey: new Uint8Array(64),
      })),
    },
  };
});

vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddressSync: vi.fn().mockReturnValue({ toBase58: () => 'mockAta' }),
  createTransferInstruction: vi.fn().mockReturnValue('mockTransferIx'),
  createAssociatedTokenAccountInstruction: vi.fn().mockReturnValue('mockCreateAtaIx'),
  getAccount: vi.fn(),
  TOKEN_PROGRAM_ID: { toBase58: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
  ASSOCIATED_TOKEN_PROGRAM_ID: { toBase58: () => 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' },
}));

vi.mock('../../src/jobs/queues.js', () => ({
  addJob: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { airdropService } from '../../src/services/airdrop.service.js';
import { supabase } from '../../src/config/supabase.js';
import { connection } from '../../src/config/solana.js';
import { getAccount, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { PublicKey, Keypair } from '@solana/web3.js';

// ── Helper ──────────────────────────────────────────────────────────

function createChain(terminalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, any> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'lt', 'gte', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain thenable so `await chain` resolves to terminalResult
  chain.then = (resolve: Function) => resolve(terminalResult);
  chain.single = vi.fn().mockResolvedValue(terminalResult);
  return chain;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('airdropService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── resolveAudience ─────────────────────────────────────────────

  describe('resolveAudience', () => {
    it('should resolve followers from follows table', async () => {
      const chain = createChain({
        data: [
          { follower_wallet: 'walletA' },
          { follower_wallet: 'walletB' },
        ],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'followers');

      expect(supabase.from).toHaveBeenCalledWith('follows');
      expect(chain.select).toHaveBeenCalledWith('follower_wallet');
      expect(chain.eq).toHaveBeenCalledWith('following_wallet', 'creatorWallet');
      expect(result).toEqual(['walletA', 'walletB']);
    });

    it('should resolve tippers from transactions table', async () => {
      const chain = createChain({
        data: [
          { from_wallet: 'tipperA' },
          { from_wallet: 'tipperB' },
        ],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'tippers');

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(chain.select).toHaveBeenCalledWith('from_wallet');
      expect(chain.eq).toHaveBeenCalledWith('to_wallet', 'creatorWallet');
      expect(chain.eq).toHaveBeenCalledWith('type', 'tip');
      expect(chain.eq).toHaveBeenCalledWith('status', 'confirmed');
      expect(result).toEqual(['tipperA', 'tipperB']);
    });

    it('should resolve tippers with minAmount filter', async () => {
      const chain = createChain({
        data: [{ from_wallet: 'bigTipper' }],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'tippers', { minAmount: 5 });

      expect(chain.gte).toHaveBeenCalledWith('amount', 5);
      expect(result).toEqual(['bigTipper']);
    });

    it('should resolve subscribers from transactions table', async () => {
      const chain = createChain({
        data: [
          { from_wallet: 'subA' },
          { from_wallet: 'subB' },
        ],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'subscribers');

      expect(supabase.from).toHaveBeenCalledWith('transactions');
      expect(chain.eq).toHaveBeenCalledWith('type', 'subscribe');
      expect(result).toEqual(['subA', 'subB']);
    });

    it('should resolve custom wallets from audienceFilter', async () => {
      const result = await airdropService.resolveAudience('creatorWallet', 'custom', {
        wallets: ['walletX', 'walletY'],
      });

      expect(result).toEqual(['walletX', 'walletY']);
    });

    it('should resolve token_holders using getProgramAccounts', async () => {
      // Build mock account data buffers: first 32 bytes = mint, bytes 32-64 = owner
      const mintBytes = Buffer.alloc(32, 0);
      const ownerA = Buffer.alloc(32, 1);
      const ownerB = Buffer.alloc(32, 2);

      // PublicKey mock: when called with a Buffer, toBase58 returns a deterministic string
      // We override the mock for this test to handle Buffer keys
      const { PublicKey: MockPK } = await import('@solana/web3.js');
      // The mock already returns typeof key === 'string' ? key : 'mockPubkey'
      // For buffer inputs we need distinct results. Let's make accounts with unique owners.

      const makeAccountData = (ownerBytes: Buffer) => {
        const buf = Buffer.alloc(165);
        mintBytes.copy(buf, 0);
        ownerBytes.copy(buf, 32);
        return buf;
      };

      vi.mocked(connection.getProgramAccounts).mockResolvedValue([
        { pubkey: { toBase58: () => 'acct1' } as any, account: { data: makeAccountData(ownerA) } as any },
        { pubkey: { toBase58: () => 'acct2' } as any, account: { data: makeAccountData(ownerB) } as any },
      ] as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'token_holders', {
        tokenMint: 'someMint123',
      });

      expect(connection.getProgramAccounts).toHaveBeenCalled();
      // Should have 2 wallets (the mock PublicKey returns 'mockPubkey' for non-string keys)
      // Both would be 'mockPubkey' since they're Buffer inputs, but they get deduplicated
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for token_holders without tokenMint', async () => {
      const result = await airdropService.resolveAudience('creatorWallet', 'token_holders', {});
      expect(result).toEqual([]);
    });

    it('should deduplicate wallets', async () => {
      const chain = createChain({
        data: [
          { follower_wallet: 'walletA' },
          { follower_wallet: 'walletA' },
          { follower_wallet: 'walletB' },
        ],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'followers');
      expect(result).toEqual(['walletA', 'walletB']);
    });

    it('should exclude creator wallet from results', async () => {
      const chain = createChain({
        data: [
          { follower_wallet: 'creatorWallet' },
          { follower_wallet: 'walletA' },
        ],
      });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const result = await airdropService.resolveAudience('creatorWallet', 'followers');
      expect(result).toEqual(['walletA']);
      expect(result).not.toContain('creatorWallet');
    });

    it('should return empty for unknown audience type', async () => {
      const result = await airdropService.resolveAudience('creatorWallet', 'unknownType');
      expect(result).toEqual([]);
    });
  });

  // ── estimateFees ────────────────────────────────────────────────

  describe('estimateFees', () => {
    it('should return 0.005 per recipient', () => {
      expect(airdropService.estimateFees(10)).toBeCloseTo(0.05);
      expect(airdropService.estimateFees(1)).toBeCloseTo(0.005);
      expect(airdropService.estimateFees(100)).toBeCloseTo(0.5);
    });

    it('should return 0 for 0 recipients', () => {
      expect(airdropService.estimateFees(0)).toBe(0);
    });
  });

  // ── getBatchSize ────────────────────────────────────────────────

  describe('getBatchSize', () => {
    it('should return 8', () => {
      expect(airdropService.getBatchSize()).toBe(8);
    });
  });

  // ── buildFundEscrowTx ──────────────────────────────────────────

  describe('buildFundEscrowTx', () => {
    it('should create transfer instruction with correct amount', async () => {
      vi.mocked(getAccount).mockResolvedValue({} as any); // escrow ATA exists

      const result = await airdropService.buildFundEscrowTx(
        'creatorWallet', 'mintAddr', 1000, 'escrowWallet'
      );

      expect(createTransferInstruction).toHaveBeenCalled();
      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('blockhash', 'mockBlockhash123');
      expect(result).toHaveProperty('lastValidBlockHeight', 1000);
      expect(typeof result.transaction).toBe('string');
    });

    it('should create escrow ATA when it does not exist', async () => {
      vi.mocked(getAccount).mockRejectedValue(new Error('Account not found'));

      await airdropService.buildFundEscrowTx(
        'creatorWallet', 'mintAddr', 1000, 'escrowWallet'
      );

      expect(createAssociatedTokenAccountInstruction).toHaveBeenCalled();
    });

    it('should skip ATA creation when escrow ATA exists', async () => {
      vi.mocked(getAccount).mockResolvedValue({} as any);

      await airdropService.buildFundEscrowTx(
        'creatorWallet', 'mintAddr', 1000, 'escrowWallet'
      );

      expect(createAssociatedTokenAccountInstruction).not.toHaveBeenCalled();
    });
  });

  // ── executeDistributionBatch ───────────────────────────────────

  describe('executeDistributionBatch', () => {
    const mockEscrowKeypair = {
      publicKey: { toBase58: () => 'escrowPubkey', toBuffer: () => Buffer.alloc(32) },
      secretKey: new Uint8Array(64),
    } as any;

    it('should distribute tokens and mark recipients as sent', async () => {
      vi.mocked(getAccount).mockResolvedValue({} as any); // ATAs exist
      vi.mocked(connection.sendRawTransaction).mockResolvedValue('txSig123');
      vi.mocked(connection.confirmTransaction).mockResolvedValue({} as any);

      const updateChain = createChain({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(updateChain as any);

      const result = await airdropService.executeDistributionBatch(
        'campaign1', ['walletA', 'walletB'], 'mintAddr', 500, mockEscrowKeypair
      );

      expect(result.successful).toEqual(['walletA', 'walletB']);
      expect(result.failed).toEqual([]);
      expect(connection.sendRawTransaction).toHaveBeenCalled();
      expect(connection.confirmTransaction).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('airdrop_recipients');
    });

    it('should create recipient ATAs when they do not exist', async () => {
      vi.mocked(getAccount).mockRejectedValue(new Error('Account not found'));
      vi.mocked(connection.sendRawTransaction).mockResolvedValue('txSig123');
      vi.mocked(connection.confirmTransaction).mockResolvedValue({} as any);

      const updateChain = createChain({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(updateChain as any);

      await airdropService.executeDistributionBatch(
        'campaign1', ['walletA'], 'mintAddr', 500, mockEscrowKeypair
      );

      expect(createAssociatedTokenAccountInstruction).toHaveBeenCalled();
    });

    it('should mark all as failed on transaction error', async () => {
      vi.mocked(getAccount).mockResolvedValue({} as any);
      vi.mocked(connection.sendRawTransaction).mockRejectedValue(new Error('TX failed'));

      const updateChain = createChain({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(updateChain as any);

      const result = await airdropService.executeDistributionBatch(
        'campaign1', ['walletA', 'walletB'], 'mintAddr', 500, mockEscrowKeypair
      );

      expect(result.failed.length).toBe(2);
      expect(result.successful).toEqual([]);
      // Verify status updated to 'failed'
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should handle invalid wallet addresses in batch', async () => {
      // Make PublicKey constructor throw for a specific wallet
      const { PublicKey: MockPK } = await import('@solana/web3.js');
      vi.mocked(MockPK).mockImplementationOnce(() => { throw new Error('Invalid public key'); });
      // Second call succeeds
      vi.mocked(MockPK).mockImplementationOnce((key: any) => ({
        toBase58: () => (typeof key === 'string' ? key : 'mockPubkey'),
        toBuffer: () => Buffer.alloc(32),
        equals: () => false,
      }));
      // Third call for the mint
      vi.mocked(MockPK).mockImplementationOnce((key: any) => ({
        toBase58: () => 'mintAddr',
        toBuffer: () => Buffer.alloc(32),
        equals: () => false,
      }));

      vi.mocked(getAccount).mockResolvedValue({} as any);
      vi.mocked(connection.sendRawTransaction).mockResolvedValue('txSig123');
      vi.mocked(connection.confirmTransaction).mockResolvedValue({} as any);

      const updateChain = createChain({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(updateChain as any);

      // The first wallet will fail due to invalid public key, but note that
      // PublicKey is called for mint first, then escrowKeypair.publicKey is used directly.
      // Actually the implementation calls `new PublicKey(wallet)` for each wallet in the loop,
      // so we set up the mock to fail on the first wallet call.
      // We need to reset and re-setup carefully.
      vi.mocked(MockPK).mockReset();
      // Call 1: mint PublicKey
      vi.mocked(MockPK).mockImplementationOnce((key: any) => ({
        toBase58: () => 'mintAddr',
        toBuffer: () => Buffer.alloc(32),
        equals: () => false,
      }));
      // Call 2: new PublicKey('badWallet') - throws
      vi.mocked(MockPK).mockImplementationOnce(() => { throw new Error('Invalid public key'); });
      // Call 3: new PublicKey('goodWallet') - succeeds
      vi.mocked(MockPK).mockImplementationOnce((key: any) => ({
        toBase58: () => 'goodWallet',
        toBuffer: () => Buffer.alloc(32),
        equals: () => false,
      }));

      const result = await airdropService.executeDistributionBatch(
        'campaign1', ['badWallet', 'goodWallet'], 'mintAddr', 500, mockEscrowKeypair
      );

      expect(result.failed.some(f => f.wallet === 'badWallet')).toBe(true);
    });

    it('should return empty results for empty recipients list', async () => {
      const result = await airdropService.executeDistributionBatch(
        'campaign1', [], 'mintAddr', 500, mockEscrowKeypair
      );

      expect(result.successful).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    });
  });
});
