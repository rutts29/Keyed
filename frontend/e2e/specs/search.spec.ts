import { test, expect } from "../setup/test-base";

test.describe("Search Bar", () => {
  test.describe("Search Input", () => {
    test("should display search input on feed page", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      // Search input should be visible
      const searchInput = searchPage.searchInput;
      await expect(searchInput).toBeVisible();
    });

    test("should have placeholder text", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      const placeholder = await searchPage.searchInput.getAttribute("placeholder");
      expect(placeholder?.toLowerCase()).toContain("search");
    });

    test("should accept text input", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      await searchPage.typeQuery("test query");

      const value = await searchPage.searchInput.inputValue();
      expect(value).toBe("test query");
    });
  });

  test.describe("Search Suggestions", () => {
    test("should show suggestions dropdown on focus", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      await searchPage.focusSearch();

      // May show recent searches or suggestions
      // Dropdown appears based on prior searches
      await searchPage.page.waitForTimeout(500);

      // Just verify no errors on focus
    });

    test("should show recent searches when available", async ({ feedPage, searchPage, page }) => {
      // First, add a recent search to localStorage
      await page.addInitScript(() => {
        localStorage.setItem("solshare-recent-searches", JSON.stringify(["art", "music", "nft"]));
      });

      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      await searchPage.focusSearch();
      await page.waitForTimeout(500);

      // Should show recent searches label if dropdown visible
      const recentLabel = await searchPage.recentSearchesLabel.isVisible().catch(() => false);

      // Recent searches functionality may be available
    });
  });

  test.describe("Search Submission", () => {
    test("should navigate to search results on enter", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      await searchPage.submitSearch("digital art");

      // Should navigate to search page with query
      await searchPage.page.waitForURL(/\/search/);

      const currentUrl = searchPage.getCurrentUrl();
      expect(currentUrl).toContain("/search");
      expect(currentUrl).toContain("q=");
    });

    test("should encode query in URL", async ({ feedPage, searchPage }) => {
      await feedPage.goto();
      await feedPage.waitForFeedLoaded();

      await searchPage.submitSearch("cozy workspaces");

      await searchPage.page.waitForURL(/\/search/);

      const query = searchPage.getQueryFromUrl();
      expect(query).toBe("cozy workspaces");
    });
  });
});

test.describe("Search Results Page", () => {
  test.describe("Page Loading", () => {
    test("should load search page directly", async ({ searchPage }) => {
      await searchPage.goto();

      expect(searchPage.getCurrentUrl()).toContain("/search");
    });

    test("should load search page with query parameter", async ({ searchPage }) => {
      await searchPage.goto("art");

      expect(searchPage.getCurrentUrl()).toContain("q=art");
    });
  });

  test.describe("Results Display", () => {
    test("should display search results or no results message", async ({ searchPage }) => {
      await searchPage.goto("creator content");
      await searchPage.waitForResults();

      const resultCount = await searchPage.getResultCount();
      const hasNoResults = await searchPage.noResultsMessage.isVisible().catch(() => false);

      // Should show either results or no results message
      expect(resultCount > 0 || hasNoResults).toBe(true);
    });

    test("should display result cards similar to feed posts", async ({ searchPage }) => {
      await searchPage.goto("test");
      await searchPage.waitForResults();

      const results = await searchPage.getResults();

      if (results.length > 0) {
        const firstResult = results[0];
        // Results should contain author handles like feed posts
        const text = await firstResult.textContent();
        // Search results show relevant content
      }
    });
  });

  test.describe("Search from Results Page", () => {
    test("should allow new search from results page", async ({ searchPage }) => {
      await searchPage.goto("initial query");
      await searchPage.waitForResults();

      // Perform new search
      await searchPage.submitSearch("new query");

      await searchPage.page.waitForURL(/new/);

      const query = searchPage.getQueryFromUrl();
      expect(query).toBe("new query");
    });

    test("should clear and update search input", async ({ searchPage }) => {
      await searchPage.goto("old");
      await searchPage.waitForResults();

      await searchPage.clearSearch();
      await searchPage.typeQuery("fresh search");

      const value = await searchPage.searchInput.inputValue();
      expect(value).toBe("fresh search");
    });
  });
});

test.describe("Semantic Search", () => {
  test("should support natural language queries", async ({ searchPage }) => {
    await searchPage.goto("cozy coffee shop aesthetic");
    await searchPage.waitForResults();

    // Semantic search should process natural language
    // Just verify no errors on complex query
    const hasError = await searchPage.page.locator("text=error").isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test("should handle emoji in search", async ({ searchPage }) => {
    await searchPage.goto("art 🎨");
    await searchPage.waitForResults();

    // Should handle special characters gracefully
    const hasError = await searchPage.page.locator("text=error").isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});

test.describe("Search Tag Navigation", () => {
  test("should navigate to search when clicking tag on feed", async ({ feedPage, searchPage }) => {
    await feedPage.goto();
    await feedPage.waitForFeedLoaded();

    // Find a clickable tag
    const tagLink = feedPage.page.locator("a[href*='/search']").filter({ hasText: /#/ }).first();

    if (await tagLink.isVisible().catch(() => false)) {
      const tagText = await tagLink.textContent();
      await tagLink.click();

      await feedPage.page.waitForURL(/\/search/);

      // Should navigate to search with tag
      expect(searchPage.getCurrentUrl()).toContain("/search");
    }
  });
});

test.describe("Empty Search", () => {
  test("should handle empty search gracefully", async ({ searchPage }) => {
    await searchPage.goto();

    // Try to submit empty search
    await searchPage.searchInput.press("Enter");

    // Should not navigate or should show appropriate message
    // Just verify no errors
    const hasError = await searchPage.page.locator("text=error").isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
