import { matches, type FilterNode } from "./filter-engine.ts";
import { metricValue, type MetricContext } from "./metrics.ts";
import { sortItems, type SortRule } from "./sort-engine.ts";
import type { BazaarProduct } from "./types.ts";

/**
 * Filter and sort the catalogue already in memory.
 * This does not fetch. Changing a condition only re-runs this function.
 */
export function applyView(
  items: readonly BazaarProduct[],
  filter: FilterNode,
  sorts: readonly SortRule[],
  search: string,
  ctx: MetricContext,
): BazaarProduct[] {
  const query = search.trim().toLowerCase();
  let rows = items;
  if (query) {
    rows = rows.filter(
      (item) => item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query),
    );
  }
  rows = rows.filter((item) => matches(item, filter, ctx));
  return sortItems(rows, sorts, (item, metric) => {
    const value = metricValue(item, metric, ctx);
    return value;
  });
}
