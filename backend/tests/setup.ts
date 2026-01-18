import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
process.env.R2_ACCOUNT_ID = 'test';
process.env.R2_ACCESS_KEY_ID = 'test';
process.env.R2_SECRET_ACCESS_KEY = 'test';
process.env.R2_BUCKET_NAME = 'test';
process.env.R2_PUBLIC_URL = 'https://test.r2.dev';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.SOCIAL_PROGRAM_ID = 'G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L';
process.env.PAYMENT_PROGRAM_ID = 'H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t';
process.env.TOKEN_GATE_PROGRAM_ID = 'EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi';
process.env.PINATA_API_KEY = 'test';
process.env.PINATA_SECRET_KEY = 'test';
process.env.PINATA_GATEWAY_URL = 'https://gateway.pinata.cloud';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Global mock for logger to avoid console noise during tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
