/**
 * Global setup for integration tests.
 * Flushes rate limit keys in Redis so the test suite starts with a clean quota.
 * Only deletes ratelimit:* keys — no other Redis data is affected.
 */
import { execFileSync } from "child_process";

export default async function globalSetup() {
  try {
    const luaScript =
      "local keys = redis.call('KEYS', 'ratelimit:*') " +
      "for i,key in ipairs(keys) do redis.call('DEL', key) end " +
      "return #keys";

    execFileSync(
      "docker",
      ["exec", "solshare-redis", "redis-cli", "--no-auth-warning", "EVAL", luaScript, "0"],
      { stdio: "pipe", timeout: 5000 }
    );
    console.log("[integration] Rate limit keys flushed in Redis");
  } catch (e) {
    // Non-fatal: tests can still run, they may just hit 429s
    console.warn("[integration] Could not flush rate limit keys:", (e as Error).message);
  }
}
