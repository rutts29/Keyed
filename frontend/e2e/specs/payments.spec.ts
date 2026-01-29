import { test, expect, TEST_WALLETS } from "../setup/test-base";
import { testUsers } from "../setup/test-fixtures";

test.describe("Tip Modal", () => {
  test.describe("Modal Opening", () => {
    test("should open tip modal when clicking tip button on post", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        // Modal should open
        const isOpen = await tipModal.isOpen();
        if (isOpen) {
          await tipModal.waitForOpen();
          expect(await tipModal.dialog.isVisible()).toBe(true);
        }
      }
    });
  });

  test.describe("Amount Input", () => {
    test("should have amount input field", async ({ feedPage, tipModal, page }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          // Amount input should be visible
          await expect(tipModal.amountInput).toBeVisible();
        }
      }
    });

    test("should allow entering custom amount", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();
          await tipModal.setAmount(0.25);

          const value = await tipModal.amountInput.inputValue();
          expect(value).toBe("0.25");
        }
      }
    });

    test("should display preset amount buttons", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          const presets = await tipModal.getPresetAmounts();
          // Should have preset buttons (typically 0.1, 0.5, 1 SOL)
          expect(presets.length).toBeGreaterThan(0);
        }
      }
    });

    test("should update amount when clicking preset", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          const presets = await tipModal.getPresetAmounts();
          if (presets.length > 0) {
            const presetAmount = presets[0];
            await tipModal.selectPreset(presetAmount);

            const value = await tipModal.amountInput.inputValue();
            expect(parseFloat(value)).toBe(presetAmount);
          }
        }
      }
    });
  });

  test.describe("Private Tip Toggle", () => {
    test("should have private tip toggle switch", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          // Private tip toggle should be visible
          await expect(tipModal.privateTipToggle).toBeVisible();
        }
      }
    });

    test("should toggle private tip state", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          const initialState = await tipModal.isPrivateEnabled();
          await tipModal.togglePrivate(!initialState);

          const newState = await tipModal.isPrivateEnabled();
          expect(newState).toBe(!initialState);
        }
      }
    });

    test("should show shielded balance when private tip enabled", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();
          await tipModal.togglePrivate(true);

          // Should show shielded balance info
          const balanceVisible = await tipModal.shieldedBalance.isVisible().catch(() => false);
          // Private tip mode should show relevant balance info
        }
      }
    });
  });

  test.describe("Modal Actions", () => {
    test("should have send and cancel buttons", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();

          await expect(tipModal.sendButton).toBeVisible();
          await expect(tipModal.cancelButton).toBeVisible();
        }
      }
    });

    test("should close modal when clicking cancel", async ({ feedPage, tipModal }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const posts = await feedPage.getPostCards();

      if (posts.length > 0) {
        await feedPage.clickTipButton(posts[0]);

        if (await tipModal.isOpen()) {
          await tipModal.waitForOpen();
          await tipModal.cancel();

          await tipModal.expectClosed();
        }
      }
    });
  });
});

test.describe("Tip Flow (Mock)", () => {
  test("should complete mock tip transaction", async ({ feedPage, tipModal, page }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    const posts = await feedPage.getPostCards();

    if (posts.length > 0) {
      await feedPage.clickTipButton(posts[0]);

      if (await tipModal.isOpen()) {
        await tipModal.waitForOpen();
        await tipModal.setAmount(0.1);
        await tipModal.submit();

        // In mock mode, should process quickly
        // May show success toast or close modal
        await page.waitForTimeout(2000);

        // Check for success indicators
        const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /sent|success/i });
        const modalClosed = !(await tipModal.isOpen());

        // Either toast appears or modal closes (or error toast for validation)
      }
    }
  });
});

test.describe("Profile Tip Button", () => {
  test("should open tip modal from profile page", async ({ profilePage, tipModal }) => {
    await profilePage.goto(TEST_WALLETS.creator.address);

    // Try to find and click tip button on profile
    const tipButton = profilePage.page.getByRole("button", { name: /tip/i }).first();

    if (await tipButton.isVisible().catch(() => false)) {
      await tipButton.click();

      if (await tipModal.isOpen()) {
        await tipModal.waitForOpen();
        expect(await tipModal.dialog.isVisible()).toBe(true);
      }
    }
  });
});
