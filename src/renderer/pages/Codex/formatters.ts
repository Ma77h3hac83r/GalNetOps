/** Formatters for Codex page. */

export function formatCredits(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B CR`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M CR`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K CR`;
  }
  return `${value.toLocaleString()} CR`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatEntryDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
