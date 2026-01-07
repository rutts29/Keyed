"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.programIds = exports.connection = void 0;
exports.getRecentBlockhash = getRecentBlockhash;
const web3_js_1 = require("@solana/web3.js");
const env_js_1 = require("./env.js");
exports.connection = new web3_js_1.Connection(env_js_1.env.SOLANA_RPC_URL || (0, web3_js_1.clusterApiUrl)('devnet'), 'confirmed');
exports.programIds = {
    social: env_js_1.env.SOCIAL_PROGRAM_ID ? new web3_js_1.PublicKey(env_js_1.env.SOCIAL_PROGRAM_ID) : null,
    payment: env_js_1.env.PAYMENT_PROGRAM_ID ? new web3_js_1.PublicKey(env_js_1.env.PAYMENT_PROGRAM_ID) : null,
    tokenGate: env_js_1.env.TOKEN_GATE_PROGRAM_ID ? new web3_js_1.PublicKey(env_js_1.env.TOKEN_GATE_PROGRAM_ID) : null,
};
async function getRecentBlockhash() {
    const { blockhash, lastValidBlockHeight } = await exports.connection.getLatestBlockhash();
    return { blockhash, lastValidBlockHeight };
}
//# sourceMappingURL=solana.js.map