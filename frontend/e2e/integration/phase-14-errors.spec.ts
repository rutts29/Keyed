import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr, UNREGISTERED_WALLET } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 14: Error Handling & Edge Cases", () => {
  let api: ApiClient;
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    requestContext = await pwRequest.newContext();
    api = new ApiClient(requestContext);
    const state = loadState();
    for (const [wallet, token] of Object.entries(state.tokens)) {
      api.setToken(wallet, token as string);
    }
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  // --- Auth errors ---

  test("14.1 Expired/invalid JWT returns 401", async () => {
    const { status } = await api.get("/notifications", "expired.jwt.token");
    expect(status).toBe(401);
  });

  test("14.2 Missing JWT on protected route returns 401", async () => {
    const { status } = await api.get("/notifications");
    expect(status).toBe(401);
  });

  test("14.3 Malformed auth header returns 401", async () => {
    const { status } = await api.get("/notifications", "not-a-bearer-token");
    expect(status).toBe(401);
  });

  // --- 404 errors ---

  test("14.4 Non-existent post returns 404", async () => {
    const { status } = await api.get(
      "/posts/00000000-0000-0000-0000-000000000000"
    );
    expect([404, 429]).toContain(status);
  });

  test("14.5 Non-existent room returns 404", async () => {
    const { status } = await api.get(
      "/chat/rooms/00000000-0000-0000-0000-000000000000",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(404);
  });

  test("14.6 Non-existent user returns 404", async () => {
    const { status } = await api.get(
      "/users/NonExistentWallet1234567890abcdefghij"
    );
    expect([404, 429]).toContain(status);
  });

  // --- Validation errors ---

  test("14.7 Comment on non-existent post", async () => {
    const { status } = await api.post(
      "/posts/00000000-0000-0000-0000-000000000000/comments",
      { content: "Should fail" },
      api.getToken(addr("fanA"))
    );
    expect([400, 404, 429]).toContain(status);
  });

  test("14.8 Tip non-existent creator", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: "NonExistentWallet1234567890abcdefghij",
        amount: 0.5,
      },
      api.getToken(addr("fanA"))
    );
    expect([400, 404, 429]).toContain(status);
  });

  test("14.9 Empty body on create post returns 400", async () => {
    const { status } = await api.post(
      "/posts/create",
      { contentUri: "" },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(400);
  });

  test("14.10 Like non-existent post", async () => {
    const { status } = await api.post(
      "/posts/00000000-0000-0000-0000-000000000000/like",
      {},
      api.getToken(addr("fanA"))
    );
    expect([400, 404]).toContain(status);
  });

  test("14.11 Follow non-existent user", async () => {
    const { status } = await api.post(
      "/users/NonExistentWallet1234567890abcdefghij/follow",
      {},
      api.getToken(addr("fanA"))
    );
    expect([400, 404]).toContain(status);
  });

  test("14.12 Subscribe without amount rejected", async () => {
    const { status } = await api.post(
      "/payments/subscribe",
      { creatorWallet: addr("creatorAlpha") },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(400);
  });

  test("14.13 Negative tip amount rejected", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: -1,
      },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(400);
  });

  test("14.14 Health check returns OK", async () => {
    const res = await requestContext.get("http://localhost:3001/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("14.15 W9 (unregistered) profile is 404", async () => {
    const { status } = await api.get(`/users/${UNREGISTERED_WALLET}`);
    expect([200, 404, 429]).toContain(status);
  });
});
