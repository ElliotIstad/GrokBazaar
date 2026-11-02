export const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
export const ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";
export const COFL_NAMES_URL = "https://sky.coflnet.com/api/items";

export function coflHistoryUrl(id: string, range: "hour" | "day" | "week"): string {
  return `https://sky.coflnet.com/api/bazaar/${encodeURIComponent(id)}/history/${range}`;
}

export function coflItemHref(id: string): string {
  return `https://sky.coflnet.com/item/${encodeURIComponent(id)}`;
}

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export type FetchJsonResult =
  | { ok: true; status: number; body: unknown; attempts: number }
  | { ok: false; status: number | null; error: string; attempts: number };

export async function fetchJsonWithRetry(
  url: string,
  options?: {
    fetchImpl?: typeof fetch;
    retries?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
    timeoutMs?: number;
  },
): Promise<FetchJsonResult> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  const sleep = options?.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options?.timeoutMs ?? 20_000;
  let lastError = "Request failed";
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { accept: "application/json", "user-agent": "BazaarDesk/1.0" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      lastStatus = response.status;
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        if (!RETRY_STATUSES.has(response.status) || attempt === retries) {
          return { ok: false, status: response.status, error: lastError, attempts: attempt };
        }
      } else {
        const text = await response.text();
        try {
          return { ok: true, status: response.status, body: JSON.parse(text) as unknown, attempts: attempt };
        } catch {
          return { ok: false, status: response.status, error: "Response was not valid JSON", attempts: attempt };
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network error";
      lastStatus = null;
      if (attempt === retries) {
        return { ok: false, status: null, error: lastError, attempts: attempt };
      }
    }
    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
  return { ok: false, status: lastStatus, error: lastError, attempts: retries };
}

/** Whether a cached payload should be reused. Force-refresh still waits out minGapMs. */
export function shouldUseCache(ageMs: number, ttlMs: number, force: boolean, minGapMs: number): boolean {
  if (!Number.isFinite(ageMs) || ageMs < 0) return false;
  if (!force && ageMs < ttlMs) return true;
  if (force && ageMs < minGapMs) return true;
  return false;
}
