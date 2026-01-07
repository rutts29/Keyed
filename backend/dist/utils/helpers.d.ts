export declare function generateNonce(length?: number): string;
export declare function generateChallengeMessage(wallet: string, nonce: string): string;
export declare function hashImage(buffer: Buffer): string;
export declare function extractIpfsHash(uri: string): string | null;
export declare function ipfsToGatewayUrl(ipfsUri: string, gateway: string): string;
export declare function sleep(ms: number): Promise<void>;
export declare function snakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
export declare function camelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
//# sourceMappingURL=helpers.d.ts.map