import { canonicalItemId, categoryFromId, derivedName } from "./ids.ts";
import { nonNegativeOrNull, positiveOrNull } from "./numbers.ts";
import type { BazaarProduct, BookSide, CoflPoint, OrderLevel } from "./types.ts";

export type ItemMeta = {
  name: string;
  category: string | null;
  rarity: string | null;
  npcSellPrice: number | null;
};

export type NormalizeInput = {
  bazaar: unknown;
  items: unknown | null;
  names: unknown | null;
  hypixelUpdatedAt?: number | null;
};

export type NormalizeOutput = {
  items: BazaarProduct[];
  hypixelUpdatedAt: number | null;
  warnings: string[];
  productCount: number;
  namedFromHypixel: number;
  namedFromCoflnet: number;
  namedDerived: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function levelsFrom(value: unknown, warnings: string[], id: string, side: string): OrderLevel[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    warnings.push(`${id}: ${side} summary was not a list and was ignored.`);
    return [];
  }
  const levels: OrderLevel[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;
    const price = positiveOrNull(row.pricePerUnit);
    const amount = nonNegativeOrNull(row.amount);
    const orders = nonNegativeOrNull(row.orders);
    if (price === null || amount === null || orders === null) continue;
    levels.push({ pricePerUnit: price, amount, orders });
  }
  return levels;
}

function bestPrice(levels: OrderLevel[], kind: "buy" | "sell"): number | null {
  if (levels.length === 0) return null;
  let best = levels[0]!.pricePerUnit;
  for (const level of levels) {
    if (kind === "buy" ? level.pricePerUnit < best : level.pricePerUnit > best) {
      best = level.pricePerUnit;
    }
  }
  return best;
}

function bookSide(
  summary: unknown,
  qty: unknown,
  count: unknown,
  weighted: unknown,
  warnings: string[],
  id: string,
  side: "buy" | "sell",
): BookSide {
  const levels = levelsFrom(summary, warnings, id, side);
  const orderQty = nonNegativeOrNull(qty);
  const orderCount = nonNegativeOrNull(count);
  const weightedRaw = positiveOrNull(weighted);
  // A weighted price with an empty book is not a live quote.
  const weightedPrice = orderQty !== null && orderQty > 0 ? weightedRaw : null;
  return {
    orderQty,
    orderCount,
    weightedPrice,
    bestPrice: bestPrice(levels, side),
    levels,
  };
}

export function readItemMeta(items: unknown | null, warnings: string[]): Map<string, ItemMeta> {
  const map = new Map<string, ItemMeta>();
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
      npcSellPrice: positiveOrNull(row.npc_sell_price),
    });
  }
  return map;
}

export function readCoflNames(names: unknown | null, warnings: string[]): Map<string, string> {
  const map = new Map<string, string>();
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

function namesDisagree(left: string, right: string): boolean {
  return left.trim().toLowerCase() !== right.trim().toLowerCase();
}

export function normalizeCatalogue(input: NormalizeInput): NormalizeOutput {
  const warnings: string[] = [];
  const root = asRecord(input.bazaar);
  if (!root || root.success === false || !asRecord(root.products)) {
    const cause = root && typeof root.cause === "string" ? root.cause : "missing products";
    throw new Error(`Hypixel Bazaar payload is unusable (${cause}).`);
  }
  const products = asRecord(root.products)!;
  const hypixelUpdatedAt =
    typeof root.lastUpdated === "number" && Number.isFinite(root.lastUpdated)
      ? root.lastUpdated
      : (input.hypixelUpdatedAt ?? null);

  const meta = readItemMeta(input.items, warnings);
  const cofl = readCoflNames(input.names, warnings);
  const items: BazaarProduct[] = [];
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
    let name: string;
    let nameSource: BazaarProduct["nameSource"];
    let alternateName: string | null = null;
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
    let categorySource: BazaarProduct["categorySource"] = category ? "hypixel-items" : null;
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
      sell: bookSide(
        product.sell_summary,
        quick.sellVolume,
        quick.sellOrders,
        quick.sellPrice,
        warnings,
        id,
        "sell",
      ),
      buyWeek: nonNegativeOrNull(quick.buyMovingWeek),
      sellWeek: nonNegativeOrNull(quick.sellMovingWeek),
      hypixelUpdatedAt,
      local: null,
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
    namedDerived,
  };
}

function numField(value: unknown): number | null {
  return positiveOrNull(value);
}

function qtyField(value: unknown): number | null {
  return nonNegativeOrNull(value);
}

export function parseCoflHistory(payload: unknown): CoflPoint[] {
  if (!Array.isArray(payload)) {
    throw new Error("Coflnet history was not a list.");
  }
  const points: CoflPoint[] = [];
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
      sellMovingWeek: qtyField(row.sellMovingWeek),
    });
  }
  points.sort((a, b) => a.at - b.at);
  return points;
}
