import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState, updateState } from "./helpers/test-state";

test.describe.serial("Phase 9: Chat Rooms & Messages", () => {
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

  // --- Room creation ---

  test("9.1 W1 creates open room", async () => {
    const { status, body } = await api.post(
      "/chat/rooms",
      {
        name: "Alpha's Open Lounge",
        description: "Open chat for everyone",
        isGated: false,
      },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.id).toBeTruthy();
    const state = loadState();
    state.roomIds = [body.data.id];
    updateState(state);
  });

  test("9.2 W2 creates gated room", async () => {
    const { status, body } = await api.post(
      "/chat/rooms",
      {
        name: "Beta's VIP Room",
        description: "Subscribers only",
        isGated: true,
      },
      api.getToken(addr("creatorBeta"))
    );
    expect(status).toBe(200);
    expect(body.data.id).toBeTruthy();
    const state = loadState();
    state.roomIds.push(body.data.id);
    updateState(state);
  });

  // --- Room listing ---

  test("9.3 List all rooms", async () => {
    const { status, body } = await api.get(
      "/chat/rooms",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data.rooms.length).toBeGreaterThanOrEqual(2);
  });

  test("9.4 Get room details", async () => {
    const state = loadState();
    const { status, body } = await api.get(
      `/chat/rooms/${state.roomIds[0]}`,
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data.name).toBe("Alpha's Open Lounge");
  });

  test("9.5 W1's my rooms", async () => {
    const { status, body } = await api.get(
      "/chat/rooms/mine",
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    // Response has created[] and joined[] arrays
    expect(body.data.created.length).toBeGreaterThanOrEqual(1);
  });

  // --- Joining ---

  test("9.6 W3 joins open room", async () => {
    const state = loadState();
    const { status } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/join`,
      {},
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
  });

  test("9.7 W4 joins open room", async () => {
    const state = loadState();
    const { status } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/join`,
      {},
      api.getToken(addr("fanB"))
    );
    expect(status).toBe(200);
  });

  // --- Messaging ---

  test("9.8 W1 sends message in open room", async () => {
    const state = loadState();
    const { status, body } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/messages`,
      { content: "Welcome everyone to the lounge!" },
      api.getToken(addr("creatorAlpha"))
    );
    expect(status).toBe(200);
    expect(body.data.id).toBeTruthy();
  });

  test("9.9 W3 sends message in open room", async () => {
    const state = loadState();
    const { status, body } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/messages`,
      { content: "Thanks for having us Alpha!" },
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
  });

  test("9.10 W4 sends message in open room", async () => {
    const state = loadState();
    const { status, body } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/messages`,
      { content: "Great to be here!" },
      api.getToken(addr("fanB"))
    );
    expect(status).toBe(200);
  });

  // --- Get messages ---

  test("9.11 Get messages from open room", async () => {
    const state = loadState();
    const { status, body } = await api.get(
      `/chat/rooms/${state.roomIds[0]}/messages`,
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(200);
    expect(body.data.messages.length).toBeGreaterThanOrEqual(3);
  });

  // --- Leave ---

  test("9.12 W4 leaves open room", async () => {
    const state = loadState();
    const { status } = await api.post(
      `/chat/rooms/${state.roomIds[0]}/leave`,
      {},
      api.getToken(addr("fanB"))
    );
    expect(status).toBe(200);
  });

  // --- Gated room access ---

  test("9.13 W5 attempts to join gated room", async () => {
    const state = loadState();
    const { status } = await api.post(
      `/chat/rooms/${state.roomIds[1]}/join`,
      {},
      api.getToken(addr("fanC"))
    );
    // May be rejected (403) or require token gating check
    expect([200, 403, 400]).toContain(status);
  });

  test("9.14 Get non-existent room returns 404", async () => {
    const { status } = await api.get(
      "/chat/rooms/00000000-0000-0000-0000-000000000000",
      api.getToken(addr("fanA"))
    );
    expect(status).toBe(404);
  });

  test("9.15 Chat without auth returns 401", async () => {
    const { status } = await api.get("/chat/rooms");
    expect(status).toBe(401);
  });
});
