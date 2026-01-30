import { Connection, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { ISolana } from "@dynamic-labs/solana-core";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

const connection: Connection | null = rpcUrl ? new Connection(rpcUrl, "confirmed") : null;

export async function signAndSubmitTransaction(
  serializedTx: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any
): Promise<string> {
  if (!connection) {
    throw new Error("Solana RPC URL is not configured");
  }

  // Dynamic Labs wallet: get the Solana signer from the connector
  const signer: ISolana | undefined = await wallet?.connector?.getSigner();
  if (!signer?.signTransaction) {
    throw new Error("Wallet does not support signing transactions");
  }

  const txBuffer = Buffer.from(serializedTx, "base64");
  const transaction = Transaction.from(txBuffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signedTx = await signer.signTransaction(transaction as any);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
