export type SortDirection = "asc" | "desc";

export type SortRule = {
  id: string;
  metric: string;
  direction: SortDirection;
};

export type SortValue = number | string | null;

/**
 * Multi-key sort.
 * Null and blank values sort last in both directions.
 * Remaining ties keep the original order (stable).
 * The caller decides priority by the order of `rules` — index 0 is the primary key.
 */
export function sortItems<T>(
  items: readonly T[],
  rules: readonly SortRule[],
  read: (item: T, metric: string) => SortValue,
): T[] {
  const decorated = items.map((item, index) => ({ item, index }));
  decorated.sort((left, right) => {
    for (const rule of rules) {
      const compared = compareValues(read(left.item, rule.metric), read(right.item, rule.metric), rule.direction);
      if (compared !== 0) return compared;
    }
    return left.index - right.index;
  });
  return decorated.map((entry) => entry.item);
}

function isBlank(value: SortValue): boolean {
  return value === null || value === "";
}

export function compareValues(left: SortValue, right: SortValue, direction: SortDirection): number {
  const leftBlank = isBlank(left);
  const rightBlank = isBlank(right);
  if (leftBlank && rightBlank) return 0;
  if (leftBlank) return 1;
  if (rightBlank) return -1;
  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left === right ? 0 : left < right ? -1 : 1;
  } else {
    result = String(left).localeCompare(String(right), "en", { numeric: true, sensitivity: "base" });
  }
  return direction === "asc" ? result : -result;
}

export function sanitizeSorts(raw: unknown): SortRule[] {
  if (!Array.isArray(raw)) return [];
  const sorts: SortRule[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.metric !== "string" || !row.metric) continue;
    if (row.direction !== "asc" && row.direction !== "desc") continue;
    sorts.push({ id: row.id, metric: row.metric, direction: row.direction });
  }
  return sorts;
}
