/**
 * Convert a date string to a relative time ago label.
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Format a number with compact notation (1.2k, 3.4M, etc.)
 */
export function formatNumber(n: number): string {
  if (n < 0) return `-${formatNumber(-n)}`;
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return k >= 100 ? `${Math.floor(k)}k` : `${parseFloat(k.toFixed(1))}k`;
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000;
    return m >= 100 ? `${Math.floor(m)}M` : `${parseFloat(m.toFixed(1))}M`;
  }
  const b = n / 1_000_000_000;
  return b >= 100 ? `${Math.floor(b)}B` : `${parseFloat(b.toFixed(1))}B`;
}

/**
 * Get the first initial of a name, uppercase.
 */
export function getInitial(name: string | null): string {
  if (!name || name.trim().length === 0) return "?";
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Truncate text to a max length, appending ellipsis if needed.
 */
export function truncate(text: string, len: number): string {
  if (text.length <= len) return text;
  return text.slice(0, len).trimEnd() + "...";
}
