import 'dotenv/config';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

// Configuration
export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  solanaRpc: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
};

// Test wallet setup
let testWallet: Keypair;

if (process.env.TEST_WALLET_PRIVATE_KEY) {
  const secretKey = bs58.decode(process.env.TEST_WALLET_PRIVATE_KEY);
  testWallet = Keypair.fromSecretKey(secretKey);
} else {
  // Generate a random wallet for testing
  testWallet = Keypair.generate();
  console.log('⚠️  Generated random test wallet:', testWallet.publicKey.toBase58());
  console.log('   To use a persistent wallet, set TEST_WALLET_PRIVATE_KEY in .env');
}

export const wallet = testWallet;
export const connection = new Connection(config.solanaRpc, 'confirmed');

// Store auth token
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// API helpers
export async function api(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${config.backendUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function apiFormData(
  endpoint: string,
  formData: FormData
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${config.backendUrl}${endpoint}`;
  const headers: Record<string, string> = {};

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

// Sign message with wallet
export function signMessage(message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, wallet.secretKey);
  return bs58.encode(signature);
}

// Test result helpers
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

export function test(name: string, fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, duration: Date.now() - start });
      console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
      console.log(`  ❌ ${name}: ${errorMsg}`);
    }
  };
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEq<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

export async function runTests(suiteName: string, tests: (() => Promise<void>)[]) {
  console.log(`\n📋 ${suiteName}`);
  console.log('─'.repeat(50));

  for (const t of tests) {
    await t();
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('─'.repeat(50));
  console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);

  return { passed, failed, results };
}

export function clearResults() {
  results.length = 0;
}
