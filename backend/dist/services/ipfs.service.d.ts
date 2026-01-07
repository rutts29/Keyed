export declare const ipfsService: {
    uploadToPinata(file: Buffer, filename: string): Promise<string>;
    cacheInR2(ipfsHash: string, content: Buffer, contentType: string): Promise<string>;
    getContent(ipfsUri: string): Promise<Buffer | null>;
    exists(ipfsHash: string): Promise<boolean>;
    getPublicUrl(ipfsUri: string): string;
};
//# sourceMappingURL=ipfs.service.d.ts.map