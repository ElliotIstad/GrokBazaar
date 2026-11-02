import { METRICS } from "./metrics.ts";
import { sanitizeNode, type FilterGroup } from "./filter-engine.ts";
import { defaultPresets, type Preset } from "./presets.ts";
import { sanitizeSorts, type SortRule } from "./sort-engine.ts";

export const SETTINGS_KEY = "bazaar-desk.settings.v1";

export type ColumnPref = {
  id: string;
  visible: boolean;
  width: number;
};

export type DeskSettings = {
  version: 1;
  refreshSec: number;
  /** Percent, e.g. 1.25. Stored separately from the fraction the calculators use. */
  taxPercent: number;
  filter: FilterGroup;
  sorts: SortRule[];
  columns: ColumnPref[];
  presets: Preset[];
  activePresetId: string | null;
  search: string;
};

const REFRESH_CHOICES = [0, 30, 60, 120, 300];

const DEFAULT_VISIBLE = [
  "name",
  "instantBuy",
  "instantSell",
  "instantSpread",
  "instantSpreadPct",
  "estBuyValue",
  "estSellValue",
  "estValueDiff",
  "buyPerHour",
  "sellPerHour",
  "hourlyTurnover",
  "category",
];

const DEFAULT_WIDTH: Record<string, number> = {
  name: 240,
  id: 220,
  category: 140,
  rarity: 120,
};

export function defaultColumns(): ColumnPref[] {
  return METRICS.map((metric) => ({
    id: metric.id,
    visible: DEFAULT_VISIBLE.includes(metric.id),
    width: DEFAULT_WIDTH[metric.id] ?? (metric.kind === "text" ? 160 : 124),
  }));
}

export function defaultSettings(now = 0): DeskSettings {
  const presets = defaultPresets(now);
  const example = presets[0]!;
  return {
    version: 1,
    refreshSec: 60,
    taxPercent: 1.25,
    filter: example.filter,
    sorts: example.sorts,
    columns: defaultColumns(),
    presets,
    activePresetId: example.id,
    search: "",
  };
}

export function taxRateFromPercent(percent: number): number {
  return percent / 100;
}

function clampTax(value: unknown): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 1.25;
  return Math.min(20, Math.max(0, number));
}

function clampRefresh(value: unknown): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 60;
  let best: number = REFRESH_CHOICES[1]!;
  let distance = Infinity;
  for (const choice of REFRESH_CHOICES) {
    const next = Math.abs(choice - number);
    if (next < distance) {
      distance = next;
      best = choice;
    }
  }
  return best;
}

function sanitizeColumns(raw: unknown): ColumnPref[] {
  const defaults = defaultColumns();
  const byId = new Map<string, ColumnPref>();
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      if (typeof row.id !== "string") continue;
      const width = typeof row.width === "number" && Number.isFinite(row.width) ? Math.min(480, Math.max(72, row.width)) : 124;
      byId.set(row.id, { id: row.id, visible: row.visible !== false, width });
    }
  }
  const known = new Set(defaults.map((column) => column.id));
  const ordered: ColumnPref[] = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const id = (entry as { id?: unknown }).id;
      if (typeof id !== "string" || !known.has(id) || ordered.some((column) => column.id === id)) continue;
      const saved = byId.get(id);
      const fallback = defaults.find((column) => column.id === id)!;
      ordered.push(saved ? { ...fallback, ...saved, id } : fallback);
    }
  }
  for (const column of defaults) {
    if (!ordered.some((saved) => saved.id === column.id)) ordered.push(column);
  }
  const name = ordered.find((column) => column.id === "name");
  if (name) name.visible = true;
  return ordered;
}

function sanitizePreset(raw: unknown): Preset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || !row.name.trim()) return null;
  const filter = sanitizeNode(row.filter);
  if (!filter || filter.type !== "group") return null;
  return {
    id: row.id,
    name: row.name.trim().slice(0, 80),
    filter,
    sorts: sanitizeSorts(row.sorts),
    createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
    updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0,
  };
}

export function settingsFromUnknown(raw: unknown): DeskSettings {
  const defaults = defaultSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const row = raw as Record<string, unknown>;
  const filterNode = sanitizeNode(row.filter);
  const filter = filterNode && filterNode.type === "group" ? filterNode : defaults.filter;
  const presets = Array.isArray(row.presets)
    ? row.presets.map(sanitizePreset).filter((preset): preset is Preset => preset !== null)
    : [];
  return {
    version: 1,
    refreshSec: clampRefresh(row.refreshSec),
    taxPercent: clampTax(row.taxPercent),
    filter,
    sorts: sanitizeSorts(row.sorts).length > 0 ? sanitizeSorts(row.sorts) : defaults.sorts,
    columns: sanitizeColumns(row.columns),
    presets: presets.length > 0 ? presets : defaults.presets,
    activePresetId: typeof row.activePresetId === "string" ? row.activePresetId : defaults.activePresetId,
    search: typeof row.search === "string" ? row.search.slice(0, 120) : "",
  };
}

export function serializeSettings(settings: DeskSettings): string {
  return JSON.stringify(settings);
}

export function loadSettings(raw: string | null): DeskSettings {
  if (!raw) return defaultSettings();
  try {
    return settingsFromUnknown(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function createMemoryStorage(): MemoryStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export function importPresets(raw: unknown, current: readonly Preset[]): Preset[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { presets?: unknown }).presets)
      ? (raw as { presets: unknown[] }).presets
      : raw && typeof raw === "object" && (raw as { filter?: unknown }).filter
        ? [raw]
        : [];
  const next = current.map((preset) => ({ ...preset }));
  for (const entry of list) {
    const preset = sanitizePreset(entry);
    if (!preset) continue;
    const index = next.findIndex((item) => item.id === preset.id);
    if (index >= 0) next[index] = preset;
    else next.push(preset);
  }
  return next;
}

export function readDesk(storage: MemoryStorage): DeskSettings {
  return loadSettings(storage.getItem(SETTINGS_KEY));
}

export function writeDesk(storage: MemoryStorage, settings: DeskSettings): void {
  storage.setItem(SETTINGS_KEY, serializeSettings(settings));
}
