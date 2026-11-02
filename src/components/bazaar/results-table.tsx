import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { METRIC_BY_ID } from "@/lib/bazaar/metrics";
import type { MetricContext } from "@/lib/bazaar/metrics";
import type { SortRule } from "@/lib/bazaar/sort-engine";
import type { ColumnPref } from "@/lib/bazaar/storage";
import type { BazaarProduct } from "@/lib/bazaar/types";
import { formatMetric, readMetric, toneClass } from "./format-metric";

const ROW = 44;

export function ResultsTable({
  rows,
  columns,
  sorts,
  ctx,
  selectedId,
  compareIds,
  onSort,
  onOpen,
  onToggleCompare,
  onResize,
}: {
  rows: BazaarProduct[];
  columns: ColumnPref[];
  sorts: SortRule[];
  ctx: MetricContext;
  selectedId: string | null;
  compareIds: string[];
  onSort: (metric: string) => void;
  onOpen: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onResize: (id: string, width: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const visible = columns.filter((column) => column.visible);
  const width = 52 + visible.reduce((sum, column) => sum + column.width, 0);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full min-h-0 overflow-auto">
      <div style={{ width, minWidth: "100%" }}>
        <div className="sticky top-0 z-10 flex h-11 border-b border-border bg-surface text-xs tracking-wide text-muted uppercase">
          <div className="flex w-12 shrink-0 items-center justify-center">Pick</div>
          {visible.map((column) => {
            const ruleIndex = sorts.findIndex((rule) => rule.metric === column.id);
            const rule = ruleIndex >= 0 ? sorts[ruleIndex] : undefined;
            return (
              <div
                key={column.id}
                className="relative flex shrink-0 items-center"
                style={{ width: column.width }}
              >
                <button
                  className="flex h-11 w-full items-center px-2 text-left"
                  onClick={() => onSort(column.id)}
                  title={METRIC_BY_ID.get(column.id)?.description}
                >
                  <span className="truncate">{METRIC_BY_ID.get(column.id)?.short ?? column.id}</span>
                  {rule ? (
                    <span className="ml-1 font-mono text-primary">
                      {rule.direction === "asc" ? "↑" : "↓"}
                      {sorts.length > 1 ? ruleIndex + 1 : ""}
                    </span>
                  ) : null}
                </button>
                <span
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${column.id}`}
                  className="absolute top-0 right-0 h-11 w-2 cursor-col-resize"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startX = event.clientX;
                    const startW = column.width;
                    const move = (ev: PointerEvent) => {
                      onResize(column.id, Math.min(480, Math.max(88, startW + ev.clientX - startX)));
                    };
                    const up = () => {
                      window.removeEventListener("pointermove", move);
                      window.removeEventListener("pointerup", up);
                    };
                    window.addEventListener("pointermove", move);
                    window.addEventListener("pointerup", up);
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = rows[virtualRow.index];
            if (!item) return null;
            const open = item.id === selectedId;
            return (
              <div
                key={item.id}
                className={`absolute top-0 left-0 flex border-b border-border ${open ? "bg-surface-3" : "bg-bg"}`}
                style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)`, width }}
              >
                <div className="flex w-12 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    className="size-4"
                    aria-label={`Compare ${item.name}`}
                    checked={compareIds.includes(item.id)}
                    onChange={() => onToggleCompare(item.id)}
                  />
                </div>
                {visible.map((column) => {
                  const value = readMetric(item, column.id, ctx);
                  const def = METRIC_BY_ID.get(column.id);
                  const text = formatMetric(column.id, value);
                  return (
                    <button
                      key={column.id}
                      className={`flex h-11 shrink-0 items-center px-2 text-left text-sm ${column.id === "name" ? "font-medium" : "font-mono"} ${toneClass(def, value)}`}
                      style={{ width: column.width }}
                      onClick={() => onOpen(item.id)}
                      title={text === "—" ? "Unavailable" : text}
                    >
                      <span className="truncate">{text}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
