/**
 * E2E Test Setup
 *
 * Uses REAL connections to all services EXCEPT AI/Gemini moderation.
 * Only the AI moderation service is mocked (two scenarios: pass and fail).
 */
import { config } from 'dotenv';
import { resolve } from 'path';
// Load root .env BEFORE anything else reads process.env
config({ path: resolve(__dirname, '../../../.env') });

import { vi, beforeAll, afterAll } from 'vitest';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { ModerationResult } from '../../src/types/index.js';

// ─── Environment Setup (uses REAL env vars from .env) ───
// Do NOT override env vars - we use real connections for E2E

// ─── Shared Test State ───
export let testWalletA: Keypair;
export let testWalletB: Keypair;
export let connection: Connection;
export let authTokenA: string;
export let authTokenB: string;

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ─── Gemini Mock Scenarios ───

export const GEMINI_PASS_RESULT: ModerationResult = {
  verdict: 'allow',
  scores: {
    nsfw: 0.01,
    violence: 0.0,
    hate: 0.0,
    childSafety: 0.0,
    spam: 0.05,
    drugsWeapons: 0.0,
  },
  maxScore: 0.05,
  explanation: 'Content is safe for the platform.',
  processingTimeMs: 150,
};

export const GEMINI_FAIL_RESULT: ModerationResult = {
  verdict: 'block',
  scores: {
    nsfw: 0.95,
    violence: 0.0,
    hate: 0.0,
    childSafety: 0.0,
    spam: 0.0,
    drugsWeapons: 0.0,
  },
  maxScore: 0.95,
  blockedCategory: 'nsfw',
  explanation: 'Content contains explicit material and violates platform guidelines.',
  processingTimeMs: 200,
};

export const HASH_CHECK_CLEAN = { knownBad: false };

// ─── API Helper ───

export async function api(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function apiFormData(
  endpoint: string,
  formData: FormData,
  token?: string,
): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// ─── Wallet Helpers ───

export function signMessage(message: string, wallet: Keypair): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, wallet.secretKey);
  return bs58.encode(signature);
}

export async function authenticate(wallet: Keypair): Promise<string> {
  const challengeRes = await api('/api/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
  });

  if (!challengeRes.ok) {
    throw new Error(`Challenge failed: ${JSON.stringify(challengeRes.data)}`);
  }

  const signature = signMessage(challengeRes.data.data.message, wallet);

  const verifyRes = await api('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      wallet: wallet.publicKey.toBase58(),
      signature,
    }),
  });

  if (!verifyRes.ok) {
    throw new Error(`Verify failed: ${JSON.stringify(verifyRes.data)}`);
  }

  return verifyRes.data.data.token;
}

export async function requestAirdrop(wallet: Keypair, solAmount = 2): Promise<void> {
  const conn = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );
  try {
    const sig = await conn.requestAirdrop(
      wallet.publicKey,
      solAmount * LAMPORTS_PER_SOL
    );
    await conn.confirmTransaction(sig, 'confirmed');
  } catch (err) {
    // Airdrop may fail due to rate limits; continue if wallet already has balance
    const balance = await conn.getBalance(wallet.publicKey);
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.warn(`Airdrop failed and wallet has low balance (${balance / LAMPORTS_PER_SOL} SOL). Some tests may fail.`);
    }
  }
}

// ─── Test Image Helpers ───

/** Minimal valid 1x1 red PNG (67 bytes) */
export function createTestPNG(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe,
    0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

/** Create a slightly different PNG for second-upload tests */
export function createTestPNG2(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe,
    0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

// ─── Global Setup ───

beforeAll(async () => {
  // Use a real funded wallet from env if available, otherwise generate fresh
  if (process.env.TEST_WALLET_PRIVATE_KEY) {
    try {
      const secretKey = bs58.decode(process.env.TEST_WALLET_PRIVATE_KEY);
      testWalletA = Keypair.fromSecretKey(secretKey);
      console.log(`Test Wallet A (from env): ${testWalletA.publicKey.toBase58()}`);
    } catch {
      console.warn('Invalid TEST_WALLET_PRIVATE_KEY, generating random keypair');
      testWalletA = Keypair.generate();
    }
  } else {
    testWalletA = Keypair.generate();
    console.log(`Test Wallet A (random): ${testWalletA.publicKey.toBase58()}`);
  }

  testWalletB = Keypair.generate();
  connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  console.log(`Test Wallet B (random): ${testWalletB.publicKey.toBase58()}`);
}, 30000);
