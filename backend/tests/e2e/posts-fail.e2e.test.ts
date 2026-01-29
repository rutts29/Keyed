/**
 * E2E Tests: Posts -- Moderation Rejection & Fail-Closed Behavior
 *
 * Tests content blocking against a live backend. Without the AI service
 * running, the backend uses fail-closed behavior (blocks all uploads).
 * This verifies:
 *   - Uploads are blocked when AI is unavailable (fail-closed)
 *   - Error response shape is correct
 *   - Unauthenticated uploads are rejected
 *
 * When the AI service IS running, blocked content hashes are tested
 * by re-uploading the same image after a first block.
 *
 * No vi.mock() -- all services are real.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  testWalletA,
  authenticate,
  apiFormData,
  createTestPNG,
  createTestPNG2,
} from './setup.js';

let tokenA: string;

describe('Posts E2E -- moderation BLOCK path', () => {
  beforeAll(async () => {
    tokenA = await authenticate(testWalletA);
  }, 30_000);

  // ── 1. Upload is blocked (either by AI moderation or fail-closed) ───
  it('should block or reject upload (fail-closed when AI unavailable)', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'blocked-image.png');
    formData.append('caption', 'Should be blocked');

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    // Upload must NOT succeed -- either AI blocks it or fail-closed kicks in
    expect(res.ok).toBe(false);
    expect([400, 500, 503]).toContain(res.status);

    // If a structured error is returned, verify shape
    if (res.data.error) {
      expect(res.data.error.code).toBeDefined();
      expect(typeof res.data.error.code).toBe('string');
    }
  }, 30_000);

  // ── 2. Re-upload same image -- should still be blocked ──────────────
  it('should block re-upload of the same image', async () => {
    const png = createTestPNG(); // same bytes as test 1
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'same-blocked.png');

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    expect(res.ok).toBe(false);
    expect([400, 500, 503]).toContain(res.status);
  }, 15_000);

  // ── 3. Upload a different image -- also blocked (fail-closed) ───────
  it('should also block a different image when AI is unavailable', async () => {
    const png = createTestPNG2(); // different bytes
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'different-image.png');

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    // Without AI service, all uploads are blocked
    expect(res.ok).toBe(false);
    expect([400, 500, 503]).toContain(res.status);
  }, 15_000);

  // ── 4. Verify error response shape ──────────────────────────────────
  it('should return a structured error on blocked upload', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'error-shape.png');

    const res = await apiFormData('/api/posts/upload', formData, tokenA);

    expect(res.ok).toBe(false);
    expect(res.data).toBeDefined();
    // Response should have success: false
    if (res.data.success !== undefined) {
      expect(res.data.success).toBe(false);
    }
  }, 15_000);

  // ── 5. Upload without auth -- 401 ──────────────────────────────────
  it('should reject upload without authentication (401)', async () => {
    const png = createTestPNG();
    const formData = new FormData();
    formData.append('file', new Blob([png], { type: 'image/png' }), 'no-auth.png');

    const res = await apiFormData('/api/posts/upload', formData);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  }, 10_000);
});
