/**
 * API client for integration tests.
 * Wraps Playwright's APIRequestContext with typed helpers.
 */
import type { APIRequestContext } from "@playwright/test";
import type { Keypair } from "@solana/web3.js";
import { signMessage } from "./wallets";

const API_BASE = "http://localhost:3001/api";

// Global throttle state shared across all ApiClient instances
let globalLastRequestTime = 0;
const MIN_GAP_MS = 250;

export class ApiClient {
  private tokens: Map<string, string> = new Map();

  constructor(private request: APIRequestContext) {}

  // --- Auth ---

  async authenticate(keypair: Keypair): Promise<string> {
    const wallet = keypair.publicKey.toBase58();

    // Step 1: Get challenge
    const { body: challengeBody } = await this.post("/auth/challenge", { wallet });
    const message = (challengeBody as { data: { message: string } }).data.message;

    // Step 2: Sign challenge
    const signature = signMessage(keypair, message);

    // Step 3: Verify
    const { body: verifyBody } = await this.post("/auth/verify", { wallet, signature });
    const vb = verifyBody as { data?: { token?: string } };

    if (!vb.data?.token) {
      throw new Error(`Auth failed for ${wallet}: ${JSON.stringify(verifyBody)}`);
    }

    const token = vb.data.token;
    this.tokens.set(wallet, token);
    return token;
  }

  getToken(wallet: string): string {
    const token = this.tokens.get(wallet);
    if (!token) throw new Error(`No token for wallet ${wallet}`);
    return token;
  }

  setToken(wallet: string, token: string) {
    this.tokens.set(wallet, token);
  }

  private headers(token?: string): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - globalLastRequestTime;
    if (elapsed < MIN_GAP_MS) {
      await new Promise((r) => setTimeout(r, MIN_GAP_MS - elapsed));
    }
    globalLastRequestTime = Date.now();
  }

  // Retry on 429 (rate limited) with exponential backoff
  private async withRetry<T>(
    fn: () => Promise<{ status: () => number; json: () => Promise<unknown> }>
  ): Promise<{ status: number; body: T }> {
    await this.throttle();
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fn();
      const status = res.status();
      if (status !== 429) {
        return { status, body: (await res.json()) as T };
      }
      // Wait before retry: 1s, 2s, 4s, 8s, 16s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
    // Final attempt — return whatever we get
    const res = await fn();
    return { status: res.status(), body: (await res.json()) as T };
  }

  // --- Generic HTTP ---

  async get(path: string, token?: string) {
    return this.withRetry(() =>
      this.request.get(`${API_BASE}${path}`, {
        headers: this.headers(token),
      })
    );
  }

  async post(path: string, data?: unknown, token?: string) {
    return this.withRetry(() =>
      this.request.post(`${API_BASE}${path}`, {
        headers: this.headers(token),
        data: data ?? {},
      })
    );
  }

  async put(path: string, data?: unknown, token?: string) {
    return this.withRetry(() =>
      this.request.put(`${API_BASE}${path}`, {
        headers: this.headers(token),
        data: data ?? {},
      })
    );
  }

  async del(path: string, token?: string) {
    return this.withRetry(() =>
      this.request.delete(`${API_BASE}${path}`, {
        headers: this.headers(token),
      })
    );
  }

  // --- Multipart upload ---

  async uploadFile(
    path: string,
    filePath: string,
    fieldName: string,
    token?: string
  ) {
    const fs = await import("fs");
    const buffer = fs.readFileSync(filePath);
    return this.withRetry(() =>
      this.request.post(`${API_BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        multipart: {
          [fieldName]: {
            name: "test-image.jpg",
            mimeType: "image/jpeg",
            buffer,
          },
        },
      })
    );
  }

  async refresh(token: string) {
    return this.withRetry(() =>
      this.request.post(`${API_BASE}/auth/refresh`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  }
}
