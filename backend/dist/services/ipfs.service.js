"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipfsService = void 0;
const env_js_1 = require("../config/env.js");
const r2_js_1 = require("../config/r2.js");
const logger_js_1 = require("../utils/logger.js");
exports.ipfsService = {
    async uploadToPinata(file, filename) {
        const formData = new FormData();
        const blob = new Blob([file]);
        formData.append('file', blob, filename);
        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': env_js_1.env.PINATA_API_KEY,
                'pinata_secret_api_key': env_js_1.env.PINATA_SECRET_KEY,
            },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.text();
            logger_js_1.logger.error({ error }, 'Pinata upload failed');
            throw new Error('Failed to upload to IPFS');
        }
        const data = await response.json();
        return `ipfs://${data.IpfsHash}`;
    },
    async cacheInR2(ipfsHash, content, contentType) {
        const key = `images/${ipfsHash}`;
        return (0, r2_js_1.uploadToR2)(key, content, contentType);
    },
    async getContent(ipfsUri) {
        const hash = ipfsUri.replace('ipfs://', '');
        const key = `images/${hash}`;
        const cached = await (0, r2_js_1.getFromR2)(key);
        if (cached)
            return cached;
        const gatewayUrl = `${env_js_1.env.PINATA_GATEWAY_URL}/ipfs/${hash}`;
        try {
            const response = await fetch(gatewayUrl);
            if (!response.ok)
                return null;
            const buffer = Buffer.from(await response.arrayBuffer());
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            await (0, r2_js_1.uploadToR2)(key, buffer, contentType).catch(() => { });
            return buffer;
        }
        catch (error) {
            logger_js_1.logger.error({ error, ipfsUri }, 'Failed to fetch from IPFS');
            return null;
        }
    },
    async exists(ipfsHash) {
        const key = `images/${ipfsHash}`;
        return (0, r2_js_1.existsInR2)(key);
    },
    getPublicUrl(ipfsUri) {
        const hash = ipfsUri.replace('ipfs://', '');
        return `${env_js_1.env.R2_PUBLIC_URL}/images/${hash}`;
    },
};
//# sourceMappingURL=ipfs.service.js.map