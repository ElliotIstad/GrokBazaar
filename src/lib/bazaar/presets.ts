import { emptyGroup, type CompareCondition, type FilterGroup, type RangeCondition } from "./filter-engine.ts";
import type { SortRule } from "./sort-engine.ts";

export type Preset = {
  id: string;
  name: string;
  filter: FilterGroup;
  sorts: SortRule[];
  createdAt: number;
  updatedAt: number;
};

function range(
  id: string,
  metric: string,
  min: number,
  max: number,
  minText: string,
  maxText: string,
): RangeCondition {
  return { type: "range", id, metric, op: "between", min, max, minText, maxText };
}

function above(id: string, metric: string, value: number, text: string): CompareCondition {
  return { type: "compare", id, metric, op: "gt", value, text };
}

/** The example the desk opens with. Every field is ordinary filter data — edit or delete it. */
export function exampleImbalancePreset(now = 0): Preset {
  const filter: FilterGroup = {
    type: "group",
    id: "example-root",
    logic: "and",
    negate: false,
    children: [
      range("ex-buy-value", "estBuyValue", 5_000_000, 15_000_000, "5M", "15M"),
      range("ex-sell-value", "estSellValue", 5_000_000, 15_000_000, "5M", "15M"),
      above("ex-gap", "estValueDiff", 2_000_000, "2M"),
      above("ex-buy-hour", "buyPerHour", 180, "180"),
      above("ex-sell-hour", "sellPerHour", 180, "180"),
    ],
  };
  return {
    id: "example-imbalance",
    name: "Example: order-value band",
    filter,
    sorts: [
      { id: "ex-s1", metric: "estValueDiff", direction: "desc" },
      { id: "ex-s2", metric: "buyPerHour", direction: "desc" },
      { id: "ex-s3", metric: "sellPerHour", direction: "desc" },
      { id: "ex-s4", metric: "name", direction: "asc" },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function allProductsPreset(now = 0): Preset {
  return {
    id: "all-products",
    name: "Entire catalogue",
    filter: { ...emptyGroup("all-root"), children: [] },
    sorts: [
      { id: "all-s1", metric: "hourlyTurnover", direction: "desc" },
      { id: "all-s2", metric: "name", direction: "asc" },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultPresets(now = 0): Preset[] {
  return [exampleImbalancePreset(now), allProductsPreset(now)];
}

export type SortShortcut = { id: string; label: string; sorts: SortRule[] };

export const SORT_SHORTCUTS: SortShortcut[] = [
  {
    id: "spread",
    label: "Highest instant spread",
    sorts: [
      { id: "sc-spread", metric: "instantSpread", direction: "desc" },
      { id: "sc-spread-name", metric: "name", direction: "asc" },
    ],
  },
  {
    id: "spread-pct",
    label: "Highest spread %",
    sorts: [
      { id: "sc-spread-pct", metric: "instantSpreadPct", direction: "desc" },
      { id: "sc-spread-pct-name", metric: "name", direction: "asc" },
    ],
  },
  {
    id: "buy-hour",
    label: "Highest buy / hour",
    sorts: [{ id: "sc-buy-hour", metric: "buyPerHour", direction: "desc" }],
  },
  {
    id: "sell-hour",
    label: "Highest sell / hour",
    sorts: [{ id: "sc-sell-hour", metric: "sellPerHour", direction: "desc" }],
  },
  {
    id: "turnover",
    label: "Highest hourly turnover",
    sorts: [{ id: "sc-turn", metric: "hourlyTurnover", direction: "desc" }],
  },
  {
    id: "buy-value",
    label: "Largest buy order value",
    sorts: [{ id: "sc-buy-val", metric: "estBuyValue", direction: "desc" }],
  },
  {
    id: "sell-value",
    label: "Largest sell order value",
    sorts: [{ id: "sc-sell-val", metric: "estSellValue", direction: "desc" }],
  },
  {
    id: "up",
    label: "Highest price increase",
    sorts: [{ id: "sc-up", metric: "weightedBuyChangePct", direction: "desc" }],
  },
  {
    id: "down",
    label: "Highest price decrease",
    sorts: [{ id: "sc-down", metric: "weightedBuyChangePct", direction: "asc" }],
  },
  {
    id: "volty",
    label: "Highest volatility",
    sorts: [{ id: "sc-vol", metric: "buyVolatilityPct", direction: "desc" }],
  },
];
