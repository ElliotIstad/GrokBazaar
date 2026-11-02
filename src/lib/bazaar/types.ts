/** One price level from Hypixel buy_summary or sell_summary. Not the full book. */
export type OrderLevel = {
  pricePerUnit: number;
  amount: number;
  orders: number;
};

/**
 * One side of a product as Hypixel publishes it.
 * `buy` is the instant-buy side (buy_summary / buyPrice / buyVolume).
 * `sell` is the instant-sell side (sell_summary / sellPrice / sellVolume).
 * Quantities here are active orders, never executed trades.
 */
export type BookSide = {
  /** quick_status volume: items in all active orders on this side. */
  orderQty: number | null;
  /** quick_status order count. */
  orderCount: number | null;
  /**
   * Weighted average of the top 2% of orders by volume.
   * Null when the side has no quantity or the price is not a positive finite number.
   * This is not the next-unit fill price.
   */
  weightedPrice: number | null;
  /**
   * Best price among the returned summary (at most 30 levels).
   * Instant-buy side: cheapest level. Instant-sell side: highest level.
   * Null when Hypixel returned no levels. Never coerced to 0.
   */
  bestPrice: number | null;
  levels: OrderLevel[];
};

/** Stats computed only from scans this browser has stored. Never invented. */
export type LocalStats = {
  samples: number;
  spanMs: number;
  from: number;
  to: number;
  weightedBuyChangePct: number | null;
  weightedSellChangePct: number | null;
  weightedBuyPrevPct: number | null;
  weightedSellPrevPct: number | null;
  buyVolatilityPct: number | null;
  sellVolatilityPct: number | null;
  /** Signed change in buyMovingWeek since the previous stored scan. Can be negative. */
  buyWeekDelta: number | null;
  sellWeekDelta: number | null;
};

export type BazaarProduct = {
  id: string;
  name: string;
  nameSource: "hypixel-items" | "coflnet" | "derived";
  /** Present only when another source disagrees with the display name. Not merged in. */
  alternateName: string | null;
  alternateNameSource: "coflnet" | null;
  category: string | null;
  categorySource: "hypixel-items" | "id-prefix" | null;
  rarity: string | null;
  npcSellPrice: number | null;
  buy: BookSide;
  sell: BookSide;
  /**
   * buyMovingWeek / sellMovingWeek.
   * Historic transacted units over seven days plus the live state.
   * Not order-book quantity.
   */
  buyWeek: number | null;
  sellWeek: number | null;
  hypixelUpdatedAt: number | null;
  local: LocalStats | null;
};

export type SourceStatus = "ok" | "degraded" | "unused" | "error";

export type SourceReport = {
  id: string;
  label: string;
  role: string;
  status: SourceStatus;
  fetchedAt: number | null;
  detail: string;
  href?: string;
};

export type ScanResult = {
  ok: boolean;
  /** When this process finished assembling the catalogue. */
  scannedAt: number;
  /** Hypixel `lastUpdated`, milliseconds. */
  hypixelUpdatedAt: number | null;
  fromCache: boolean;
  cacheAgeMs: number;
  items: BazaarProduct[];
  sources: SourceReport[];
  warnings: string[];
  error: string | null;
};

export type CoflPoint = {
  at: number;
  /** Coflnet `buy` — tracks Hypixel weighted buy, not a separate definition we blend. */
  buy: number | null;
  sell: number | null;
  minBuy: number | null;
  maxBuy: number | null;
  minSell: number | null;
  maxSell: number | null;
  /** Order-book quantity snapshot, not units traded in the bucket. */
  buyOrderQty: number | null;
  sellOrderQty: number | null;
  buyMovingWeek: number | null;
  sellMovingWeek: number | null;
};

export type HistoryResult = {
  ok: boolean;
  id: string;
  range: "hour" | "day" | "week";
  fetchedAt: number | null;
  fromCache: boolean;
  points: CoflPoint[];
  error: string | null;
  href: string;
};
