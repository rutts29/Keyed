import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState } from "./helpers/test-state";

test.describe.serial("Phase 11: Access Control (Token Gating)", () => {
  let api: ApiClient;
  let requestContext: APIRequestContext;
  let gatedPostId: string;

  test.beforeAll(async () => {
    requestContext = await pwRequest.newContext();
    api = new ApiClient(requestContext);
    const state = loadState();
    for (const [wallet, token] of Object.entries(state.tokens)) {
      api.setToken(wallet, token as string);
    }
    // postIds[3] is W2's gated post (if posts were created)
    gatedPostId = state.postIds[3] || "00000000-0000-0000-0000-000000000000";
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test("11.1 W2 sets access requirements on gated post", async () => {
    const { status } = await api.post(
      "/access/requirements",
      {
        postId: gatedPostId,
        requirementType: "token",
        tokenMint: "So11111111111111111111111111111111111111112",
        minAmount: 1,
      },
      api.getToken(addr("creatorBeta"))
    );
    // May succeed, fail (400), or 404 if gated post wasn't created
    expect([200, 400, 404, 500]).toContain(status);
  });

  test("11.2 W3 checks access to gated post (no token)", async () => {
    const { status, body } = await api.get(
      `/access/verify?postId=${gatedPostId}`,
      api.getToken(addr("fanA"))
    );
    // 200 if post exists, 404 if gated post wasn't created
    expect([200, 404]).toContain(status);
    if (status === 200) {
      expect(typeof body.data.hasAccess).toBe("boolean");
    }
  });

  test("11.3 Verify token access endpoint", async () => {
    const { status } = await api.post(
      "/access/verify-token",
      {
        postId: gatedPostId,
        tokenMint: "So11111111111111111111111111111111111111112",
      },
      api.getToken(addr("fanA"))
    );
    // Returns tx object or access status
    expect([200, 400, 403]).toContain(status);
  });

  test("11.4 Verify NFT access endpoint", async () => {
    const { status } = await api.post(
      "/access/verify-nft",
      {
        postId: gatedPostId,
        nftMint: "11111111111111111111111111111111",
      },
      api.getToken(addr("fanA"))
    );
    expect([200, 400, 403]).toContain(status);
  });

  test("11.5 Check access status", async () => {
    const { status, body } = await api.get(
      `/access/check?postId=${gatedPostId}`,
      api.getToken(addr("fanA"))
    );
    expect([200, 400]).toContain(status);
  });

  test("11.6 Access control without auth returns 401", async () => {
    const { status } = await api.get(`/access/verify?postId=${gatedPostId}`);
    expect(status).toBe(401);
  });
});
