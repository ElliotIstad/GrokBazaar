import type { BookSide, BazaarProduct, CoflPoint, OrderLevel } from "./types.ts";

/** Seven-day moving volumes become an average hour by dividing by 7 × 24. */
export const HOURS_PER_WEEK = 168;
export const HOURS_PER_DAY = 24;

export type MetricContext = {
  /** Fraction, not percent. 0.0125 means 1.25%. */
  taxRate: number;
};

export type MetricUnit = "coins" | "items" | "count" | "percent" | "hours" | "text";

export type MetricDef = {
  id: string;
  label: string;
  short: string;
  group: string;
  kind: "number" | "text";
  unit: MetricUnit;
  tone: "neutral" | "change" | "pnl";
  description: string;
  read: (item: BazaarProduct, ctx: MetricContext) => number | string | null;
};

export function averagePerHour(weekVolume: number | null): number | null {
  if (weekVolume === null || !Number.isFinite(weekVolume)) return null;
  return weekVolume / HOURS_PER_WEEK;
}

export function averagePerDay(weekVolume: number | null): number | null {
  if (weekVolume === null || !Number.isFinite(weekVolume)) return null;
  return weekVolume / 7;
}

/**
 * Full-book quantity × top-2% weighted price.
 * This estimates coins sitting in orders. It is not an integral of the real book:
 * deeper levels are usually worse than the top 2%, so the estimate is biased high.
 * Returns null when either input is missing. Never substitutes 0.
 */
export function estimatedOrderValue(qty: number | null, weightedPrice: number | null): number | null {
  if (qty === null || weightedPrice === null) return null;
  if (!Number.isFinite(qty) || !Number.isFinite(weightedPrice)) return null;
  return qty * weightedPrice;
}

/** Exact sum of amount × price over the returned summary only. Null when no levels came back. */
export function visibleBookValue(levels: OrderLevel[]): number | null {
  if (levels.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const level of levels) {
    if (!Number.isFinite(level.amount) || !Number.isFinite(level.pricePerUnit)) continue;
    sum += level.amount * level.pricePerUnit;
    any = true;
  }
  return any ? sum : null;
}

export function summaryQty(levels: OrderLevel[]): number | null {
  if (levels.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const level of levels) {
    if (!Number.isFinite(level.amount)) continue;
    sum += level.amount;
    any = true;
  }
  return any ? sum : null;
}

/**
 * Quantity in the returned summary within `fraction` of the best price.
 * Buy side (asks): prices at or below best × (1 + fraction).
 * Sell side (bids): prices at or above best × (1 − fraction).
 */
export function depthQty(side: BookSide, kind: "buy" | "sell", fraction: number): number | null {
  if (side.bestPrice === null || side.levels.length === 0) return null;
  const limit =
    kind === "buy" ? side.bestPrice * (1 + fraction) : side.bestPrice * (1 - fraction);
  let qty = 0;
  for (const level of side.levels) {
    if (!Number.isFinite(level.amount) || !Number.isFinite(level.pricePerUnit)) continue;
    const inside =
      kind === "buy" ? level.pricePerUnit <= limit + 1e-6 : level.pricePerUnit >= limit - 1e-6;
    if (inside) qty += level.amount;
  }
  return qty;
}

export function depthValue(side: BookSide, kind: "buy" | "sell", fraction: number): number | null {
  if (side.bestPrice === null || side.levels.length === 0) return null;
  const limit =
    kind === "buy" ? side.bestPrice * (1 + fraction) : side.bestPrice * (1 - fraction);
  let sum = 0;
  for (const level of side.levels) {
    if (!Number.isFinite(level.amount) || !Number.isFinite(level.pricePerUnit)) continue;
    const inside =
      kind === "buy" ? level.pricePerUnit <= limit + 1e-6 : level.pricePerUnit >= limit - 1e-6;
    if (inside) sum += level.amount * level.pricePerUnit;
  }
  return sum;
}

export function spread(ask: number | null, bid: number | null): number | null {
  if (ask === null || bid === null) return null;
  return ask - bid;
}

export function spreadPct(ask: number | null, bid: number | null): number | null {
  if (ask === null || bid === null || bid === 0) return null;
  return ((ask - bid) / Math.abs(bid)) * 100;
}

/**
 * Coins per unit for an instant buy followed by an instant sell, after tax on the sell.
 * Usually negative. Tax rate is the user's setting, not a hidden strategy constant.
 */
export function roundTripAfterTax(
  instantBuy: number | null,
  instantSell: number | null,
  taxRate: number,
): number | null {
  if (instantBuy === null || instantSell === null || !Number.isFinite(taxRate)) return null;
  return instantSell * (1 - taxRate) - instantBuy;
}

export function coefficientOfVariationPct(values: number[]): number | null {
  if (values.length < 3) return null;
  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / values.length;
  if (!Number.isFinite(mean) || mean === 0) return null;
  let squares = 0;
  for (const value of values) squares += (value - mean) ** 2;
  return (Math.sqrt(squares / values.length) / Math.abs(mean)) * 100;
}

export function percentChange(first: number | null, last: number | null): number | null {
  if (first === null || last === null || first === 0) return null;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  return ((last - first) / Math.abs(first)) * 100;
}

export function priceGap(
  primary: number | null,
  other: number | null,
): { abs: number; pct: number } | null {
  if (primary === null || other === null || primary === 0) return null;
  const abs = other - primary;
  return { abs, pct: (abs / Math.abs(primary)) * 100 };
}

export type CoflWindowStats = {
  samples: number;
  from: number | null;
  to: number | null;
  buyChangePct: number | null;
  sellChangePct: number | null;
  buyAvg: number | null;
  sellAvg: number | null;
  buyVolatilityPct: number | null;
  sellVolatilityPct: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function coflWindowStats(points: CoflPoint[]): CoflWindowStats {
  const buys = points.map((point) => point.buy).filter((value): value is number => value !== null);
  const sells = points.map((point) => point.sell).filter((value): value is number => value !== null);
  const first = points[0];
  const last = points[points.length - 1];
  return {
    samples: points.length,
    from: first?.at ?? null,
    to: last?.at ?? null,
    buyChangePct: points.length >= 2 ? percentChange(first?.buy ?? null, last?.buy ?? null) : null,
    sellChangePct: points.length >= 2 ? percentChange(first?.sell ?? null, last?.sell ?? null) : null,
    buyAvg: average(buys),
    sellAvg: average(sells),
    buyVolatilityPct: coefficientOfVariationPct(buys),
    sellVolatilityPct: coefficientOfVariationPct(sells),
  };
}

const num = (
  partial: Omit<MetricDef, "kind" | "read"> & {
    read: MetricDef["read"];
  },
): MetricDef => ({ ...partial, kind: "number" });

const text = (
  partial: Omit<MetricDef, "kind" | "unit" | "tone" | "read"> & {
    read: MetricDef["read"];
  },
): MetricDef => ({ ...partial, kind: "text", unit: "text", tone: "neutral" });

function coverage(summary: number | null, full: number | null): number | null {
  if (summary === null || full === null || full === 0) return null;
  return (summary / full) * 100;
}

function bestLevel(side: BookSide, kind: "buy" | "sell"): OrderLevel | null {
  if (side.bestPrice === null) return null;
  if (kind === "buy") {
    return side.levels.reduce<OrderLevel | null>((best, level) => {
      if (!best || level.pricePerUnit < best.pricePerUnit) return level;
      return best;
    }, null);
  }
  return side.levels.reduce<OrderLevel | null>((best, level) => {
    if (!best || level.pricePerUnit > best.pricePerUnit) return level;
    return best;
  }, null);
}

function turnover(item: BazaarProduct, hours: number): number | null {
  const buyHour = averagePerHour(item.buyWeek);
  const sellHour = averagePerHour(item.sellWeek);
  if (
    buyHour === null ||
    sellHour === null ||
    item.buy.weightedPrice === null ||
    item.sell.weightedPrice === null
  ) {
    return null;
  }
  const perHour = buyHour * item.buy.weightedPrice + sellHour * item.sell.weightedPrice;
  return perHour * (hours / 1);
}

export const METRICS: MetricDef[] = [
  text({
    id: "name",
    label: "Item name",
    short: "Name",
    group: "Identity",
    description: "Display name. Hypixel's item list wins. Coflnet fills gaps. Otherwise the id is prettified and marked as derived.",
    read: (item) => item.name,
  }),
  text({
    id: "id",
    label: "Item ID",
    short: "ID",
    group: "Identity",
    description: "Canonical Hypixel product id. This is the key used everywhere in the desk.",
    read: (item) => item.id,
  }),
  text({
    id: "category",
    label: "Category",
    short: "Category",
    group: "Identity",
    description: "Hypixel item category when the item list has one. Enchantments, shards and essences get an id-prefix category, labelled as derived.",
    read: (item) => item.category,
  }),
  text({
    id: "rarity",
    label: "Rarity",
    short: "Rarity",
    group: "Identity",
    description: "Hypixel item tier. Unavailable when the item list has no tier. Never guessed.",
    read: (item) => item.rarity,
  }),
  text({
    id: "nameSource",
    label: "Name source",
    short: "Name from",
    group: "Identity",
    description: "Which source supplied the display name.",
    read: (item) => item.nameSource,
  }),

  num({
    id: "instantBuy",
    label: "Instant buy",
    short: "Insta buy",
    group: "Prices",
    unit: "coins",
    tone: "neutral",
    description:
      "Cheapest pricePerUnit in buy_summary. This is the next-unit instant-buy cost among the orders Hypixel returned (top 30). It is not buyPrice, and it is not a guaranteed fill if you walk past that level. Unavailable when buy_summary is empty.",
    read: (item) => item.buy.bestPrice,
  }),
  num({
    id: "instantSell",
    label: "Instant sell",
    short: "Insta sell",
    group: "Prices",
    unit: "coins",
    tone: "neutral",
    description:
      "Highest pricePerUnit in sell_summary. This is the next-unit instant-sell proceeds before tax, among the orders Hypixel returned. Unavailable when sell_summary is empty. Not sellVolume and not a traded price.",
    read: (item) => item.sell.bestPrice,
  }),
  num({
    id: "weightedBuy",
    label: "Weighted buy price",
    short: "Wtd buy",
    group: "Prices",
    unit: "coins",
    tone: "neutral",
    description:
      "quick_status.buyPrice. Hypixel's weighted average of the top 2% of buy-side orders by volume. Approximate instant-buy level, not the next tick and not an average of the whole book. Cleared when buy volume is 0 or the price is not positive.",
    read: (item) => item.buy.weightedPrice,
  }),
  num({
    id: "weightedSell",
    label: "Weighted sell price",
    short: "Wtd sell",
    group: "Prices",
    unit: "coins",
    tone: "neutral",
    description:
      "quick_status.sellPrice. Weighted average of the top 2% of sell-side orders by volume. Approximate instant-sell proceeds before tax. Cleared when sell volume is 0 or the price is not positive.",
    read: (item) => item.sell.weightedPrice,
  }),

  num({
    id: "instantSpread",
    label: "Instant spread",
    short: "Spread",
    group: "Spread",
    unit: "coins",
    tone: "neutral",
    description:
      "Instant buy minus instant sell. Positive means an instant round trip loses coins before tax, which is the normal book. Not a profit figure.",
    read: (item) => spread(item.buy.bestPrice, item.sell.bestPrice),
  }),
  num({
    id: "instantSpreadPct",
    label: "Instant spread %",
    short: "Spread %",
    group: "Spread",
    unit: "percent",
    tone: "neutral",
    description: "Instant spread divided by instant sell, in percent. Unavailable if instant sell is missing or zero.",
    read: (item) => spreadPct(item.buy.bestPrice, item.sell.bestPrice),
  }),
  num({
    id: "weightedSpread",
    label: "Weighted spread",
    short: "Wtd spread",
    group: "Spread",
    unit: "coins",
    tone: "neutral",
    description: "Weighted buy price minus weighted sell price. Uses the top-2% averages, so it can differ from the next-tick spread.",
    read: (item) => spread(item.buy.weightedPrice, item.sell.weightedPrice),
  }),
  num({
    id: "weightedSpreadPct",
    label: "Weighted spread %",
    short: "Wtd spr %",
    group: "Spread",
    unit: "percent",
    tone: "neutral",
    description: "Weighted spread divided by the weighted sell price, in percent.",
    read: (item) => spreadPct(item.buy.weightedPrice, item.sell.weightedPrice),
  }),
  num({
    id: "roundTripAfterTax",
    label: "Instant round trip after tax",
    short: "After tax",
    group: "Spread",
    unit: "coins",
    tone: "pnl",
    description:
      "Instant sell × (1 − tax) − instant buy. Tax comes from Settings (default 1.25%). Usually negative. This is a calculator, not a trading rule baked into the filters.",
    read: (item, ctx) => roundTripAfterTax(item.buy.bestPrice, item.sell.bestPrice, ctx.taxRate),
  }),

  num({
    id: "buyOrderQty",
    label: "Buy-side order quantity",
    short: "Buy qty",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description:
      "quick_status.buyVolume. Items sitting in active buy-side orders. This is liquidity, not units traded. Do not read it as hourly volume.",
    read: (item) => item.buy.orderQty,
  }),
  num({
    id: "sellOrderQty",
    label: "Sell-side order quantity",
    short: "Sell qty",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description: "quick_status.sellVolume. Items sitting in active sell-side orders. Not units traded.",
    read: (item) => item.sell.orderQty,
  }),
  num({
    id: "buyOrderCount",
    label: "Buy-side order count",
    short: "Buy orders",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "quick_status.buyOrders. Number of active buy-side orders, not items and not trades.",
    read: (item) => item.buy.orderCount,
  }),
  num({
    id: "sellOrderCount",
    label: "Sell-side order count",
    short: "Sell orders",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "quick_status.sellOrders. Number of active sell-side orders.",
    read: (item) => item.sell.orderCount,
  }),
  num({
    id: "buyLevelCount",
    label: "Buy-summary levels",
    short: "Buy levels",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "How many price levels Hypixel returned in buy_summary. Capped by the API at 30. Not the depth of the whole book.",
    read: (item) => (item.buy.levels.length === 0 ? null : item.buy.levels.length),
  }),
  num({
    id: "sellLevelCount",
    label: "Sell-summary levels",
    short: "Sell levels",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "How many price levels Hypixel returned in sell_summary. Capped at 30. Not the whole book.",
    read: (item) => (item.sell.levels.length === 0 ? null : item.sell.levels.length),
  }),
  num({
    id: "buySummaryQty",
    label: "Visible buy-summary quantity",
    short: "Buy shown",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description: "Sum of amounts in buy_summary only. Often much smaller than buy-side order quantity.",
    read: (item) => summaryQty(item.buy.levels),
  }),
  num({
    id: "sellSummaryQty",
    label: "Visible sell-summary quantity",
    short: "Sell shown",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description: "Sum of amounts in sell_summary only. Not sellVolume.",
    read: (item) => summaryQty(item.sell.levels),
  }),
  num({
    id: "buyCoveragePct",
    label: "Buy summary coverage",
    short: "Buy cover",
    group: "Order book",
    unit: "percent",
    tone: "neutral",
    description: "Visible buy-summary quantity divided by full buy-side order quantity. Shows how much of the book the summary actually contains.",
    read: (item) => coverage(summaryQty(item.buy.levels), item.buy.orderQty),
  }),
  num({
    id: "sellCoveragePct",
    label: "Sell summary coverage",
    short: "Sell cover",
    group: "Order book",
    unit: "percent",
    tone: "neutral",
    description: "Visible sell-summary quantity divided by full sell-side order quantity.",
    read: (item) => coverage(summaryQty(item.sell.levels), item.sell.orderQty),
  }),
  num({
    id: "buyBestAmount",
    label: "Quantity at instant buy",
    short: "Ask size",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description: "Amount on the cheapest buy-summary level. How many units the next instant buy hits before the price moves.",
    read: (item) => bestLevel(item.buy, "buy")?.amount ?? null,
  }),
  num({
    id: "sellBestAmount",
    label: "Quantity at instant sell",
    short: "Bid size",
    group: "Order book",
    unit: "items",
    tone: "neutral",
    description: "Amount on the highest sell-summary level.",
    read: (item) => bestLevel(item.sell, "sell")?.amount ?? null,
  }),
  num({
    id: "buyBestOrders",
    label: "Orders at instant buy",
    short: "Ask orders",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "Order count on the cheapest buy-summary level.",
    read: (item) => bestLevel(item.buy, "buy")?.orders ?? null,
  }),
  num({
    id: "sellBestOrders",
    label: "Orders at instant sell",
    short: "Bid orders",
    group: "Order book",
    unit: "count",
    tone: "neutral",
    description: "Order count on the highest sell-summary level.",
    read: (item) => bestLevel(item.sell, "sell")?.orders ?? null,
  }),

  num({
    id: "estBuyValue",
    label: "Estimated buy-side order value",
    short: "Buy value",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description:
      "Buy-side order quantity × weighted buy price. An estimate of coins in buy-side orders. Biased high because the weight is the top 2%, not the average of the whole book. This is the metric the example preset calls buy order value. It is not the sum of buy_summary.",
    read: (item) => estimatedOrderValue(item.buy.orderQty, item.buy.weightedPrice),
  }),
  num({
    id: "estSellValue",
    label: "Estimated sell-side order value",
    short: "Sell value",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description:
      "Sell-side order quantity × weighted sell price. Same estimate, sell side. Not the sum of sell_summary.",
    read: (item) => estimatedOrderValue(item.sell.orderQty, item.sell.weightedPrice),
  }),
  num({
    id: "estValueDiff",
    label: "Estimated buy value − sell value",
    short: "Value gap",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description:
      "Estimated buy-side order value minus estimated sell-side order value. Null if either estimate is unavailable. Missing is not treated as zero.",
    read: (item) => {
      const buy = estimatedOrderValue(item.buy.orderQty, item.buy.weightedPrice);
      const sell = estimatedOrderValue(item.sell.orderQty, item.sell.weightedPrice);
      if (buy === null || sell === null) return null;
      return buy - sell;
    },
  }),
  num({
    id: "visibleBuyValue",
    label: "Visible buy-summary value",
    short: "Buy slice",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description:
      "Sum of amount × price over buy_summary only. Exact for the returned slice. Not the value of the entire buy book.",
    read: (item) => visibleBookValue(item.buy.levels),
  }),
  num({
    id: "visibleSellValue",
    label: "Visible sell-summary value",
    short: "Sell slice",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description: "Sum of amount × price over sell_summary only. Not the value of the entire sell book.",
    read: (item) => visibleBookValue(item.sell.levels),
  }),
  num({
    id: "visibleValueDiff",
    label: "Visible buy value − visible sell value",
    short: "Shown gap",
    group: "Order value",
    unit: "coins",
    tone: "neutral",
    description: "Visible buy-summary value minus visible sell-summary value. Both slices must be present.",
    read: (item) => {
      const buy = visibleBookValue(item.buy.levels);
      const sell = visibleBookValue(item.sell.levels);
      if (buy === null || sell === null) return null;
      return buy - sell;
    },
  }),

  num({
    id: "buyPerHour",
    label: "Buy transactions per hour (7-day avg)",
    short: "Buy /h",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description:
      "buyMovingWeek ÷ 168. A seven-day average of buy-side transactions per hour, including the live state Hypixel folds into movingWeek. Not the last clock hour, and not buyVolume.",
    read: (item) => averagePerHour(item.buyWeek),
  }),
  num({
    id: "sellPerHour",
    label: "Sell transactions per hour (7-day avg)",
    short: "Sell /h",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "sellMovingWeek ÷ 168. Seven-day average sell-side transactions per hour. Not the last hour and not sellVolume.",
    read: (item) => averagePerHour(item.sellWeek),
  }),
  num({
    id: "buyPerDay",
    label: "Buy transactions per day (7-day avg)",
    short: "Buy /day",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "buyMovingWeek ÷ 7. Average buy-side transactions per day across the same seven-day window.",
    read: (item) => averagePerDay(item.buyWeek),
  }),
  num({
    id: "sellPerDay",
    label: "Sell transactions per day (7-day avg)",
    short: "Sell /day",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "sellMovingWeek ÷ 7.",
    read: (item) => averagePerDay(item.sellWeek),
  }),
  num({
    id: "buyPerWeek",
    label: "Buy transactions per week",
    short: "Buy /week",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "quick_status.buyMovingWeek. Units transacted on the buy side over seven days plus the live state.",
    read: (item) => item.buyWeek,
  }),
  num({
    id: "sellPerWeek",
    label: "Sell transactions per week",
    short: "Sell /week",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "quick_status.sellMovingWeek. Units transacted on the sell side over seven days plus the live state.",
    read: (item) => item.sellWeek,
  }),
  num({
    id: "totalPerWeek",
    label: "Both sides per week",
    short: "Both /week",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description:
      "buyMovingWeek + sellMovingWeek. Both sides are counted, so a unit that was bought and later sold is counted twice. Not unique items.",
    read: (item) => {
      if (item.buyWeek === null || item.sellWeek === null) return null;
      return item.buyWeek + item.sellWeek;
    },
  }),
  num({
    id: "totalPerHour",
    label: "Both sides per hour (7-day avg)",
    short: "Both /h",
    group: "Traded volume",
    unit: "items",
    tone: "neutral",
    description: "(buyMovingWeek + sellMovingWeek) ÷ 168. Same double-count warning as the weekly total.",
    read: (item) => {
      if (item.buyWeek === null || item.sellWeek === null) return null;
      return (item.buyWeek + item.sellWeek) / HOURS_PER_WEEK;
    },
  }),

  num({
    id: "hourlyTurnover",
    label: "Estimated hourly turnover",
    short: "Coins /h",
    group: "Turnover",
    unit: "coins",
    tone: "neutral",
    description:
      "Buy/hour × weighted buy price + sell/hour × weighted sell price. Values the seven-day average flow at today's top-2% prices. Not actual coins that changed hands, and not order-book liquidity.",
    read: (item) => turnover(item, 1),
  }),
  num({
    id: "dailyTurnover",
    label: "Estimated daily turnover",
    short: "Coins /day",
    group: "Turnover",
    unit: "coins",
    tone: "neutral",
    description: "Estimated hourly turnover × 24. Same caveats.",
    read: (item) => {
      const hour = turnover(item, 1);
      return hour === null ? null : hour * HOURS_PER_DAY;
    },
  }),
  num({
    id: "weeklyTurnover",
    label: "Estimated weekly turnover",
    short: "Coins /week",
    group: "Turnover",
    unit: "coins",
    tone: "neutral",
    description: "Buy week × weighted buy + sell week × weighted sell. Prices are current, volumes are the seven-day counters.",
    read: (item) => {
      if (
        item.buyWeek === null ||
        item.sellWeek === null ||
        item.buy.weightedPrice === null ||
        item.sell.weightedPrice === null
      ) {
        return null;
      }
      return item.buyWeek * item.buy.weightedPrice + item.sellWeek * item.sell.weightedPrice;
    },
  }),

  num({
    id: "buyDepth1",
    label: "Instant-buy depth within 1%",
    short: "Ask 1%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in buy_summary priced within 1% above the instant-buy price. Only the returned levels. Not the full book.",
    read: (item) => depthQty(item.buy, "buy", 0.01),
  }),
  num({
    id: "buyDepth5",
    label: "Instant-buy depth within 5%",
    short: "Ask 5%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in buy_summary within 5% above instant buy.",
    read: (item) => depthQty(item.buy, "buy", 0.05),
  }),
  num({
    id: "buyDepth10",
    label: "Instant-buy depth within 10%",
    short: "Ask 10%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in buy_summary within 10% above instant buy.",
    read: (item) => depthQty(item.buy, "buy", 0.1),
  }),
  num({
    id: "sellDepth1",
    label: "Instant-sell depth within 1%",
    short: "Bid 1%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in sell_summary priced within 1% below the instant-sell price.",
    read: (item) => depthQty(item.sell, "sell", 0.01),
  }),
  num({
    id: "sellDepth5",
    label: "Instant-sell depth within 5%",
    short: "Bid 5%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in sell_summary within 5% below instant sell.",
    read: (item) => depthQty(item.sell, "sell", 0.05),
  }),
  num({
    id: "sellDepth10",
    label: "Instant-sell depth within 10%",
    short: "Bid 10%",
    group: "Depth",
    unit: "items",
    tone: "neutral",
    description: "Quantity in sell_summary within 10% below instant sell.",
    read: (item) => depthQty(item.sell, "sell", 0.1),
  }),
  num({
    id: "buyDepthValue5",
    label: "Instant-buy value within 5%",
    short: "Ask 5% val",
    group: "Depth",
    unit: "coins",
    tone: "neutral",
    description: "Coins (amount × price) in buy_summary within 5% above instant buy. Visible slice only.",
    read: (item) => depthValue(item.buy, "buy", 0.05),
  }),
  num({
    id: "sellDepthValue5",
    label: "Instant-sell value within 5%",
    short: "Bid 5% val",
    group: "Depth",
    unit: "coins",
    tone: "neutral",
    description: "Coins in sell_summary within 5% below instant sell. Visible slice only.",
    read: (item) => depthValue(item.sell, "sell", 0.05),
  }),

  num({
    id: "npcSell",
    label: "NPC sell price",
    short: "NPC",
    group: "NPC",
    unit: "coins",
    tone: "neutral",
    description: "npc_sell_price from the Hypixel item list. What an NPC pays you. Unavailable when the item list omits it.",
    read: (item) => item.npcSellPrice,
  }),
  num({
    id: "instantSellVsNpc",
    label: "Instant sell − NPC",
    short: "Sell vs NPC",
    group: "NPC",
    unit: "coins",
    tone: "pnl",
    description: "Instant sell minus NPC sell price, before bazaar tax. Positive means the bazaar bid beats the NPC.",
    read: (item) => {
      if (item.sell.bestPrice === null || item.npcSellPrice === null) return null;
      return item.sell.bestPrice - item.npcSellPrice;
    },
  }),
  num({
    id: "instantBuyVsNpc",
    label: "Instant buy − NPC",
    short: "Buy vs NPC",
    group: "NPC",
    unit: "coins",
    tone: "neutral",
    description: "Instant buy minus NPC sell price. How far above vendor price the next instant buy sits.",
    read: (item) => {
      if (item.buy.bestPrice === null || item.npcSellPrice === null) return null;
      return item.buy.bestPrice - item.npcSellPrice;
    },
  }),

  num({
    id: "historySamples",
    label: "Stored scans",
    short: "Scans",
    group: "Your history",
    unit: "count",
    tone: "neutral",
    description: "How many of your own scans include this product. Unavailable until this browser has stored a scan. Not Hypixel history.",
    read: (item) => (item.local ? item.local.samples : null),
  }),
  num({
    id: "historySpanHours",
    label: "History span",
    short: "Span h",
    group: "Your history",
    unit: "hours",
    tone: "neutral",
    description: "Hours between your oldest and newest stored scan for this product.",
    read: (item) => (item.local && item.local.samples >= 2 ? item.local.spanMs / 3_600_000 : null),
  }),
  num({
    id: "weightedBuyChangePct",
    label: "Weighted buy change over your history",
    short: "Buy Δ",
    group: "Your history",
    unit: "percent",
    tone: "change",
    description: "Percent change in weighted buy from your oldest stored scan to the newest. Unavailable with fewer than two scans.",
    read: (item) => item.local?.weightedBuyChangePct ?? null,
  }),
  num({
    id: "weightedSellChangePct",
    label: "Weighted sell change over your history",
    short: "Sell Δ",
    group: "Your history",
    unit: "percent",
    tone: "change",
    description: "Percent change in weighted sell across your stored scans.",
    read: (item) => item.local?.weightedSellChangePct ?? null,
  }),
  num({
    id: "weightedBuyPrevPct",
    label: "Weighted buy change vs previous scan",
    short: "Buy Δ1",
    group: "Your history",
    unit: "percent",
    tone: "change",
    description: "Percent change in weighted buy since your immediately previous scan.",
    read: (item) => item.local?.weightedBuyPrevPct ?? null,
  }),
  num({
    id: "weightedSellPrevPct",
    label: "Weighted sell change vs previous scan",
    short: "Sell Δ1",
    group: "Your history",
    unit: "percent",
    tone: "change",
    description: "Percent change in weighted sell since your immediately previous scan.",
    read: (item) => item.local?.weightedSellPrevPct ?? null,
  }),
  num({
    id: "buyVolatilityPct",
    label: "Weighted buy volatility",
    short: "Buy volty",
    group: "Your history",
    unit: "percent",
    tone: "neutral",
    description:
      "Coefficient of variation of weighted buy across your stored scans (standard deviation ÷ mean). Needs at least three scans. This is variation of the quote, not of traded volume.",
    read: (item) => item.local?.buyVolatilityPct ?? null,
  }),
  num({
    id: "sellVolatilityPct",
    label: "Weighted sell volatility",
    short: "Sell volty",
    group: "Your history",
    unit: "percent",
    tone: "neutral",
    description: "Coefficient of variation of weighted sell across your stored scans. Needs at least three scans.",
    read: (item) => item.local?.sellVolatilityPct ?? null,
  }),
  num({
    id: "buyWeekDelta",
    label: "Buy-week counter since previous scan",
    short: "Buy wk Δ",
    group: "Your history",
    unit: "items",
    tone: "change",
    description:
      "Change in buyMovingWeek since your previous scan. The counter is a rolling seven-day window, so this can fall when old trades age out. It is not order-book quantity and it is not clamped at zero.",
    read: (item) => item.local?.buyWeekDelta ?? null,
  }),
  num({
    id: "sellWeekDelta",
    label: "Sell-week counter since previous scan",
    short: "Sell wk Δ",
    group: "Your history",
    unit: "items",
    tone: "change",
    description: "Change in sellMovingWeek since your previous scan. Can be negative. Not order-book quantity.",
    read: (item) => item.local?.sellWeekDelta ?? null,
  }),

  num({
    id: "missingCore",
    label: "Missing core quotes",
    short: "Gaps",
    group: "Quality",
    unit: "count",
    tone: "neutral",
    description: "How many of instant buy, instant sell, weighted buy and weighted sell are unavailable for this product.",
    read: (item) => {
      const quotes = [item.buy.bestPrice, item.sell.bestPrice, item.buy.weightedPrice, item.sell.weightedPrice];
      return quotes.filter((quote) => quote === null).length;
    },
  }),
];

export const METRIC_BY_ID: Map<string, MetricDef> = new Map(METRICS.map((metric) => [metric.id, metric]));

export const METRIC_GROUPS: string[] = [];
for (const metric of METRICS) {
  if (!METRIC_GROUPS.includes(metric.group)) METRIC_GROUPS.push(metric.group);
}

export function metricValue(
  item: BazaarProduct,
  id: string,
  ctx: MetricContext,
): number | string | null {
  const metric = METRIC_BY_ID.get(id);
  if (!metric) return null;
  const value = metric.read(item, ctx);
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

export function metricLabel(id: string): string {
  return METRIC_BY_ID.get(id)?.label ?? id;
}

export function catalogueHealth(items: BazaarProduct[]) {
  let emptyBuy = 0;
  let emptySell = 0;
  let missingQuotes = 0;
  for (const item of items) {
    if (item.buy.bestPrice === null && item.buy.weightedPrice === null) emptyBuy += 1;
    if (item.sell.bestPrice === null && item.sell.weightedPrice === null) emptySell += 1;
    if (item.buy.weightedPrice === null) missingQuotes += 1;
    if (item.sell.weightedPrice === null) missingQuotes += 1;
    if (item.buy.bestPrice === null) missingQuotes += 1;
    if (item.sell.bestPrice === null) missingQuotes += 1;
  }
  return { emptyBuy, emptySell, missingQuotes };
}
