import { appendSnapshot, type PriceSnapshot } from "./history.ts";

const DB_NAME = "bazaar-desk";
const STORE = "snapshots";
const KEY = "log";

type Log = { snapshots: PriceSnapshot[] };

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function readLog(): Promise<PriceSnapshot[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      const value = request.result as Log | undefined;
      resolve(Array.isArray(value?.snapshots) ? value.snapshots : []);
    };
    request.onerror = () => resolve([]);
  });
}

async function writeLog(snapshots: PriceSnapshot[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ snapshots } satisfies Log, KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

export async function loadStoredSnapshots(): Promise<PriceSnapshot[]> {
  try {
    return await readLog();
  } catch {
    return [];
  }
}

export async function rememberSnapshot(existing: readonly PriceSnapshot[], next: PriceSnapshot): Promise<PriceSnapshot[]> {
  const snapshots = appendSnapshot(existing, next);
  try {
    await writeLog(snapshots);
  } catch {
    // The in-memory series still works for this session.
  }
  return snapshots;
}
