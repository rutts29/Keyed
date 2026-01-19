import { Page, Locator, expect } from "@playwright/test";

/**
 * Base Page Object Model with common functionality.
 */
export class BasePage {
  readonly page: Page;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastContainer = page.locator("[data-sonner-toaster]");
  }

  /**
   * Navigate to a URL path.
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for navigation to complete.
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get a toast notification by text content.
   */
  async getToast(text: string): Promise<Locator> {
    return this.page.locator(`[data-sonner-toast]:has-text("${text}")`);
  }

  /**
   * Assert a success toast appears.
   */
  async expectSuccessToast(text: string): Promise<void> {
    const toast = await this.getToast(text);
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  /**
   * Assert an error toast appears.
   */
  async expectErrorToast(text: string): Promise<void> {
    const toast = await this.getToast(text);
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for API response.
   */
  async waitForApiResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  /**
   * Click a button by its text content.
   */
  async clickButton(text: string): Promise<void> {
    await this.page.getByRole("button", { name: text }).click();
  }

  /**
   * Fill an input by its label.
   */
  async fillInput(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Check if element is visible.
   */
  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }

  /**
   * Wait for element to be visible.
   */
  async waitForElement(selector: string, timeout = 5000): Promise<void> {
    await this.page.locator(selector).waitFor({ state: "visible", timeout });
  }

  /**
   * Get current URL.
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Take a screenshot.
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png` });
  }
}
