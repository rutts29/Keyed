import { createHash } from 'crypto';
export function generateNonce(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
export function generateChallengeMessage(wallet, nonce) {
    const timestamp = Date.now();
    return `Sign this message to authenticate with SolShare.\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
export function hashImage(buffer) {
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