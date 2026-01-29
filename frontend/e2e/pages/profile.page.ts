import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for Profile pages.
 */
export class ProfilePage extends BasePage {
  readonly avatar: Locator;
  readonly username: Locator;
  readonly bio: Locator;
  readonly followButton: Locator;
  readonly followersCount: Locator;
  readonly followingCount: Locator;
  readonly postCount: Locator;
  readonly postsTab: Locator;
  readonly likesTab: Locator;
  readonly posts: Locator;
  readonly verifiedBadge: Locator;
  readonly tipButton: Locator;

  constructor(page: Page) {
    super(page);
    // Use data-slot attribute for Avatar component
    this.avatar = page.locator('[data-slot="avatar"], [class*="Avatar"]').first();
    this.username = page.locator("h1, h2").first();
    this.bio = page.locator("p").filter({ hasText: /.{20,}/ }).first();
    this.followButton = page.getByRole("button", { name: /follow/i });
    this.followersCount = page.getByText(/followers/i);
    this.followingCount = page.getByText(/following/i);
    this.postCount = page.getByText(/posts/i);
    this.postsTab = page.getByRole("tab", { name: /posts/i });
    this.likesTab = page.getByRole("tab", { name: /likes/i });
    // Use data-slot attribute from Card component
    this.posts = page.locator('[data-slot="card"]').filter({ hasText: /@/ });
    this.verifiedBadge = page.locator('[class*="verified"], [aria-label*="verified"]');
    this.tipButton = page.getByRole("button", { name: /tip|subscribe/i }).first();
  }

  /**
   * Navigate to a user's profile.
   */
  async goto(wallet: string): Promise<void> {
    await super.goto(`/profile/${wallet}`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Follow the user.
   */
  async follow(): Promise<void> {
    await this.followButton.click();
  }

  /**
   * Unfollow the user.
   */
  async unfollow(): Promise<void> {
    // Button text changes to "Following" or "Unfollow" when already following
    const unfollowButton = this.page.getByRole("button", { name: /following|unfollow/i });
    await unfollowButton.click();
  }

  /**
   * Check if following the user.
   */
  async isFollowing(): Promise<boolean> {
    const buttonText = await this.followButton.textContent();
    return buttonText?.toLowerCase().includes("following") ?? false;
  }

  /**
   * Get the follower count.
   */
  async getFollowerCount(): Promise<number> {
    const text = await this.followersCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get the following count.
   */
  async getFollowingCount(): Promise<number> {
    const text = await this.followingCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click the tip button to tip the creator.
   */
  async clickTip(): Promise<void> {
    await this.tipButton.click();
  }

  /**
   * Assert profile loaded successfully.
   */
  async expectProfileLoaded(): Promise<void> {
    await expect(this.avatar).toBeVisible();
  }

  /**
   * Assert user is verified.
   */
  async expectVerified(): Promise<void> {
    await expect(this.verifiedBadge).toBeVisible();
  }

  /**
   * Get profile username text.
   */
  async getUsername(): Promise<string> {
    return (await this.username.textContent()) ?? "";
  }

  /**
   * Get posts on the profile.
   */
  async getPosts(): Promise<Locator[]> {
    return this.posts.all();
  }
}
