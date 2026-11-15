/**
 * Tiny numeric helpers with no dependencies at all.
 *
 * They live here, not in lib/utils.ts, because lib/utils.ts imports clsx and
 * tailwind-merge for className merging — and the scoring core has to be
 * importable from a plain Node process (the MCP server, a script, a test)
 * without dragging UI libraries along.
 */

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to a fixed number of decimals (default 2) without floating point drift. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Group array items by a key selector. */
export function groupBy<T, K extends string | number>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}
