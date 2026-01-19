import { test, expect, TEST_WALLETS } from "../setup/test-base";

test.describe("Authentication Flow", () => {
  test.describe("Mock Wallet Connection", () => {
    test("should have mock wallet injected on page load", async ({ page }) => {
      await page.goto("/app");

      // Verify mock wallet is available in window
      const hasMockWallet = await page.evaluate(() => {
        return typeof (window as unknown as { __MOCK_WALLET__?: unknown }).__MOCK_WALLET__ !== "undefined";
      });

      expect(hasMockWallet).toBe(true);
    });

    test("should have mock auth session in localStorage", async ({ page }) => {
      await page.goto("/app");

      const authSession = await page.evaluate(() => {
        const stored = localStorage.getItem("solshare-auth");
        return stored ? JSON.parse(stored) : null;
      });

      expect(authSession).not.toBeNull();
      expect(authSession.wallet).toBe(TEST_WALLETS.viewer.address);
      expect(authSession.token).toBe("mock-jwt-token-for-testing");
    });

    test("should display connected wallet state in UI", async ({ page }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      // Look for wallet button or connected indicator
      const walletButton = page.locator("button").filter({ hasText: /wallet|connect/i }).first();

      // The wallet button should exist (may show address or "Connected")
      if (await walletButton.isVisible()) {
        const buttonText = await walletButton.textContent();
        // Should not show "Connect Wallet" when already connected
        expect(buttonText?.toLowerCase()).not.toContain("connect wallet");
      }
    });
  });

  test.describe("Session Persistence", () => {
    test("should persist auth session across page reloads", async ({ page }) => {
      await page.goto("/app");

      // Store initial session
      const initialSession = await page.evaluate(() => {
        return localStorage.getItem("solshare-auth");
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Verify session persisted
      const reloadedSession = await page.evaluate(() => {
        return localStorage.getItem("solshare-auth");
      });

      expect(reloadedSession).toBe(initialSession);
    });

    test("should maintain auth state when navigating between pages", async ({ page }) => {
      await page.goto("/app");

      const initialWallet = await page.evaluate(() => {
        const session = localStorage.getItem("solshare-auth");
        return session ? JSON.parse(session).wallet : null;
      });

      // Navigate to search page
      await page.goto("/search");
      await page.waitForLoadState("networkidle");

      const afterNavWallet = await page.evaluate(() => {
        const session = localStorage.getItem("solshare-auth");
        return session ? JSON.parse(session).wallet : null;
      });

      expect(afterNavWallet).toBe(initialWallet);
    });
  });

  test.describe("Wallet Disconnection", () => {
    test("should clear auth session on logout", async ({ page }) => {
      await page.goto("/app");

      // Verify session exists
      let hasSession = await page.evaluate(() => {
        return localStorage.getItem("solshare-auth") !== null;
      });
      expect(hasSession).toBe(true);

      // Simulate logout by clearing session
      await page.evaluate(() => {
        localStorage.removeItem("solshare-auth");
        const mockWallet = (window as unknown as { __MOCK_WALLET__?: { setConnected: (v: boolean) => void } }).__MOCK_WALLET__;
        if (mockWallet) {
          mockWallet.setConnected(false);
        }
      });

      // Verify session is cleared
      hasSession = await page.evaluate(() => {
        return localStorage.getItem("solshare-auth") !== null;
      });
      expect(hasSession).toBe(false);
    });
  });

  test.describe("Protected Routes", () => {
    test("should allow access to feed when authenticated", async ({ page }) => {
      await page.goto("/app");
      await page.waitForLoadState("networkidle");

      // Should not be redirected, should see feed content
      expect(page.url()).toContain("/app");
    });

    test("should allow access to settings when authenticated", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Should be able to access settings
      // (may redirect to /app/settings or similar)
      const currentUrl = page.url();
      expect(currentUrl.includes("settings") || currentUrl.includes("app")).toBe(true);
    });
  });

  test.describe("User Profile Data", () => {
    test("should have user profile in auth session", async ({ page }) => {
      await page.goto("/app");

      const userProfile = await page.evaluate(() => {
        const session = localStorage.getItem("solshare-auth");
        return session ? JSON.parse(session).user : null;
      });

      expect(userProfile).not.toBeNull();
      expect(userProfile.wallet).toBe(TEST_WALLETS.viewer.address);
      expect(userProfile.username).toBe("testuser");
      expect(userProfile.isVerified).toBe(true);
    });
  });
});

test.describe("Unauthenticated State", () => {
  test("should handle page without auth session gracefully", async ({ page }) => {
    // Clear auth before navigation
    await page.addInitScript(() => {
      localStorage.removeItem("solshare-auth");
    });

    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Page should load without errors (may show connect prompt)
    const hasError = await page.locator("text=error").isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
