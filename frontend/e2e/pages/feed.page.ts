import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Feed page.
 */
export class FeedPage extends BasePage {
  readonly postCards: Locator;
  readonly createPostButton: Locator;
  readonly refreshButton: Locator;
  readonly loadingSpinner: Locator;
  readonly emptyState: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    super(page);
    // Use data-slot attribute from Card component, filter for posts with @ handles
    this.postCards = page.locator('[data-slot="card"]').filter({ hasText: /@/ });
    this.createPostButton = page.getByRole("button", { name: /create|post|publish/i });
    this.refreshButton = page.getByRole("button", { name: /refresh/i });
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.emptyState = page.getByText(/no posts|empty|nothing/i);
    this.sidebar = page.locator("aside, [class*='Sidebar']");
  }

  /**
   * Navigate to the feed page.
   */
  async goto(): Promise<void> {
    await super.goto("/app");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Get all visible post cards.
   */
  async getPostCards(): Promise<Locator[]> {
    await this.postCards.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    return this.postCards.all();
  }

  /**
   * Get post card by index.
   */
  getPostByIndex(index: number): Locator {
    return this.postCards.nth(index);
  }

  /**
   * Get post card by author name.
   */
  getPostByAuthor(authorName: string): Locator {
    return this.postCards.filter({ hasText: authorName }).first();
  }

  /**
   * Click the like button on a post.
   */
  async likePost(postLocator: Locator): Promise<void> {
    const likeButton = postLocator.locator("button").filter({ hasText: /^\d+$/ }).first();
    await likeButton.click();
  }

  /**
   * Click the comment button on a post.
   */
  async clickCommentButton(postLocator: Locator): Promise<void> {
    const commentButton = postLocator.locator("a, button").filter({ has: this.page.locator('[class*="MessageCircle"]') }).first();
    await commentButton.click();
  }

  /**
   * Click the tip button on a post.
   */
  async clickTipButton(postLocator: Locator): Promise<void> {
    const tipButton = postLocator.getByRole("button", { name: /tip/i });
    await tipButton.click();
  }

  /**
   * Scroll to load more posts (infinite scroll).
   */
  async scrollToLoadMore(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    // Wait for potential new content to load
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for feed to finish loading.
   */
  async waitForFeedLoaded(): Promise<void> {
    // Wait for either posts to appear or empty state
    await Promise.race([
      this.postCards.first().waitFor({ state: "visible", timeout: 10000 }),
      this.emptyState.waitFor({ state: "visible", timeout: 10000 }),
    ]).catch(() => {});
  }

  /**
   * Assert feed has posts.
   */
  async expectPostsVisible(minCount = 1): Promise<void> {
    await expect(this.postCards).toHaveCount(minCount, { timeout: 10000 });
  }

  /**
   * Assert a post contains specific text.
   */
  async expectPostWithText(text: string): Promise<void> {
    await expect(this.postCards.filter({ hasText: text })).toBeVisible();
  }

  /**
   * Get the post count.
   */
  async getPostCount(): Promise<number> {
    return this.postCards.count();
  }

  /**
   * Check if sidebar is visible.
   */
  async isSidebarVisible(): Promise<boolean> {
    return this.sidebar.isVisible();
  }
}
