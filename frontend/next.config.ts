import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from parent directory's .env file
config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  // Map env vars from root .env (without NEXT_PUBLIC_ prefix) to client-accessible vars
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENV_ID: process.env.DYNAMIC_ENV_ID || process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
  },
};

export default nextConfig;
