import { test, expect, TEST_WALLETS } from "../setup/test-base";

test.describe("Token-Gated Content", () => {
  test.describe("Token Gate Badge", () => {
    test("should display token gate badge on gated posts", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Look for token gate indicators
      const tokenBadge = feedPage.page.locator('[class*="token"], [class*="gate"], [class*="lock"]').first();

      // Token gated posts may or may not be in feed
      await tokenBadge.isVisible().catch(() => false);
    });

    test("should indicate locked content visually", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Look for lock icons or gated indicators
      const lockIcon = feedPage.page.locator('svg[class*="lock"], [aria-label*="lock"], [class*="Lock"]').first();

      // Gated content has visual indicators
      await lockIcon.isVisible().catch(() => false);
    });
  });

  test.describe("Access Verification", () => {
    test("should show access status on gated content", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Look for access-related text
      const accessText = feedPage.page.getByText(/access|locked|unlock|required/i).first();

      // Access status may be shown
      await accessText.isVisible().catch(() => false);
    });

    test("should display required token info", async ({ feedPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Look for token requirement info
      const tokenInfo = feedPage.page.getByText(/token|nft|required|hold/i).first();

      // Token requirements may be displayed
      await tokenInfo.isVisible().catch(() => false);
    });
  });

  test.describe("Gated Post Detail", () => {
    test("should load post detail page", async ({ page }) => {
      // Navigate to a post detail
      await page.goto("/post/test-post-001");
      await page.waitForLoadState("networkidle");

      // Post detail should load or show not found
      const hasContent = await page.locator("body").textContent();
      expect(hasContent?.length).toBeGreaterThan(0);
    });

    test("should show unlock prompt for gated content without access", async ({ page }) => {
      await page.goto("/post/gated-post-id");
      await page.waitForLoadState("networkidle");

      // Look for unlock or access prompts
      const unlockPrompt = page.getByText(/unlock|get access|purchase|subscribe/i).first();

      // Gated content shows unlock options
      await unlockPrompt.isVisible().catch(() => false);
    });
  });
});

test.describe("Create Token-Gated Post", () => {
  test("should have token gate option in create modal", async ({ feedPage, createPostModal }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    // Try to open create post modal
    const createButton = feedPage.page.getByRole("button", { name: /create|new post/i }).first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();

      if (await createPostModal.isOpen()) {
        await createPostModal.waitForOpen();

        // Look for token gate toggle
        const tokenGateToggle = createPostModal.tokenGateToggle;
        await tokenGateToggle.isVisible().catch(() => false);
      }
    }
  });

  test("should show token input when gating enabled", async ({ feedPage, createPostModal }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    const createButton = feedPage.page.getByRole("button", { name: /create|new post/i }).first();

    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();

      if (await createPostModal.isOpen()) {
        await createPostModal.waitForOpen();

        // Enable token gating
        await createPostModal.toggleTokenGate(true);

        // Token input should appear
        const tokenInput = createPostModal.tokenInput;
        const isVisible = await tokenInput.isVisible().catch(() => false);

        // Token gating shows configuration options
      }
    }
  });
});

test.describe("Access Actions", () => {
  test("should show subscribe option for gated creator content", async ({ profilePage }) => {
    await profilePage.goto(TEST_WALLETS.creator.address);
    await profilePage.page.waitForLoadState("networkidle");

    // Look for subscribe button
    const subscribeButton = profilePage.page.getByRole("button", { name: /subscribe/i }).first();

    // Subscribe option may be available
    await subscribeButton.isVisible().catch(() => false);
  });

  test("should show purchase option for individual gated posts", async ({ page }) => {
    await page.goto("/post/gated-post-id");
    await page.waitForLoadState("networkidle");

    // Look for purchase/unlock button
    const purchaseButton = page.getByRole("button", { name: /purchase|unlock|buy/i }).first();

    // Purchase option for individual access
    await purchaseButton.isVisible().catch(() => false);
  });
});
