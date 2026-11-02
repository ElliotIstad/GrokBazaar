import { useRef, useState } from "react";
import { newId } from "@/lib/bazaar/ids";
import { METRIC_BY_ID, METRIC_GROUPS, METRICS, metricLabel } from "@/lib/bazaar/metrics";
import { parseUserNumber } from "@/lib/bazaar/numbers";
import { SORT_SHORTCUTS } from "@/lib/bazaar/presets";
import {
  describeCondition,
  emptyGroup,
  isGroup,
  type CompareOp,
  type Condition,
  type FilterGroup,
  type FilterNode,
  type PresenceOp,
  type RangeOp,
  type TextOp,
} from "@/lib/bazaar/filter-engine";
import type { SortRule } from "@/lib/bazaar/sort-engine";
import {
  defaultSettings,
  importPresets,
  type ColumnPref,
  type DeskSettings,
} from "@/lib/bazaar/storage";
import type { SourceReport } from "@/lib/bazaar/types";

const COMPARE: Array<[CompareOp, string]> = [
  ["gt", ">"],
  ["gte", "≥"],
  ["lt", "<"],
  ["lte", "≤"],
  ["eq", "="],
  ["neq", "≠"],
];
const TEXT: Array<[TextOp, string]> = [
  ["contains", "contains"],
  ["not_contains", "does not contain"],
  ["starts", "starts with"],
  ["ends", "ends with"],
  ["eq", "equals"],
  ["neq", "does not equal"],
];

export function DeskControls({
  settings,
  onChange,
}: {
  settings: DeskSettings;
  onChange: (next: DeskSettings) => void;
}) {
  const [tab, setTab] = useState<"filters" | "sort" | "settings">("filters");
  const fileRef = useRef<HTMLInputElement>(null);
  const active = settings.presets.find((preset) => preset.id === settings.activePresetId);
  const dirty =
    !!active &&
    (JSON.stringify(active.filter) !== JSON.stringify(settings.filter) ||
      JSON.stringify(active.sorts) !== JSON.stringify(settings.sorts));

  function patch(partial: Partial<DeskSettings>) {
    onChange({ ...settings, ...partial });
  }

  function savePreset(name?: string) {
    const now = Date.now();
    if (active && !name) {
      patch({
        presets: settings.presets.map((preset) =>
          preset.id === active.id
            ? { ...preset, filter: settings.filter, sorts: settings.sorts, updatedAt: now }
            : preset,
        ),
      });
      return;
    }
    const preset = {
      id: newId(),
      name: name?.trim() || "Untitled preset",
      filter: settings.filter,
      sorts: settings.sorts,
      createdAt: now,
      updatedAt: now,
    };
    patch({ presets: [...settings.presets, preset], activePresetId: preset.id });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-2" role="tablist" aria-label="Desk controls">
        {(
          [
            ["filters", "Filters"],
            ["sort", "Sort"],
            ["settings", "Settings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`btn btn-tiny flex-1 ${tab === id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "filters" ? (
        <>
          <PresetBar
            settings={settings}
            dirty={dirty}
            onChange={patch}
            onSave={() => savePreset()}
            onSaveAs={() => {
              const name = window.prompt("Preset name", "New preset");
              if (name) savePreset(name);
            }}
            onImport={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text()) as unknown;
                patch({ presets: importPresets(parsed, settings.presets) });
              } catch {
                window.alert("That file is not a preset export.");
              }
            }}
          />
          <p className="text-sm text-muted">
            Conditions run together on the catalogue already loaded. Missing numbers never count as zero, and Exclude
            does not let a missing value through.
          </p>
          <GroupEditor
            group={settings.filter}
            depth={0}
            onChange={(filter) => patch({ filter })}
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => patch({ filter: addCondition(settings.filter) })}>
              Add condition
            </button>
            <button className="btn" onClick={() => patch({ filter: addGroup(settings.filter) })}>
              Add group
            </button>
            <button className="btn btn-ghost" onClick={() => patch({ filter: emptyGroup(newId()) })}>
              Clear
            </button>
          </div>
        </>
      ) : null}

      {tab === "sort" ? (
        <SortEditor
          sorts={settings.sorts}
          onChange={(sorts) => patch({ sorts })}
        />
      ) : null}

      {tab === "settings" ? (
        <SettingsEditor settings={settings} onChange={patch} />
      ) : null}
    </div>
  );
}

function PresetBar({
  settings,
  dirty,
  onChange,
  onSave,
  onSaveAs,
  onImport,
}: {
  settings: DeskSettings;
  dirty: boolean;
  onChange: (partial: Partial<DeskSettings>) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onImport: () => void;
}) {
  const active = settings.presets.find((preset) => preset.id === settings.activePresetId);
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium tracking-wide text-muted uppercase">
        Preset
        <select
          className="field mt-1"
          value={settings.activePresetId ?? ""}
          onChange={(event) => {
            const preset = settings.presets.find((item) => item.id === event.target.value);
            if (!preset) return;
            onChange({ activePresetId: preset.id, filter: preset.filter, sorts: preset.sorts });
          }}
        >
          {settings.presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      {dirty ? <p className="text-sm text-warn">Unsaved changes to this preset.</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={onSave} disabled={!active}>
          Save
        </button>
        <button className="btn" onClick={onSaveAs}>
          Save as
        </button>
        <button
          className="btn"
          onClick={() => {
            if (!active) return;
            const name = window.prompt("Rename preset", active.name);
            if (!name?.trim()) return;
            onChange({
              presets: settings.presets.map((preset) =>
                preset.id === active.id ? { ...preset, name: name.trim(), updatedAt: Date.now() } : preset,
              ),
            });
          }}
        >
          Rename
        </button>
        <button
          className="btn"
          onClick={() => {
            if (!active) return;
            const copy = {
              ...active,
              id: newId(),
              name: `${active.name} copy`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            onChange({ presets: [...settings.presets, copy], activePresetId: copy.id, filter: copy.filter, sorts: copy.sorts });
          }}
        >
          Duplicate
        </button>
        <button
          className="btn"
          onClick={() => {
            if (!active) return;
            const presets = settings.presets.filter((preset) => preset.id !== active.id);
            const next = presets[0];
            onChange({
              presets: presets.length > 0 ? presets : defaultSettings().presets,
              activePresetId: next?.id ?? defaultSettings().activePresetId,
              filter: next?.filter ?? emptyGroup(newId()),
              sorts: next?.sorts ?? [],
            });
          }}
        >
          Delete
        </button>
        <button
          className="btn"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ presets: settings.presets }, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "bazaar-desk-presets.json";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export
        </button>
        <button className="btn" onClick={onImport}>
          Import
        </button>
        <button className="btn btn-ghost" onClick={() => onChange(defaultSettings(Date.now()))}>
          Restore defaults
        </button>
      </div>
    </div>
  );
}

function GroupEditor({
  group,
  depth,
  onChange,
  onRemove,
}: {
  group: FilterGroup;
  depth: number;
  onChange: (next: FilterGroup) => void;
  onRemove?: () => void;
}) {
  const pad = ["pl-0", "pl-3", "pl-6", "pl-8"][Math.min(depth, 3)];
  return (
    <div className={`${pad} flex flex-col gap-2 border-l border-border`}>
      <div className="flex flex-wrap items-center gap-2 pl-3">
        <select
          className="field w-auto"
          aria-label="Group logic"
          value={group.logic}
          onChange={(event) => onChange({ ...group, logic: event.target.value === "or" ? "or" : "and" })}
        >
          <option value="and">All of these</option>
          <option value="or">Any of these</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={group.negate}
            onChange={(event) => onChange({ ...group, negate: event.target.checked })}
          />
          Exclude group
        </label>
        {onRemove ? (
          <button className="btn btn-tiny btn-ghost" onClick={onRemove}>
            Remove group
          </button>
        ) : null}
      </div>
      {group.children.length === 0 ? (
        <p className="pl-3 text-sm text-muted">
          {group.logic === "and" ? "Empty group matches every product." : "Empty group matches nothing."}
        </p>
      ) : null}
      {group.children.map((child, index) =>
        isGroup(child) ? (
          <GroupEditor
            key={child.id}
            group={child}
            depth={depth + 1}
            onChange={(next) => onChange(replaceChild(group, index, next))}
            onRemove={() => onChange(removeChild(group, index))}
          />
        ) : (
          <ConditionRow
            key={child.id}
            condition={child}
            onChange={(next) => onChange(replaceChild(group, index, next))}
            onRemove={() => onChange(removeChild(group, index))}
            onUp={() => onChange(moveChild(group, index, -1))}
            onDown={() => onChange(moveChild(group, index, 1))}
          />
        ),
      )}
      {depth > 0 ? (
        <div className="flex gap-2 pl-3">
          <button className="btn btn-tiny" onClick={() => onChange(addCondition(group))}>
            Add condition
          </button>
          <button className="btn btn-tiny" onClick={() => onChange(addGroup(group))}>
            Add group
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const def = METRIC_BY_ID.get(condition.metric);
  const textMetric = def?.kind === "text";
  return (
    <div className="ml-3 flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
      <p className="text-sm text-fg">{describeCondition(condition)}</p>
      <select
        className="field"
        aria-label="Metric"
        value={condition.metric}
        onChange={(event) => onChange(retarget(condition, event.target.value))}
      >
        {METRIC_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {METRICS.filter((metric) => metric.group === group).map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {def ? <p className="text-xs leading-5 text-muted">{def.description}</p> : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          className="field"
          aria-label="Operator"
          value={operatorValue(condition)}
          onChange={(event) => onChange(withOperator(condition, event.target.value))}
        >
          {textMetric
            ? TEXT.map(([op, label]) => (
                <option key={op} value={op}>
                  {label}
                </option>
              ))
            : COMPARE.map(([op, label]) => (
                <option key={op} value={op}>
                  {label}
                </option>
              ))}
          {!textMetric ? (
            <>
              <option value="between">between</option>
              <option value="outside">outside</option>
            </>
          ) : null}
          <option value="available">is available</option>
          <option value="unavailable">is unavailable</option>
        </select>
        {condition.type === "compare" ? (
          <input
            className="field font-mono"
            aria-label="Threshold"
            value={condition.text}
            placeholder="180 or 5M"
            onChange={(event) =>
              onChange({
                ...condition,
                text: event.target.value,
                value: parseUserNumber(event.target.value),
              })
            }
          />
        ) : null}
        {condition.type === "text" ? (
          <input
            className="field"
            aria-label="Text"
            value={condition.value}
            onChange={(event) => onChange({ ...condition, value: event.target.value })}
          />
        ) : null}
      </div>
      {condition.type === "range" ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field font-mono"
            aria-label="Minimum"
            value={condition.minText}
            placeholder="Min"
            onChange={(event) =>
              onChange({ ...condition, minText: event.target.value, min: parseUserNumber(event.target.value) })
            }
          />
          <input
            className="field font-mono"
            aria-label="Maximum"
            value={condition.maxText}
            placeholder="Max"
            onChange={(event) =>
              onChange({ ...condition, maxText: event.target.value, max: parseUserNumber(event.target.value) })
            }
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!condition.negate}
            onChange={(event) => onChange({ ...condition, negate: event.target.checked })}
          />
          Exclude
        </label>
        <button className="btn btn-tiny" onClick={onUp} aria-label="Move condition up">
          Up
        </button>
        <button className="btn btn-tiny" onClick={onDown} aria-label="Move condition down">
          Down
        </button>
        <button className="btn btn-tiny btn-ghost" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}

function SortEditor({ sorts, onChange }: { sorts: SortRule[]; onChange: (next: SortRule[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        The first rule wins. Later rules break ties. Blank values always sort last. If everything is still equal, the
        original order is kept.
      </p>
      <div className="flex flex-col gap-2">
        {SORT_SHORTCUTS.map((shortcut) => (
          <button key={shortcut.id} className="btn justify-start" onClick={() => onChange(shortcut.sorts)}>
            {shortcut.label}
          </button>
        ))}
      </div>
      {sorts.map((rule, index) => (
        <div key={rule.id} className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
          <p className="font-mono text-xs text-primary">{index + 1}</p>
          <select
            className="field"
            aria-label={`Sort metric ${index + 1}`}
            value={rule.metric}
            onChange={(event) =>
              onChange(sorts.map((item, itemIndex) => (itemIndex === index ? { ...item, metric: event.target.value } : item)))
            }
          >
            {METRIC_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {METRICS.filter((metric) => metric.group === group).map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-tiny"
              onClick={() =>
                onChange(
                  sorts.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, direction: item.direction === "asc" ? "desc" : "asc" }
                      : item,
                  ),
                )
              }
            >
              {rule.direction === "asc" ? "Ascending" : "Descending"}
            </button>
            <button className="btn btn-tiny" onClick={() => onChange(move(sorts, index, -1))} aria-label="Raise priority">
              Up
            </button>
            <button className="btn btn-tiny" onClick={() => onChange(move(sorts, index, 1))} aria-label="Lower priority">
              Down
            </button>
            <button className="btn btn-tiny btn-ghost" onClick={() => onChange(sorts.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
          <p className="text-xs text-muted">{metricLabel(rule.metric)}</p>
        </div>
      ))}
      <button
        className="btn"
        onClick={() => onChange([...sorts, { id: newId(), metric: "instantSpread", direction: "desc" }])}
      >
        Add sort rule
      </button>
    </div>
  );
}

function SettingsEditor({
  settings,
  onChange,
}: {
  settings: DeskSettings;
  onChange: (partial: Partial<DeskSettings>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm text-muted">
        Refresh
        <select
          className="field mt-1"
          value={settings.refreshSec}
          onChange={(event) => onChange({ refreshSec: Number(event.target.value) })}
        >
          <option value={0}>Manual only</option>
          <option value={30}>Every 30 seconds</option>
          <option value={60}>Every minute</option>
          <option value={120}>Every 2 minutes</option>
          <option value={300}>Every 5 minutes</option>
        </select>
      </label>
      <label className="text-sm text-muted">
        Bazaar tax %
        <input
          className="field mt-1 font-mono"
          inputMode="decimal"
          value={settings.taxPercent}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) onChange({ taxPercent: Math.min(20, Math.max(0, value)) });
          }}
        />
      </label>
      <p className="text-sm text-muted">
        Used only by the “instant round trip after tax” metric. Hourly volume is always the seven-day average, week
        divided by 168, even if you refresh faster than that.
      </p>
      <ColumnPicker columns={settings.columns} onChange={(columns) => onChange({ columns })} />
    </div>
  );
}

export function ColumnPicker({
  columns,
  onChange,
}: {
  columns: ColumnPref[];
  onChange: (next: ColumnPref[]) => void;
}) {
  return (
    <div className="flex max-h-80 flex-col gap-1 overflow-auto rounded-md border border-border p-2">
      {columns.map((column, index) => {
        const def = METRIC_BY_ID.get(column.id);
        return (
          <div key={column.id} className="flex items-center gap-2">
            <label className="flex min-h-11 flex-1 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={column.visible}
                disabled={column.id === "name"}
                onChange={(event) =>
                  onChange(columns.map((item) => (item.id === column.id ? { ...item, visible: event.target.checked } : item)))
                }
              />
              {def?.short ?? column.id}
            </label>
            <button className="btn btn-tiny" onClick={() => onChange(move(columns, index, -1))} aria-label="Move column left">
              Left
            </button>
            <button className="btn btn-tiny" onClick={() => onChange(move(columns, index, 1))} aria-label="Move column right">
              Right
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function SourceList({ sources }: { sources: SourceReport[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {sources.map((source) => (
        <li key={source.id} className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{source.label}</span>
            <span className="font-mono text-xs text-muted uppercase">{source.status}</span>
          </div>
          <p className="text-xs leading-5 text-muted">{source.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function replaceChild(group: FilterGroup, index: number, child: FilterNode): FilterGroup {
  const children = group.children.slice();
  children[index] = child;
  return { ...group, children };
}

function removeChild(group: FilterGroup, index: number): FilterGroup {
  return { ...group, children: group.children.filter((_, itemIndex) => itemIndex !== index) };
}

function moveChild(group: FilterGroup, index: number, delta: number): FilterGroup {
  return { ...group, children: move(group.children, index, delta) };
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}

function addCondition(group: FilterGroup): FilterGroup {
  const condition: Condition = {
    type: "compare",
    id: newId(),
    metric: "buyPerHour",
    op: "gt",
    value: null,
    text: "",
  };
  return { ...group, children: [...group.children, condition] };
}

function addGroup(group: FilterGroup): FilterGroup {
  return {
    ...group,
    children: [...group.children, { type: "group", id: newId(), logic: "or", negate: false, children: [] }],
  };
}

function retarget(condition: Condition, metric: string): Condition {
  const kind = METRIC_BY_ID.get(metric)?.kind ?? "number";
  if (kind === "text") {
    return { type: "text", id: condition.id, metric, op: "contains", value: "", negate: condition.negate };
  }
  if (condition.type === "text" || condition.type === "presence") {
    return { type: "compare", id: condition.id, metric, op: "gt", value: null, text: "", negate: condition.negate };
  }
  return { ...condition, metric };
}

function operatorValue(condition: Condition): string {
  return condition.op;
}

function withOperator(condition: Condition, op: string): Condition {
  if (op === "available" || op === "unavailable") {
    return { type: "presence", id: condition.id, metric: condition.metric, op: op as PresenceOp, negate: condition.negate };
  }
  if (op === "between" || op === "outside") {
    const min = condition.type === "range" ? condition.min : condition.type === "compare" ? condition.value : null;
    const max = condition.type === "range" ? condition.max : null;
    return {
      type: "range",
      id: condition.id,
      metric: condition.metric,
      op: op as RangeOp,
      min,
      max,
      minText: condition.type === "range" ? condition.minText : condition.type === "compare" ? condition.text : "",
      maxText: condition.type === "range" ? condition.maxText : "",
      negate: condition.negate,
    };
  }
  const def = METRIC_BY_ID.get(condition.metric);
  if (def?.kind === "text") {
    return {
      type: "text",
      id: condition.id,
      metric: condition.metric,
      op: op as TextOp,
      value: condition.type === "text" ? condition.value : "",
      negate: condition.negate,
    };
  }
  return {
    type: "compare",
    id: condition.id,
    metric: condition.metric,
    op: op as CompareOp,
    value: condition.type === "compare" ? condition.value : condition.type === "range" ? condition.min : null,
    text: condition.type === "compare" ? condition.text : condition.type === "range" ? condition.minText : "",
    negate: condition.negate,
  };
}
