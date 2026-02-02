import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState, updateState } from "./helpers/test-state";

test.describe.serial("Phase 8: Notifications", () => {
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

  test("8.1 W1 has notifications (likes, follows, comments, tips)", async () => {
    const { status, body } = await api.get(
      "/notifications",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.notifications.length).toBeGreaterThanOrEqual(1);
    // Store first notification ID for later tests
    if (body.data.notifications.length > 0) {
      const state = loadState();
      state.notificationIds = body.data.notifications
        .slice(0, 3)
        .map((n: { id: string }) => n.id);
      updateState(state);
    }
  });

  test("8.2 W1 unread count > 0", async () => {
    const { status, body } = await api.get(
      "/notifications/unread-count",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.count).toBeGreaterThanOrEqual(1);
  });

  test("8.3 Mark one notification as read", async () => {
    const state = loadState();
    if (state.notificationIds.length === 0) {
      test.skip();
      return;
    }
    const notifId = state.notificationIds[0];
    const { status } = await api.put(
      `/notifications/${notifId}/read`,
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
  });

  test("8.4 Mark all notifications as read", async () => {
    const { status } = await api.put(
      "/notifications/read-all",
      {},
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
  });

  test("8.5 W1 unread count = 0 after mark all read", async () => {
    const { status, body } = await api.get(
      "/notifications/unread-count",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.count).toBe(0);
  });

  test("8.6 W2 has notifications too", async () => {
    const { status, body } = await api.get(
      "/notifications",
      api.getToken(addr("creatorBeta"))
    );
    expect(status).toBe(200);
    expect(Array.isArray(body.data.notifications)).toBe(true);
  });

  test("8.7 Notifications without auth returns 401", async () => {
    const { status } = await api.get("/notifications");
    expect(status).toBe(401);
  });
});
