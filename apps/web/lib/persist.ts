// File-backed persistence for the in-memory data layer (lib/seed-data.ts).
//
// This is NOT a real database - no transactions, no concurrent-writer
// safety, no multi-instance support. What it fixes is the single biggest
// gap for a demo that's actually going to be used by more than one person
// in one sitting: every store edit, reservation, and review used to vanish
// the moment the server restarted (or redeployed). Now that same state is
// mirrored to a JSON file on disk and reloaded on boot, so a restart no
// longer wipes the catalog.
//
// Swapping this for a real database (Postgres, per docs/02-system-architecture.md)
// only requires replacing loadPersisted/persist - nothing in seed-data.ts's
// call sites needs to change.
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Record<string, unknown> {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    console.error("[persist] failed to read db.json, starting fresh:", e);
    return {};
  }
}

// Cached for the lifetime of the process (same globalThis-singleton
// rationale as seed-data.ts itself - avoids re-reading the file on every
// mutation while still surviving dev-mode module duplication).
declare global {
  // eslint-disable-next-line no-var
  var __sioPersistCache: Record<string, unknown> | undefined;
  // eslint-disable-next-line no-var
  var __sioPersistTimer: ReturnType<typeof setTimeout> | undefined;
}

function getCache(): Record<string, unknown> {
  if (!globalThis.__sioPersistCache) globalThis.__sioPersistCache = readAll();
  return globalThis.__sioPersistCache;
}

function writeNow() {
  try {
    ensureDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(globalThis.__sioPersistCache, null, 2));
  } catch (e) {
    console.error("[persist] failed to write db.json:", e);
  }
}

// Debounced so a burst of writes (e.g. bulk product import) collapses into
// one disk write instead of one per row.
function scheduleWrite() {
  if (globalThis.__sioPersistTimer) return;
  globalThis.__sioPersistTimer = setTimeout(() => {
    globalThis.__sioPersistTimer = undefined;
    writeNow();
  }, 150);
}

/** Returns the persisted value for `key` if present, otherwise seeds it with `initial` (and persists that seed). */
export function loadPersisted<T>(key: string, initial: T): T {
  const store = getCache();
  if (!(key in store)) {
    store[key] = initial;
    scheduleWrite();
  }
  return store[key] as T;
}

/** Call after mutating a loaded value to mirror the change to disk. */
export function persist(key: string, value: unknown) {
  getCache()[key] = value;
  scheduleWrite();
}
