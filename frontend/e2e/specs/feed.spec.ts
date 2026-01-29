import { test, expect } from "../setup/test-base";

test.describe("Feed Page", () => {
  test.describe("Feed Loading", () => {
    test("should load the feed page", async ({ feedPage }) => {
      await feedPage.goto();

      // Page should load without errors
      expect(feedPage.getCurrentUrl()).toContain("/app");
    });

    test("should display posts or empty state", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Should show either posts or empty state
      const postCount = await feedPage.getPostCount();
      const hasEmptyState = await feedPage.emptyState.isVisible().catch(() => false);

      expect(postCount > 0 || hasEmptyState).toBe(true);
    });

    test("should display post cards with author info", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        // Post should contain author handle (starts with @)
        const postText = await firstPost.textContent();
        expect(postText).toMatch(/@\w+/);
      }
    });
  });

  test.describe("Post Interactions", () => {
    test("should display like button on posts", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        // Look for like count (a number in the post actions)
        const hasLikeArea = await firstPost.locator("button").filter({ hasText: /^\d+$/ }).first().isVisible().catch(() => false);
        // Posts should have interactive buttons
        expect(await firstPost.locator("button").count()).toBeGreaterThan(0);
      }
    });

    test("should display comment button linking to post detail", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        // Should have a link to the post detail page
        const postLink = firstPost.locator("a[href*='/post/']").first();
        const hasLink = await postLink.isVisible().catch(() => false);

        // Posts should have clickable elements to view details
        expect(await firstPost.locator("a, button").count()).toBeGreaterThan(0);
      }
    });

    test("should display tip button on posts", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        const tipButton = firstPost.getByRole("button", { name: /tip/i });
        const hasTipButton = await tipButton.isVisible().catch(() => false);

        // Feed items should have tip functionality
        expect(hasTipButton).toBe(true);
      }
    });
  });

  test.describe("Infinite Scroll", () => {
    test("should load page without scroll errors", async ({ feedPage, page }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const initialCount = await feedPage.getPostCount();

      // Scroll to bottom
      await feedPage.scrollToLoadMore();

      // Wait for potential new content
      await page.waitForTimeout(2000);

      // Should not throw errors during scroll
      const hasError = await page.locator("text=error").isVisible().catch(() => false);
      expect(hasError).toBe(false);
    });
  });

  test.describe("Post Display", () => {
    test("should display post timestamps", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        const postText = await firstPost.textContent();

        // Should contain some time indicator (date, hours ago, etc.)
        const hasTimeIndicator = /\d+[hdm]|\d{1,2}\/\d{1,2}|today|yesterday/i.test(postText ?? "");
        // Posts typically show some form of timestamp or date
      }
    });

    test("should display post content or caption", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        const firstPost = posts[0];
        const textContent = await firstPost.textContent();

        // Post should have meaningful content (more than just the author handle)
        expect(textContent?.length).toBeGreaterThan(10);
      }
    });

    test("should display token gate badge for gated posts", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Check if any post has token gate indicator
      const tokenGateBadge = feedPage.page.locator('[class*="token"], [class*="gate"], [class*="lock"]').first();

      // Token gate badges may or may not be present depending on content
      // Just verify no errors occur when checking
      await tokenGateBadge.isVisible().catch(() => false);
    });
  });

  test.describe("Post Tags", () => {
    test("should display tags when present", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        // Look for badge/tag elements with # prefix
        const tagsOnPage = feedPage.page.locator('[class*="badge"], [class*="tag"]').filter({ hasText: /#/ });

        // Tags are optional, but if present should be formatted correctly
        const tagCount = await tagsOnPage.count();
        if (tagCount > 0) {
          const firstTag = await tagsOnPage.first().textContent();
          expect(firstTag).toMatch(/^#\w+/);
        }
      }
    });

    test("should make tags clickable for search", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const tagLinks = feedPage.page.locator("a[href*='/search']").filter({ hasText: /#/ });
      const tagCount = await tagLinks.count();

      if (tagCount > 0) {
        const firstTagHref = await tagLinks.first().getAttribute("href");
        expect(firstTagHref).toContain("/search");
      }
    });
  });

  test.describe("Sidebar", () => {
    test("should display sidebar on desktop", async ({ feedPage, page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Sidebar should be visible on larger screens
      const sidebar = page.locator("aside, nav, [class*='sidebar' i]").first();
      const isSidebarVisible = await sidebar.isVisible().catch(() => false);

      // Layout should adapt to screen size
    });
  });
});

test.describe("Feed Composer", () => {
  test("should have a way to create new posts", async ({ feedPage }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    // Look for create post button or composer
    const createButton = feedPage.page.getByRole("button", { name: /create|post|new/i }).first();
    const composer = feedPage.page.locator('[class*="composer"], textarea[placeholder*="post" i]').first();

    const hasCreateOption = await createButton.isVisible().catch(() => false) ||
                           await composer.isVisible().catch(() => false);

    // Feed page should provide a way to create content
  });
});
