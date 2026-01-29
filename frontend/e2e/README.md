# E2E Testing Suite

End-to-end UI testing for SolShare using Playwright with mock wallet support.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests in mock mode
npm run test:e2e:mock

# Run tests with interactive UI
npm run test:e2e:ui
```

## Test Modes

| Mode | Command | Description |
|------|---------|-------------|
| Mock | `npm run test:e2e:mock` | Fast tests with mocked wallet & API |
| UI | `npm run test:e2e:ui` | Interactive Playwright UI |
| Debug | `npm run test:e2e:debug` | Step-through debugging |
| Report | `npm run test:e2e:report` | View HTML test report |

## Directory Structure

```
e2e/
├── setup/
│   ├── mock-wallet.ts      # Mock Dynamic.xyz wallet
│   ├── test-fixtures.ts    # Test data & helpers
│   ├── test-base.ts        # Extended test fixtures
│   └── global-setup.ts     # Global initialization
├── pages/
│   ├── base.page.ts        # Base Page Object Model
│   ├── feed.page.ts        # Feed page
│   ├── profile.page.ts     # Profile page
│   ├── search.page.ts      # Search page
│   └── modals/
│       ├── tip.modal.ts    # Tip modal
│       ├── shield.modal.ts # Shield SOL modal
│       └── create-post.modal.ts
├── specs/
│   ├── auth.spec.ts        # Authentication tests
│   ├── feed.spec.ts        # Feed & post tests
│   ├── payments.spec.ts    # Tip & payment tests
│   ├── privacy.spec.ts     # Privacy feature tests
│   ├── search.spec.ts      # Search tests
│   ├── profile.spec.ts     # Profile tests
│   └── token-gate.spec.ts  # Token-gated content tests
└── ai-agent/
    ├── test-runner.md      # AI agent guide
    └── test-cases/         # Human-readable test specs
```

## Mock Wallet

Tests use a mock wallet that intercepts Dynamic.xyz:

```typescript
// Available test wallets
TEST_WALLETS.creator  // Creator wallet for testing
TEST_WALLETS.tipper   // Tipper wallet for testing
TEST_WALLETS.viewer   // Default viewer wallet
```

The mock wallet is automatically injected and provides:
- Mock auth session in localStorage
- Mock wallet signing (no real transactions)
- Instant transaction confirmations

## Writing New Tests

```typescript
import { test, expect } from "../setup/test-base";

test("my new test", async ({ feedPage, tipModal }) => {
  await feedPage.goto();
  await feedPage.waitForFeedLoaded();

  // Use page objects for interactions
  const posts = await feedPage.getPostCards();
  expect(posts.length).toBeGreaterThan(0);
});
```

## CI/CD

Tests run automatically on push/PR to `main` or `frontend` branches via GitHub Actions.

See `.github/workflows/e2e-tests.yml` for configuration.
