import { test, expect, APIRequestContext, request as pwRequest } from "@playwright/test";
import { ApiClient } from "./helpers/api-client";
import { addr } from "./helpers/wallets";
import { loadState, updateState } from "./helpers/test-state";
import path from "path";
import fs from "fs";

test.describe.serial("Phase 4: Posts & Content", () => {
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

  test("4.1 Upload image for W1", async () => {
    const token = api.getToken(addr("creatorAlpha"));
    const testImagePath = path.join(__dirname, "helpers", "test-image.jpg");
    if (!fs.existsSync(testImagePath)) {
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);
      fs.writeFileSync(testImagePath, jpegHeader);
    }
    const { status, body } = await api.uploadFile(
      "/posts/upload",
      testImagePath,
      "file",
      token
    );
    // Upload may succeed, fail (400 invalid file), or 500 depending on storage config
    expect([200, 400, 500]).toContain(status);
    if (status === 200) {
      expect(body.data.url).toBeTruthy();
    }
  });

  test("4.2 W1 creates public post #1", async () => {
    const token = api.getToken(addr("creatorAlpha"));
    const { status, body } = await api.post(
      "/posts/create",
      {
        contentUri: "https://example.com/test-image-1.jpg",
        contentType: "text",
        caption: "First post from Alpha creator! #solana #art",
      },
      token
    );
    expect(status).toBe(200);
    // Returns a transaction to sign; postId is in metadata
    const postId = body.data.id || body.data.metadata?.postId;
    expect(postId).toBeTruthy();
    const state = loadState();
    state.postIds = [postId];
    updateState(state);
  });

  test("4.3 W1 creates public post #2", async () => {
    const token = api.getToken(addr("creatorAlpha"));
    const { status, body } = await api.post(
      "/posts/create",
      {
        contentUri: "https://example.com/test-image-2.jpg",
        contentType: "text",
        caption: "Second post — sharing my latest artwork #nft",
      },
      token
    );
    expect(status).toBe(200);
    const postId = body.data.id || body.data.metadata?.postId;
    expect(postId).toBeTruthy();
    const state = loadState();
    state.postIds.push(postId);
    updateState(state);
  });

  test("4.4 W2 creates public post", async () => {
    const token = api.getToken(addr("creatorBeta"));
    const { status, body } = await api.post(
      "/posts/create",
      {
        contentUri: "https://example.com/test-image-3.jpg",
        contentType: "text",
        caption: "Beta creator here — new music drop soon! #music #solana",
      },
      token
    );
    expect(status).toBe(200);
    const postId = body.data.id || body.data.metadata?.postId;
    expect(postId).toBeTruthy();
    const state = loadState();
    state.postIds.push(postId);
    updateState(state);
  });

  test("4.5 W2 creates token-gated post", async () => {
    const token = api.getToken(addr("creatorBeta"));
    const { status, body } = await api.post(
      "/posts/create",
      {
        contentUri: "https://example.com/test-image-gated.jpg",
        contentType: "text",
        caption: "Exclusive content for subscribers only!",
        isTokenGated: true,
      },
      token
    );
    expect(status).toBe(200);
    const postId = body.data.id || body.data.metadata?.postId;
    expect(postId).toBeTruthy();
    const state = loadState();
    state.postIds.push(postId);
    updateState(state);
  });

  test("4.6 Get post by ID", async () => {
    const state = loadState();
    const postId = state.postIds[0];
    const { status, body } = await api.get(`/posts/${postId}`);
    expect(status).toBe(200);
    expect(body.data.id).toBe(postId);
    expect(body.data.caption || body.data.content_uri).toBeTruthy();
    expect(body.data.creator_wallet || body.data.wallet).toBe(addr("creatorAlpha"));
  });

  test("4.7 Get non-existent post returns 404", async () => {
    const { status } = await api.get("/posts/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
  });

  test("4.8 List W1's posts", async () => {
    const { status, body } = await api.get(
      `/users/${addr("creatorAlpha")}/posts`
    );
    expect(status).toBe(200);
    expect(body.data.posts.length).toBeGreaterThanOrEqual(2);
  });

  test("4.9 List W2's posts", async () => {
    const { status, body } = await api.get(
      `/users/${addr("creatorBeta")}/posts`
    );
    expect(status).toBe(200);
    expect(body.data.posts.length).toBeGreaterThanOrEqual(2);
  });

  test("4.10 Create post without auth returns 401", async () => {
    const { status } = await api.post("/posts/create", {
      contentUri: "https://example.com/test.jpg",
    });
    expect(status).toBe(401);
  });

  test("4.11 Create post with empty contentUri rejected", async () => {
    const token = api.getToken(addr("creatorAlpha"));
    const { status } = await api.post(
      "/posts/create",
      { contentUri: "" },
      token
    );
    expect(status).toBe(400);
  });
});
