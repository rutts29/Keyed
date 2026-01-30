/**
 * Postinstall script: copies WASM files required by @lightprotocol/hasher.rs
 * into the browser-fat ESM directory so they can be loaded at runtime.
 *
 * Copies to both the frontend's node_modules and the privacy-cash-sdk's
 * node_modules (since webpack follows symlinks and resolves from there).
 */
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const files = [
  "hasher_wasm_simd_bg.wasm",
  "light_wasm_hasher_bg.wasm",
];

const locations = [
  resolve(root, "node_modules/@lightprotocol/hasher.rs/dist"),
  resolve(root, "../privacy-cash-sdk/node_modules/@lightprotocol/hasher.rs/dist"),
];

for (const srcDir of locations) {
  if (!existsSync(srcDir)) {
    console.log(`[copy-wasm] Skipping ${srcDir} (not found)`);
    continue;
  }

  const destDir = resolve(srcDir, "browser-fat/es");
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  for (const file of files) {
    const src = resolve(srcDir, file);
    const dest = resolve(destDir, file);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`[copy-wasm] Copied ${file} → ${destDir}`);
    } else {
      console.warn(`[copy-wasm] Warning: ${file} not found at ${src}`);
    }
  }
}

console.log("[copy-wasm] Done.");
