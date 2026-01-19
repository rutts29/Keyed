# AI Agent Test Runner Guide

This document describes how to use an AI agent with MCP browser tools to run interactive tests on SolShare.

## Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Configure the AI agent with MCP browser tools (Puppeteer or Playwright MCP server)

3. The AI agent should be able to:
   - Navigate to URLs
   - Click elements
   - Fill form inputs
   - Read page content
   - Take screenshots

## Test Environment

- **Base URL**: `http://localhost:3000`
- **Mock Mode**: Tests run with mock wallet injected (no real transactions)
- **Test Wallets**:
  - Creator: `CreatorWa11etAddressForE2ETesting11111111`
  - Tipper: `TipperWa11etAddressForE2ETesting111111111`
  - Viewer: `ViewerWa11etAddressForE2ETesting111111111`

## Running Tests

For each test case in `test-cases/`, the AI agent should:

1. **Read the test file** to understand preconditions, steps, and expected results
2. **Set up preconditions** (navigate to starting page, ensure auth state)
3. **Execute steps** one by one, verifying each action completes
4. **Verify expected results** match actual page state
5. **Report outcome** (pass/fail with details)

## Example Test Execution

```markdown
## Executing: auth-tests.md > Test: Mock Wallet Session

### Setup
- Navigating to http://localhost:3000/app
- Checking localStorage for auth session

### Step 1: Verify mock wallet injected
- Executing: Check window.__MOCK_WALLET__ exists
- Result: ✅ Mock wallet found

### Step 2: Verify auth session
- Executing: Check localStorage solshare-auth
- Result: ✅ Session found with wallet ViewerWa11etAddressForE2ETesting111111111

### Verification
- Expected: User appears authenticated
- Actual: Feed page loaded, no "Connect Wallet" prompt
- Result: ✅ PASS
```

## Debugging Tips

1. **Take screenshots** at each step for visual verification
2. **Log page content** if elements aren't found
3. **Check console errors** for JavaScript issues
4. **Verify network requests** if API calls fail

## Test Case Format

Each test case file follows this structure:

```markdown
## Test: [Test Name]

### Preconditions
- List of required setup states

### Steps
1. Step-by-step actions
2. Each step should be atomic
3. Include selector hints where helpful

### Expected Results
- Clear success criteria
- What to verify after completion
```
