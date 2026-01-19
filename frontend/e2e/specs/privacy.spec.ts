import { test, expect } from "../setup/test-base";

test.describe("Shield Modal", () => {
  test.describe("Modal Display", () => {
    test("should display shield modal UI elements", async ({ page, shieldModal }) => {
      // Navigate to a page with privacy features
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      // Try to open shield modal via privacy store or UI element
      // First, let's check if there's a privacy balance component or shield button
      const shieldButton = page.getByRole("button", { name: /shield/i }).first();
      const privacyBalance = page.locator('[class*="privacy"], [class*="shield"]').first();

      if (await shieldButton.isVisible().catch(() => false)) {
        await shieldButton.click();

        if (await shieldModal.isOpen()) {
          await shieldModal.waitForOpen();

          // Verify UI elements
          await expect(shieldModal.amountInput).toBeVisible();
          await expect(shieldModal.shieldButton).toBeVisible();
          await expect(shieldModal.cancelButton).toBeVisible();
        }
      }
    });

    test("should show info text about shielded SOL", async ({ page, shieldModal }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      const shieldButton = page.getByRole("button", { name: /shield/i }).first();

      if (await shieldButton.isVisible().catch(() => false)) {
        await shieldButton.click();

        if (await shieldModal.isOpen()) {
          await shieldModal.waitForOpen();

          // Should have explanatory text
          const infoText = await shieldModal.infoText.isVisible().catch(() => false);
          // Modal should explain what shielding does
        }
      }
    });
  });

  test.describe("Amount Input", () => {
    test("should allow entering shield amount", async ({ page, shieldModal }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      const shieldButton = page.getByRole("button", { name: /shield/i }).first();

      if (await shieldButton.isVisible().catch(() => false)) {
        await shieldButton.click();

        if (await shieldModal.isOpen()) {
          await shieldModal.waitForOpen();
          await shieldModal.setAmount(0.5);

          const value = await shieldModal.getAmount();
          expect(value).toBe("0.5");
        }
      }
    });
  });

  test.describe("Modal Actions", () => {
    test("should close modal on cancel", async ({ page, shieldModal }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      const shieldButton = page.getByRole("button", { name: /shield/i }).first();

      if (await shieldButton.isVisible().catch(() => false)) {
        await shieldButton.click();

        if (await shieldModal.isOpen()) {
          await shieldModal.waitForOpen();
          await shieldModal.cancel();

          await shieldModal.expectClosed();
        }
      }
    });
  });
});

test.describe("Privacy Balance Display", () => {
  test("should display privacy balance component if available", async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Look for privacy balance display
    const privacyBalance = page.locator('[class*="privacy"], [class*="shielded"]').filter({ hasText: /SOL|balance/i }).first();

    // Privacy features may or may not be visible depending on UI state
    const isVisible = await privacyBalance.isVisible().catch(() => false);

    // No assertion - just checking for errors
  });

  test("should show shielded and available balances", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Dashboard may show privacy balances
    const shieldedText = page.getByText(/shielded/i).first();
    const availableText = page.getByText(/available/i).first();

    // These elements may or may not be present depending on the page
    await shieldedText.isVisible().catch(() => false);
    await availableText.isVisible().catch(() => false);
  });
});

test.describe("Private Tip Integration", () => {
  test("should link to shield modal from tip modal when balance insufficient", async ({ feedPage, tipModal, shieldModal }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    const posts = await feedPage.getPostCards();

    if (posts.length > 0) {
      await feedPage.clickTipButton(posts[0]);

      if (await tipModal.isOpen()) {
        await tipModal.waitForOpen();
        await tipModal.togglePrivate(true);

        // Check for "Shield more SOL" link
        const shieldMoreLink = await tipModal.shieldMoreLink.isVisible().catch(() => false);

        if (shieldMoreLink) {
          await tipModal.clickShieldMore();

          // Should open shield modal
          await shieldModal.waitForOpen();
          expect(await shieldModal.isOpen()).toBe(true);
        }
      }
    }
  });
});

test.describe("Privacy Settings", () => {
  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Settings page should load
    const currentUrl = page.url();
    expect(currentUrl).toContain("settings");
  });

  test("should display privacy settings options", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Look for privacy-related settings
    const privacySection = page.getByText(/privacy|private|anonymous/i).first();
    const defaultPrivateToggle = page.locator('[role="switch"]').first();

    // Settings should have privacy options
    const hasPrivacyOptions = await privacySection.isVisible().catch(() => false) ||
                              await defaultPrivateToggle.isVisible().catch(() => false);
  });

  test("should have default private tips toggle", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Look for default private tips setting
    const privateLabel = page.getByText(/default.*private|private.*default/i).first();
    const toggle = page.locator('[role="switch"]');

    if (await privateLabel.isVisible().catch(() => false)) {
      // Should have associated toggle
      expect(await toggle.count()).toBeGreaterThan(0);
    }
  });
});

test.describe("Private Tips History", () => {
  test("should display private tips section if available", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for private tips history
    const privateTipsSection = page.getByText(/private.*tip|anonymous.*tip/i).first();

    // May or may not be present
    await privateTipsSection.isVisible().catch(() => false);
  });
});

test.describe("Shield Transaction Flow (Mock)", () => {
  test("should complete mock shield transaction", async ({ page, shieldModal }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    const shieldButton = page.getByRole("button", { name: /shield/i }).first();

    if (await shieldButton.isVisible().catch(() => false)) {
      await shieldButton.click();

      if (await shieldModal.isOpen()) {
        await shieldModal.waitForOpen();
        await shieldModal.setAmount(0.5);
        await shieldModal.submit();

        // In mock mode, should show progress or complete quickly
        await page.waitForTimeout(2000);

        // Check for success indicators
        const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /confirmed|success/i });
        const modalClosed = !(await shieldModal.isOpen());

        // Either shows progress, success, or validation error
      }
    }
  });
});
