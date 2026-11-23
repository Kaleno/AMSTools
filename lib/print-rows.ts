export function padRows<T>(items: T[], min = 8): (T | null)[] {
  const extra = Math.max(0, min - items.length);
  return [...items, ...Array.from({ length: extra }, () => null)];
}
