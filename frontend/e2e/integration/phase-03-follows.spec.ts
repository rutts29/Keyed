import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 3: Social Graph (Follows)", () => {
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

  test("3.1 W3 follows W1", async () => {
    const { status, body } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("fanA"))
    );
    // 200 = new follow, 400 = already following (re-run)
    expect([200, 400]).toContain(status);
  });

  test("3.2 W3 follows W2", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorBeta")}/follow`,
      {},
      api.getToken(addr("fanA"))
    );
    expect([200, 400]).toContain(status);
  });

  test("3.3 W4 follows W1", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("fanB"))
    );
    expect([200, 400]).toContain(status);
  });

  test("3.4 W5 follows W1", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("fanC"))
    );
    expect([200, 400]).toContain(status);
  });

  test("3.5 W4 follows W2", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorBeta")}/follow`,
      {},
      api.getToken(addr("fanB"))
    );
    expect([200, 400]).toContain(status);
  });

  test("3.6 W1 follows W2 (cross-creator)", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorBeta")}/follow`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect([200, 400]).toContain(status);
  });

  test("3.7 Double follow rejected", async () => {
    const { status, body } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe("ALREADY_FOLLOWING");
  });

  test("3.8 Self-follow rejected", async () => {
    const { status, body } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_ACTION");
  });

  test("3.9 W1 has 3 followers", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(status).toBe(200);
    expect(body.data.follower_count).toBe(3);
  });

  test("3.10 W2 has 3 followers (W3, W4, W1)", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorBeta")}`);
    expect(status).toBe(200);
    expect(body.data.follower_count).toBe(3);
  });

  test("3.11 List W1's followers", async () => {
    const { status, body } = await api.get(
      `/users/${addr("creatorAlpha")}/followers`
    );
    expect(status).toBe(200);
    const wallets = body.data.followers.map((f: { wallet: string }) => f.wallet);
    expect(wallets).toContain(addr("fanA"));
    expect(wallets).toContain(addr("fanB"));
    expect(wallets).toContain(addr("fanC"));
  });

  test("3.12 List W3's following", async () => {
    const { status, body } = await api.get(
      `/users/${addr("fanA")}/following`
    );
    expect(status).toBe(200);
    const wallets = body.data.following.map((f: { wallet: string }) => f.wallet);
    expect(wallets).toContain(addr("creatorAlpha"));
    expect(wallets).toContain(addr("creatorBeta"));
  });

  test("3.13 Profile shows isFollowing=true", async () => {
    const { status, body } = await api.get(
      `/users/${addr("creatorAlpha")}`,
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data.isFollowing).toBe(true);
  });

  test("3.14 W5 unfollows W1", async () => {
    const { status } = await api.del(
      `/users/${addr("creatorAlpha")}/follow`,
      api.getToken(addr("fanC"))
    );
    expect(status).toBe(200);
  });

  test("3.15 W1 follower count decremented to 2", async () => {
    const { status, body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(status).toBe(200);
    expect(body.data.follower_count).toBe(2);
  });

  test("3.16 W5 re-follows W1", async () => {
    const { status } = await api.post(
      `/users/${addr("creatorAlpha")}/follow`,
      {},
      api.getToken(addr("fanC"))
    );
    expect(status).toBe(200);
  });

  test("3.17 W1 follower count back to 3", async () => {
    const { body } = await api.get(`/users/${addr("creatorAlpha")}`);
    expect(body.data.follower_count).toBe(3);
  });
});
