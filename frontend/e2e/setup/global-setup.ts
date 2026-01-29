import { FullConfig } from "@playwright/test";

/**
 * Global setup runs once before all tests.
 * Use this for any one-time initialization like:
 * - Database seeding (for integration tests)
 * - Cache warming
 * - Environment validation
 */
async function globalSetup(config: FullConfig): Promise<void> {
  const isMockMode = process.env.MOCK_MODE !== "false";

  console.log("\n========================================");
  console.log("  SolShare E2E Test Suite");
  console.log(`  Mode: ${isMockMode ? "MOCK" : "INTEGRATION"}`);
  console.log(`  Base URL: ${config.projects[0]?.use?.baseURL}`);
  console.log("========================================\n");

  if (isMockMode) {
    console.log("[GlobalSetup] Running in mock mode - no external services required");
  } else {
    console.log("[GlobalSetup] Running in integration mode - verifying services...");

    // Verify backend is accessible
    const apiUrl = process.env.TEST_API_URL || "http://localhost:3001/api";
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      console.log("[GlobalSetup] Backend API is healthy");
    } catch (error) {
      console.warn(
        "[GlobalSetup] Warning: Backend API not accessible. Integration tests may fail."
      );
      console.warn(`  URL: ${apiUrl}`);
      console.warn(`  Error: ${error}`);
    }

    // Verify test wallet has balance (only in integration mode)
    if (process.env.TEST_WALLET_ADDRESS) {
      console.log(
        `[GlobalSetup] Test wallet: ${process.env.TEST_WALLET_ADDRESS.slice(0, 8)}...`
      );
    }
  }

  // Set up any global test state
  process.env.TEST_RUN_ID = `test-run-${Date.now()}`;
  console.log(`[GlobalSetup] Test run ID: ${process.env.TEST_RUN_ID}`);
}

export default globalSetup;
