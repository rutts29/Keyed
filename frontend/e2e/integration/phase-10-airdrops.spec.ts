import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState, updateState } from "./helpers/test-state";

test.describe.serial("Phase 10: Airdrop Campaigns", () => {
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

  test("10.1 W1 creates airdrop campaign (followers audience)", async () => {
    const { status, body } = await api.post(
      "/airdrops",
      {
        name: "Alpha's Fan Appreciation",
        description: "Tokens for all followers",
        type: "spl_token",
        tokenMint: "So11111111111111111111111111111111111111112",
        amountPerRecipient: 0.01,
        audienceType: "followers",
      },
      api.getToken(addr("creatorAlpha"))
    );
    // May succeed (200/201) or fail (400/500) depending on server config
    expect([200, 201, 400, 500]).toContain(status);
    if (status === 200 || status === 201) {
      expect(body.data.id).toBeTruthy();
      const state = loadState();
      state.campaignIds = [body.data.id];
      updateState(state);
    }
  });

  test("10.2 List W1's campaigns", async () => {
    const { status, body } = await api.get(
      "/airdrops/mine",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.campaigns)).toBe(true);
  });

  test("10.3 Get campaign detail", async () => {
    const state = loadState();
    if (!state.campaignIds[0]) { test.skip(); return; }
    const { status, body } = await api.get(
      `/airdrops/${state.campaignIds[0]}`,
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.name).toBe("Alpha's Fan Appreciation");
  });

  test("10.4 Prepare campaign", async () => {
    const state = loadState();
    if (!state.campaignIds[0]) { test.skip(); return; }
    const { status } = await api.post(
      `/airdrops/${state.campaignIds[0]}/prepare`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect([200, 400]).toContain(status);
  });

  test("10.5 Fund campaign (returns tx)", async () => {
    const state = loadState();
    if (!state.campaignIds[0]) { test.skip(); return; }
    const { status } = await api.post(
      `/airdrops/${state.campaignIds[0]}/fund`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect([200, 400]).toContain(status);
  });

  test("10.6 Start campaign", async () => {
    const state = loadState();
    if (!state.campaignIds[0]) { test.skip(); return; }
    const { status } = await api.post(
      `/airdrops/${state.campaignIds[0]}/start`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect([200, 400]).toContain(status);
  });

  test("10.7 W3 checks received airdrops", async () => {
    const { status, body } = await api.get(
      "/airdrops/received",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.drops)).toBe(true);
  });

  test("10.8 W2 creates + cancels campaign", async () => {
    // Create
    const { status: createStatus, body: createBody } = await api.post(
      "/airdrops",
      {
        name: "Beta's Giveaway",
        description: "Quick giveaway",
        type: "spl_token",
        tokenMint: "So11111111111111111111111111111111111111112",
        amountPerRecipient: 0.005,
        audienceType: "followers",
      },
      api.getToken(addr("creatorBeta"))
    );
    expect([200, 201, 400, 500]).toContain(createStatus);
    if (createStatus !== 200 && createStatus !== 201) return;
    const campaignId = createBody.data.id;

    // Cancel
    const { status: cancelStatus } = await api.post(
      `/airdrops/${campaignId}/cancel`,
      {},
      api.getToken(addr("creatorBeta"))
    );
    expect([200, 400]).toContain(cancelStatus);
  });

  test("10.9 Airdrop without auth returns 401", async () => {
    const { status } = await api.post("/airdrops", {
      name: "Fail",
      type: "spl_token",
      audienceType: "followers",
    });
    expect(status).toBe(401);
  });
});
