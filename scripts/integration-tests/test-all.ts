#!/usr/bin/env tsx
/**
 * Run all integration tests
 */

import { config, wallet, clearResults, runTests } from './config.js';
import { authTests } from './test-auth.js';
import { postsTests } from './test-posts.js';
import { searchTests } from './test-search.js';
import { paymentsTests } from './test-payments.js';
import { accessTests } from './test-access.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         SolShare Integration Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Backend URL: ${config.backendUrl}`);
  console.log(`AI Service URL: ${config.aiServiceUrl}`);
  console.log(`Solana RPC: ${config.solanaRpc}`);
  console.log(`Test Wallet: ${wallet.publicKey.toBase58()}`);
  console.log();

  const allResults: { suite: string; passed: number; failed: number }[] = [];

  // Run each test suite
  const suites = [
    { name: 'Auth Flow', tests: authTests },
    { name: 'Post Creation', tests: postsTests },
    { name: 'Search', tests: searchTests },
    { name: 'Payments', tests: paymentsTests },
    { name: 'Token Gate', tests: accessTests },
  ];

  for (const suite of suites) {
    clearResults();
    const { passed, failed } = await runTests(`${suite.name} Tests`, suite.tests);
    allResults.push({ suite: suite.name, passed, failed });
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                   SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();

  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of allResults) {
    const status = result.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${result.suite}: ${result.passed} passed, ${result.failed} failed`);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  console.log('─'.repeat(50));
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
  console.log();

  if (totalFailed > 0) {
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
