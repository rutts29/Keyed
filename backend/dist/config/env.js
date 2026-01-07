"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3001'),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    UPSTASH_REDIS_URL: zod_1.z.string().min(1),
    UPSTASH_REDIS_TOKEN: zod_1.z.string().optional(),
    R2_ACCOUNT_ID: zod_1.z.string().min(1),
    R2_ACCESS_KEY_ID: zod_1.z.string().min(1),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().min(1),
    R2_BUCKET_NAME: zod_1.z.string().min(1),
    R2_PUBLIC_URL: zod_1.z.string().url(),
    SOLANA_RPC_URL: zod_1.z.string().url(),
    SOCIAL_PROGRAM_ID: zod_1.z.string().optional(),
    PAYMENT_PROGRAM_ID: zod_1.z.string().optional(),
    TOKEN_GATE_PROGRAM_ID: zod_1.z.string().optional(),
    PINATA_API_KEY: zod_1.z.string().min(1),
    PINATA_SECRET_KEY: zod_1.z.string().min(1),
    PINATA_GATEWAY_URL: zod_1.z.string().url().default('https://gateway.pinata.cloud'),
    JWT_SECRET: zod_1.z.string().min(32),
    AI_SERVICE_URL: zod_1.z.string().url(),
    FRONTEND_URL: zod_1.z.string().url(),
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
exports.env = validateEnv();
//# sourceMappingURL=env.js.map