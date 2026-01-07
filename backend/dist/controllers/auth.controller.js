"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../config/supabase.js");
exports.authController = {
    async getChallenge(req, res) {
        const { wallet } = req.body;
        const { message, nonce } = await (0, auth_js_1.generateChallenge)(wallet);
        res.json({
            success: true,
            data: { message, nonce },
        });
    },
    async verify(req, res) {
        const { wallet, signature } = req.body;
        const result = await (0, auth_js_1.verifyChallenge)(wallet, signature);
        if (!result.valid) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid signature' },
            });
            return;
        }
        const { data: existingUser } = await supabase_js_1.supabase
            .from('users')
            .select('wallet')
            .eq('wallet', wallet)
            .single();
        if (!existingUser) {
            await supabase_js_1.supabase.from('users').insert({
                wallet,
                created_at: new Date().toISOString(),
            });
        }
        res.json({
            success: true,
            data: { token: result.token, wallet },
        });
    },
    async refresh(req, res) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Missing token' },
            });
            return;
        }
        const token = authHeader.slice(7);
        const payload = (0, auth_js_1.verifyToken)(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
            });
            return;
        }
        const result = await (0, auth_js_1.verifyChallenge)(payload.wallet, '');
        res.json({
            success: true,
            data: { token: result.token, wallet: payload.wallet },
        });
    },
};
//# sourceMappingURL=auth.controller.js.map