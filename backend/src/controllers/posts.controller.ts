import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types/index.js';
import { supabase } from '../config/supabase.js';
import { cacheService } from '../services/cache.service.js';
import { ipfsService } from '../services/ipfs.service.js';
import { aiService } from '../services/ai.service.js';
import { solanaService } from '../services/solana.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashImage } from '../utils/helpers.js';
import { addJob } from '../jobs/queues.js';

export const postsController = {
  async upload(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const file = req.file;
    
    if (!file) {
      throw new AppError(400, 'NO_FILE', 'No file uploaded');
    }
    
    const { data } = await supabase.rpc('get_wallet_upload_limit', { wallet_address: wallet });
    const limit = data?.limit ?? data ?? 0;
    if (limit === 0) {
      throw new AppError(403, 'UPLOAD_BLOCKED', 'Upload privileges suspended');
    }
    
    // Compute perceptual hash for detecting similar/modified versions of blocked content
    const imageHash = await hashImage(file.buffer);
    
    const { data: blocked } = await supabase
      .from('blocked_content_hashes')
      .select('reason')
      .eq('image_hash', imageHash)
      .single();
    
    if (blocked) {
      throw new AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${blocked.reason}`);
    }
    
    const hashCheck = await aiService.checkHash(imageHash);
    if (hashCheck.knownBad) {
      throw new AppError(400, 'CONTENT_BLOCKED', `Content blocked: ${hashCheck.reason}`);
    }
    
    const base64 = file.buffer.toString('base64');
    const imageBase64 = `data:${file.mimetype};base64,${base64}`;
    const moderationResult = await aiService.moderateContent(imageBase64, req.body.caption, wallet);
    
    if (moderationResult.verdict === 'block') {
      await supabase.from('content_violations').insert({
        wallet,
        violation_type: moderationResult.blockedCategory,
        severity_score: moderationResult.maxScore,
        image_hash: imageHash,
        explanation: moderationResult.explanation,
      });
      
      await supabase.from('blocked_content_hashes').upsert({
        image_hash: imageHash,
        reason: moderationResult.blockedCategory,
      }, { onConflict: 'image_hash', ignoreDuplicates: true });
      
      throw new AppError(400, 'CONTENT_VIOLATION', moderationResult.explanation);
    }
    
    const contentUri = await ipfsService.uploadToPinata(file.buffer, file.originalname);
    const ipfsHash = contentUri.replace('ipfs://', '');
    await ipfsService.cacheInR2(ipfsHash, file.buffer, file.mimetype);
    
    res.json({
      success: true,
      data: {
        contentUri,
        publicUrl: ipfsService.getPublicUrl(contentUri),
        moderationResult,
      },
    });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { contentUri, contentType, caption, isTokenGated, requiredToken } = req.body;
    
    // Generate a 32-character hex ID from UUID v4 (without dashes)
    // Note: This is an internal database ID, not a Solana address
    const postId = uuidv4().replace(/-/g, '');
    
    const txResponse = await solanaService.buildCreatePostTx(
      wallet,
      contentUri,
      contentType,
      caption || '',
      isTokenGated,
      requiredToken
    );
    
    await supabase.from('posts').insert({
      id: postId,
      creator_wallet: wallet,
      content_uri: contentUri,
      content_type: contentType,
      caption,
      timestamp: new Date().toISOString(),
      is_token_gated: isTokenGated,
      required_token: requiredToken,
    });
    
    await supabase.rpc('increment_user_stat', { wallet_addr: wallet, stat_name: 'post_count' });
    
    await addJob('ai-analysis' as const, { postId, contentUri, caption, creatorWallet: wallet });
    await addJob('notification' as const, { type: 'new_post', postId, creatorWallet: wallet });
    
    await cacheService.invalidateUser(wallet);
    
    res.json({
      success: true,
      data: { ...txResponse, metadata: { postId } },
    });
  },

  async getPost(req: AuthenticatedRequest, res: Response) {
    const { postId } = req.params;
    
    const cached = await cacheService.getPost(postId);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    const { data: post, error } = await supabase
      .from('posts')
      .select('*, users!posts_creator_wallet_fkey(*)')
      .eq('id', postId)
      .single();
    
    if (error || !post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    let isLiked = false;
    if (req.wallet) {
      const { data: like } = await supabase
        .from('likes')
        .select('user_wallet')
        .eq('post_id', postId)
        .eq('user_wallet', req.wallet)
        .single();
      isLiked = !!like;
    }
    
    const result = { ...post, isLiked };
    await cacheService.setPost(postId, result);
    
    res.json({ success: true, data: result });
  },

  async like(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId } = req.params;
    
    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();
    
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    if (post.creator_wallet === wallet) {
      throw new AppError(400, 'INVALID_ACTION', 'Cannot like your own post');
    }
    
    // Check if user already liked this post to prevent duplicate likes
    const { data: existingLike } = await supabase
      .from('likes')
      .select('user_wallet')
      .eq('user_wallet', wallet)
      .eq('post_id', postId)
      .single();
    
    if (existingLike) {
      throw new AppError(400, 'ALREADY_LIKED', 'You have already liked this post');
    }
    
    const txResponse = await solanaService.buildLikeTx(wallet, postId);
    
    // Use upsert with onConflict to handle race conditions gracefully
    const { error: insertError } = await supabase.from('likes').upsert({
      user_wallet: wallet,
      post_id: postId,
    }, { onConflict: 'user_wallet,post_id', ignoreDuplicates: true });
    
    // Only increment if insert was successful (not a duplicate)
    if (!insertError) {
      // Atomically increment likes counter using RPC
      await supabase.rpc('increment_post_likes', { post_id: postId });
      
      await cacheService.invalidatePost(postId);
      await addJob('notification', {
        type: 'like',
        postId,
        targetWallet: post.creator_wallet,
        fromWallet: wallet,
      });
    }
    
    res.json({ success: true, data: txResponse });
  },

  async unlike(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId } = req.params;
    
    const txResponse = await solanaService.buildUnlikeTx(wallet, postId);
    
    await supabase
      .from('likes')
      .delete()
      .eq('user_wallet', wallet)
      .eq('post_id', postId);
    
    // Atomically decrement likes counter using RPC
    await supabase.rpc('decrement_post_likes', { post_id: postId });
    
    await cacheService.invalidatePost(postId);
    
    res.json({ success: true, data: txResponse });
  },

  async getComments(req: AuthenticatedRequest, res: Response) {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    
    let query = supabase
      .from('comments')
      .select('*, users!comments_commenter_wallet_fkey(*)')
      .eq('post_id', postId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (cursor) {
      query = query.lt('timestamp', cursor);
    }
    
    const { data: comments, error } = await query;
    
    if (error) {
      throw new AppError(500, 'DB_ERROR', 'Failed to fetch comments');
    }
    
    const nextCursor = comments.length === limit ? comments[comments.length - 1].timestamp : null;
    
    res.json({
      success: true,
      data: { comments, nextCursor },
    });
  },

  async addComment(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId } = req.params;
    const { text } = req.body;
    
    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();
    
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    // Generate a 32-character hex ID from UUID v4 (without dashes)
    const commentId = uuidv4().replace(/-/g, '');
    
    const txResponse = await solanaService.buildCommentTx(wallet, postId, text);
    
    const { data: comment } = await supabase
      .from('comments')
      .insert({
        id: commentId,
        post_id: postId,
        commenter_wallet: wallet,
        text,
      })
      .select('*')
      .single();
    
    // Atomically increment comments counter using RPC
    await supabase.rpc('increment_post_comments', { post_id: postId });
    
    await cacheService.invalidatePost(postId);
    await addJob('notification', {
      type: 'comment',
      postId,
      targetWallet: post.creator_wallet,
      fromWallet: wallet,
    });
    
    res.json({
      success: true,
      data: { ...txResponse, metadata: { commentId } },
    });
  },

  async report(req: AuthenticatedRequest, res: Response) {
    const wallet = req.wallet!;
    const { postId } = req.params;
    const { reason, description } = req.body;
    
    const { data: post } = await supabase
      .from('posts')
      .select('creator_wallet')
      .eq('id', postId)
      .single();
    
    if (!post) {
      throw new AppError(404, 'NOT_FOUND', 'Post not found');
    }
    
    await supabase.from('user_reports').insert({
      reporter_wallet: wallet,
      reported_content_id: postId,
      reported_wallet: post.creator_wallet,
      reason,
      description,
    });
    
    res.json({ success: true, data: { message: 'Report submitted' } });
  },
};
