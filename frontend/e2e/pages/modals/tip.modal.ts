import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Tip Modal.
 */
export class TipModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly amountInput: Locator;
  readonly presetButtons: Locator;
  readonly privateTipToggle: Locator;
  readonly shieldedBalance: Locator;
  readonly shieldMoreLink: Locator;
  readonly sendButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use a more specific selector to target only the Tip modal
    this.dialog = page.getByRole("dialog", { name: /send a tip/i });
    this.title = this.dialog.locator('h2, [class*="DialogTitle"]');
    this.amountInput = this.dialog.getByLabel(/amount/i);
    this.presetButtons = this.dialog.locator("button").filter({ hasText: /\d+\.?\d*\s*SOL/i });
    this.privateTipToggle = this.dialog.locator('[role="switch"]');
    this.shieldedBalance = this.dialog.getByText(/shielded balance/i);
    this.shieldMoreLink = this.dialog.getByRole("button", { name: /shield more/i });
    this.sendButton = this.dialog.getByRole("button", { name: /send tip/i });
    this.cancelButton = this.dialog.getByRole("button", { name: /cancel/i });
  }

  /**
   * Wait for the modal to be visible.
   */
  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
    await expect(this.title).toContainText(/tip/i);
  }

  /**
   * Check if modal is open.
   */
  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  /**
   * Set the tip amount.
   */
  async setAmount(amount: number | string): Promise<void> {
    await this.amountInput.clear();
    await this.amountInput.fill(amount.toString());
  }

  /**
   * Click a preset amount button.
   */
  async selectPreset(amount: number): Promise<void> {
    const presetButton = this.presetButtons.filter({ hasText: `${amount}` }).first();
    await presetButton.click();
  }

  /**
   * Get available preset amounts.
   */
  async getPresetAmounts(): Promise<number[]> {
    const buttons = await this.presetButtons.all();
    const amounts: number[] = [];
    for (const button of buttons) {
      const text = await button.textContent();
      const match = text?.match(/(\d+\.?\d*)/);
      if (match) {
        amounts.push(parseFloat(match[1]));
      }
    }
    return amounts;
  }

  /**
   * Toggle private tip on or off.
   */
  async togglePrivate(enabled: boolean): Promise<void> {
    const isChecked = await this.privateTipToggle.getAttribute("data-state") === "checked";
    if (isChecked !== enabled) {
      await this.privateTipToggle.click();
    }
  }

  /**
   * Check if private tip is enabled.
   */
  async isPrivateEnabled(): Promise<boolean> {
    return (await this.privateTipToggle.getAttribute("data-state")) === "checked";
  }

  /**
   * Get the displayed shielded balance.
   */
  async getShieldedBalance(): Promise<number> {
    const text = await this.shieldedBalance.textContent();
    const match = text?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Click shield more SOL link.
   */
  async clickShieldMore(): Promise<void> {
    await this.shieldMoreLink.click();
  }

  /**
   * Submit the tip.
   */
  async submit(): Promise<void> {
    await this.sendButton.click();
  }

  /**
   * Cancel and close the modal.
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Assert modal closed.
   */
  async expectClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Complete a tip flow.
   */
  async completeTip(amount: number, isPrivate = false): Promise<void> {
    await this.waitForOpen();
    await this.setAmount(amount);
    if (isPrivate) {
      await this.togglePrivate(true);
    }
    await this.submit();
  }
}
