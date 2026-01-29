import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { 
  programs, 
  pdaDerivation, 
  connection,
  fetchAccessControl,
  fetchAccessVerification,
} from '../config/solana.js';
import { solanaService } from '../services/solana.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const accessController = {
  async verifyAccess(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const postId = req.query.postId as string;

    if (!postId) {
      throw new AppError(400, 'MISSING_PARAM', 'postId is required');
    }

    const { data: post } = await supabase
      .from('posts')
      .select('is_token_gated, required_token, creator_wallet')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }

    // Public post - everyone has access
    if (!post.is_token_gated) {
      res.json({
        success: true,
        data: { hasAccess: true, reason: 'public' },
      });
      return;
    }

    // Creator always has access to their own content
    if (post.creator_wallet === wallet) {
      res.json({
        success: true,
        data: { hasAccess: true, reason: 'owner' },
      });
      return;
    }

    // Check on-chain verification status
    if (programs.tokenGate) {
      try {
        const userPubkey = new PublicKey(wallet);
        const postPubkey = new PublicKey(postId);

        // Try to fetch verification account
        const verification = await fetchAccessVerification(userPubkey, postPubkey);

        if (verification && verification.verified) {
          const expiresAt = verification.expiresAt
            ? new Date(Number(verification.expiresAt) * 1000)
            : null;

          // Grant access if no expiration or not yet expired
          if (!expiresAt || expiresAt > new Date()) {
            res.json({
              success: true,
              data: {
                hasAccess: true,
                reason: 'verified',
                verifiedAt: new Date(Number(verification.verifiedAt) * 1000),
                ...(expiresAt && { expiresAt }),
              },
            });
            return;
          }
        }

        // Get access requirements
        const accessControl = await fetchAccessControl(postPubkey);
        
        if (accessControl) {
          res.json({
            success: true,
            data: {
              hasAccess: false,
              reason: 'token_required',
              requirements: {
                requiredToken: accessControl.requiredToken?.toBase58() || null,
                minimumBalance: Number(accessControl.minimumBalance),
                requiredNftCollection: accessControl.requiredNftCollection?.toBase58() || null,
                gateType: accessControl.gateType,
              },
            },
          });
          return;
        }
      } catch (error) {
        logger.error({ error, wallet, postId }, 'Error checking on-chain access');
      }
    }

    // Fallback: Check if user holds the required token using RPC
    if (post.required_token) {
      try {
        const userPubkey = new PublicKey(wallet);
        const tokenMint = new PublicKey(post.required_token);
        
        // Get token accounts for the user
        const tokenAccounts = await connection.getTokenAccountsByOwner(userPubkey, {
          mint: tokenMint,
        });

        if (tokenAccounts.value.length > 0) {
          // User holds the token - they should verify on-chain to cache access
          res.json({
            success: true,
            data: {
              hasAccess: true,
              reason: 'token_holder',
              message: 'You hold the required token. Verify on-chain to cache access.',
              tokenAccounts: tokenAccounts.value.map(ta => ta.pubkey.toBase58()),
            },
          });
          return;
        }
      } catch (error) {
        logger.warn({ error, wallet, postId }, 'Error checking token balance');
      }
    }

    // No access
    res.json({
      success: true,
      data: {
        hasAccess: false,
        reason: 'token_required',
        requiredToken: post.required_token,
      },
    });
  },

  async setRequirements(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId, requiredToken, minimumBalance, requiredNftCollection } = req.body;

    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }

    if (post.creator_wallet !== wallet) {
      throw new AppError(403, 'FORBIDDEN', 'Not the post owner');
    }

    // Build the set access requirements transaction
    const txResponse = await solanaService.buildSetAccessRequirementsTx(
      wallet,
      postId,
      requiredToken,
      minimumBalance || 0,
      requiredNftCollection
    );

    // Update database record
    await supabase
      .from('posts')
      .update({
        is_token_gated: true,
        required_token: requiredToken,
      })
      .eq('id', postId);

    res.json({
      success: true,
      data: {
        ...txResponse,
        metadata: {
          postId,
          requiredToken,
          minimumBalance: minimumBalance || 0,
          requiredNftCollection,
        },
      },
    });
  },

  async verifyTokenAccess(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId, tokenAccount } = req.body;

    if (!postId) {
      throw new AppError(400, 'MISSING_PARAM', 'postId is required');
    }

    if (!tokenAccount) {
      throw new AppError(400, 'MISSING_PARAM', 'tokenAccount is required');
    }

    const txResponse = await solanaService.buildVerifyTokenAccessTx(
      wallet,
      postId,
      tokenAccount
    );

    res.json({
      success: true,
      data: txResponse,
    });
  },

  async verifyNftAccess(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId, nftTokenAccount, nftMint } = req.body;

    if (!postId) {
      throw new AppError(400, 'MISSING_PARAM', 'postId is required');
    }

    if (!nftTokenAccount || !nftMint) {
      throw new AppError(400, 'MISSING_PARAM', 'nftTokenAccount and nftMint are required');
    }

    const txResponse = await solanaService.buildVerifyNftAccessTx(
      wallet,
      postId,
      nftTokenAccount,
      nftMint
    );

    res.json({
      success: true,
      data: txResponse,
    });
  },

  async checkAccess(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const postId = req.query.postId as string;

    if (!postId) {
      throw new AppError(400, 'MISSING_PARAM', 'postId is required');
    }

    if (!programs.tokenGate) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Token gate program not available');
    }

    try {
      const userPubkey = new PublicKey(wallet);
      const postPubkey = new PublicKey(postId);
      const [accessControlPda] = pdaDerivation.accessControl(postPubkey);
      const [verificationPda] = pdaDerivation.accessVerification(userPubkey, postPubkey);

      // Call the check_access instruction (view function)
      const hasAccess = await programs.tokenGate.methods
        .checkAccess()
        .accounts({
          accessControl: accessControlPda,
          verification: verificationPda,
          user: userPubkey,
        })
        .view();

      res.json({
        success: true,
        data: { hasAccess },
      });
    } catch (error) {
      logger.error({ error, wallet, postId }, 'Error checking access on-chain');
      res.json({
        success: true,
        data: { hasAccess: false },
      });
    }
  },
};
