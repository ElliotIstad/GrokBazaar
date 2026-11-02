const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
};

/** Parse desk input: `180`, `5M`, `2.5k`, `1,200`, `0.5b`. Null if it is not a finite number. */
export function parseUserNumber(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "").replace(/\s+/g, "");
  if (!trimmed) return null;
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))([kmb])?$/i.exec(trimmed);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toLowerCase() ?? "";
  const multiplier = suffix ? MULTIPLIERS[suffix] : 1;
  if (!multiplier) return null;
  return value * multiplier;
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const units: Array<[number, string]> = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [scale, suffix] of units) {
    if (absolute >= scale && absolute % scale === 0) {
      return `${sign}${absolute / scale}${suffix}`;
    }
  }
  return `${value}`;
}

export function finiteOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

/** Positive finite prices only. Zero is treated as "no quote", not a real price of 0. */
export function positiveOrNull(value: unknown): number | null {
  const number = finiteOrNull(value);
  if (number === null || number <= 0) return null;
  return number;
}

/** Quantities and counts may be zero. Negative or non-finite values are missing, not zero. */
export function nonNegativeOrNull(value: unknown): number | null {
  const number = finiteOrNull(value);
  if (number === null || number < 0) return null;
  return number;
}
