import { createServerFn } from "@tanstack/react-start";
import { canonicalItemId } from "./ids.ts";
import { normalizeCatalogue, parseCoflHistory } from "./normalize.ts";
import {
  BAZAAR_URL,
  COFL_NAMES_URL,
  ITEMS_URL,
  coflHistoryUrl,
  coflItemHref,
  fetchJsonWithRetry,
  shouldUseCache,
} from "./remote.ts";
import { STATIC_UNUSED_SOURCES } from "./sources.ts";
import type { HistoryResult, ScanResult, SourceReport } from "./types.ts";

const BAZAAR_TTL_MS = 20_000;
const BAZAAR_MIN_GAP_MS = 15_000;
const META_TTL_MS = 6 * 60 * 60 * 1000;
const HISTORY_TTL_MS = 60_000;

type Timed<T> = { at: number; body: T };

let bazaarCache: Timed<unknown> | null = null;
let itemsCache: Timed<unknown> | null = null;
let namesCache: Timed<unknown> | null = null;
const historyCache = new Map<string, Timed<HistoryResult>>();
let scanInflight: Promise<ScanResult> | null = null;

type Loaded =
  | { ok: true; body: unknown; at: number; fromCache: boolean; attempts: number; staleError?: string }
  | { ok: false; error: string; attempts: number };

async function loadUrl(
  url: string,
  cache: Timed<unknown> | null,
  ttl: number,
  force: boolean,
  minGap: number,
): Promise<{ loaded: Loaded; cache: Timed<unknown> | null }> {
  const now = Date.now();
  if (cache && shouldUseCache(now - cache.at, ttl, force, minGap)) {
    return {
      loaded: { ok: true, body: cache.body, at: cache.at, fromCache: true, attempts: 0 },
      cache,
    };
  }
  const result = await fetchJsonWithRetry(url);
  if (!result.ok) {
    if (cache) {
      return {
        loaded: {
          ok: true,
          body: cache.body,
          at: cache.at,
          fromCache: true,
          attempts: result.attempts,
          staleError: result.error,
        },
        cache,
      };
    }
    return { loaded: { ok: false, error: result.error, attempts: result.attempts }, cache };
  }
  const next = { at: Date.now(), body: result.body };
  return {
    loaded: { ok: true, body: next.body, at: next.at, fromCache: false, attempts: result.attempts },
    cache: next,
  };
}

function capWarnings(warnings: string[]): string[] {
  if (warnings.length <= 8) return warnings;
  return [...warnings.slice(0, 8), `${warnings.length - 8} further notes were omitted.`];
}

async function assemble(force: boolean): Promise<ScanResult> {
  const bazaarPromise = loadUrl(BAZAAR_URL, bazaarCache, BAZAAR_TTL_MS, force, BAZAAR_MIN_GAP_MS);
  const itemsPromise = loadUrl(ITEMS_URL, itemsCache, META_TTL_MS, false, META_TTL_MS);
  const namesPromise = loadUrl(COFL_NAMES_URL, namesCache, META_TTL_MS, false, META_TTL_MS);
  const [bazaarLoaded, itemsLoaded, namesLoaded] = await Promise.all([
    bazaarPromise,
    itemsPromise,
    namesPromise,
  ]);
  bazaarCache = bazaarLoaded.cache;
  itemsCache = itemsLoaded.cache;
  namesCache = namesLoaded.cache;

  const sources: SourceReport[] = [];
  const scannedAt = Date.now();

  if (!bazaarLoaded.loaded.ok) {
    sources.push({
      id: "hypixel-bazaar",
      label: "Hypixel Bazaar",
      role: "Live order book and weekly volumes",
      status: "error",
      fetchedAt: null,
      detail: `${bazaarLoaded.loaded.error} after ${bazaarLoaded.loaded.attempts} attempt(s). No catalogue was invented.`,
      href: "https://api.hypixel.net/",
    });
    return {
      ok: false,
      scannedAt,
      hypixelUpdatedAt: null,
      fromCache: false,
      cacheAgeMs: 0,
      items: [],
      sources: [...sources, ...metaSources(itemsLoaded.loaded, namesLoaded.loaded), ...STATIC_UNUSED_SOURCES],
      warnings: [],
      error: `Hypixel Bazaar is unavailable (${bazaarLoaded.loaded.error}).`,
    };
  }

  const bazaar = bazaarLoaded.loaded;
  sources.push({
    id: "hypixel-bazaar",
    label: "Hypixel Bazaar",
    role: "Live order book and weekly volumes",
    status: bazaar.staleError ? "degraded" : "ok",
    fetchedAt: bazaar.at,
    detail: bazaar.staleError
      ? `Live refresh failed (${bazaar.staleError}). Showing the last good payload.`
      : bazaar.fromCache
        ? "Served from the short server cache so the public endpoint is not polled on every click."
        : `Fetched from Hypixel (${bazaar.attempts} attempt(s)). No API key — this endpoint is public.`,
    href: "https://api.hypixel.net/",
  });

  let normalized;
  try {
    normalized = normalizeCatalogue({
      bazaar: bazaar.body,
      items: itemsLoaded.loaded.ok ? itemsLoaded.loaded.body : null,
      names: namesLoaded.loaded.ok ? namesLoaded.loaded.body : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the Bazaar payload.";
    return {
      ok: false,
      scannedAt,
      hypixelUpdatedAt: null,
      fromCache: bazaar.fromCache,
      cacheAgeMs: Math.max(0, scannedAt - bazaar.at),
      items: [],
      sources: [...sources, ...metaSources(itemsLoaded.loaded, namesLoaded.loaded), ...STATIC_UNUSED_SOURCES],
      warnings: [],
      error: message,
    };
  }

  return {
    ok: true,
    scannedAt,
    hypixelUpdatedAt: normalized.hypixelUpdatedAt,
    fromCache: bazaar.fromCache,
    cacheAgeMs: Math.max(0, scannedAt - bazaar.at),
    items: normalized.items,
    sources: [
      ...sources,
      ...metaSources(itemsLoaded.loaded, namesLoaded.loaded, normalized),
      ...STATIC_UNUSED_SOURCES,
    ],
    warnings: capWarnings(normalized.warnings),
    error: null,
  };
}

function metaSources(
  items: Loaded,
  names: Loaded,
  normalized?: { namedFromHypixel: number; namedFromCoflnet: number; namedDerived: number },
): SourceReport[] {
  const itemReport: SourceReport = items.ok
    ? {
        id: "hypixel-items",
        label: "Hypixel items",
        role: "Names, category, rarity, NPC price",
        status: items.staleError ? "degraded" : "ok",
        fetchedAt: items.at,
        detail: items.staleError
          ? `Refresh failed (${items.staleError}). Using the cached item list.`
          : normalized
            ? `${normalized.namedFromHypixel.toLocaleString("en-US")} products named from this list.`
            : "Item list loaded.",
        href: ITEMS_URL,
      }
    : {
        id: "hypixel-items",
        label: "Hypixel items",
        role: "Names, category, rarity, NPC price",
        status: "error",
        fetchedAt: null,
        detail: `${items.error}. Products still scan; names fall back to Coflnet or a derived label.`,
        href: ITEMS_URL,
      };
  const nameReport: SourceReport = names.ok
    ? {
        id: "coflnet-names",
        label: "SkyCofl item names",
        role: "Names Hypixel's item list does not carry",
        status: names.staleError ? "degraded" : "ok",
        fetchedAt: names.at,
        detail: normalized
          ? `${normalized.namedFromCoflnet.toLocaleString("en-US")} products use a Coflnet name. ${normalized.namedDerived.toLocaleString("en-US")} still use a derived label. Coflnet names never replace a Hypixel name.`
          : "Name list loaded.",
        href: "https://sky.coflnet.com",
      }
    : {
        id: "coflnet-names",
        label: "SkyCofl item names",
        role: "Names Hypixel's item list does not carry",
        status: "error",
        fetchedAt: null,
        detail: `${names.error}. Derived names are used where Hypixel has no item entry.`,
        href: "https://sky.coflnet.com",
      };
  return [itemReport, nameReport];
}

export const scanBazaar = createServerFn({ method: "POST" })
  .validator((input: { force?: boolean } | undefined) => ({ force: input?.force === true }))
  .handler(async ({ data }): Promise<ScanResult> => {
    if (scanInflight) return scanInflight;
    scanInflight = assemble(data.force).finally(() => {
      scanInflight = null;
    });
    return scanInflight;
  });

function historyRange(value: string | undefined): "hour" | "day" | "week" {
  if (value === "hour" || value === "day" || value === "week") return value;
  throw new Error("Choose a product and a history range.");
}

export const fetchItemHistory = createServerFn({ method: "GET" })
  .validator((input: { id?: string; range?: string } | undefined) => {
    const id = canonicalItemId(String(input?.id ?? ""));
    if (!id) throw new Error("Choose a product and a history range.");
    return { id, range: historyRange(input?.range) };
  })
  .handler(async ({ data }): Promise<HistoryResult> => {
    const key = `${data.range}:${data.id}`;
    const href = coflItemHref(data.id);
    const cached = historyCache.get(key);
    const now = Date.now();
    if (cached && shouldUseCache(now - cached.at, HISTORY_TTL_MS, false, HISTORY_TTL_MS)) {
      return { ...cached.body, fromCache: true };
    }
    const url = coflHistoryUrl(data.id, data.range);
    const result = await fetchJsonWithRetry(url, { retries: 2, timeoutMs: 20_000 });
    if (!result.ok) {
      return {
        ok: false,
        id: data.id,
        range: data.range,
        fetchedAt: null,
        fromCache: false,
        points: [],
        error: `SkyCofl history is unavailable (${result.error}).`,
        href,
      };
    }
    try {
      const points = parseCoflHistory(result.body);
      const payload: HistoryResult = {
        ok: true,
        id: data.id,
        range: data.range,
        fetchedAt: Date.now(),
        fromCache: false,
        points,
        error: null,
        href,
      };
      historyCache.set(key, { at: payload.fetchedAt ?? Date.now(), body: payload });
      return payload;
    } catch (error) {
      return {
        ok: false,
        id: data.id,
        range: data.range,
        fetchedAt: null,
        fromCache: false,
        points: [],
        error: error instanceof Error ? error.message : "SkyCofl history could not be read.",
        href,
      };
    }
  });
