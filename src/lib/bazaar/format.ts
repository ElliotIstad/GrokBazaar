export function formatCoins(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1e9) return sign + trimScaled(absolute / 1e9) + "B";
  if (absolute >= 1e6) return sign + trimScaled(absolute / 1e6) + "M";
  if (absolute >= 1e3) return sign + trimScaled(absolute / 1e3) + "K";
  if (absolute >= 100) return sign + trimScaled(absolute);
  if (absolute >= 1) return sign + absolute.toFixed(2);
  return sign + absolute.toFixed(3);
}

function trimScaled(value: number): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}

export function formatExact(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

export function formatQty(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1e6) return sign + trimScaled(absolute / 1e6) + "M";
  if (absolute >= 10_000) return sign + trimScaled(absolute / 1e3) + "K";
  return sign + new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(absolute);
}

export function formatPct(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function formatAge(ms: number | null, now = Date.now()): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  const delta = Math.max(0, now - ms);
  const seconds = Math.round(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClock(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(ms));
}
