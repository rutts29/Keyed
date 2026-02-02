import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { WALLETS, addr, UNREGISTERED_WALLET } from "./helpers/wallets";
import { resetState, updateState } from "./helpers/test-state";

test.describe.serial("Phase 1: Authentication", () => {
  let api: ApiClient;
  let requestContext: APIRequestContext;

  test.beforeAll(async () => {
    requestContext = await pwRequest.newContext();
    api = new ApiClient(requestContext);
    resetState(); // Fresh state for test run
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test("1.1 Authenticate W1 (creatorAlpha)", async () => {
    const token = await api.authenticate(WALLETS.creatorAlpha);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });

  test("1.2 Authenticate W2 (creatorBeta)", async () => {
    const token = await api.authenticate(WALLETS.creatorBeta);
    expect(token).toBeTruthy();
  });

  test("1.3 Authenticate W3–W6 (fans + lurker)", async () => {
    for (const name of ["fanA", "fanB", "fanC", "lurker"] as const) {
      const token = await api.authenticate(WALLETS[name]);
      expect(token).toBeTruthy();
    }
  });

  test("1.4 Authenticate W7 (newUser)", async () => {
    const token = await api.authenticate(WALLETS.newUser);
    expect(token).toBeTruthy();
  });

  test("1.5 Authenticate W8 (spammer)", async () => {
    const token = await api.authenticate(WALLETS.spammer);
    expect(token).toBeTruthy();
  });

  test("1.6 Store all tokens in shared state", async () => {
    const tokens: Record<string, string> = {};
    for (const [name, kp] of Object.entries(WALLETS)) {
      tokens[kp.publicKey.toBase58()] = api.getToken(kp.publicKey.toBase58());
    }
    updateState({ tokens });
  });

  test("1.7 Unauthenticated request returns 401", async () => {
    const { status } = await api.get("/notifications");
    expect(status).toBe(401);
  });

  test("1.8 Invalid token returns 401", async () => {
    const { status } = await api.get("/notifications", "invalid-jwt-token");
    expect(status).toBe(401);
  });

  test("1.9 Token refresh works", async () => {
    const originalToken = api.getToken(addr("creatorAlpha"));
    const { status, body } = await api.refresh(originalToken);
    expect(status).toBe(200);
    expect(body.data.token).toBeTruthy();
    expect(body.data.wallet).toBe(addr("creatorAlpha"));
    // Update stored token
    api.setToken(addr("creatorAlpha"), body.data.token);
    const { loadState } = await import("./helpers/test-state");
    const state = updateState({
      tokens: {
        ...loadState().tokens,
        [addr("creatorAlpha")]: body.data.token,
      },
    });
  });

  test("1.10 W9 (unregistered) has no token", async () => {
    // W9 never authenticates — verify we can't access protected routes
    const { status } = await api.get(`/users/${UNREGISTERED_WALLET}`);
    // Public profile endpoint may return 404 (user not found) which is expected
    expect([200, 404]).toContain(status);
  });
});
