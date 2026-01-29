/**
 * E2E Middleware Tests
 *
 * Tests cross-cutting middleware behaviour: request IDs, auth rejection,
 * 404 handling, error response format, and CORS headers.
 *
 * Runs against a live backend (localhost:3001) with raw fetch() so we can
 * inspect response headers that the `api` helper does not expose.
 */
import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Low-level fetch that returns the raw Response (headers + parsed JSON). */
async function rawFetch(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; headers: Headers; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

// ---------------------------------------------------------------------------
// Request ID middleware
// ---------------------------------------------------------------------------

describe('Middleware - Request ID', () => {
  it('should add X-Request-ID header to every response', async () => {
    const { headers } = await rawFetch('/health');

    const requestId = headers.get('x-request-id');
    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe('string');
    expect(requestId!.length).toBeGreaterThan(0);
  });

  it('should echo back a custom X-Request-ID', async () => {
    const customId = 'e2e-test-custom-request-id-12345';
    const { headers } = await rawFetch('/health', {
      headers: { 'X-Request-ID': customId },
    });

    expect(headers.get('x-request-id')).toBe(customId);
  });
});

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

describe('Middleware - Auth', () => {
  it('should return 401 for an invalid Bearer token', async () => {
    const { status, data } = await rawFetch('/api/feed', {
      headers: { Authorization: 'Bearer this.is.invalid' },
    });

    expect(status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header is missing on a protected route', async () => {
    const { status, data } = await rawFetch('/api/feed');

    expect(status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
    expect(data.error.message).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

describe('Middleware - Not Found', () => {
  it('should return 404 with correct error shape for unknown routes', async () => {
    const { status, data } = await rawFetch('/api/this-does-not-exist');

    expect(status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Error response format
// ---------------------------------------------------------------------------

describe('Middleware - Error Response Format', () => {
  it('should return { success, error: { code, message } } for errors', async () => {
    // Trigger a known 401 to validate the error envelope
    const { status, data, headers } = await rawFetch('/api/feed');

    expect(status).toBe(401);
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code');
    expect(typeof data.error.code).toBe('string');
    expect(data.error).toHaveProperty('message');
    expect(typeof data.error.message).toBe('string');

    // The response should still have a request ID header for tracing
    expect(headers.get('x-request-id')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

describe('Middleware - CORS', () => {
  it('should include CORS headers on responses', async () => {
    // Send an OPTIONS preflight-style request.
    // cors() middleware responds to OPTIONS with the configured headers.
    const res = await fetch(`${BASE_URL}/api/feed/explore`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    // The server should acknowledge the preflight (200 or 204)
    expect([200, 204]).toContain(res.status);

    // Verify core CORS headers are present
    const allowOrigin = res.headers.get('access-control-allow-origin');
    expect(allowOrigin).toBeDefined();

    const allowCredentials = res.headers.get('access-control-allow-credentials');
    // cors({ credentials: true }) should set this to "true"
    expect(allowCredentials).toBe('true');
  });

  it('should return CORS headers on normal GET requests', async () => {
    const res = await fetch(`${BASE_URL}/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });

    // At minimum, the server should reflect the allowed origin
    const allowOrigin = res.headers.get('access-control-allow-origin');
    expect(allowOrigin).toBeDefined();
  });
});
