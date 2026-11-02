import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { explain, summarize, type FilterGroup } from "@/lib/bazaar/filter-engine";
import { formatClock, formatExact } from "@/lib/bazaar/format";
import { seriesFor, type PriceSnapshot } from "@/lib/bazaar/history";
import { METRICS, coflWindowStats, priceGap, type MetricContext } from "@/lib/bazaar/metrics";
import { fetchItemHistory } from "@/lib/bazaar/scan.functions";
import type { BazaarProduct, OrderLevel } from "@/lib/bazaar/types";
import { formatMetric, readMetric, toneClass } from "./format-metric";

export function ItemDetail({
  item,
  ctx,
  filter,
  snaps,
  onClose,
}: {
  item: BazaarProduct;
  ctx: MetricContext;
  filter: FilterGroup;
  snaps: PriceSnapshot[];
  onClose: () => void;
}) {
  const [range, setRange] = useState<"hour" | "day" | "week">("day");
  const [raw, setRaw] = useState(false);
  const history = useQuery({
    queryKey: ["bazaar-history", item.id, range],
    queryFn: () => fetchItemHistory({ data: { id: item.id, range } }),
  });
  const local = seriesFor(item.id, snaps).map((point) => ({
    t: point.at,
    buy: point.weightedBuy,
    sell: point.weightedSell,
  }));
  const cofl = history.data?.points ?? [];
  const coflStats = coflWindowStats(cofl);
  const latest = cofl[cofl.length - 1];
  const buyGap = priceGap(item.buy.weightedPrice, latest?.buy ?? null);
  const sellGap = priceGap(item.sell.weightedPrice, latest?.sell ?? null);
  const reason = explain(item, filter, ctx);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-bg/70">
      <button className="absolute inset-0" aria-label="Close product" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-title"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div>
            <p className="font-mono text-xs text-primary">{item.id}</p>
            <h2 id="product-title" className="text-xl font-semibold tracking-tight">
              {item.name}
            </h2>
            <p className="text-sm text-muted">
              {[item.rarity, item.category].filter(Boolean).join(" · ") || "Category and rarity unavailable"}
            </p>
          </div>
          <button className="btn btn-tiny" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="flex flex-col gap-6 px-4 py-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Why this row is in the results</h3>
            <p className="mb-2 text-sm text-muted">{summarize(filter)}</p>
            <ExplainTree node={reason} />
          </section>
          <QuoteGrid item={item} ctx={ctx} />
          <section className="grid gap-4 md:grid-cols-2">
            <Book title="Instant-buy side" note="buy_summary, cheapest first in the math. Not the whole book." levels={item.buy.levels} />
            <Book title="Instant-sell side" note="sell_summary. Highest bid is the instant-sell price." levels={[...item.sell.levels].sort((a, b) => b.pricePerUnit - a.pricePerUnit)} />
          </section>
          <section>
            <h3 className="mb-1 text-sm font-semibold">Your stored scans</h3>
            <p className="mb-2 text-sm text-muted">
              Weighted buy and sell from scans this browser kept. Order-book quantity changes are not treated as trades.
            </p>
            {local.length < 2 ? (
              <p className="text-sm text-warn">Unavailable until at least two different Hypixel updates have been stored.</p>
            ) : (
              <Chart data={local} />
            )}
          </section>
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">SkyCofl history</h3>
              <select className="field w-auto" value={range} onChange={(event) => setRange(event.target.value as typeof range)}>
                <option value="hour">Last hour</option>
                <option value="day">Last day</option>
                <option value="week">Last week</option>
              </select>
            </div>
            <p className="mb-2 text-sm text-muted">
              Their buy and sell fields track Hypixel’s weighted prices. Their volume fields on these points are
              order-book snapshots, not units traded in the bucket.{" "}
              <a className="text-primary" href={`https://sky.coflnet.com/item/${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer">
                SkyCofl
              </a>
            </p>
            {history.isPending ? <p className="text-sm">Loading SkyCofl history…</p> : null}
            {history.data && !history.data.ok ? <p className="text-sm text-down">{history.data.error}</p> : null}
            {history.data?.ok && cofl.length === 0 ? <p className="text-sm text-warn">SkyCofl returned no points.</p> : null}
            {cofl.length > 1 ? (
              <>
                <Chart
                  data={cofl.map((point) => ({ t: point.at, buy: point.buy, sell: point.sell }))}
                />
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Buy change" value={formatMetric("weightedBuyChangePct", coflStats.buyChangePct)} />
                  <Stat label="Sell change" value={formatMetric("weightedSellChangePct", coflStats.sellChangePct)} />
                  <Stat label="Buy average" value={formatMetric("weightedBuy", coflStats.buyAvg)} />
                  <Stat label="Sell average" value={formatMetric("weightedSell", coflStats.sellAvg)} />
                  <Stat label="Buy volatility" value={formatMetric("buyVolatilityPct", coflStats.buyVolatilityPct)} />
                  <Stat label="Sell volatility" value={formatMetric("sellVolatilityPct", coflStats.sellVolatilityPct)} />
                </dl>
              </>
            ) : null}
            {latest ? (
              <div className="mt-3 rounded-md border border-border p-3 text-sm">
                <p className="font-medium">Source check, not a blend</p>
                <p className="text-muted">
                  Hypixel weighted buy {formatExact(item.buy.weightedPrice)} versus SkyCofl {formatExact(latest.buy)} (
                  {buyGap ? `${buyGap.pct.toFixed(2)}%` : "unavailable"}). Weighted sell {formatExact(item.sell.weightedPrice)} versus{" "}
                  {formatExact(latest.sell)} ({sellGap ? `${sellGap.pct.toFixed(2)}%` : "unavailable"}). Timestamps differ, so a small gap is expected.
                </p>
                {item.alternateName ? (
                  <p className="mt-2 text-warn">
                    Name disagreement: Hypixel says “{item.name}”, SkyCofl says “{item.alternateName}”. The Hypixel name is shown.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
          <section>
            <button className="btn" onClick={() => setRaw((value) => !value)}>
              {raw ? "Hide raw payload" : "Show raw payload"}
            </button>
            {raw ? (
              <pre className="mt-3 overflow-auto rounded-md bg-bg p-3 font-mono text-xs leading-5">
                {JSON.stringify(rawPayload(item), null, 2)}
              </pre>
            ) : null}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Every metric</h3>
            <dl className="flex flex-col">
              {METRICS.map((metric) => {
                const value = readMetric(item, metric.id, ctx);
                return (
                  <div key={metric.id} className="grid grid-cols-2 gap-2 border-b border-border py-2 text-sm">
                    <dt className="text-muted" title={metric.description}>
                      {metric.label}
                    </dt>
                    <dd className={`text-right font-mono ${toneClass(metric, value)}`}>{formatMetric(metric.id, value)}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ExplainTree({ node }: { node: ReturnType<typeof explain> }) {
  return (
    <div className="border-l border-border pl-3">
      <p className={`text-sm ${node.pass ? "text-up" : "text-down"}`}>
        {node.pass ? "Met" : "Not met"} — {node.label}
      </p>
      {node.children?.map((child) => (
        <ExplainTree key={child.id} node={child} />
      ))}
    </div>
  );
}

function QuoteGrid({ item, ctx }: { item: BazaarProduct; ctx: MetricContext }) {
  const ids = ["instantBuy", "instantSell", "instantSpread", "instantSpreadPct", "buyPerHour", "sellPerHour", "estBuyValue", "estSellValue", "hourlyTurnover"];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ids.map((id) => {
        const metric = METRICS.find((entry) => entry.id === id);
        const value = readMetric(item, id, ctx);
        return (
          <div key={id} className="rounded-md border border-border bg-bg px-3 py-2">
            <dt className="text-xs text-muted">{metric?.short}</dt>
            <dd className={`font-mono text-sm ${toneClass(metric, value)}`}>{formatMetric(id, value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function Book({ title, note, levels }: { title: string; note: string; levels: OrderLevel[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-2 text-xs text-muted">{note}</p>
      {levels.length === 0 ? (
        <p className="text-sm text-warn">No levels returned.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Price</th>
              <th className="py-1 font-medium">Amount</th>
              <th className="py-1 font-medium">Orders</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {levels.map((level, index) => (
              <tr key={`${level.pricePerUnit}-${index}`} className="border-t border-border">
                <td className="py-1">{formatExact(level.pricePerUnit, 2)}</td>
                <td className="py-1">{formatExact(level.amount, 0)}</td>
                <td className="py-1">{formatExact(level.orders, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Chart({ data }: { data: Array<{ t: number; buy: number | null; sell: number | null }> }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="t" tickFormatter={(value) => formatClock(Number(value))} stroke="var(--color-muted)" fontSize={11} minTickGap={24} />
          <YAxis stroke="var(--color-muted)" fontSize={11} width={56} />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            labelFormatter={(value) => formatClock(Number(value))}
          />
          <Line type="monotone" dataKey="buy" name="Buy" stroke="var(--color-primary)" dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="sell" name="Sell" stroke="var(--color-up)" dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function rawPayload(item: BazaarProduct) {
  return {
    product_id: item.id,
    name: { value: item.name, source: item.nameSource, alternate: item.alternateName },
    category: { value: item.category, source: item.categorySource },
    rarity: item.rarity,
    npc_sell_price: item.npcSellPrice,
    quick_status: {
      buyPrice: item.buy.weightedPrice,
      sellPrice: item.sell.weightedPrice,
      buyVolume: item.buy.orderQty,
      sellVolume: item.sell.orderQty,
      buyOrders: item.buy.orderCount,
      sellOrders: item.sell.orderCount,
      buyMovingWeek: item.buyWeek,
      sellMovingWeek: item.sellWeek,
    },
    buy_summary: item.buy.levels,
    sell_summary: item.sell.levels,
    hypixelUpdatedAt: item.hypixelUpdatedAt,
  };
}
