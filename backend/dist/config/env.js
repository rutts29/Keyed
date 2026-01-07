import { z } from 'zod';
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3001'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    UPSTASH_REDIS_URL: z.string().min(1),
    UPSTASH_REDIS_TOKEN: z.string().optional(),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_PUBLIC_URL: z.string().url(),
    SOLANA_RPC_URL: z.string().url(),
    SOCIAL_PROGRAM_ID: z.string().optional(),
    PAYMENT_PROGRAM_ID: z.string().optional(),
    TOKEN_GATE_PROGRAM_ID: z.string().optional(),
    PINATA_API_KEY: z.string().min(1),
    PINATA_SECRET_KEY: z.string().min(1),
    PINATA_GATEWAY_URL: z.string().url().default('https://gateway.pinata.cloud'),
    JWT_SECRET: z.string().min(32),
    AI_SERVICE_URL: z.string().url(),
    FRONTEND_URL: z.string().url(),
});
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.flatten().fieldErrors);
        throw new Error('Invalid environment configuration');
    }
    return result.data;
}
export const env = validateEnv();
//# sourceMappingURL=env.js.map