export function fmt(n: number): string {
  if (n === 0) return "$0.00";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Compact format for dashboards/cards — e.g. $5.2M, $350K */
export function fmtCompact(n: number): string {
  if (n === 0) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Canonical date formatter — "Mar 8, 2026"
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "\u2014";
  try {
    const date = new Date(d as string | number);
    if (isNaN(date.getTime())) return "\u2014";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

// Short date — "Mar 8" (no year, for same-year contexts)
export function formatDateShort(d: string | Date | null | undefined): string {
  if (!d) return "\u2014";
  try {
    const date = new Date(d as string | number);
    if (isNaN(date.getTime())) return "\u2014";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

// Relative time — for activity feeds only
export function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(isoStr);
}
