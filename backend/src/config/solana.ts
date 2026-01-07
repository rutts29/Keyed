import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { env } from './env.js';

export const connection = new Connection(
  env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  'confirmed'
);

export const programIds = {
  social: env.SOCIAL_PROGRAM_ID ? new PublicKey(env.SOCIAL_PROGRAM_ID) : null,
  payment: env.PAYMENT_PROGRAM_ID ? new PublicKey(env.PAYMENT_PROGRAM_ID) : null,
  tokenGate: env.TOKEN_GATE_PROGRAM_ID ? new PublicKey(env.TOKEN_GATE_PROGRAM_ID) : null,
};

export async function getRecentBlockhash() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return { blockhash, lastValidBlockHeight };
}
