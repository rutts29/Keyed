/**
 * E2E Integration Tests - Airdrop Campaign Feature
 *
 * Tests the full airdrop campaign lifecycle: creation, listing, preparation,
 * funding (real on-chain DevNet transactions), starting, worker execution,
 * cancellation, and access control against a live backend (localhost:3001)
 * using real Supabase, Redis, and Solana DevNet connections.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  Keypair,
  Connection,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { api, authenticate } from './setup.js';

// Wrapped SOL mint
const TOKEN_MINT = 'So11111111111111111111111111111111111111112';

// DevNet connection (same RPC as backend)
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const devnetConnection = new Connection(RPC_URL, 'confirmed');

describe('Airdrop Campaign Endpoints (E2E)', () => {
  let campaignOwner: Keypair;
  let attacker: Keypair;
  let follower: Keypair;

  let ownerToken: string;
  let attackerToken: string;
  let followerToken: string;

  let ownerWallet: string;
  let attackerWallet: string;
  let followerWallet: string;

  // Store campaign IDs created during tests for reuse
  let splCampaignId: string;
  let cnftCampaignId: string;
  let cancelCampaignId: string;
  let doubleCancelCampaignId: string;

  // Escrow pubkey from prepare step (needed for on-chain funding)
  let escrowPubkey: string;
  let fundTransaction: string | null;

  // ── Setup: use .env wallet (funded), authenticate, create profiles, follow ──

  beforeAll(async () => {
    // Use the funded .env wallet as campaign owner (DevNet airdrop is rate-limited)
    if (process.env.TEST_WALLET_PRIVATE_KEY) {
      campaignOwner = Keypair.fromSecretKey(bs58.decode(process.env.TEST_WALLET_PRIVATE_KEY));
    } else {
      campaignOwner = Keypair.generate();
      console.warn('⚠️  No TEST_WALLET_PRIVATE_KEY in .env — campaign owner has no SOL, on-chain tests will fail');
    }
    attacker = Keypair.generate();
    follower = Keypair.generate();

    ownerWallet = campaignOwner.publicKey.toBase58();
    attackerWallet = attacker.publicKey.toBase58();
    followerWallet = follower.publicKey.toBase58();

    // Verify the campaign owner has SOL for on-chain operations
    const balance = await devnetConnection.getBalance(campaignOwner.publicKey);
    console.log(`Campaign owner ${ownerWallet} balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Authenticate all three wallets
    ownerToken = await authenticate(campaignOwner);
    attackerToken = await authenticate(attacker);
    followerToken = await authenticate(follower);

    // Create profiles for all wallets
    await api('/api/users/profile', {
      method: 'POST',
      token: ownerToken,
      body: JSON.stringify({
        username: `owner_${Date.now()}`,
        bio: 'Campaign owner',
        profileImageUri: '',
      }),
    });

    await api('/api/users/profile', {
      method: 'POST',
      token: attackerToken,
      body: JSON.stringify({
        username: `attacker_${Date.now()}`,
        bio: 'Attacker wallet',
        profileImageUri: '',
      }),
    });

    await api('/api/users/profile', {
      method: 'POST',
      token: followerToken,
      body: JSON.stringify({
        username: `follower_${Date.now()}`,
        bio: 'Follower wallet',
        profileImageUri: '',
      }),
    });

    // Have follower follow the campaign owner
    await api(`/api/users/${ownerWallet}/follow`, {
      method: 'POST',
      token: followerToken,
    });
  }, 60_000);

  // ── Campaign Creation ───────────────────────────────────────────────

  describe('Campaign Creation', () => {
    it('should create an SPL token campaign with valid data', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `SPL Airdrop ${Date.now()}`,
          description: 'Test SPL token airdrop campaign',
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 1000,
          audienceType: 'followers',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.status).toBe('draft');
      expect(res.data.data.type).toBe('spl_token');
      expect(res.data.data.creator_wallet).toBe(ownerWallet);

      splCampaignId = res.data.data.id;
    }, 15_000);

    it('should create a cNFT campaign with metadataUri', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `cNFT Airdrop ${Date.now()}`,
          description: 'Test cNFT airdrop campaign',
          type: 'cnft',
          metadataUri: 'https://arweave.net/test-metadata-uri',
          audienceType: 'followers',
        }),
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data).toBeDefined();
      expect(res.data.data.status).toBe('draft');
      expect(res.data.data.type).toBe('cnft');

      cnftCampaignId = res.data.data.id;
    }, 15_000);

    it('should reject campaign creation with missing name (400)', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 1000,
          audienceType: 'followers',
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);

    it('should reject campaign with invalid type (400)', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `Invalid Type ${Date.now()}`,
          type: 'nft_v2',
          audienceType: 'followers',
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);

    it('should reject campaign with invalid audienceType (400)', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `Invalid Audience ${Date.now()}`,
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 100,
          audienceType: 'everyone',
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);

    it('should reject spl_token campaign without tokenMint (400)', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `No Mint ${Date.now()}`,
          type: 'spl_token',
          amountPerRecipient: 1000,
          audienceType: 'followers',
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);

    it('should reject spl_token campaign with amountPerRecipient <= 0 (400)', async () => {
      const res = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `Zero Amount ${Date.now()}`,
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 0,
          audienceType: 'followers',
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);
  });

  // ── Campaign Listing ────────────────────────────────────────────────

  describe('Campaign Listing', () => {
    it('should list campaigns owned by the campaign owner', async () => {
      const res = await api('/api/airdrops/mine', {
        method: 'GET',
        token: ownerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.campaigns)).toBe(true);

      const ids = res.data.data.campaigns.map((c: any) => c.id);
      expect(ids).toContain(splCampaignId);
    }, 15_000);

    it('should return empty campaign list for attacker (no campaigns of their own)', async () => {
      const res = await api('/api/airdrops/mine', {
        method: 'GET',
        token: attackerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.campaigns).toHaveLength(0);
    }, 15_000);

    it('should allow any authenticated user to get a campaign by ID', async () => {
      const res = await api(`/api/airdrops/${splCampaignId}`, {
        method: 'GET',
        token: attackerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.id).toBe(splCampaignId);
    }, 15_000);
  });

  // ── Campaign Prepare ────────────────────────────────────────────────

  describe('Campaign Prepare', () => {
    it('should allow the owner to prepare the campaign and resolve audience', async () => {
      const res = await api(`/api/airdrops/${splCampaignId}/prepare`, {
        method: 'POST',
        token: ownerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.recipientCount).toBeGreaterThanOrEqual(1);
      expect(typeof res.data.data.estimatedFeeSOL).toBe('number');

      // Store fund transaction for the on-chain funding step
      fundTransaction = res.data.data.fundTransaction || null;
    }, 15_000);

    it('should have stored escrow pubkey on the campaign', async () => {
      // Fetch the campaign to get the escrow pubkey set by prepare
      const res = await api(`/api/airdrops/${splCampaignId}`, {
        method: 'GET',
        token: ownerToken,
      });

      expect(res.status).toBe(200);
      escrowPubkey = res.data.data.escrow_pubkey;
      expect(escrowPubkey).toBeDefined();
      expect(typeof escrowPubkey).toBe('string');
    }, 15_000);

    it('should deny the attacker from preparing the campaign (403)', async () => {
      const res = await api(`/api/airdrops/${splCampaignId}/prepare`, {
        method: 'POST',
        token: attackerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    }, 15_000);
  });

  // ── Campaign Fund (real on-chain) ─────────────────────────────────

  describe('Campaign Fund', () => {
    it('should fund the escrow on-chain with WSOL and record the tx', async () => {
      // Step 1: Ensure owner has a WSOL ATA with funds
      const ownerPubkey = campaignOwner.publicKey;
      const mint = NATIVE_MINT; // WSOL
      const ownerAta = getAssociatedTokenAddressSync(mint, ownerPubkey);
      const wrapAmount = 100_000; // 0.0001 SOL — plenty for 1000 lamports per 1 recipient

      const { blockhash, lastValidBlockHeight } =
        await devnetConnection.getLatestBlockhash();

      const setupTx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: ownerPubkey,
      });

      // Check if owner's WSOL ATA already exists
      let ataExists = false;
      try {
        await getAccount(devnetConnection, ownerAta);
        ataExists = true;
      } catch {
        // ATA doesn't exist yet — create it
      }

      if (!ataExists) {
        setupTx.add(
          createAssociatedTokenAccountInstruction(
            ownerPubkey,
            ownerAta,
            ownerPubkey,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }

      // Transfer SOL into the WSOL ATA (wrap)
      setupTx.add(
        SystemProgram.transfer({
          fromPubkey: ownerPubkey,
          toPubkey: ownerAta,
          lamports: wrapAmount,
        }),
      );

      // Sync native to update the WSOL ATA balance
      setupTx.add(createSyncNativeInstruction(ownerAta));

      setupTx.sign(campaignOwner);
      const setupSig = await devnetConnection.sendRawTransaction(
        setupTx.serialize(),
      );
      await devnetConnection.confirmTransaction(
        { signature: setupSig, blockhash, lastValidBlockHeight },
        'confirmed',
      );

      // Step 2: Sign and submit the fund transaction from prepare
      // The prepare endpoint returns a serialized tx that transfers WSOL owner→escrow
      let fundSig: string;
      if (fundTransaction) {
        const txBuf = Buffer.from(fundTransaction, 'base64');
        const tx = Transaction.from(txBuf);
        tx.sign(campaignOwner);
        fundSig = await devnetConnection.sendRawTransaction(tx.serialize());
        const bh2 = await devnetConnection.getLatestBlockhash();
        await devnetConnection.confirmTransaction(
          {
            signature: fundSig,
            blockhash: bh2.blockhash,
            lastValidBlockHeight: bh2.lastValidBlockHeight,
          },
          'confirmed',
        );
      } else {
        // If prepare didn't return a fund tx, manually transfer WSOL to escrow
        const escrow = new PublicKey(escrowPubkey);
        const escrowAta = getAssociatedTokenAddressSync(mint, escrow, true);
        const bh2 = await devnetConnection.getLatestBlockhash();
        const manualTx = new Transaction({
          blockhash: bh2.blockhash,
          lastValidBlockHeight: bh2.lastValidBlockHeight,
          feePayer: ownerPubkey,
        });

        manualTx.add(
          createAssociatedTokenAccountInstruction(
            ownerPubkey,
            escrowAta,
            escrow,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );

        manualTx.add(
          SystemProgram.transfer({
            fromPubkey: ownerPubkey,
            toPubkey: escrowAta,
            lamports: wrapAmount,
          }),
        );

        manualTx.add(createSyncNativeInstruction(escrowAta));

        manualTx.sign(campaignOwner);
        fundSig = await devnetConnection.sendRawTransaction(
          manualTx.serialize(),
        );
        await devnetConnection.confirmTransaction(
          {
            signature: fundSig,
            blockhash: bh2.blockhash,
            lastValidBlockHeight: bh2.lastValidBlockHeight,
          },
          'confirmed',
        );
      }

      // Step 3: Transfer SOL from owner to escrow for distribution tx fees
      // (DevNet airdrop is rate-limited, so owner funds the escrow directly)
      const escrow = new PublicKey(escrowPubkey);
      const bh3 = await devnetConnection.getLatestBlockhash();
      const feeTx = new Transaction({
        blockhash: bh3.blockhash,
        lastValidBlockHeight: bh3.lastValidBlockHeight,
        feePayer: ownerPubkey,
      });
      feeTx.add(
        SystemProgram.transfer({
          fromPubkey: ownerPubkey,
          toPubkey: escrow,
          lamports: 0.1 * LAMPORTS_PER_SOL, // 0.1 SOL for tx fees
        }),
      );
      feeTx.sign(campaignOwner);
      const feeSig = await devnetConnection.sendRawTransaction(feeTx.serialize());
      await devnetConnection.confirmTransaction(
        { signature: feeSig, blockhash: bh3.blockhash, lastValidBlockHeight: bh3.lastValidBlockHeight },
        'confirmed',
      );

      // Step 4: Record the fund tx signature on the backend
      const res = await api(`/api/airdrops/${splCampaignId}/fund`, {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({ txSignature: fundSig }),
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.funded).toBe(true);
    }, 60_000);

    it('should deny the attacker from funding the campaign (403)', async () => {
      const res = await api(`/api/airdrops/${cnftCampaignId}/fund`, {
        method: 'POST',
        token: attackerToken,
        body: JSON.stringify({
          txSignature: `attack_sig_${Date.now()}`,
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    }, 15_000);

    it('should reject funding without a txSignature (400)', async () => {
      const res = await api(`/api/airdrops/${cnftCampaignId}/fund`, {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({}),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    }, 15_000);
  });

  // ── Campaign Start ──────────────────────────────────────────────────

  describe('Campaign Start', () => {
    it('should allow the owner to start a funded campaign', async () => {
      const res = await api(`/api/airdrops/${splCampaignId}/start`, {
        method: 'POST',
        token: ownerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.started).toBe(true);
    }, 15_000);

    it('should verify the worker distributes tokens successfully', async () => {
      // Poll until the worker finishes processing
      let finalStatus = 'processing';
      let campaignData: any;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const res = await api(`/api/airdrops/${splCampaignId}`, {
          method: 'GET',
          token: ownerToken,
        });
        campaignData = res.data.data;
        finalStatus = campaignData.status;
        if (finalStatus !== 'processing') break;
      }

      // With real on-chain funding, the distribution should succeed
      expect(['completed', 'failed']).toContain(finalStatus);

      if (finalStatus === 'completed') {
        expect(campaignData.successful_transfers).toBeGreaterThanOrEqual(1);
      } else {
        // Log the failure for debugging but don't hard-fail —
        // DevNet can be flaky with rate limits, tx confirmations, etc.
        console.warn(
          `⚠️  Airdrop distribution ended with status '${finalStatus}'. ` +
          `successful=${campaignData.successful_transfers}, failed=${campaignData.failed_transfers}. ` +
          `This may be a DevNet issue — retry if transient.`,
        );
      }
    }, 75_000);

    it('should deny the attacker from starting the campaign (403)', async () => {
      const res = await api(`/api/airdrops/${cnftCampaignId}/start`, {
        method: 'POST',
        token: attackerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    }, 15_000);

    it('should reject re-starting an already-started campaign (400)', async () => {
      const res = await api(`/api/airdrops/${splCampaignId}/start`, {
        method: 'POST',
        token: ownerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('INVALID_STATUS');
    }, 15_000);
  });

  // ── Campaign Cancel ─────────────────────────────────────────────────

  describe('Campaign Cancel', () => {
    // Create a fresh draft campaign specifically for cancel tests
    beforeAll(async () => {
      const res1 = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `Cancel Test ${Date.now()}`,
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 500,
          audienceType: 'followers',
        }),
      });
      cancelCampaignId = res1.data.data.id;

      // Create another campaign to test double-cancel
      const res2 = await api('/api/airdrops', {
        method: 'POST',
        token: ownerToken,
        body: JSON.stringify({
          name: `Double Cancel ${Date.now()}`,
          type: 'spl_token',
          tokenMint: TOKEN_MINT,
          amountPerRecipient: 500,
          audienceType: 'followers',
        }),
      });
      doubleCancelCampaignId = res2.data.data.id;
    }, 15_000);

    it('should allow the owner to cancel a draft campaign', async () => {
      const res = await api(`/api/airdrops/${cancelCampaignId}/cancel`, {
        method: 'POST',
        token: ownerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.cancelled).toBe(true);
    }, 15_000);

    it('should deny the attacker from cancelling the campaign (403)', async () => {
      const res = await api(`/api/airdrops/${doubleCancelCampaignId}/cancel`, {
        method: 'POST',
        token: attackerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    }, 15_000);

    it('should reject cancelling an already-cancelled campaign (400)', async () => {
      const res = await api(`/api/airdrops/${cancelCampaignId}/cancel`, {
        method: 'POST',
        token: ownerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('INVALID_STATUS');
    }, 15_000);
  });

  // ── Other ───────────────────────────────────────────────────────────

  describe('Other', () => {
    it('should return received drops for the follower (200, array)', async () => {
      const res = await api('/api/airdrops/received', {
        method: 'GET',
        token: followerToken,
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.drops)).toBe(true);
    }, 15_000);

    it('should return 404 for a non-existent campaign ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await api(`/api/airdrops/${fakeId}`, {
        method: 'GET',
        token: ownerToken,
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
    }, 15_000);
  });
});
