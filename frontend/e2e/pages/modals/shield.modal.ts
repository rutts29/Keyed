import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Shield SOL Modal.
 */
export class ShieldModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly amountInput: Locator;
  readonly availableBalance: Locator;
  readonly progressBar: Locator;
  readonly shieldButton: Locator;
  readonly cancelButton: Locator;
  readonly infoText: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use a more specific selector to target only the Shield modal
    this.dialog = page.getByRole("dialog", { name: /shield sol/i });
    this.title = this.dialog.locator('h2, [class*="DialogTitle"]');
    this.amountInput = this.dialog.getByLabel(/amount/i);
    this.availableBalance = this.dialog.getByText(/available balance/i);
    this.progressBar = this.dialog.locator('[role="progressbar"]');
    this.shieldButton = this.dialog.getByRole("button", { name: /^shield$/i });
    this.cancelButton = this.dialog.getByRole("button", { name: /cancel/i });
    this.infoText = this.dialog.getByText(/shielded sol can be used/i);
  }

  /**
   * Wait for the modal to be visible.
   */
  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
    await expect(this.title).toContainText(/shield/i);
  }

  /**
   * Check if modal is open.
   */
  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  /**
   * Set the shield amount.
   */
  async setAmount(amount: number | string): Promise<void> {
    await this.amountInput.clear();
    await this.amountInput.fill(amount.toString());
  }

  /**
   * Get the current amount value.
   */
  async getAmount(): Promise<string> {
    return (await this.amountInput.inputValue()) ?? "";
  }

  /**
   * Get the displayed available balance.
   */
  async getAvailableBalance(): Promise<number> {
    const text = await this.availableBalance.textContent();
    const match = text?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Check if shielding is in progress (progress bar visible).
   */
  async isShielding(): Promise<boolean> {
    return this.progressBar.isVisible();
  }

  /**
   * Submit the shield request.
   */
  async submit(): Promise<void> {
    await this.shieldButton.click();
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
   * Assert progress bar is visible during shielding.
   */
  async expectShielding(): Promise<void> {
    await expect(this.progressBar).toBeVisible({ timeout: 2000 });
  }

  /**
   * Complete a shield flow.
   */
  async completeShield(amount: number): Promise<void> {
    await this.waitForOpen();
    await this.setAmount(amount);
    await this.submit();
  }
}
