import { Connection, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";

const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "";

const connection = new Connection(rpcUrl, "confirmed");

export async function signAndSubmitTransaction(
  serializedTx: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any
): Promise<string> {
  if (!wallet?.signTransaction) {
    throw new Error("Wallet does not support signing transactions");
  }
  const txBuffer = Buffer.from(serializedTx, "base64");
  const transaction = Transaction.from(txBuffer);
  const signedTx = await wallet.signTransaction(transaction);
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
