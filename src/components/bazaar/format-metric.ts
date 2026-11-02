import { formatCoins, formatExact, formatPct, formatQty } from "@/lib/bazaar/format";
import { METRIC_BY_ID, metricValue, type MetricContext, type MetricDef } from "@/lib/bazaar/metrics";
import type { BazaarProduct } from "@/lib/bazaar/types";

export function readMetric(item: BazaarProduct, id: string, ctx: MetricContext) {
  return metricValue(item, id, ctx);
}

export function formatMetric(id: string, value: number | string | null): string {
  if (value === null || value === "") return "—";
  const def = METRIC_BY_ID.get(id);
  if (typeof value === "string") return value;
  if (!def) return formatExact(value, 2);
  if (def.unit === "percent") return formatPct(value);
  if (def.unit === "coins") return formatCoins(value);
  if (def.unit === "hours") return formatExact(value, 2);
  if (def.unit === "count") return formatExact(value, 0);
  return formatQty(value);
}

export function toneClass(def: MetricDef | undefined, value: number | string | null): string {
  if (!def || typeof value !== "number") return "text-fg";
  if (def.tone === "change" || def.tone === "pnl") {
    if (value > 0) return "text-up";
    if (value < 0) return "text-down";
  }
  return "text-fg";
}
