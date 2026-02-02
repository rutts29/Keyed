/**
 * 10 deterministic test wallets for integration E2E tests.
 * Uses fixed seeds so wallet addresses are reproducible across runs.
 */
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

// Generate deterministic keypairs from fixed seeds
function keypairFromSeed(seedPhrase: string): Keypair {
  const encoder = new TextEncoder();
  const seedBytes = encoder.encode(seedPhrase.padEnd(32, "\0").slice(0, 32));
  return Keypair.fromSeed(seedBytes);
}

export const WALLETS = {
  creatorAlpha: keypairFromSeed("keyed-test-creator-alpha-seed01"),
  creatorBeta: keypairFromSeed("keyed-test-creator-beta--seed02"),
  fanA: keypairFromSeed("keyed-test-fan-a-----------seed03"),
  fanB: keypairFromSeed("keyed-test-fan-b-----------seed04"),
  fanC: keypairFromSeed("keyed-test-fan-c-----------seed05"),
  lurker: keypairFromSeed("keyed-test-lurker----------seed06"),
  newUser: keypairFromSeed("keyed-test-new-user--------seed07"),
  spammer: keypairFromSeed("keyed-test-spammer---------seed08"),
} as const;

// W9 = unregistered — just an address, never authenticates
export const UNREGISTERED_WALLET = keypairFromSeed(
  "keyed-test-unregistered----seed09"
).publicKey.toBase58();

// Convenience: get address string
export function addr(name: keyof typeof WALLETS): string {
  return WALLETS[name].publicKey.toBase58();
}

/**
 * Sign a challenge message with a keypair.
 * Returns the signature as a base58 string (matching backend's bs58.decode expectation).
 */
export function signMessage(keypair: Keypair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

// Wallet metadata for profile creation
export const PROFILES: Record<
  keyof typeof WALLETS,
  { username: string; bio: string; subscriptionPrice?: number }
> = {
  creatorAlpha: {
    username: "alpha_creator",
    bio: "Digital artist & NFT creator",
    subscriptionPrice: 2.5,
  },
  creatorBeta: {
    username: "beta_creator",
    bio: "Music producer on Solana",
    subscriptionPrice: 1.0,
  },
  fanA: { username: "fan_alice", bio: "Art collector" },
  fanB: { username: "fan_bob", bio: "NFT enthusiast" },
  fanC: { username: "fan_charlie", bio: "Crypto native" },
  lurker: { username: "quiet_dan", bio: "Just browsing" },
  newUser: { username: "new_eve", bio: "New to Keyed" },
  spammer: { username: "test_spam", bio: "Testing edge cases" },
};
