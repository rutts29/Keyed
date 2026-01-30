import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js"
import type { EncryptionService as EncryptionServiceType } from "privacycash/utils"

const SIGN_MESSAGE = "Privacy Money account sign in"
const KEY_BASE_PATH = "/circuit2"

// Module-level singletons (session-scoped, survive re-renders)
let encryptionService: EncryptionServiceType | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lightWasm: any = null

function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  if (!rpcUrl) throw new Error("Solana RPC URL is not configured")
  return new Connection(rpcUrl, "confirmed")
}

async function getLightWasm() {
  if (!lightWasm) {
    const { WasmFactory } = await import("@lightprotocol/hasher.rs")
    lightWasm = await WasmFactory.getInstance()
  }
  return lightWasm
}

/**
 * Initialize the privacy session by signing a message and deriving an encryption key.
 * Must be called once before any shield/withdraw/balance operations.
 */
export async function initializePrivacySession(
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<void> {
  if (encryptionService) return // Already initialized

  const { EncryptionService } = await import("privacycash/utils")
  const signature = await signMessage(new TextEncoder().encode(SIGN_MESSAGE))

  const svc = new EncryptionService()
  svc.deriveEncryptionKeyFromSignature(signature)
  encryptionService = svc

  // Pre-warm WASM
  await getLightWasm()
}

/**
 * Check if a privacy session is currently initialized.
 */
export function isSessionInitialized(): boolean {
  return encryptionService !== null
}

/**
 * Shield SOL into the privacy pool using the Privacy Cash SDK.
 * Generates ZK proof, builds VersionedTransaction, signs via wallet, relays to indexer.
 */
export async function shieldSol(params: {
  amount: number // SOL
  publicKey: PublicKey
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
}): Promise<{ tx: string }> {
  if (!encryptionService) {
    throw new Error("Privacy session not initialized. Call initializePrivacySession first.")
  }

  const { deposit } = await import("privacycash/utils")
  const wasm = await getLightWasm()
  const connection = getConnection()

  const amountLamports = Math.floor(params.amount * 1_000_000_000)

  return deposit({
    lightWasm: wasm,
    connection,
    amount_in_lamports: amountLamports,
    keyBasePath: KEY_BASE_PATH,
    publicKey: params.publicKey,
    transactionSigner: params.signTransaction,
    storage: window.localStorage,
    encryptionService,
  })
}

/**
 * Get the shielded balance by scanning and decrypting UTXOs client-side.
 */
export async function getShieldedBalance(params: {
  publicKey: PublicKey
}): Promise<{ lamports: number }> {
  if (!encryptionService) {
    throw new Error("Privacy session not initialized. Call initializePrivacySession first.")
  }

  const { getUtxos, getBalanceFromUtxos } = await import("privacycash/utils")
  const connection = getConnection()

  const utxos = await getUtxos({
    connection,
    publicKey: params.publicKey,
    encryptionService,
    storage: window.localStorage,
  })

  return getBalanceFromUtxos(utxos)
}

/**
 * Withdraw SOL from the privacy pool to a recipient address.
 */
export async function withdrawSol(params: {
  amount: number // SOL
  publicKey: PublicKey
  recipient: PublicKey
}): Promise<{ tx: string; amount_in_lamports: number; fee_in_lamports: number }> {
  if (!encryptionService) {
    throw new Error("Privacy session not initialized. Call initializePrivacySession first.")
  }

  const { withdraw } = await import("privacycash/utils")
  const wasm = await getLightWasm()
  const connection = getConnection()

  const amountLamports = Math.floor(params.amount * 1_000_000_000)

  return withdraw({
    lightWasm: wasm,
    connection,
    amount_in_lamports: amountLamports,
    keyBasePath: KEY_BASE_PATH,
    publicKey: params.publicKey,
    recipient: params.recipient,
    encryptionService,
    storage: window.localStorage,
  })
}

/**
 * Clear the privacy session (on logout or disconnect).
 */
export function clearPrivacySession(): void {
  encryptionService = null
  lightWasm = null
}
