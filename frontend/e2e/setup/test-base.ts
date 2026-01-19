/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from "@playwright/test";
import { injectMockWallet, TestWalletType, TEST_WALLETS } from "./mock-wallet";
import { FeedPage } from "../pages/feed.page";
import { ProfilePage } from "../pages/profile.page";
import { SearchPage } from "../pages/search.page";
import { TipModal } from "../pages/modals/tip.modal";
import { ShieldModal } from "../pages/modals/shield.modal";
import { CreatePostModal } from "../pages/modals/create-post.modal";

/**
 * Extended test fixtures with page objects and mock wallet support.
 */
type TestFixtures = {
  feedPage: FeedPage;
  profilePage: ProfilePage;
  searchPage: SearchPage;
  tipModal: TipModal;
  shieldModal: ShieldModal;
  createPostModal: CreatePostModal;
  mockWalletType: TestWalletType;
};

/**
 * Custom test with fixtures for SolShare E2E testing.
 */
export const test = base.extend<TestFixtures>({
  // Default mock wallet type - cast needed for Playwright fixture option type
  mockWalletType: ["viewer", { option: true }] as [TestWalletType, { option: true }],

  // Inject mock wallet before each test
  page: async ({ page, mockWalletType }, use) => {
    await injectMockWallet(page, mockWalletType);
    await use(page);
  },

  // Page object fixtures
  feedPage: async ({ page }, use) => {
    await use(new FeedPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },

  tipModal: async ({ page }, use) => {
    await use(new TipModal(page));
  },

  shieldModal: async ({ page }, use) => {
    await use(new ShieldModal(page));
  },

  createPostModal: async ({ page }, use) => {
    await use(new CreatePostModal(page));
  },
});

export { expect, TEST_WALLETS };

/**
 * Helper to create a test with a specific wallet type.
 */
export function testWithWallet(walletType: TestWalletType) {
  return test.extend<{ mockWalletType: TestWalletType }>({
    mockWalletType: [walletType, { option: true }] as [TestWalletType, { option: true }],
  });
}

/**
 * Creator wallet test fixture.
 */
export const creatorTest = testWithWallet("creator");

/**
 * Tipper wallet test fixture.
 */
export const tipperTest = testWithWallet("tipper");

/**
 * Viewer wallet test fixture.
 */
export const viewerTest = testWithWallet("viewer");
