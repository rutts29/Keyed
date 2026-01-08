/**
 * Generate a cryptographically secure random nonce for authentication challenges.
 * Uses crypto.randomBytes() instead of Math.random() for security.
 */
export declare function generateNonce(length?: number): string;
export declare function generateChallengeMessage(wallet: string, nonce: string): string;
/**
 * Compute a perceptual hash (pHash) for an image.
 * Unlike cryptographic hashes, perceptual hashes remain similar for visually similar images,
 * making them effective for detecting modified versions of blocked content.
 *
 * Falls back to SHA-256 if perceptual hashing fails (e.g., invalid image format).
 */
export declare function hashImage(buffer: Buffer): Promise<string>;
/**
 * Compute SHA-256 hash for exact duplicate detection.
 * Use this when you need to detect exact byte-for-byte duplicates.
 */
export declare function hashImageExact(buffer: Buffer): string;
export declare function extractIpfsHash(uri: string): string | null;
export declare function ipfsToGatewayUrl(ipfsUri: string, gateway: string): string;
export declare function sleep(ms: number): Promise<void>;
export declare function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
export declare function camelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
//# sourceMappingURL=helpers.d.ts.map