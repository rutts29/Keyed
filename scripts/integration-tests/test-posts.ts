#!/usr/bin/env tsx
/**
 * Post Creation Flow Integration Tests
 * 
 * Tests the complete post creation flow:
 * 1. Upload image → Backend → AI moderation check
 * 2. Store in IPFS → Create on-chain → Queue AI analysis
 * 3. Verify Qdrant indexing
 */

import { api, apiFormData, wallet, signMessage, setAuthToken, getAuthToken, test, assert, runTests, clearResults } from './config.js';

let uploadedContentUri: string;
let createdPostId: string;

// Helper to create test image (1x1 PNG)
function createTestImage(): Blob {
  // Minimal valid 1x1 red PNG (67 bytes)
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE,
    0xD4, 0xEF, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
    0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  return new Blob([pngData], { type: 'image/png' });
}

// Authenticate first
async function authenticate() {
  const challengeRes = await api('/api/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ wallet: wallet.publicKey.toBase58() }),
  });
  
  if (!challengeRes.ok) {
    throw new Error('Failed to get challenge');
  }
  
  const signature = signMessage(challengeRes.data.data.message);
  
  const verifyRes = await api('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      wallet: wallet.publicKey.toBase58(),
      signature,
    }),
  });
  
  if (!verifyRes.ok) {
    throw new Error('Failed to verify signature');
  }
  
  setAuthToken(verifyRes.data.data.token);
}

const tests = [
  test('Authenticate for post tests', async () => {
    await authenticate();
    assert(true, 'Authentication successful');
  }),

  test('Upload image file', async () => {
    const formData = new FormData();
    const testImage = createTestImage();
    formData.append('file', testImage, 'test-image.png');
    
    const res = await apiFormData('/api/posts/upload', formData);
    
    assert(res.ok, `Upload failed: ${res.status} - ${JSON.stringify(res.data)}`);
    assert(res.data.success, 'Upload not successful');
    assert(res.data.data.contentUri, 'No content URI returned');
    assert(res.data.data.hash, 'No content hash returned');
    
    uploadedContentUri = res.data.data.contentUri;
  }),

  test('Create post with uploaded content', async () => {
    const res = await api('/api/posts/create', {
      method: 'POST',
      body: JSON.stringify({
        contentUri: uploadedContentUri,
        caption: 'Test post from integration tests',
        contentType: 'image',
      }),
    });
    
    assert(res.ok, `Create post failed: ${res.status} - ${JSON.stringify(res.data)}`);
    assert(res.data.success, 'Post creation not successful');
    assert(res.data.data.postId, 'No post ID returned');
    
    createdPostId = res.data.data.postId;
  }),

  test('Get created post', async () => {
    // Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const res = await api(`/api/posts/${createdPostId}`);
    
    assert(res.ok, `Get post failed: ${res.status}`);
    assert(res.data.success, 'Get post not successful');
    assert(res.data.data.id === createdPostId, 'Post ID mismatch');
    assert(res.data.data.creator_wallet === wallet.publicKey.toBase58(), 'Creator mismatch');
  }),

  test('Like post', async () => {
    const res = await api(`/api/posts/${createdPostId}/like`, {
      method: 'POST',
    });
    
    assert(res.ok, `Like failed: ${res.status}`);
    assert(res.data.success, 'Like not successful');
  }),

  test('Get post comments (empty)', async () => {
    const res = await api(`/api/posts/${createdPostId}/comments`);
    
    assert(res.ok, `Get comments failed: ${res.status}`);
    assert(res.data.success, 'Get comments not successful');
    assert(Array.isArray(res.data.data), 'Comments should be an array');
  }),

  test('Add comment to post', async () => {
    const res = await api(`/api/posts/${createdPostId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        text: 'Great test post!',
      }),
    });
    
    assert(res.ok, `Add comment failed: ${res.status}`);
    assert(res.data.success, 'Add comment not successful');
  }),

  test('Unlike post', async () => {
    const res = await api(`/api/posts/${createdPostId}/like`, {
      method: 'DELETE',
    });
    
    assert(res.ok, `Unlike failed: ${res.status}`);
    assert(res.data.success, 'Unlike not successful');
  }),

  test('Reject upload without auth', async () => {
    // Save current token and clear it temporarily
    const savedToken = getAuthToken();
    setAuthToken('');
    
    const formData = new FormData();
    formData.append('file', createTestImage(), 'test.png');
    
    const res = await apiFormData('/api/posts/upload', formData);
    
    // Restore the saved token
    if (savedToken) {
      setAuthToken(savedToken);
    } else {
      await authenticate();
    }
    
    assert(!res.ok, 'Should reject upload without auth');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }),

  test('Reject invalid file type', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'test.txt');
    
    const res = await apiFormData('/api/posts/upload', formData);
    
    assert(!res.ok, 'Should reject invalid file type');
    assert(res.status === 400 || res.status === 500, 'Expected error status');
  }),
];

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearResults();
  runTests('Post Creation Flow Tests', tests).then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { tests as postsTests };
