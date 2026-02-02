/**
 * Shared test state persisted to disk between spec files.
 * Playwright runs each spec file in a separate worker, so we use a JSON file
 * to share state (tokens, created IDs) between phases.
 */
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(__dirname, "..", ".test-state.json");

export interface TestState {
  tokens: Record<string, string>; // wallet -> JWT
  postIds: string[]; // ordered: [w1Post1, w1Post2, w2Post1, w2GatedPost]
  roomIds: string[]; // [openRoom, gatedRoom]
  campaignIds: string[]; // [w1Campaign, w2Campaign]
  notificationIds: string[];
  commentIds: string[];
  [key: string]: unknown;
}

const DEFAULT_STATE: TestState = {
  tokens: {},
  postIds: [],
  roomIds: [],
  campaignIds: [],
  notificationIds: [],
  commentIds: [],
};

export function loadState(): TestState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    // Corrupted file, start fresh
  }
  return { ...DEFAULT_STATE };
}

export function saveState(state: TestState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function resetState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

/**
 * Helper to update a specific key in state.
 * Reads, merges, writes — safe for sequential use within a single spec file.
 */
export function updateState(updates: Partial<TestState>): TestState {
  const state = loadState();
  Object.assign(state, updates);
  saveState(state);
  return state;
}
