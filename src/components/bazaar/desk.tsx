import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { toCsv } from "@/lib/bazaar/csv";
import { countConditions, summarize } from "@/lib/bazaar/filter-engine";
import { formatAge, formatClock } from "@/lib/bazaar/format";
import { appendSnapshot, decorateWithHistory, snapshotFromProducts, type PriceSnapshot } from "@/lib/bazaar/history";
import { loadStoredSnapshots, rememberSnapshot } from "@/lib/bazaar/history-store";
import { newId } from "@/lib/bazaar/ids";
import { METRICS, catalogueHealth, metricLabel, type MetricContext } from "@/lib/bazaar/metrics";
import { allProductsPreset } from "@/lib/bazaar/presets";
import { scanBazaar } from "@/lib/bazaar/scan.functions";
import type { SortRule, SortDirection } from "@/lib/bazaar/sort-engine";
import {
  SETTINGS_KEY,
  loadSettings,
  serializeSettings,
  taxRateFromPercent,
  type ColumnPref,
  type DeskSettings,
} from "@/lib/bazaar/storage";
import type { BazaarProduct } from "@/lib/bazaar/types";
import { applyView } from "@/lib/bazaar/view";
import { DeskControls, SourceList } from "./controls";
import { formatMetric, readMetric } from "./format-metric";
import { ItemDetail } from "./item-detail";
import { ResultsTable } from "./results-table";

const COMPARE_IDS = [
  "name",
  "instantBuy",
  "instantSell",
  "instantSpreadPct",
  "estBuyValue",
  "estSellValue",
  "estValueDiff",
  "buyPerHour",
  "sellPerHour",
  "hourlyTurnover",
];

export function Desk() {
  const [settings, setSettings] = useState<DeskSettings | null>(null);
  const [ready, setReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [snaps, setSnaps] = useState<PriceSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const client = useQueryClient();

  useEffect(() => {
    setSettings(loadSettings(localStorage.getItem(SETTINGS_KEY)));
    setReady(true);
    void loadStoredSnapshots().then((stored) => {
      setSnaps(stored);
      setHistoryReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !settings) return;
    localStorage.setItem(SETTINGS_KEY, serializeSettings(settings));
  }, [ready, settings]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshMs = settings && settings.refreshSec > 0 ? settings.refreshSec * 1000 : false;
  const scan = useQuery({
    queryKey: ["bazaar-scan"],
    queryFn: () => scanBazaar({ data: { force: false } }),
    refetchInterval: refreshMs,
    enabled: ready,
  });

  useEffect(() => {
    if (!historyReady) return;
    const data = scan.data;
    if (!data?.ok || data.items.length === 0) return;
    const stamp = data.hypixelUpdatedAt ?? data.scannedAt;
    setSnaps((previous) => {
      if (previous.some((snap) => snap.at === stamp)) return previous;
      const nextSnap = snapshotFromProducts(data.items, stamp);
      void rememberSnapshot(previous, nextSnap).then((stored) => {
        setSnaps((current) => appendSnapshot(current, stored[stored.length - 1] ?? nextSnap));
      });
      return appendSnapshot(previous, nextSnap);
    });
  }, [scan.data, historyReady]);

  const taxPercent = settings?.taxPercent ?? 1.25;
  const ctx = useMemo(() => ({ taxRate: taxRateFromPercent(taxPercent) }), [taxPercent]);
  const catalogue = useMemo(() => (scan.data?.ok ? scan.data.items : []), [scan.data]);
  const viewedItems = useMemo(() => decorateWithHistory(catalogue, snaps), [catalogue, snaps]);

  const rows = useMemo(() => {
    if (!settings) return [];
    return applyView(viewedItems, settings.filter, settings.sorts, settings.search, ctx);
  }, [viewedItems, settings, ctx]);

  const selected = viewedItems.find((item) => item.id === selectedId) ?? null;
  const health = catalogueHealth(catalogue);
  const conditions = settings ? countConditions(settings.filter) : 0;

  function patch(partial: Partial<DeskSettings>) {
    setSettings((current) => (current ? { ...current, ...partial } : current));
  }

  function resort(metric: string) {
    if (!settings) return;
    const first = settings.sorts[0];
    let sorts: SortRule[];
    if (first?.metric === metric) {
      const direction: SortDirection = first.direction === "asc" ? "desc" : "asc";
      sorts = [{ ...first, direction }, ...settings.sorts.slice(1)];
    } else {
      const primary: SortRule = { id: newId(), metric, direction: "desc" };
      const rest = settings.sorts.filter((rule) => rule.metric !== metric);
      sorts = [primary, ...rest].slice(0, 6);
    }
    patch({ sorts });
  }

  function resize(id: string, width: number) {
    if (!settings) return;
    const columns: ColumnPref[] = settings.columns.map((column) => (column.id === id ? { ...column, width } : column));
    patch({ columns });
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  function download(kind: "view" | "all") {
    if (!settings) return;
    const source = kind === "view" ? rows : viewedItems;
    const ids = kind === "view" ? settings.columns.filter((column) => column.visible).map((column) => column.id) : METRICS.map((metric) => metric.id);
    const csv = toCsv(source, ids, ctx);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kind === "view" ? "bazaar-desk-filtered.csv" : "bazaar-desk-catalogue.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const status = !scan.data
    ? scan.isError
      ? "Scan failed"
      : "Scanning"
    : scan.data.ok
      ? scan.isFetching
        ? "Refreshing"
        : "Live"
      : "Unavailable";

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <div className="mr-auto">
          <p className="font-mono text-xs tracking-widest text-primary">HYPIXEL SKYBLOCK</p>
          <h1 className="text-lg font-semibold tracking-tight">Bazaar Desk</h1>
        </div>
        <Link to="/guide" className="btn btn-tiny btn-ghost">
          Metric guide
        </Link>
        <button className="btn btn-tiny lg:hidden" onClick={() => setFiltersOpen(true)}>
          Filters
        </button>
        <button
          className="btn btn-primary btn-tiny"
          onClick={() => {
            void client.fetchQuery({
              queryKey: ["bazaar-scan"],
              queryFn: () => scanBazaar({ data: { force: true } }),
            });
          }}
        >
          Refresh
        </button>
      </header>
      <section className="flex flex-wrap gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-sm">
        <Stat label="Catalogue" value={catalogue.length ? catalogue.length.toLocaleString("en-US") : "—"} />
        <Stat label="Matching" value={settings ? rows.length.toLocaleString("en-US") : "—"} />
        <Stat label="Status" value={status} />
        <Stat label="Hypixel age" value={formatAge(scan.data?.hypixelUpdatedAt ?? null, now)} />
        <Stat label="Last scan" value={formatClock(scan.data?.scannedAt ?? null)} />
        <Stat label="Empty buy side" value={catalogue.length ? String(health.emptyBuy) : "—"} />
        <Stat label="Empty sell side" value={catalogue.length ? String(health.emptySell) : "—"} />
        <Stat label="Missing quotes" value={catalogue.length ? String(health.missingQuotes) : "—"} />
        <button className="btn btn-tiny" onClick={() => setSourcesOpen(true)}>
          Sources
        </button>
      </section>
      {settings ? (
        <p className="border-b border-border px-4 py-2 text-sm text-muted">
          {conditions === 0 ? "No filter — the full loaded catalogue." : `${conditions} conditions: ${summarize(settings.filter)}`}
          {settings.sorts.length > 0
            ? ` Sorted by ${settings.sorts.map((rule) => `${metricLabel(rule.metric)} ${rule.direction === "asc" ? "↑" : "↓"}`).join(", then ")}.`
            : ""}
        </p>
      ) : (
        <p className="border-b border-border px-4 py-2 text-sm">Restoring your filters…</p>
      )}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-96 shrink-0 overflow-y-auto border-r border-border lg:block">
          {settings ? <DeskControls settings={settings} onChange={(next) => setSettings(next)} /> : null}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <input
              className="field max-w-md"
              placeholder="Search name or ID"
              value={settings?.search ?? ""}
              onChange={(event) => patch({ search: event.target.value })}
              aria-label="Search products"
            />
            <button className="btn btn-tiny" onClick={() => download("view")} disabled={rows.length === 0}>
              Export view
            </button>
            <button className="btn btn-tiny" onClick={() => download("all")} disabled={viewedItems.length === 0}>
              Export catalogue
            </button>
            {compareIds.length > 0 ? (
              <button className="btn btn-tiny" onClick={() => setCompareOpen(true)}>
                Compare {compareIds.length}
              </button>
            ) : null}
          </div>
          {!settings || (scan.isPending && catalogue.length === 0) ? (
            <p className="px-4 py-8 text-sm">Scanning the Hypixel Bazaar. The full catalogue loads before any filter runs.</p>
          ) : null}
          {scan.isError ? (
            <p className="px-4 py-6 text-sm text-down">The scan request failed. Refresh to try again. Nothing was filled in with zeros.</p>
          ) : null}
          {scan.data && !scan.data.ok ? (
            <p className="px-4 py-6 text-sm text-down">{scan.data.error}</p>
          ) : null}
          {settings && scan.data?.ok && rows.length === 0 ? (
            <div className="px-4 py-8">
              <h2 className="text-lg font-semibold">No products match</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                The catalogue has {catalogue.length.toLocaleString("en-US")} products. Estimated order value is full-book
                quantity times the top-2% weighted price, so the example 5M–15M band is tight. Widen it, switch the metric
                to the visible summary value, or browse everything.
              </p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => {
                  const preset = allProductsPreset(Date.now());
                  patch({ filter: preset.filter, sorts: preset.sorts, activePresetId: "all-products" });
                }}
              >
                Show entire catalogue
              </button>
            </div>
          ) : null}
          {settings && rows.length > 0 ? (
            <ResultsTable
              rows={rows}
              columns={settings.columns}
              sorts={settings.sorts}
              ctx={ctx}
              selectedId={selectedId}
              compareIds={compareIds}
              onSort={resort}
              onOpen={setSelectedId}
              onToggleCompare={toggleCompare}
              onResize={resize}
            />
          ) : null}
        </main>
      </div>
      <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-lg border border-border bg-surface">
            <div className="flex items-center justify-between px-4 pt-4">
              <Dialog.Title className="text-lg font-semibold">Filters and sort</Dialog.Title>
              <Dialog.Close className="btn btn-tiny">Done</Dialog.Close>
            </div>
            {settings ? <DeskControls settings={settings} onChange={(next) => setSettings(next)} /> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[80dvh] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-4">
            <Dialog.Title className="mb-3 text-lg font-semibold">Sources</Dialog.Title>
            <SourceList sources={scan.data?.sources ?? []} />
            {scan.data?.warnings?.length ? (
              <ul className="mt-3 text-sm text-warn">
                {scan.data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <Dialog.Close className="btn mt-4">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={compareOpen} onOpenChange={setCompareOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/70" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[80dvh] w-[min(56rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-border bg-surface p-4">
            <Dialog.Title className="mb-3 text-lg font-semibold">Compare</Dialog.Title>
            <CompareTable items={viewedItems.filter((item) => compareIds.includes(item.id))} ctx={ctx} />
            <Dialog.Close className="btn mt-4">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {selected && settings ? (
        <ItemDetail
          item={selected}
          ctx={ctx}
          filter={settings.filter}
          snaps={snaps}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-muted">{label}</span> <span className="font-mono">{value}</span>
    </p>
  );
}

function CompareTable({ items, ctx }: { items: BazaarProduct[]; ctx: MetricContext }) {
  if (items.length === 0) return <p className="text-sm text-muted">Pick up to four products in the table.</p>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-3 font-medium text-muted">Metric</th>
            {items.map((item) => (
              <th key={item.id} className="py-2 pr-3 font-medium">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {COMPARE_IDS.map((id) => (
            <tr key={id} className="border-t border-border">
              <th className="py-2 pr-3 font-sans font-normal text-muted">{metricLabel(id)}</th>
              {items.map((item) => (
                <td key={item.id} className="py-2 pr-3">
                  {formatMetric(id, readMetric(item, id, ctx))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
