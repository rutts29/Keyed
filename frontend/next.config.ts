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

  // Transpile the local SDK so Turbopack resolves it correctly
  transpilePackages: ["privacycash"],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      crypto: "crypto-browserify",
      stream: "stream-browserify",
      buffer: "buffer",
      "node:crypto": "crypto-browserify",
      "node-localstorage": { browser: "./empty-module.js" },
      // Turbopack doesn't always resolve package.json "exports" for file: deps
      "privacycash/utils": require.resolve("privacycash/utils"),
    },
  },

  // Webpack fallback (used when building with --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        path: false,
        fs: false,
        os: false,
        "node:path": false,
        "node:fs": false,
        "node:crypto": require.resolve("crypto-browserify"),
        "node-localstorage": false,
      };
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }
    return config;
  },
};

export default nextConfig;
