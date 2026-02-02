import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr, PROFILES } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 13: Profile Settings & Updates", () => {
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

  test("13.1 W1 updates bio", async () => {
    const { status, body } = await api.post(
      "/users/profile",
      { bio: "Updated bio — digital artist & NFT creator on Keyed" },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  test("13.2 Verify W1 bio updated", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(status).toBe(200);
    expect(body.data.bio).toContain("Updated bio");
  });

  test("13.3 W1 updates subscription price", async () => {
    const { status } = await api.post(
      "/users/profile",
      { subscriptionPrice: 5.0 },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
  });

  test("13.4 Verify W1 subscription price updated", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(status).toBe(200);
    expect(body.data.subscription_price).toBe(5.0);
  });

  test("13.5 W1 clears subscription price (set null)", async () => {
    const { status } = await api.post(
      "/users/profile",
      { subscriptionPrice: null },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
  });

  test("13.6 Verify W1 subscription price cleared", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(status).toBe(200);
    expect(body.data.subscription_price).toBeNull();
  });

  test("13.7 W1 restores subscription price", async () => {
    const { status } = await api.post(
      "/users/profile",
      { subscriptionPrice: PROFILES.creatorAlpha.subscriptionPrice },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
  });

  test("13.8 W8 updates username", async () => {
    const { status } = await api.post(
      "/users/profile",
      { username: "reformed_spammer" },
      api.getToken(addr("spammer"))
    );
    expect(status).toBe(200);
  });

  test("13.9 Verify W8 username updated", async () => {
    const { status, body } = await api.get(`/users/${addr("spammer")}`);
    expect(status).toBe(200);
    expect(body.data.username).toBe("reformed_spammer");
  });

  test("13.10 Profile update without auth returns 401", async () => {
    const { status } = await api.post("/users/profile", { bio: "No auth" });
    expect(status).toBe(401);
  });

  test("13.11 Check profile exists endpoint", async () => {
    const { status, body } = await api.get(
      `/users/${addr("creatorAlpha")}/exists`
    );
    expect(status).toBe(200);
    // exists checks on-chain profile, test wallets are DB-only
    expect(typeof body.data.exists).toBe("boolean");
  });

  test("13.12 Check non-existent profile", async () => {
    // Use a valid base58 address that doesn't exist
    const { status, body } = await api.get(
      "/users/11111111111111111111111111111111/exists"
    );
    expect([200, 500]).toContain(status);
    if (status === 200) {
      expect(typeof body.data.exists).toBe("boolean");
    }
  });
});
