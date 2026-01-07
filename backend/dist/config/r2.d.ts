import { S3Client } from '@aws-sdk/client-s3';
export declare const r2Client: S3Client;
export declare function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string>;
export declare function getFromR2(key: string): Promise<Buffer | null>;
export declare function existsInR2(key: string): Promise<boolean>;
//# sourceMappingURL=r2.d.ts.map