import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as nonNegativeOrNull, n as categoryFromId, r as derivedName, s as positiveOrNull, t as canonicalItemId } from "./numbers-CN4WsuIs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scan.functions-Z6MgnT1O.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function levelsFrom(value, warnings, id, side) {
	if (value === void 0 || value === null) return [];
	if (!Array.isArray(value)) {
		warnings.push(`${id}: ${side} summary was not a list and was ignored.`);
		return [];
	}
	const levels = [];
	for (const entry of value) {
		const row = asRecord(entry);
		if (!row) continue;
		const price = positiveOrNull(row.pricePerUnit);
		const amount = nonNegativeOrNull(row.amount);
		const orders = nonNegativeOrNull(row.orders);
		if (price === null || amount === null || orders === null) continue;
		levels.push({
			pricePerUnit: price,
			amount,
			orders
		});
	}
	return levels;
}
function bestPrice(levels, kind) {
	if (levels.length === 0) return null;
	let best = levels[0].pricePerUnit;
	for (const level of levels) if (kind === "buy" ? level.pricePerUnit < best : level.pricePerUnit > best) best = level.pricePerUnit;
	return best;
}
function bookSide(summary, qty, count, weighted, warnings, id, side) {
	const levels = levelsFrom(summary, warnings, id, side);
	const orderQty = nonNegativeOrNull(qty);
	const orderCount = nonNegativeOrNull(count);
	const weightedRaw = positiveOrNull(weighted);
	return {
		orderQty,
		orderCount,
		weightedPrice: orderQty !== null && orderQty > 0 ? weightedRaw : null,
		bestPrice: bestPrice(levels, side),
		levels
	};
}
function readItemMeta(items, warnings) {
	const map = /* @__PURE__ */ new Map();
	if (items === null) return map;
	const root = asRecord(items);
	const list = Array.isArray(items) ? items : root && Array.isArray(root.items) ? root.items : null;
	if (!list) {
		warnings.push("Hypixel item list was not a recognisable payload. Names fall back to other sources.");
		return map;
	}
	for (const entry of list) {
		const row = asRecord(entry);
		if (!row || typeof row.id !== "string" || typeof row.name !== "string" || !row.name.trim()) continue;
		const id = canonicalItemId(row.id);
		map.set(id, {
			name: row.name.trim(),
			category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : null,
			rarity: typeof row.tier === "string" && row.tier.trim() ? row.tier.trim() : null,
			npcSellPrice: positiveOrNull(row.npc_sell_price)
		});
	}
	return map;
}
function readCoflNames(names, warnings) {
	const map = /* @__PURE__ */ new Map();
	if (names === null) return map;
	if (!Array.isArray(names)) {
		warnings.push("Coflnet name list was not a list. Unlisted products use derived names.");
		return map;
	}
	for (const entry of names) {
		const row = asRecord(entry);
		if (!row || typeof row.tag !== "string" || typeof row.name !== "string") continue;
		const name = row.name.trim();
		if (!name || name.toLowerCase() === "null") continue;
		map.set(canonicalItemId(row.tag), name);
	}
	return map;
}
function namesDisagree(left, right) {
	return left.trim().toLowerCase() !== right.trim().toLowerCase();
}
function normalizeCatalogue(input) {
	const warnings = [];
	const root = asRecord(input.bazaar);
	if (!root || root.success === false || !asRecord(root.products)) {
		const cause = root && typeof root.cause === "string" ? root.cause : "missing products";
		throw new Error(`Hypixel Bazaar payload is unusable (${cause}).`);
	}
	const products = asRecord(root.products);
	const hypixelUpdatedAt = typeof root.lastUpdated === "number" && Number.isFinite(root.lastUpdated) ? root.lastUpdated : input.hypixelUpdatedAt ?? null;
	const meta = readItemMeta(input.items, warnings);
	const cofl = readCoflNames(input.names, warnings);
	const items = [];
	let namedFromHypixel = 0;
	let namedFromCoflnet = 0;
	let namedDerived = 0;
	for (const [rawId, rawProduct] of Object.entries(products)) {
		const product = asRecord(rawProduct);
		const id = canonicalItemId(typeof rawProduct === "object" && product && typeof product.product_id === "string" ? product.product_id : rawId);
		if (!id) continue;
		if (!product) {
			warnings.push(`${id}: product was not an object and was skipped.`);
			continue;
		}
		const quick = asRecord(product.quick_status) ?? {};
		const info = meta.get(id);
		const coflName = cofl.get(id) ?? null;
		let name;
		let nameSource;
		let alternateName = null;
		if (info) {
			name = info.name;
			nameSource = "hypixel-items";
			namedFromHypixel += 1;
			if (coflName && namesDisagree(coflName, info.name)) alternateName = coflName;
		} else if (coflName) {
			name = coflName;
			nameSource = "coflnet";
			namedFromCoflnet += 1;
		} else {
			name = derivedName(id);
			nameSource = "derived";
			namedDerived += 1;
		}
		let category = info?.category ?? null;
		let categorySource = category ? "hypixel-items" : null;
		if (!category) {
			const derived = categoryFromId(id);
			if (derived) {
				category = derived;
				categorySource = "id-prefix";
			}
		}
		items.push({
			id,
			name,
			nameSource,
			alternateName,
			alternateNameSource: alternateName ? "coflnet" : null,
			category,
			categorySource,
			rarity: info?.rarity ?? null,
			npcSellPrice: info?.npcSellPrice ?? null,
			buy: bookSide(product.buy_summary, quick.buyVolume, quick.buyOrders, quick.buyPrice, warnings, id, "buy"),
			sell: bookSide(product.sell_summary, quick.sellVolume, quick.sellOrders, quick.sellPrice, warnings, id, "sell"),
			buyWeek: nonNegativeOrNull(quick.buyMovingWeek),
			sellWeek: nonNegativeOrNull(quick.sellMovingWeek),
			hypixelUpdatedAt,
			local: null
		});
	}
	items.sort((a, b) => a.id.localeCompare(b.id));
	return {
		items,
		hypixelUpdatedAt,
		warnings,
		productCount: items.length,
		namedFromHypixel,
		namedFromCoflnet,
		namedDerived
	};
}
function numField(value) {
	return positiveOrNull(value);
}
function qtyField(value) {
	return nonNegativeOrNull(value);
}
function parseCoflHistory(payload) {
	if (!Array.isArray(payload)) throw new Error("Coflnet history was not a list.");
	const points = [];
	for (const entry of payload) {
		const row = asRecord(entry);
		if (!row || typeof row.timestamp !== "string") continue;
		const at = Date.parse(row.timestamp);
		if (!Number.isFinite(at)) continue;
		points.push({
			at,
			buy: numField(row.buy),
			sell: numField(row.sell),
			minBuy: numField(row.minBuy),
			maxBuy: numField(row.maxBuy),
			minSell: numField(row.minSell),
			maxSell: numField(row.maxSell),
			buyOrderQty: qtyField(row.buyVolume),
			sellOrderQty: qtyField(row.sellVolume),
			buyMovingWeek: qtyField(row.buyMovingWeek),
			sellMovingWeek: qtyField(row.sellMovingWeek)
		});
	}
	points.sort((a, b) => a.at - b.at);
	return points;
}
var BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
var ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";
var COFL_NAMES_URL = "https://sky.coflnet.com/api/items";
function coflHistoryUrl(id, range) {
	return `https://sky.coflnet.com/api/bazaar/${encodeURIComponent(id)}/history/${range}`;
}
function coflItemHref(id) {
	return `https://sky.coflnet.com/item/${encodeURIComponent(id)}`;
}
var RETRY_STATUSES = /* @__PURE__ */ new Set([
	408,
	429,
	500,
	502,
	503,
	504
]);
async function fetchJsonWithRetry(url, options) {
	const fetchImpl = options?.fetchImpl ?? fetch;
	const retries = options?.retries ?? 3;
	const baseDelayMs = options?.baseDelayMs ?? 400;
	const sleep = options?.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
	const timeoutMs = options?.timeoutMs ?? 2e4;
	let lastError = "Request failed";
	let lastStatus = null;
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			const response = await fetchImpl(url, {
				headers: {
					accept: "application/json",
					"user-agent": "BazaarDesk/1.0"
				},
				signal: AbortSignal.timeout(timeoutMs)
			});
			lastStatus = response.status;
			if (!response.ok) {
				lastError = `HTTP ${response.status}`;
				if (!RETRY_STATUSES.has(response.status) || attempt === retries) return {
					ok: false,
					status: response.status,
					error: lastError,
					attempts: attempt
				};
			} else {
				const text = await response.text();
				try {
					return {
						ok: true,
						status: response.status,
						body: JSON.parse(text),
						attempts: attempt
					};
				} catch {
					return {
						ok: false,
						status: response.status,
						error: "Response was not valid JSON",
						attempts: attempt
					};
				}
			}
		} catch (error) {
			lastError = error instanceof Error ? error.message : "Network error";
			lastStatus = null;
			if (attempt === retries) return {
				ok: false,
				status: null,
				error: lastError,
				attempts: attempt
			};
		}
		await sleep(baseDelayMs * 2 ** (attempt - 1));
	}
	return {
		ok: false,
		status: lastStatus,
		error: lastError,
		attempts: retries
	};
}
/** Whether a cached payload should be reused. Force-refresh still waits out minGapMs. */
function shouldUseCache(ageMs, ttlMs, force, minGapMs) {
	if (!Number.isFinite(ageMs) || ageMs < 0) return false;
	if (!force && ageMs < ttlMs) return true;
	if (force && ageMs < minGapMs) return true;
	return false;
}
var STATIC_UNUSED_SOURCES = [{
	id: "skyblock-finance",
	label: "skyblock.finance",
	role: "Supplementary prices",
	status: "unused",
	fetchedAt: null,
	detail: "Not queried. The host did not resolve when the desk was built, so there is no structured feed to prefer over Hypixel.",
	href: "https://skyblock.finance"
}, {
	id: "skyblock-bz",
	label: "skyblock.bz",
	role: "Supplementary prices",
	status: "unused",
	fetchedAt: null,
	detail: "Not queried at runtime. The site responds, but no public JSON API was available at the usual bazaar paths. HTML scraping is intentionally not used.",
	href: "https://www.skyblock.bz"
}];
var BAZAAR_TTL_MS = 2e4;
var BAZAAR_MIN_GAP_MS = 15e3;
var META_TTL_MS = 216e5;
var HISTORY_TTL_MS = 6e4;
var bazaarCache = null;
var itemsCache = null;
var namesCache = null;
var historyCache = /* @__PURE__ */ new Map();
var scanInflight = null;
async function loadUrl(url, cache, ttl, force, minGap) {
	if (cache && shouldUseCache(Date.now() - cache.at, ttl, force, minGap)) return {
		loaded: {
			ok: true,
			body: cache.body,
			at: cache.at,
			fromCache: true,
			attempts: 0
		},
		cache
	};
	const result = await fetchJsonWithRetry(url);
	if (!result.ok) {
		if (cache) return {
			loaded: {
				ok: true,
				body: cache.body,
				at: cache.at,
				fromCache: true,
				attempts: result.attempts,
				staleError: result.error
			},
			cache
		};
		return {
			loaded: {
				ok: false,
				error: result.error,
				attempts: result.attempts
			},
			cache
		};
	}
	const next = {
		at: Date.now(),
		body: result.body
	};
	return {
		loaded: {
			ok: true,
			body: next.body,
			at: next.at,
			fromCache: false,
			attempts: result.attempts
		},
		cache: next
	};
}
function capWarnings(warnings) {
	if (warnings.length <= 8) return warnings;
	return [...warnings.slice(0, 8), `${warnings.length - 8} further notes were omitted.`];
}
async function assemble(force) {
	const bazaarPromise = loadUrl(BAZAAR_URL, bazaarCache, BAZAAR_TTL_MS, force, BAZAAR_MIN_GAP_MS);
	const itemsPromise = loadUrl(ITEMS_URL, itemsCache, META_TTL_MS, false, META_TTL_MS);
	const namesPromise = loadUrl(COFL_NAMES_URL, namesCache, META_TTL_MS, false, META_TTL_MS);
	const [bazaarLoaded, itemsLoaded, namesLoaded] = await Promise.all([
		bazaarPromise,
		itemsPromise,
		namesPromise
	]);
	bazaarCache = bazaarLoaded.cache;
	itemsCache = itemsLoaded.cache;
	namesCache = namesLoaded.cache;
	const sources = [];
	const scannedAt = Date.now();
	if (!bazaarLoaded.loaded.ok) {
		sources.push({
			id: "hypixel-bazaar",
			label: "Hypixel Bazaar",
			role: "Live order book and weekly volumes",
			status: "error",
			fetchedAt: null,
			detail: `${bazaarLoaded.loaded.error} after ${bazaarLoaded.loaded.attempts} attempt(s). No catalogue was invented.`,
			href: "https://api.hypixel.net/"
		});
		return {
			ok: false,
			scannedAt,
			hypixelUpdatedAt: null,
			fromCache: false,
			cacheAgeMs: 0,
			items: [],
			sources: [
				...sources,
				...metaSources(itemsLoaded.loaded, namesLoaded.loaded),
				...STATIC_UNUSED_SOURCES
			],
			warnings: [],
			error: `Hypixel Bazaar is unavailable (${bazaarLoaded.loaded.error}).`
		};
	}
	const bazaar = bazaarLoaded.loaded;
	sources.push({
		id: "hypixel-bazaar",
		label: "Hypixel Bazaar",
		role: "Live order book and weekly volumes",
		status: bazaar.staleError ? "degraded" : "ok",
		fetchedAt: bazaar.at,
		detail: bazaar.staleError ? `Live refresh failed (${bazaar.staleError}). Showing the last good payload.` : bazaar.fromCache ? "Served from the short server cache so the public endpoint is not polled on every click." : `Fetched from Hypixel (${bazaar.attempts} attempt(s)). No API key — this endpoint is public.`,
		href: "https://api.hypixel.net/"
	});
	let normalized;
	try {
		normalized = normalizeCatalogue({
			bazaar: bazaar.body,
			items: itemsLoaded.loaded.ok ? itemsLoaded.loaded.body : null,
			names: namesLoaded.loaded.ok ? namesLoaded.loaded.body : null
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
			sources: [
				...sources,
				...metaSources(itemsLoaded.loaded, namesLoaded.loaded),
				...STATIC_UNUSED_SOURCES
			],
			warnings: [],
			error: message
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
			...STATIC_UNUSED_SOURCES
		],
		warnings: capWarnings(normalized.warnings),
		error: null
	};
}
function metaSources(items, names, normalized) {
	return [items.ok ? {
		id: "hypixel-items",
		label: "Hypixel items",
		role: "Names, category, rarity, NPC price",
		status: items.staleError ? "degraded" : "ok",
		fetchedAt: items.at,
		detail: items.staleError ? `Refresh failed (${items.staleError}). Using the cached item list.` : normalized ? `${normalized.namedFromHypixel.toLocaleString("en-US")} products named from this list.` : "Item list loaded.",
		href: ITEMS_URL
	} : {
		id: "hypixel-items",
		label: "Hypixel items",
		role: "Names, category, rarity, NPC price",
		status: "error",
		fetchedAt: null,
		detail: `${items.error}. Products still scan; names fall back to Coflnet or a derived label.`,
		href: ITEMS_URL
	}, names.ok ? {
		id: "coflnet-names",
		label: "SkyCofl item names",
		role: "Names Hypixel's item list does not carry",
		status: names.staleError ? "degraded" : "ok",
		fetchedAt: names.at,
		detail: normalized ? `${normalized.namedFromCoflnet.toLocaleString("en-US")} products use a Coflnet name. ${normalized.namedDerived.toLocaleString("en-US")} still use a derived label. Coflnet names never replace a Hypixel name.` : "Name list loaded.",
		href: "https://sky.coflnet.com"
	} : {
		id: "coflnet-names",
		label: "SkyCofl item names",
		role: "Names Hypixel's item list does not carry",
		status: "error",
		fetchedAt: null,
		detail: `${names.error}. Derived names are used where Hypixel has no item entry.`,
		href: "https://sky.coflnet.com"
	}];
}
var scanBazaar_createServerFn_handler = createServerRpc({
	id: "d47887d1bc9fb7e404bd9ed7e26d7f7bbf01768c8074013dcca5a01d3eecca44",
	name: "scanBazaar",
	filename: "src/lib/bazaar/scan.functions.ts"
}, (opts) => scanBazaar.__executeServer(opts));
var scanBazaar = createServerFn({ method: "POST" }).validator((input) => ({ force: input?.force === true })).handler(scanBazaar_createServerFn_handler, async ({ data }) => {
	if (scanInflight) return scanInflight;
	scanInflight = assemble(data.force).finally(() => {
		scanInflight = null;
	});
	return scanInflight;
});
function historyRange(value) {
	if (value === "hour" || value === "day" || value === "week") return value;
	throw new Error("Choose a product and a history range.");
}
var fetchItemHistory_createServerFn_handler = createServerRpc({
	id: "a0700fb8265dd636516e3556c9c3d477a17dbc0cbb0e845033b44b47f1ce151a",
	name: "fetchItemHistory",
	filename: "src/lib/bazaar/scan.functions.ts"
}, (opts) => fetchItemHistory.__executeServer(opts));
var fetchItemHistory = createServerFn({ method: "GET" }).validator((input) => {
	const id = canonicalItemId(String(input?.id ?? ""));
	if (!id) throw new Error("Choose a product and a history range.");
	return {
		id,
		range: historyRange(input?.range)
	};
}).handler(fetchItemHistory_createServerFn_handler, async ({ data }) => {
	const key = `${data.range}:${data.id}`;
	const href = coflItemHref(data.id);
	const cached = historyCache.get(key);
	if (cached && shouldUseCache(Date.now() - cached.at, HISTORY_TTL_MS, false, HISTORY_TTL_MS)) return {
		...cached.body,
		fromCache: true
	};
	const result = await fetchJsonWithRetry(coflHistoryUrl(data.id, data.range), {
		retries: 2,
		timeoutMs: 2e4
	});
	if (!result.ok) return {
		ok: false,
		id: data.id,
		range: data.range,
		fetchedAt: null,
		fromCache: false,
		points: [],
		error: `SkyCofl history is unavailable (${result.error}).`,
		href
	};
	try {
		const points = parseCoflHistory(result.body);
		const payload = {
			ok: true,
			id: data.id,
			range: data.range,
			fetchedAt: Date.now(),
			fromCache: false,
			points,
			error: null,
			href
		};
		historyCache.set(key, {
			at: payload.fetchedAt ?? Date.now(),
			body: payload
		});
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
			href
		};
	}
});
//#endregion
export { fetchItemHistory_createServerFn_handler, scanBazaar_createServerFn_handler };
