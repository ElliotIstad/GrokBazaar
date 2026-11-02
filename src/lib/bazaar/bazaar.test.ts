import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCsv } from "./csv.ts";
import {
  countConditions,
  emptyGroup,
  explain,
  matches,
  sanitizeNode,
  summarize,
  type FilterGroup,
  type FilterNode,
} from "./filter-engine.ts";
import {
  appendSnapshot,
  decorateWithHistory,
  snapshotFromProducts,
  statsFromPoints,
  type SeriesPoint,
} from "./history.ts";
import {
  averagePerHour,
  coflWindowStats,
  estimatedOrderValue,
  metricValue,
  priceGap,
  roundTripAfterTax,
  visibleBookValue,
} from "./metrics.ts";
import { normalizeCatalogue, parseCoflHistory } from "./normalize.ts";
import { parseUserNumber } from "./numbers.ts";
import { exampleImbalancePreset } from "./presets.ts";
import { fetchJsonWithRetry, shouldUseCache } from "./remote.ts";
import { compareValues, sortItems, type SortRule } from "./sort-engine.ts";
import {
  createMemoryStorage,
  defaultSettings,
  importPresets,
  loadSettings,
  readDesk,
  SETTINGS_KEY,
  writeDesk,
} from "./storage.ts";
import type { BazaarProduct, BookSide, CoflPoint } from "./types.ts";
import { applyView } from "./view.ts";

const ctx = { taxRate: 0.0125 };

function side(over: Partial<BookSide> = {}): BookSide {
  return {
    orderQty: 10,
    orderCount: 2,
    weightedPrice: 100,
    bestPrice: 100,
    levels: [{ pricePerUnit: 100, amount: 10, orders: 2 }],
    ...over,
  };
}

function item(over: Partial<BazaarProduct> = {}): BazaarProduct {
  return {
    id: "ALPHA",
    name: "Alpha",
    nameSource: "hypixel-items",
    alternateName: null,
    alternateNameSource: null,
    category: "COMBAT",
    categorySource: "hypixel-items",
    rarity: "RARE",
    npcSellPrice: 50,
    buy: side(),
    sell: side({
      weightedPrice: 80,
      bestPrice: 80,
      orderQty: 4,
      levels: [{ pricePerUnit: 80, amount: 4, orders: 1 }],
    }),
    buyWeek: 1680,
    sellWeek: 3360,
    hypixelUpdatedAt: 1,
    local: null,
    ...over,
  };
}

describe("filtering", () => {
  const sample = item();

  it("supports every numerical comparison and inclusive boundaries", () => {
    const ops = ["gt", "gte", "lt", "lte", "eq", "neq"] as const;
    const expected = {
      gt: [false, true],
      gte: [true, true],
      lt: [false, false],
      lte: [true, false],
      eq: [true, false],
      neq: [false, true],
    };
    for (const op of ops) {
      const at = matches(sample, { type: "compare", id: "c", metric: "buyPerHour", op, value: 10, text: "10" }, ctx);
      const above = matches(sample, { type: "compare", id: "c", metric: "buyPerHour", op, value: 9, text: "9" }, ctx);
      assert.equal(at, expected[op][0], op);
      assert.equal(above, expected[op][1], op);
    }
    assert.equal(metricValue(sample, "buyPerHour", ctx), 10);
  });

  it("treats between as inclusive and outside as exclusive of the edges", () => {
    const between = (min: number, max: number) =>
      matches(
        sample,
        { type: "range", id: "r", metric: "buyPerHour", op: "between", min, max, minText: "", maxText: "" },
        ctx,
      );
    const outside = (min: number, max: number) =>
      matches(
        sample,
        { type: "range", id: "r", metric: "buyPerHour", op: "outside", min, max, minText: "", maxText: "" },
        ctx,
      );
    assert.equal(between(10, 20), true);
    assert.equal(between(10.01, 20), false);
    assert.equal(outside(10, 20), false);
    assert.equal(outside(11, 20), true);
    assert.equal(outside(0, 9.9), true);
  });

  it("combines AND, OR, and arbitrarily nested groups", () => {
    const tree: FilterGroup = {
      type: "group",
      id: "root",
      logic: "and",
      negate: false,
      children: [
        { type: "compare", id: "a", metric: "buyPerHour", op: "gt", value: 5, text: "5" },
        {
          type: "group",
          id: "or",
          logic: "or",
          negate: false,
          children: [
            {
              type: "group",
              id: "and2",
              logic: "and",
              negate: false,
              children: [
                { type: "text", id: "n", metric: "name", op: "contains", value: "alp" },
                { type: "text", id: "r", metric: "rarity", op: "eq", value: "rare" },
              ],
            },
            { type: "text", id: "no", metric: "name", op: "eq", value: "Nope" },
          ],
        },
      ],
    };
    assert.equal(matches(sample, tree, ctx), true);
    assert.equal(matches(item({ name: "Beta", rarity: "COMMON" }), tree, ctx), false);
    assert.equal(countConditions(tree), 4);
    assert.match(summarize(tree), /AND/);
  });

  it("excludes matches and does not let missing metrics through a negation", () => {
    const named = item();
    const exclude: FilterNode = {
      type: "group",
      id: "g",
      logic: "and",
      negate: true,
      children: [{ type: "text", id: "n", metric: "name", op: "eq", value: "Alpha" }],
    };
    assert.equal(matches(named, exclude, ctx), false);
    assert.equal(matches(item({ name: "Beta" }), exclude, ctx), true);

    const missing = item({ buyWeek: null });
    const numeric = {
      type: "compare" as const,
      id: "m",
      metric: "buyPerHour",
      op: "neq" as const,
      value: 5,
      text: "5",
      negate: true,
    };
    assert.equal(matches(missing, numeric, ctx), false);
    assert.equal(
      matches(missing, { type: "presence", id: "p", metric: "buyPerHour", op: "unavailable" }, ctx),
      true,
    );
    assert.equal(
      matches(sample, { type: "presence", id: "p", metric: "buyPerHour", op: "available" }, ctx),
      true,
    );
    const why = explain(missing, numeric, ctx);
    assert.equal(why.pass, false);
  });

  it("supports text operators and an empty AND group matching everything", () => {
    assert.equal(matches(sample, { type: "text", id: "t", metric: "name", op: "starts", value: "al" }, ctx), true);
    assert.equal(matches(sample, { type: "text", id: "t", metric: "id", op: "ends", value: "HA" }, ctx), true);
    assert.equal(matches(sample, { type: "text", id: "t", metric: "name", op: "not_contains", value: "zzz" }, ctx), true);
    const emptyOr = emptyGroup();
    emptyOr.logic = "or";
    assert.equal(matches(sample, emptyGroup(), ctx), true);
    assert.equal(matches(sample, emptyOr, ctx), false);
  });
});

describe("sorting", () => {
  const rows = [
    item({ id: "B", name: "Bravo", buyWeek: 1680 }),
    item({ id: "A", name: "Alpha", buyWeek: 1680 }),
    item({ id: "C", name: "Charlie", buyWeek: 168 }),
    item({ id: "D", name: "Delta", buyWeek: null }),
  ];

  it("applies priority, direction, nulls-last, and stable ties", () => {
    const rules: SortRule[] = [
      { id: "1", metric: "buyPerHour", direction: "desc" },
      { id: "2", metric: "name", direction: "asc" },
    ];
    const sorted = sortItems(rows, rules, (row, metric) => metricValue(row, metric, ctx));
    assert.deepEqual(
      sorted.map((row) => row.id),
      ["A", "B", "C", "D"],
    );
    const flipped = sortItems(rows, [{ id: "1", metric: "name", direction: "desc" }], (row, metric) =>
      metricValue(row, metric, ctx),
    );
    assert.deepEqual(
      flipped.map((row) => row.name),
      ["Delta", "Charlie", "Bravo", "Alpha"],
    );
    const stable = sortItems(rows, [{ id: "1", metric: "npcSell", direction: "asc" }], (row, metric) =>
      metricValue(row, metric, ctx),
    );
    assert.deepEqual(
      stable.map((row) => row.id),
      ["B", "A", "C", "D"],
    );
    assert.equal(compareValues(null, 1, "asc"), 1);
    assert.equal(compareValues(null, 1, "desc"), 1);
  });
});

describe("metrics and normalization", () => {
  it("converts weekly volume to an hourly average without treating missing as zero", () => {
    assert.equal(averagePerHour(1680), 10);
    assert.equal(averagePerHour(0), 0);
    assert.equal(averagePerHour(null), null);
    assert.equal(estimatedOrderValue(null, 5), null);
    assert.equal(estimatedOrderValue(0, 5), 0);
    assert.equal(visibleBookValue([]), null);
    assert.equal(roundTripAfterTax(110, 100, 0.0125), 100 * 0.9875 - 110);
    const gap = priceGap(100, 110);
    assert.deepEqual(gap, { abs: 10, pct: 10 });
    assert.notEqual(gap && (100 + 110) / 2, gap?.abs);
  });

  it("keeps order-book quantity distinct from the visible summary and drops empty quotes", () => {
    const out = normalizeCatalogue({
      bazaar: {
        success: true,
        lastUpdated: 123,
        products: {
          "enchanted_diamond": {
            product_id: "enchanted_diamond",
            buy_summary: [
              { pricePerUnit: 9, amount: 2, orders: 1 },
              { pricePerUnit: 5, amount: 100, orders: 1 },
            ],
            sell_summary: [
              { pricePerUnit: 1, amount: 3, orders: 1 },
              { pricePerUnit: 4, amount: 8, orders: 2 },
            ],
            quick_status: {
              buyPrice: 8,
              sellPrice: 3,
              buyVolume: 1000,
              sellVolume: 0,
              buyOrders: 4,
              sellOrders: 0,
              buyMovingWeek: 168,
              sellMovingWeek: 0,
            },
          },
          ENCHANTMENT_SHARPNESS_5: {
            product_id: "ENCHANTMENT_SHARPNESS_5",
            buy_summary: [],
            sell_summary: [],
            quick_status: {
              buyPrice: 0,
              sellPrice: 0,
              buyVolume: 0,
              sellVolume: 0,
              buyOrders: 0,
              sellOrders: 0,
              buyMovingWeek: 0,
              sellMovingWeek: 0,
            },
          },
          bad: "nope",
        },
      },
      items: {
        items: [
          {
            id: "ENCHANTED_DIAMOND",
            name: "Enchanted Diamond",
            tier: "UNCOMMON",
            npc_sell_price: 1280,
            category: "MATERIAL",
          },
        ],
      },
      names: [
        { tag: "ENCHANTED_DIAMOND", name: "Not The Hypixel Name" },
        { tag: "ENCHANTMENT_SHARPNESS_5", name: "Sharpness 5" },
      ],
    });
    const diamond = out.items.find((row) => row.id === "ENCHANTED_DIAMOND");
    assert.ok(diamond);
    assert.equal(diamond.buy.bestPrice, 5);
    assert.equal(diamond.sell.bestPrice, 4);
    assert.equal(diamond.buy.orderQty, 1000);
    assert.notEqual(diamond.buy.orderQty, 102);
    assert.equal(diamond.sell.weightedPrice, null);
    assert.equal(diamond.sell.orderQty, 0);
    assert.equal(diamond.name, "Enchanted Diamond");
    assert.equal(diamond.alternateName, "Not The Hypixel Name");
    assert.equal(metricValue(diamond, "buyPerHour", ctx), 1);
    const enchant = out.items.find((row) => row.id === "ENCHANTMENT_SHARPNESS_5");
    assert.equal(enchant?.name, "Sharpness 5");
    assert.equal(enchant?.nameSource, "coflnet");
    assert.equal(enchant?.buy.weightedPrice, null);
    assert.equal(enchant?.category, "ENCHANTMENT");
    assert.equal(enchant?.categorySource, "id-prefix");
    assert.equal(out.warnings.some((warning) => warning.includes("BAD")), true);
  });

  it("rejects a malformed bazaar payload and parses Coflnet history without blending it", () => {
    assert.throws(() => normalizeCatalogue({ bazaar: { success: false }, items: null, names: null }));
    const points = parseCoflHistory([
      { timestamp: "not-a-date", buy: 1 },
      {
        timestamp: "2026-10-31T17:00:00Z",
        buy: 10,
        sell: 9,
        minBuy: 8,
        maxBuy: 11,
        minSell: 7,
        maxSell: 12,
        buyVolume: 50,
        sellVolume: 40,
        buyMovingWeek: 100,
        sellMovingWeek: 80,
      },
    ]);
    assert.equal(points.length, 1);
    assert.equal(points[0]?.buyOrderQty, 50);
    assert.notEqual(points[0]?.buyOrderQty, points[0]?.buyMovingWeek);
    const stats = coflWindowStats(points);
    assert.equal(stats.samples, 1);
    assert.equal(stats.buyChangePct, null);
  });

  it("parses desk numbers and updates a view locally", () => {
    assert.equal(parseUserNumber("5M"), 5_000_000);
    assert.equal(parseUserNumber("2.5k"), 2500);
    assert.equal(parseUserNumber("nope"), null);
    const rows = [item({ id: "A", name: "Alpha" }), item({ id: "B", name: "Beta", buyWeek: 0 })];
    const open = applyView(rows, emptyGroup(), [], "", ctx);
    const filtered = applyView(
      rows,
      {
        type: "group",
        id: "g",
        logic: "and",
        negate: false,
        children: [{ type: "compare", id: "c", metric: "buyPerHour", op: "gt", value: 1, text: "1" }],
      },
      [{ id: "s", metric: "name", direction: "asc" }],
      "alp",
      ctx,
    );
    assert.equal(open.length, 2);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, "A");
    const preset = exampleImbalancePreset();
    assert.equal(preset.filter.children.length, 5);
    assert.match(toCsv(rows, ["name", "buyPerHour"], ctx), /Alpha/);
  });
});

describe("history and persistence", () => {
  it("computes change from stored scans and keeps a falling week counter signed", () => {
    const points: SeriesPoint[] = [
      { at: 0, weightedBuy: 100, weightedSell: 80, buyWeek: 10, sellWeek: 10 },
      { at: 1_000, weightedBuy: 110, weightedSell: 80, buyWeek: 8, sellWeek: 12 },
      { at: 2_000, weightedBuy: 90, weightedSell: 70, buyWeek: 9, sellWeek: 12 },
    ];
    const one = statsFromPoints(points.slice(0, 1));
    assert.equal(one?.weightedBuyChangePct, null);
    const two = statsFromPoints(points.slice(0, 2));
    assert.equal(two?.weightedBuyChangePct, 10);
    assert.equal(two?.buyWeekDelta, -2);
    const three = statsFromPoints(points);
    assert.ok(three?.buyVolatilityPct !== null);
    const snaps = appendSnapshot(
      [snapshotFromProducts([item()], 1)],
      snapshotFromProducts([item({ buy: side({ weightedPrice: 150 }) })], 2),
    );
    const decorated = decorateWithHistory([item()], snaps);
    assert.equal(decorated[0]?.local?.samples, 2);
    assert.equal(decorated[0]?.buy.weightedPrice, 100);
  });

  it("saves and restores presets, sorts, and falls back when storage is corrupt", () => {
    const memory = createMemoryStorage();
    const settings = defaultSettings(5);
    settings.taxPercent = 2.5;
    settings.sorts = [{ id: "custom", metric: "name", direction: "desc" }];
    settings.presets = [
      ...settings.presets,
      { ...exampleImbalancePreset(9), id: "custom-preset", name: "Mine" },
    ];
    writeDesk(memory, settings);
    const loaded = readDesk(memory);
    assert.equal(loaded.taxPercent, 2.5);
    assert.equal(loaded.sorts[0]?.direction, "desc");
    assert.equal(loaded.presets.some((preset) => preset.id === "custom-preset"), true);
    assert.equal(loaded.columns.find((column) => column.id === "name")?.visible, true);
    memory.setItem(SETTINGS_KEY, "{");
    assert.equal(readDesk(memory).activePresetId, defaultSettings().activePresetId);
    assert.equal(loadSettings(null).refreshSec, 60);
    const dirty = sanitizeNode({ type: "compare", id: "x", metric: "buyPerHour", op: "nope" });
    assert.equal(dirty, null);
    const merged = importPresets([{ id: "custom-preset", name: "Renamed", filter: emptyGroup("z"), sorts: [] }], loaded.presets);
    assert.equal(merged.find((preset) => preset.id === "custom-preset")?.name, "Renamed");
  });

  it("retries transient HTTP failures and refuses to treat a fresh cache as expired", async () => {
    assert.equal(shouldUseCache(10_000, 20_000, false, 15_000), true);
    assert.equal(shouldUseCache(30_000, 20_000, false, 15_000), false);
    assert.equal(shouldUseCache(10_000, 20_000, true, 15_000), true);
    assert.equal(shouldUseCache(16_000, 20_000, true, 15_000), false);

    const sleeps: number[] = [];
    let calls = 0;
    const recovered = await fetchJsonWithRetry("https://example.test/bazaar", {
      retries: 3,
      baseDelayMs: 400,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      fetchImpl: (async () => {
        calls += 1;
        if (calls < 3) return new Response("busy", { status: 503 });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(recovered.ok, true);
    assert.deepEqual(sleeps, [400, 800]);

    const missing = await fetchJsonWithRetry("https://example.test/missing", {
      retries: 3,
      sleep: async () => undefined,
      fetchImpl: (async () => new Response("no", { status: 404 })) as typeof fetch,
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.attempts, 1);

    const malformed = await fetchJsonWithRetry("https://example.test/bad", {
      retries: 3,
      sleep: async () => undefined,
      fetchImpl: (async () => new Response("not-json", { status: 200 })) as typeof fetch,
    });
    assert.equal(malformed.ok, false);
    assert.match(malformed.ok ? "" : malformed.error, /JSON/);
  });
});
