/** Number and date formatters for Statistics page. */

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatCredits(credits: number): string {
  if (credits >= 1_000_000_000) {
    return `${(credits / 1_000_000_000).toFixed(2)}B CR`;
  }
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(2)}M CR`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(2)}K CR`;
  }
  return `${credits.toLocaleString()} CR`;
}

export function formatDateShort(value: string | number): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateMedium(label: unknown): string {
  return label != null
    ? new Date(String(label)).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '';
}

export function formatDateLabel(label: unknown): string {
  return label != null ? new Date(String(label)).toLocaleString() : '';
}

export function formatYAxisValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return String(value);
}
