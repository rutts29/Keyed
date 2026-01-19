import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for the Create Post Modal.
 */
export class CreatePostModal {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly captionInput: Locator;
  readonly fileInput: Locator;
  readonly uploadArea: Locator;
  readonly previewImage: Locator;
  readonly tokenGateToggle: Locator;
  readonly tokenInput: Locator;
  readonly aiPreview: Locator;
  readonly aiDescription: Locator;
  readonly aiTags: Locator;
  readonly publishButton: Locator;
  readonly cancelButton: Locator;
  readonly progressIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.title = this.dialog.locator('h2, [class*="DialogTitle"]');
    this.captionInput = this.dialog.locator('textarea, [placeholder*="caption" i]');
    this.fileInput = this.dialog.locator('input[type="file"]');
    this.uploadArea = this.dialog.locator('[class*="dropzone"], [class*="upload"]');
    this.previewImage = this.dialog.locator("img");
    this.tokenGateToggle = this.dialog.locator('[role="switch"]');
    this.tokenInput = this.dialog.getByLabel(/token/i);
    this.aiPreview = this.dialog.locator('[class*="ai"], [class*="preview"]');
    this.aiDescription = this.dialog.getByText(/description/i).locator("..");
    this.aiTags = this.dialog.locator('[class*="tag"], [class*="badge"]');
    this.publishButton = this.dialog.getByRole("button", { name: /publish|create|post/i });
    this.cancelButton = this.dialog.getByRole("button", { name: /cancel|close/i });
    this.progressIndicator = this.dialog.locator('[role="progressbar"], [class*="progress"]');
  }

  /**
   * Wait for the modal to be visible.
   */
  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if modal is open.
   */
  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  /**
   * Upload a file.
   */
  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Set the caption text.
   */
  async setCaption(caption: string): Promise<void> {
    await this.captionInput.clear();
    await this.captionInput.fill(caption);
  }

  /**
   * Get the current caption text.
   */
  async getCaption(): Promise<string> {
    return (await this.captionInput.inputValue()) ?? "";
  }

  /**
   * Toggle token gating.
   */
  async toggleTokenGate(enabled: boolean): Promise<void> {
    const isChecked = await this.tokenGateToggle.getAttribute("data-state") === "checked";
    if (isChecked !== enabled) {
      await this.tokenGateToggle.click();
    }
  }

  /**
   * Set the required token for gating.
   */
  async setRequiredToken(token: string): Promise<void> {
    await this.toggleTokenGate(true);
    await this.tokenInput.clear();
    await this.tokenInput.fill(token);
  }

  /**
   * Wait for AI analysis to complete.
   */
  async waitForAiAnalysis(): Promise<void> {
    // Wait for AI preview content to appear
    await this.aiTags.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  }

  /**
   * Get AI-generated tags.
   */
  async getAiTags(): Promise<string[]> {
    const tags = await this.aiTags.allTextContents();
    return tags.map((t) => t.trim()).filter(Boolean);
  }

  /**
   * Check if preview image is visible.
   */
  async hasPreview(): Promise<boolean> {
    return this.previewImage.isVisible();
  }

  /**
   * Submit and publish the post.
   */
  async publish(): Promise<void> {
    await this.publishButton.click();
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
   * Assert publish button is enabled.
   */
  async expectPublishEnabled(): Promise<void> {
    await expect(this.publishButton).toBeEnabled();
  }

  /**
   * Assert publish button is disabled.
   */
  async expectPublishDisabled(): Promise<void> {
    await expect(this.publishButton).toBeDisabled();
  }

  /**
   * Complete a basic post creation flow.
   */
  async createPost(caption: string, filePath?: string): Promise<void> {
    await this.waitForOpen();
    if (filePath) {
      await this.uploadFile(filePath);
    }
    await this.setCaption(caption);
    await this.publish();
  }
}
