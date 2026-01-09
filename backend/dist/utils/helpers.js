import { createHash, randomBytes } from 'crypto';
import * as imageHash from 'imghash';
import { logger } from './logger.js';
/**
 * Generate a cryptographically secure random nonce for authentication challenges.
 * Uses crypto.randomBytes() instead of Math.random() for security.
 */
export function generateNonce(length = 32) {
    return randomBytes(Math.ceil(length * 0.75))
        .toString('base64url')
        .slice(0, length);
}
export function generateChallengeMessage(wallet, nonce) {
    const timestamp = Date.now();
    return `Sign this message to authenticate with SolShare.\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
/**
 * Compute a perceptual hash (pHash) for an image.
 * Unlike cryptographic hashes, perceptual hashes remain similar for visually similar images,
 * making them effective for detecting modified versions of blocked content.
 *
 * Falls back to SHA-256 if perceptual hashing fails (e.g., invalid image format).
 */
export async function hashImage(buffer) {
    try {
        // Compute 16-bit perceptual hash for good balance of accuracy and size
        const hash = await imageHash.hash(buffer, 16);
        return hash;
    }
    catch (error) {
        // Log the error for diagnosability before falling back
        logger.warn({
            err: error,
            bufferSize: buffer.length
        }, 'Perceptual hash failed, falling back to SHA-256');
        // Fallback to SHA-256 for non-image files or corrupted images
        return createHash('sha256').update(buffer).digest('hex');
    }
}
/**
 * Compute SHA-256 hash for exact duplicate detection.
 * Use this when you need to detect exact byte-for-byte duplicates.
 */
export function hashImageExact(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}
export function extractIpfsHash(uri) {
    const match = uri.match(/ipfs:\/\/(\w+)/);
    return match ? match[1] : null;
}
export function ipfsToGatewayUrl(ipfsUri, gateway) {
    const hash = extractIpfsHash(ipfsUri);
    if (!hash)
        return ipfsUri;
    return `${gateway}/ipfs/${hash}`;
}
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function snakeToCamel(obj) {
    const result = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
}
export function camelToSnake(obj) {
    const result = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
}
//# sourceMappingURL=helpers.js.map