import { formatExact } from "./format.ts";
import { METRIC_BY_ID, metricValue, type MetricContext } from "./metrics.ts";
import type { BazaarProduct } from "./types.ts";

function cell(value: number | string | null): string {
  if (value === null) return "";
  const text = typeof value === "number" ? formatExact(value, 4) : value;
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(items: readonly BazaarProduct[], metricIds: readonly string[], ctx: MetricContext): string {
  const headers = metricIds.map((id) => METRIC_BY_ID.get(id)?.label ?? id);
  const lines = [headers.map((header) => cell(header)).join(",")];
  for (const item of items) {
    lines.push(metricIds.map((id) => cell(metricValue(item, id, ctx))).join(","));
  }
  return lines.join("\n");
}
