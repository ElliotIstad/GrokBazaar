import { coefficientOfVariationPct, percentChange } from "./metrics.ts";
import type { BazaarProduct, LocalStats } from "./types.ts";

export type PriceSnapshot = {
  at: number;
  ids: string[];
  weightedBuy: Array<number | null>;
  weightedSell: Array<number | null>;
  buyWeek: Array<number | null>;
  sellWeek: Array<number | null>;
};

export type SeriesPoint = {
  at: number;
  weightedBuy: number | null;
  weightedSell: number | null;
  buyWeek: number | null;
  sellWeek: number | null;
};

const MAX_SNAPSHOTS = 48;

export function snapshotFromProducts(items: readonly BazaarProduct[], at: number): PriceSnapshot {
  return {
    at,
    ids: items.map((item) => item.id),
    weightedBuy: items.map((item) => item.buy.weightedPrice),
    weightedSell: items.map((item) => item.sell.weightedPrice),
    buyWeek: items.map((item) => item.buyWeek),
    sellWeek: items.map((item) => item.sellWeek),
  };
}

export function appendSnapshot(existing: readonly PriceSnapshot[], next: PriceSnapshot): PriceSnapshot[] {
  const withoutDuplicate = existing.filter((snap) => snap.at !== next.at);
  const sorted = [...withoutDuplicate, next].sort((a, b) => a.at - b.at);
  return sorted.slice(-MAX_SNAPSHOTS);
}

export function seriesFor(id: string, snaps: readonly PriceSnapshot[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const snap of snaps) {
    const index = snap.ids.indexOf(id);
    if (index < 0) continue;
    points.push({
      at: snap.at,
      weightedBuy: snap.weightedBuy[index] ?? null,
      weightedSell: snap.weightedSell[index] ?? null,
      buyWeek: snap.buyWeek[index] ?? null,
      sellWeek: snap.sellWeek[index] ?? null,
    });
  }
  points.sort((a, b) => a.at - b.at);
  return points;
}

function numbers(points: SeriesPoint[], key: "weightedBuy" | "weightedSell"): number[] {
  const values: number[] = [];
  for (const point of points) {
    const value = point[key];
    if (value !== null && Number.isFinite(value)) values.push(value);
  }
  return values;
}

export function statsFromPoints(points: readonly SeriesPoint[]): LocalStats | null {
  if (points.length === 0) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const prev = points.length >= 2 ? points[points.length - 2]! : null;
  return {
    samples: points.length,
    spanMs: last.at - first.at,
    from: first.at,
    to: last.at,
    weightedBuyChangePct: points.length >= 2 ? percentChange(first.weightedBuy, last.weightedBuy) : null,
    weightedSellChangePct: points.length >= 2 ? percentChange(first.weightedSell, last.weightedSell) : null,
    weightedBuyPrevPct: prev ? percentChange(prev.weightedBuy, last.weightedBuy) : null,
    weightedSellPrevPct: prev ? percentChange(prev.weightedSell, last.weightedSell) : null,
    buyVolatilityPct: coefficientOfVariationPct(numbers(points as SeriesPoint[], "weightedBuy")),
    sellVolatilityPct: coefficientOfVariationPct(numbers(points as SeriesPoint[], "weightedSell")),
    buyWeekDelta:
      prev && prev.buyWeek !== null && last.buyWeek !== null ? last.buyWeek - prev.buyWeek : null,
    sellWeekDelta:
      prev && prev.sellWeek !== null && last.sellWeek !== null ? last.sellWeek - prev.sellWeek : null,
  };
}

export function decorateWithHistory(
  items: readonly BazaarProduct[],
  snaps: readonly PriceSnapshot[],
): BazaarProduct[] {
  if (snaps.length === 0) {
    return items.map((item) => (item.local === null ? item : { ...item, local: null }));
  }
  const byId = new Map<string, SeriesPoint[]>();
  const ordered = [...snaps].sort((a, b) => a.at - b.at);
  for (const snap of ordered) {
    for (let index = 0; index < snap.ids.length; index += 1) {
      const id = snap.ids[index]!;
      let series = byId.get(id);
      if (!series) {
        series = [];
        byId.set(id, series);
      }
      series.push({
        at: snap.at,
        weightedBuy: snap.weightedBuy[index] ?? null,
        weightedSell: snap.weightedSell[index] ?? null,
        buyWeek: snap.buyWeek[index] ?? null,
        sellWeek: snap.sellWeek[index] ?? null,
      });
    }
  }
  return items.map((item) => ({
    ...item,
    local: statsFromPoints(byId.get(item.id) ?? []),
  }));
}
