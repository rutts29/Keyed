import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 12: Privacy Settings & Private Tips", () => {
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

  test("12.1 Get W3 privacy settings", async () => {
    const { status, body } = await api.get(
      "/privacy/settings",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data).toBeTruthy();
  });

  test("12.2 Update W3 privacy settings", async () => {
    const { status, body } = await api.put(
      "/privacy/settings",
      { default_private_tips: true },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  test("12.3 Verify privacy settings persisted", async () => {
    const { status, body } = await api.get(
      "/privacy/settings",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data.default_private_tips).toBe(true);
  });

  test("12.4 Log a private tip", async () => {
    const { status } = await api.post(
      "/privacy/tip/log",
      {
        creatorWallet: addr("creatorAlpha"),
        amount: 0.1,
        txSignature: "test-private-tip-signature-" + Date.now(),
      },
      api.getToken(addr("fanA"))
    );
    expect([200, 201]).toContain(status);
  });

  test("12.5 Get received private tips (W1)", async () => {
    const { status, body } = await api.get(
      "/privacy/tips/received",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.tips)).toBe(true);
  });

  test("12.6 Get sent private tips (W3)", async () => {
    const { status, body } = await api.get(
      "/privacy/tips/sent",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.tips)).toBe(true);
  });

  test("12.7 Get privacy pool info", async () => {
    const { status, body } = await api.get(
      "/privacy/pool/info",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data).toBeTruthy();
  });

  test("12.8 Privacy endpoints without auth return 401", async () => {
    const { status } = await api.get("/privacy/settings");
    expect(status).toBe(401);
  });

  test("12.9 Reset W3 privacy settings", async () => {
    const { status } = await api.put(
      "/privacy/settings",
      { default_private_tips: false },
      api.getToken(addr("fanA"))
    );
    expect([200, 400]).toContain(status);
  });
});
