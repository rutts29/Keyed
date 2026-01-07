import { env } from '../config/env.js';
import { uploadToR2, getFromR2, existsInR2 } from '../config/r2.js';
import { logger } from '../utils/logger.js';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export const ipfsService = {
  async uploadToPinata(file: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([file]);
    formData.append('file', blob, filename);
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': env.PINATA_API_KEY,
        'pinata_secret_api_key': env.PINATA_SECRET_KEY,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      logger.error({ error }, 'Pinata upload failed');
      throw new Error('Failed to upload to IPFS');
    }
    
    const data = await response.json() as PinataResponse;
    return `ipfs://${data.IpfsHash}`;
  },

  async cacheInR2(ipfsHash: string, content: Buffer, contentType: string): Promise<string> {
    const key = `images/${ipfsHash}`;
    return uploadToR2(key, content, contentType);
  },

  async getContent(ipfsUri: string): Promise<Buffer | null> {
    const hash = ipfsUri.replace('ipfs://', '');
    const key = `images/${hash}`;
    
    const cached = await getFromR2(key);
    if (cached) return cached;
    
    const gatewayUrl = `${env.PINATA_GATEWAY_URL}/ipfs/${hash}`;
    try {
      const response = await fetch(gatewayUrl);
      if (!response.ok) return null;
      
      const buffer = Buffer.from(await response.arrayBuffer());
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      await uploadToR2(key, buffer, contentType).catch(() => {});
      
      return buffer;
    } catch (error) {
      logger.error({ error, ipfsUri }, 'Failed to fetch from IPFS');
      return null;
    }
  },

  async exists(ipfsHash: string): Promise<boolean> {
    const key = `images/${ipfsHash}`;
    return existsInR2(key);
  },

  getPublicUrl(ipfsUri: string): string {
    const hash = ipfsUri.replace('ipfs://', '');
    return `${env.R2_PUBLIC_URL}/images/${hash}`;
  },
};
