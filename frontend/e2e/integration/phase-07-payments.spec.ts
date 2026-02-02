import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 7: Payments (Tips, Subscriptions, Withdrawals)", () => {
  let api: ApiClient;
  let requestContext: APIRequestContext;
  let postIds: string[];

  test.beforeAll(async () => {
    requestContext = await pwRequest.newContext();
    api = new ApiClient(requestContext);
    const state = loadState();
    for (const [wallet, token] of Object.entries(state.tokens)) {
      api.setToken(wallet, token as string);
    }
    postIds = state.postIds;
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  // --- Vault ---

  test("7.1 W1 initializes vault", async () => {
    const { status, body } = await api.post(
      "/payments/vault/initialize",
      {},
      api.getToken(addr("creatorAlpha"))
    );
    // May succeed or return already-initialized
    expect([200, 400]).toContain(status);
  });

  test("7.2 W2 initializes vault", async () => {
    const { status } = await api.post(
      "/payments/vault/initialize",
      {},
      api.getToken(addr("creatorBeta"))
    );
    expect([200, 400]).toContain(status);
  });

  test("7.3 Get W1 vault info", async () => {
    const { status, body } = await api.get(
      "/payments/vault",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data).toBeTruthy();
  });

  // --- Tips ---

  test("7.4 W3 tips W1 (0.5 SOL)", async () => {
    const { status, body } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: 0.5,
      },
      api.getToken(addr("fanA"))
    );
    // Tip returns a transaction to sign (or processes directly)
    expect([200, 201]).toContain(status);
  });

  test("7.5 W4 tips W1 (1.0 SOL)", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: 1.0,
      },
      api.getToken(addr("fanB"))
    );
    expect([200, 201]).toContain(status);
  });

  test("7.6 W3 tips W1 on specific post", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: 0.25,
        postId: postIds[0],
      },
      api.getToken(addr("fanA"))
    );
    expect([200, 201]).toContain(status);
  });

  test("7.7 W5 tips W2", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorBeta"),
        amount: 0.5,
      },
      api.getToken(addr("fanC"))
    );
    expect([200, 201]).toContain(status);
  });

  test("7.8 Tip with 0 amount rejected", async () => {
    const { status } = await api.post(
      "/payments/tip",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: 0,
      },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(400);
  });

  test("7.9 Tip without auth returns 401", async () => {
    const { status } = await api.post("/payments/tip", {
      creatorWallet: addr("creatorAlpha"),
      amount: 0.5,
    });
    expect(status).toBe(401);
  });

  // --- Subscriptions ---

  test("7.10 W3 subscribes to W1", async () => {
    const { status, body } = await api.post(
      "/payments/subscribe",
      {
        creatorWallet: addr("creatorAlpha"),
        amountPerMonth: 2.5,
      },
      api.getToken(addr("fanA"))
    );
    // Subscription returns tx or confirms
    expect([200, 201]).toContain(status);
  });

  test("7.11 W4 subscribes to W2", async () => {
    const { status } = await api.post(
      "/payments/subscribe",
      {
        creatorWallet: addr("creatorBeta"),
        amountPerMonth: 1.0,
      },
      api.getToken(addr("fanB"))
    );
    expect([200, 201]).toContain(status);
  });

  test("7.12 W3 cancels subscription to W1", async () => {
    const { status } = await api.del(
      `/payments/subscribe/${addr("creatorAlpha")}`,
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
  });

  // --- Earnings & Withdrawal ---

  test("7.13 W1 earnings", async () => {
    const { status, body } = await api.get(
      "/payments/earnings",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data).toBeTruthy();
  });

  test("7.14 W1 withdraws", async () => {
    const { status } = await api.post(
      "/payments/withdraw",
      {},
      api.getToken(addr("creatorAlpha"))
    );
    // Withdraw returns tx or confirms (may fail if no on-chain balance)
    expect([200, 400]).toContain(status);
  });
});
