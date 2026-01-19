import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Search page and Search Bar.
 */
export class SearchPage extends BasePage {
  readonly searchInput: Locator;
  readonly suggestionsDropdown: Locator;
  readonly suggestionItems: Locator;
  readonly recentSearchesLabel: Locator;
  readonly searchResults: Locator;
  readonly noResultsMessage: Locator;
  readonly loadingIndicator: Locator;
  readonly filters: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search/i);
    this.suggestionsDropdown = page.locator('[class*="absolute"][class*="rounded"]').filter({ hasText: /(suggestions|recent)/i });
    this.suggestionItems = this.suggestionsDropdown.locator("button");
    this.recentSearchesLabel = page.getByText(/recent searches/i);
    // Use data-slot attribute from Card component
    this.searchResults = page.locator('[data-slot="card"]').filter({ hasText: /@/ });
    this.noResultsMessage = page.getByText(/no results|nothing found|no matches/i);
    this.loadingIndicator = page.locator('[class*="animate-spin"], [class*="loading"]');
    this.filters = page.locator('[role="tablist"], [class*="filter"]');
  }

  /**
   * Navigate to the search page.
   */
  async goto(query?: string): Promise<void> {
    const path = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    await super.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Focus the search input.
   */
  async focusSearch(): Promise<void> {
    await this.searchInput.click();
  }

  /**
   * Type a search query.
   */
  async typeQuery(query: string): Promise<void> {
    await this.searchInput.clear();
    await this.searchInput.fill(query);
  }

  /**
   * Submit a search.
   */
  async submitSearch(query?: string): Promise<void> {
    if (query) {
      await this.typeQuery(query);
    }
    await this.searchInput.press("Enter");
  }

  /**
   * Wait for suggestions to appear.
   */
  async waitForSuggestions(): Promise<void> {
    await expect(this.suggestionsDropdown).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get suggestion items.
   */
  async getSuggestions(): Promise<string[]> {
    await this.waitForSuggestions();
    return this.suggestionItems.allTextContents();
  }

  /**
   * Click a suggestion.
   */
  async clickSuggestion(text: string): Promise<void> {
    await this.suggestionItems.filter({ hasText: text }).click();
  }

  /**
   * Click a suggestion by index.
   */
  async clickSuggestionByIndex(index: number): Promise<void> {
    await this.suggestionItems.nth(index).click();
  }

  /**
   * Check if suggestions dropdown is visible.
   */
  async areSuggestionsVisible(): Promise<boolean> {
    return this.suggestionsDropdown.isVisible();
  }

  /**
   * Wait for search results to load.
   */
  async waitForResults(): Promise<void> {
    // Wait for loading to finish
    await this.loadingIndicator.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    // Then wait for either results or no results message
    await Promise.race([
      this.searchResults.first().waitFor({ state: "visible", timeout: 10000 }),
      this.noResultsMessage.waitFor({ state: "visible", timeout: 10000 }),
    ]).catch(() => {});
  }

  /**
   * Get the number of search results.
   */
  async getResultCount(): Promise<number> {
    return this.searchResults.count();
  }

  /**
   * Assert results are shown.
   */
  async expectResults(minCount = 1): Promise<void> {
    const count = await this.getResultCount();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }

  /**
   * Assert no results message is shown.
   */
  async expectNoResults(): Promise<void> {
    await expect(this.noResultsMessage).toBeVisible();
  }

  /**
   * Get the current search query from the URL.
   */
  getQueryFromUrl(): string {
    const url = new URL(this.page.url());
    return url.searchParams.get("q") ?? "";
  }

  /**
   * Clear the search input.
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  /**
   * Get search results as locators.
   */
  async getResults(): Promise<Locator[]> {
    return this.searchResults.all();
  }

  /**
   * Click a search result by index.
   */
  async clickResult(index: number): Promise<void> {
    await this.searchResults.nth(index).click();
  }
}
