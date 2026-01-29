import { Page } from "@playwright/test";

export interface MockWallet {
  address: string;
  publicKey: string;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (tx: unknown) => Promise<unknown>;
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
}

export const TEST_WALLETS = {
  creator: {
    address: "CreatorWa11etAddressForE2ETesting11111111",
    publicKey: "CreatorWa11etAddressForE2ETesting11111111",
    name: "Test Creator",
  },
  tipper: {
    address: "TipperWa11etAddressForE2ETesting111111111",
    publicKey: "TipperWa11etAddressForE2ETesting111111111",
    name: "Test Tipper",
  },
  viewer: {
    address: "ViewerWa11etAddressForE2ETesting111111111",
    publicKey: "ViewerWa11etAddressForE2ETesting111111111",
    name: "Test Viewer",
  },
} as const;

export type TestWalletType = keyof typeof TEST_WALLETS;

/**
 * Injects a mock wallet into the page that intercepts Dynamic.xyz wallet operations.
 * This allows tests to run without requiring real wallet connections.
 */
export async function injectMockWallet(
  page: Page,
  walletType: TestWalletType = "viewer"
): Promise<void> {
  const wallet = TEST_WALLETS[walletType];

  await page.addInitScript(
    ({ address, publicKey }) => {
      // Mock wallet state
      const mockWalletState = {
        isConnected: false,
        address,
        publicKey,
      };

      // Expose mock wallet globally for Dynamic.xyz interception
      (window as unknown as { __MOCK_WALLET__: typeof mockWalletState & {
        signMessage: (msg: string) => Promise<string>;
        signTransaction: (tx: unknown) => Promise<unknown>;
        connect: () => Promise<{ address: string }>;
        disconnect: () => Promise<void>;
        setConnected: (connected: boolean) => void;
      } }).__MOCK_WALLET__ = {
        ...mockWalletState,
        signMessage: async (msg: string) => {
          console.log("[MockWallet] Signing message:", msg.slice(0, 50));
          // Return a mock signature (base58 encoded)
          return "MockSignature" + btoa(msg.slice(0, 20)).replace(/[^a-zA-Z0-9]/g, "");
        },
        signTransaction: async (tx: unknown) => {
          console.log("[MockWallet] Signing transaction");
          // Return the transaction as-is for mock mode
          return tx;
        },
        connect: async () => {
          console.log("[MockWallet] Connecting wallet");
          mockWalletState.isConnected = true;
          return { address };
        },
        disconnect: async () => {
          console.log("[MockWallet] Disconnecting wallet");
          mockWalletState.isConnected = false;
        },
        setConnected: (connected: boolean) => {
          mockWalletState.isConnected = connected;
        },
      };

      // Mock localStorage for auth persistence
      // Only set if not already present to preserve across reloads
      const existingSession = localStorage.getItem("solshare-auth");
      if (!existingSession) {
        const mockAuthSession = {
          token: "mock-jwt-token-for-testing",
          wallet: address,
          user: {
            wallet: address,
            username: "testuser",
            bio: "Test user for E2E testing",
            profileImageUri: null,
            followerCount: 100,
            followingCount: 50,
            postCount: 25,
            createdAt: "2024-01-01T00:00:00.000Z", // Fixed timestamp for consistency
            isVerified: true,
          },
          expiresAt: 9999999999999, // Far future for testing
        };

        // Store mock session
        localStorage.setItem("solshare-auth", JSON.stringify(mockAuthSession));
      }

      console.log("[MockWallet] Initialized with address:", address);
    },
    { address: wallet.address, publicKey: wallet.publicKey }
  );
}

/**
 * Simulates wallet connection by triggering the mock wallet's connect method.
 */
export async function connectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mockWallet = (window as unknown as { __MOCK_WALLET__?: { connect: () => Promise<{ address: string }>; setConnected: (connected: boolean) => void } }).__MOCK_WALLET__;
    if (mockWallet) {
      mockWallet.setConnected(true);
    }
  });
}

/**
 * Simulates wallet disconnection.
 */
export async function disconnectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mockWallet = (window as unknown as { __MOCK_WALLET__?: { disconnect: () => Promise<void>; setConnected: (connected: boolean) => void } }).__MOCK_WALLET__;
    if (mockWallet) {
      mockWallet.setConnected(false);
    }
    localStorage.removeItem("solshare-auth");
  });
}

/**
 * Gets the current mock wallet state.
 */
export async function getMockWalletState(
  page: Page
): Promise<{ isConnected: boolean; address: string } | null> {
  return page.evaluate(() => {
    const mockWallet = (window as unknown as { __MOCK_WALLET__?: { isConnected: boolean; address: string } }).__MOCK_WALLET__;
    if (mockWallet) {
      return {
        isConnected: mockWallet.isConnected,
        address: mockWallet.address,
      };
    }
    return null;
  });
}
