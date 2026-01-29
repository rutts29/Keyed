# SolShare E2E Testing Guide

## Overview

The E2E test suite uses Playwright with mock mode for testing the frontend without requiring backend services. Tests run against Chromium and mobile-chrome viewports.

## Quick Start

```bash
# Navigate to frontend directory
cd frontend

# Run all E2E tests in mock mode (recommended)
npm run test:e2e:mock

# Run with UI for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/specs/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e:mock` | Run all tests in mock mode (no backend needed) |
| `npm run test:e2e:ui` | Open Playwright UI for interactive debugging |
| `npm run test:e2e:report` | View HTML test report |

## Test File Structure

```
frontend/e2e/
├── setup/
│   ├── global-setup.ts      # Test initialization
│   ├── mock-wallet.ts       # Mock Solana wallet injection
│   └── test-base.ts         # Custom fixtures & page objects
├── pages/
│   ├── feed.page.ts         # Feed page object
│   ├── profile.page.ts      # Profile page object
│   ├── search.page.ts       # Search page object
│   └── modals/
│       ├── tip.modal.ts     # Tip modal page object
│       ├── shield.modal.ts  # Shield modal page object
│       └── create-post.modal.ts
└── specs/
    ├── auth.spec.ts         # Authentication tests
    ├── feed.spec.ts         # Feed page tests
    ├── payments.spec.ts     # Tip modal tests
    ├── privacy.spec.ts      # Privacy/shield tests
    ├── profile.spec.ts      # Profile page tests
    ├── search.spec.ts       # Search functionality tests
    └── token-gate.spec.ts   # Token gating tests
```

## Writing New Tests

### 1. Import the custom test fixture

```typescript
import { test, expect } from "../setup/test-base";
```

### 2. Use page objects for common actions

```typescript
test("should display feed posts", async ({ feedPage }) => {
  await feedPage.goto();
  await feedPage.waitForPosts();
  const count = await feedPage.getPostCount();
  expect(count).toBeGreaterThan(0);
});
```

### 3. Use wallet-specific fixtures

```typescript
import { creatorTest, tipperTest, viewerTest } from "../setup/test-base";

creatorTest("creator-specific test", async ({ page }) => {
  // Test runs with creator wallet
});
```

## Mock Wallet Types

The test suite provides three mock wallet types:

- **creator**: Has high SOL balance, owns posts
- **tipper**: Has moderate balance, can send tips
- **viewer**: Read-only access, low balance

## Page Objects

### FeedPage
- `goto()` - Navigate to feed
- `waitForPosts()` - Wait for posts to load
- `getPostCount()` - Get number of visible posts
- `clickTipButton(index)` - Click tip on nth post

### ProfilePage
- `goto(wallet)` - Navigate to profile
- `getFollowerCount()` - Get follower count
- `clickFollowButton()` - Follow user

### SearchPage
- `goto(query?)` - Navigate to search
- `search(query)` - Enter search query
- `getResultCount()` - Get search results count

### TipModal
- `open()` - Open tip modal
- `setAmount(amount)` - Set tip amount
- `togglePrivate()` - Toggle private tip
- `submit()` - Submit tip

## Troubleshooting

### Tests timeout
- Ensure dev server is running or let webServer config start it
- Check network tab for failing API calls
- Increase timeout in playwright.config.ts

### Mock wallet not injected
- Verify MOCK_MODE=true in test command
- Check browser console for injection errors
- Ensure page reloads after wallet injection

### Flaky tests
- Add explicit waits: `await page.waitForSelector()`
- Use page object methods that include proper waits
- Check for race conditions in async operations

### Debug a specific test
```bash
# Run with debug mode
npx playwright test e2e/specs/feed.spec.ts --debug

# Run with trace viewer
npx playwright test --trace on
```

## CI/CD Integration

Tests run automatically on GitHub Actions. The workflow:

1. Starts Next.js dev server
2. Runs all E2E tests in mock mode
3. Uploads test artifacts on failure
4. Generates HTML report

## Configuration

See `frontend/playwright.config.ts` for:
- Browser configurations
- Viewport settings
- Test timeouts
- Parallel workers
- WebServer configuration
