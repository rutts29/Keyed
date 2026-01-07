"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2Client = void 0;
exports.uploadToR2 = uploadToR2;
exports.getFromR2 = getFromR2;
exports.existsInR2 = existsInR2;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_js_1 = require("./env.js");
exports.r2Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${env_js_1.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env_js_1.env.R2_ACCESS_KEY_ID,
        secretAccessKey: env_js_1.env.R2_SECRET_ACCESS_KEY,
    },
});
async function uploadToR2(key, body, contentType) {
    await exports.r2Client.send(new client_s3_1.PutObjectCommand({
        Bucket: env_js_1.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return `${env_js_1.env.R2_PUBLIC_URL}/${key}`;
}
async function getFromR2(key) {
    try {
        const response = await exports.r2Client.send(new client_s3_1.GetObjectCommand({
            Bucket: env_js_1.env.R2_BUCKET_NAME,
            Key: key,
        }));
        if (response.Body) {
            return Buffer.from(await response.Body.transformToByteArray());
        }
        return null;
    }
    catch {
        return null;
    }
}
async function existsInR2(key) {
    try {
        await exports.r2Client.send(new client_s3_1.HeadObjectCommand({
            Bucket: env_js_1.env.R2_BUCKET_NAME,
            Key: key,
        }));
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=r2.js.map