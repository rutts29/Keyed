"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
exports.generateChallengeMessage = generateChallengeMessage;
exports.hashImage = hashImage;
exports.extractIpfsHash = extractIpfsHash;
exports.ipfsToGatewayUrl = ipfsToGatewayUrl;
exports.sleep = sleep;
exports.snakeToCamel = snakeToCamel;
exports.camelToSnake = camelToSnake;
const crypto_1 = require("crypto");
function generateNonce(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function generateChallengeMessage(wallet, nonce) {
    const timestamp = Date.now();
    return `Sign this message to authenticate with SolShare.\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
function hashImage(buffer) {
    return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
}
function extractIpfsHash(uri) {
    const match = uri.match(/ipfs:\/\/(\w+)/);
    return match ? match[1] : null;
}
function ipfsToGatewayUrl(ipfsUri, gateway) {
    const hash = extractIpfsHash(ipfsUri);
    if (!hash)
        return ipfsUri;
    return `${gateway}/ipfs/${hash}`;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function snakeToCamel(obj) {
    const result = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
}
function camelToSnake(obj) {
    const result = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
}
//# sourceMappingURL=helpers.js.map