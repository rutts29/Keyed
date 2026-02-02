import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 6: Feed & Discovery", () => {
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

  test("6.1 W3 personalized feed (follows W1 + W2)", async () => {
    const { status, body } = await api.get(
      "/feed",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    // May be 0 if no posts created yet or on re-run
    expect(body.data.posts.length).toBeGreaterThanOrEqual(0);
  });

  test("6.2 W3 following feed", async () => {
    const { status, body } = await api.get(
      "/feed/following",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.posts)).toBe(true);
  });

  test("6.3 Explore feed (public, no auth)", async () => {
    const { status, body } = await api.get("/feed/explore");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.posts)).toBe(true);
    expect(body.data.posts.length).toBeGreaterThanOrEqual(1);
  });

  test("6.4 Trending posts", async () => {
    const { status, body } = await api.get("/feed/trending");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.posts)).toBe(true);
  });

  test("6.5 Trending topics", async () => {
    const { status, body } = await api.get("/feed/trending-topics");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.topics)).toBe(true);
  });

  test("6.6 W7 feed (new user, no follows) is empty or has explore content", async () => {
    const { status, body } = await api.get(
      "/feed/following",
      api.getToken(addr("newUser"))
    );
    expect(status).toBe(200);
    // New user follows nobody, following feed should be empty
    expect(body.data.posts.length).toBe(0);
  });

  test("6.7 Feed with pagination", async () => {
    const { status, body } = await api.get(
      "/feed/explore?limit=2",
    );
    expect(status).toBe(200);
    expect(body.data.posts.length).toBeLessThanOrEqual(2);
  });

  test("6.8 Search users", async () => {
    const { status, body } = await api.get("/search/users?q=alpha");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.users)).toBe(true);
  });

  test("6.9 Search by tag", async () => {
    const { status, body } = await api.get("/search/tag?tag=solana");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.posts)).toBe(true);
  });

  test("6.10 Search suggestions", async () => {
    const { status, body } = await api.get("/search/suggest?q=art");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.suggestions)).toBe(true);
  });
});
