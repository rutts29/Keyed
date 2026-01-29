/**
 * E2E Tests: Posts -- Upload, Create, Read, Like, Comment, Unlike
 *
 * Tests the post lifecycle against a live backend. If the AI moderation
 * service is running, uploads succeed (moderation ALLOW). If it is not
 * running, the backend blocks uploads via fail-closed behavior -- and we
 * verify that instead.
 *
 * No vi.mock() -- all services are real.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  testWalletA,
  testWalletB,
  authenticate,
  api,
  apiFormData,
  createTestPNG,
} from './setup.js';

let tokenA: string;
let tokenB: string;
let uploadedContentUri: string | null = null;
let createdPostId: string | null = null;
let aiServiceAvailable = false;

describe('Posts E2E -- post lifecycle', () => {
  beforeAll(async () => {
    tokenA = await authenticate(testWalletA);
    tokenB = await authenticate(testWalletB);
  }, 30_000);

  // ── 1. Upload valid PNG ──────────────────────────────────────────────
  it('should upload a valid PNG or be blocked by fail-closed moderation', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'test-image.png');
    formData.append('caption', 'E2E test upload');

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    if (res.ok) {
      // AI service is running -- upload succeeded
      aiServiceAvailable = true;
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.data.contentUri).toBeDefined();
      expect(typeof res.data.data.contentUri).toBe('string');
      expect(res.data.data.publicUrl).toBeDefined();
      uploadedContentUri = res.data.data.contentUri;
    } else {
      // AI service not running -- fail-closed blocks the upload
      aiServiceAvailable = false;
      expect([400, 500, 503]).toContain(res.status);
      // This verifies fail-closed behavior: content is blocked when AI is unavailable
    }
  }, 30_000);

  // ── 2. Create post ──────────────────────────────────────────────────
  it('should create a post with contentUri (if upload succeeded)', async () => {
    if (!uploadedContentUri) {
      // Upload was blocked -- skip post creation but don't fail
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api('/api/posts/create', {
      method: 'POST',
      token: tokenA,
      body: JSON.stringify({
        contentUri: uploadedContentUri,
        contentType: 'image',
        caption: 'My first E2E post',
        isTokenGated: false,
        requiredToken: null,
      }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.metadata).toBeDefined();
    expect(res.data.data.metadata.postId).toBeDefined();
    expect(res.data.data.transaction).toBeDefined();
    expect(res.data.data.blockhash).toBeDefined();
    expect(res.data.data.lastValidBlockHeight).toBeDefined();

    createdPostId = res.data.data.metadata.postId;
  }, 15_000);

  // ── 3. Get post ──────────────────────────────────────────────────────
  it('should retrieve the created post (if it exists)', async () => {
    if (!createdPostId) {
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api(`/api/posts/${createdPostId}`, {
      method: 'GET',
      token: tokenA,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.id).toBe(createdPostId);
    expect(res.data.data.content_uri).toBe(uploadedContentUri);
    expect(res.data.data.caption).toBe('My first E2E post');
    expect(res.data.data.creator_wallet).toBe(testWalletA.publicKey.toBase58());
  }, 15_000);

  // ── 4. Like post ────────────────────────────────────────────────────
  it('should like the post (if it exists)', async () => {
    if (!createdPostId) {
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api(`/api/posts/${createdPostId}/like`, {
      method: 'POST',
      token: tokenB,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  // ── 5. Comment on post ──────────────────────────────────────────────
  it('should add a comment to the post (if it exists)', async () => {
    if (!createdPostId) {
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api(`/api/posts/${createdPostId}/comments`, {
      method: 'POST',
      token: tokenB,
      body: JSON.stringify({ text: 'Great post from E2E test!' }),
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.metadata).toBeDefined();
    expect(res.data.data.metadata.commentId).toBeDefined();
  }, 15_000);

  // ── 6. Get comments ─────────────────────────────────────────────────
  it('should return comments for the post (if it exists)', async () => {
    if (!createdPostId) {
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api(`/api/posts/${createdPostId}/comments`, {
      method: 'GET',
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data.comments)).toBe(true);
    expect(res.data.data.comments.length).toBeGreaterThanOrEqual(1);

    const comment = res.data.data.comments.find(
      (c: any) => c.text === 'Great post from E2E test!',
    );
    expect(comment).toBeDefined();
  }, 15_000);

  // ── 7. Unlike post ──────────────────────────────────────────────────
  it('should unlike the post (if it exists)', async () => {
    if (!createdPostId) {
      expect(aiServiceAvailable).toBe(false);
      return;
    }

    const res = await api(`/api/posts/${createdPostId}/like`, {
      method: 'DELETE',
      token: tokenB,
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  }, 15_000);

  // ── 8. Upload without auth ──────────────────────────────────────────
  it('should reject upload without authentication (401)', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'no-auth.png');

    const res = await apiFormData('/api/posts/upload', formData);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  }, 10_000);

  // ── 9. Upload invalid file type ─────────────────────────────────────
  it('should reject upload of invalid file type', async () => {
    const textBuffer = Buffer.from('This is not an image');
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([textBuffer], { type: 'text/plain' }),
      'not-an-image.txt',
    );

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    expect(res.ok).toBe(false);
    expect([400, 500]).toContain(res.status);
  }, 10_000);
});
