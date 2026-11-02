import { metricLabel, metricValue, type MetricContext } from "./metrics.ts";
import type { BazaarProduct } from "./types.ts";

export type CompareOp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
export type RangeOp = "between" | "outside";
export type TextOp = "contains" | "not_contains" | "starts" | "ends" | "eq" | "neq";
export type PresenceOp = "available" | "unavailable";

type NodeBase = { id: string; negate?: boolean };

export type CompareCondition = NodeBase & {
  type: "compare";
  metric: string;
  op: CompareOp;
  value: number | null;
  text: string;
};

export type RangeCondition = NodeBase & {
  type: "range";
  metric: string;
  op: RangeOp;
  min: number | null;
  max: number | null;
  minText: string;
  maxText: string;
};

export type TextCondition = NodeBase & {
  type: "text";
  metric: string;
  op: TextOp;
  value: string;
};

export type PresenceCondition = NodeBase & {
  type: "presence";
  metric: string;
  op: PresenceOp;
};

export type Condition = CompareCondition | RangeCondition | TextCondition | PresenceCondition;

export type FilterGroup = {
  type: "group";
  id: string;
  logic: "and" | "or";
  negate: boolean;
  children: FilterNode[];
};

export type FilterNode = Condition | FilterGroup;

export type ExplainNode = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  children?: ExplainNode[];
};

const COMPARE_OPS: CompareOp[] = ["gt", "gte", "lt", "lte", "eq", "neq"];
const RANGE_OPS: RangeOp[] = ["between", "outside"];
const TEXT_OPS: TextOp[] = ["contains", "not_contains", "starts", "ends", "eq", "neq"];
const PRESENCE_OPS: PresenceOp[] = ["available", "unavailable"];

export function isGroup(node: FilterNode): node is FilterGroup {
  return node.type === "group";
}

export function emptyGroup(id = "root"): FilterGroup {
  return { type: "group", id, logic: "and", negate: false, children: [] };
}

function isEmptyValue(value: number | string | null): boolean {
  return value === null || value === "";
}

function compareNumbers(left: number, op: CompareOp, right: number): boolean {
  switch (op) {
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    default:
      return false;
  }
}

/**
 * Numeric and text conditions fail when the metric is unavailable.
 * Negation does not let a missing value through.
 * Only presence operators answer "is unavailable".
 */
export function matchCondition(
  item: BazaarProduct,
  condition: Condition,
  ctx: MetricContext,
): boolean {
  const value = metricValue(item, condition.metric, ctx);
  if (condition.type === "presence") {
    const available = !isEmptyValue(value);
    const base = condition.op === "available" ? available : !available;
    return condition.negate ? !base : base;
  }
  if (isEmptyValue(value)) return false;

  let base = false;
  if (condition.type === "compare") {
    if (typeof value !== "number" || condition.value === null) return false;
    base = compareNumbers(value, condition.op, condition.value);
  } else if (condition.type === "range") {
    if (typeof value !== "number" || condition.min === null || condition.max === null) return false;
    const inside = value >= condition.min && value <= condition.max;
    base = condition.op === "between" ? inside : !inside;
  } else {
    if (typeof value !== "string") return false;
    const hay = value.toLowerCase();
    const needle = condition.value.trim().toLowerCase();
    switch (condition.op) {
      case "contains":
        base = hay.includes(needle);
        break;
      case "not_contains":
        base = !hay.includes(needle);
        break;
      case "starts":
        base = hay.startsWith(needle);
        break;
      case "ends":
        base = hay.endsWith(needle);
        break;
      case "eq":
        base = hay === needle;
        break;
      case "neq":
        base = hay !== needle;
        break;
      default:
        base = false;
    }
  }
  return condition.negate ? !base : base;
}

export function matches(item: BazaarProduct, node: FilterNode, ctx: MetricContext): boolean {
  if (!isGroup(node)) return matchCondition(item, node, ctx);
  if (node.children.length === 0) {
    const base = node.logic === "and";
    return node.negate ? !base : base;
  }
  const base =
    node.logic === "and"
      ? node.children.every((child) => matches(item, child, ctx))
      : node.children.some((child) => matches(item, child, ctx));
  return node.negate ? !base : base;
}

export function explain(item: BazaarProduct, node: FilterNode, ctx: MetricContext): ExplainNode {
  if (!isGroup(node)) {
    const pass = matchCondition(item, node, ctx);
    return { id: node.id, label: describeCondition(node), pass, detail: pass ? "Met" : "Not met" };
  }
  const children = node.children.map((child) => explain(item, child, ctx));
  const pass = matches(item, node, ctx);
  const logic = node.logic === "and" ? "All of" : "Any of";
  const label = node.children.length === 0 ? `${logic} (empty)` : logic;
  return {
    id: node.id,
    label: node.negate ? `Not (${label.toLowerCase()})` : label,
    pass,
    detail: pass ? "Group matched" : "Group did not match",
    children,
  };
}

const OP_WORDS: Record<string, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
  between: "between",
  outside: "outside",
  contains: "contains",
  not_contains: "does not contain",
  starts: "starts with",
  ends: "ends with",
  available: "is available",
  unavailable: "is unavailable",
};

export function describeCondition(condition: Condition): string {
  const name = metricLabel(condition.metric);
  const prefix = condition.negate ? "Exclude if " : "";
  if (condition.type === "presence") {
    return `${prefix}${name} ${OP_WORDS[condition.op]}`;
  }
  if (condition.type === "compare") {
    return `${prefix}${name} ${OP_WORDS[condition.op]} ${condition.text || "∅"}`;
  }
  if (condition.type === "range") {
    return `${prefix}${name} ${OP_WORDS[condition.op]} ${condition.minText || "∅"} and ${condition.maxText || "∅"}`;
  }
  return `${prefix}${name} ${OP_WORDS[condition.op]} “${condition.value}”`;
}

export function summarize(node: FilterNode): string {
  if (!isGroup(node)) return describeCondition(node);
  if (node.children.length === 0) return node.negate ? "Match nothing (empty group, excluded)" : "No conditions — every product matches";
  const joiner = node.logic === "and" ? " AND " : " OR ";
  const inner = node.children
    .map((child) => (isGroup(child) ? `(${summarize(child)})` : describeCondition(child)))
    .join(joiner);
  return node.negate ? `NOT (${inner})` : inner;
}

export function countConditions(node: FilterNode): number {
  if (!isGroup(node)) return 1;
  return node.children.reduce((sum, child) => sum + countConditions(child), 0);
}

function isOp<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function sanitizeNode(raw: unknown): FilterNode | null {
  const row = asRecord(raw);
  if (!row || typeof row.type !== "string" || typeof row.id !== "string" || !row.id) return null;
  if (row.type === "group") {
    if (row.logic !== "and" && row.logic !== "or") return null;
    if (!Array.isArray(row.children)) return null;
    const children: FilterNode[] = [];
    for (const child of row.children) {
      const clean = sanitizeNode(child);
      if (clean) children.push(clean);
    }
    return {
      type: "group",
      id: row.id,
      logic: row.logic,
      negate: row.negate === true,
      children,
    };
  }
  if (typeof row.metric !== "string" || !row.metric) return null;
  const negate = row.negate === true;
  if (row.type === "compare" && isOp(row.op, COMPARE_OPS)) {
    const value = typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null;
    const text = typeof row.text === "string" ? row.text : value === null ? "" : String(value);
    return { type: "compare", id: row.id, metric: row.metric, op: row.op, value, text, negate };
  }
  if (row.type === "range" && isOp(row.op, RANGE_OPS)) {
    const min = typeof row.min === "number" && Number.isFinite(row.min) ? row.min : null;
    const max = typeof row.max === "number" && Number.isFinite(row.max) ? row.max : null;
    return {
      type: "range",
      id: row.id,
      metric: row.metric,
      op: row.op,
      min,
      max,
      minText: typeof row.minText === "string" ? row.minText : min === null ? "" : String(min),
      maxText: typeof row.maxText === "string" ? row.maxText : max === null ? "" : String(max),
      negate,
    };
  }
  if (row.type === "text" && isOp(row.op, TEXT_OPS)) {
    return {
      type: "text",
      id: row.id,
      metric: row.metric,
      op: row.op,
      value: typeof row.value === "string" ? row.value : "",
      negate,
    };
  }
  if (row.type === "presence" && isOp(row.op, PRESENCE_OPS)) {
    return { type: "presence", id: row.id, metric: row.metric, op: row.op, negate };
  }
  return null;
}
