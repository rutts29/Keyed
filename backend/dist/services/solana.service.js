"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solanaService = void 0;
const web3_js_1 = require("@solana/web3.js");
const solana_js_1 = require("../config/solana.js");
const logger_js_1 = require("../utils/logger.js");
const PLATFORM_FEE_BPS = 200; // 2%
function serializeTransaction(tx) {
    return tx.serialize({ requireAllSignatures: false }).toString('base64');
}
exports.solanaService = {
    async buildCreateProfileTx(wallet, _username, _bio, _profileImageUri) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (solana_js_1.programIds.social) {
            // TODO: Add actual Anchor instruction when IDL available
            const ix = new web3_js_1.TransactionInstruction({
                keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
                programId: solana_js_1.programIds.social,
                data: Buffer.from([]),
            });
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildCreatePostTx(wallet, _contentUri, _contentType, _caption, _isTokenGated, _requiredToken) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (solana_js_1.programIds.social) {
            const ix = new web3_js_1.TransactionInstruction({
                keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
                programId: solana_js_1.programIds.social,
                data: Buffer.from([]),
            });
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildLikeTx(wallet, _postId) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (solana_js_1.programIds.social) {
            const ix = new web3_js_1.TransactionInstruction({
                keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
                programId: solana_js_1.programIds.social,
                data: Buffer.from([]),
            });
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildUnlikeTx(wallet, _postId) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildFollowTx(wallet, _targetWallet) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (solana_js_1.programIds.social) {
            const ix = new web3_js_1.TransactionInstruction({
                keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
                programId: solana_js_1.programIds.social,
                data: Buffer.from([]),
            });
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildUnfollowTx(wallet, _targetWallet) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildCommentTx(wallet, _postId, _text) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        if (solana_js_1.programIds.social) {
            const ix = new web3_js_1.TransactionInstruction({
                keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
                programId: solana_js_1.programIds.social,
                data: Buffer.from([]),
            });
            tx.add(ix);
        }
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildTipTx(wallet, creatorWallet, amount, _postId) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const creatorPubkey = new web3_js_1.PublicKey(creatorWallet);
        const lamports = Math.floor(amount * web3_js_1.LAMPORTS_PER_SOL);
        const fee = Math.floor(lamports * PLATFORM_FEE_BPS / 10000);
        const netAmount = lamports - fee;
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        tx.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: creatorPubkey,
            lamports: netAmount,
        }));
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildSubscribeTx(wallet, creatorWallet, amountPerMonth) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const creatorPubkey = new web3_js_1.PublicKey(creatorWallet);
        const lamports = Math.floor(amountPerMonth * web3_js_1.LAMPORTS_PER_SOL);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        tx.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: creatorPubkey,
            lamports,
        }));
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async buildWithdrawTx(wallet, _amount) {
        const { blockhash, lastValidBlockHeight } = await (0, solana_js_1.getRecentBlockhash)();
        const userPubkey = new web3_js_1.PublicKey(wallet);
        const tx = new web3_js_1.Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;
        return {
            transaction: serializeTransaction(tx),
            blockhash,
            lastValidBlockHeight,
        };
    },
    async submitTransaction(signedTx) {
        const buffer = Buffer.from(signedTx, 'base64');
        const signature = await solana_js_1.connection.sendRawTransaction(buffer);
        await solana_js_1.connection.confirmTransaction(signature, 'confirmed');
        logger_js_1.logger.info({ signature }, 'Transaction confirmed');
        return signature;
    },
    async getBalance(wallet) {
        const pubkey = new web3_js_1.PublicKey(wallet);
        const balance = await solana_js_1.connection.getBalance(pubkey);
        return balance / web3_js_1.LAMPORTS_PER_SOL;
    },
};
//# sourceMappingURL=solana.service.js.map