/**
 * The browser's own copy of the results it received, so a result survives a server that
 * forgets it (serverless hosts keep no shared disk). Pure client helpers; every access is
 * wrapped because storage can be blocked (private windows, strict settings).
 */
const PREFIX = 'fp:analysis:';
const INDEX_KEY = 'fp:analysis-index';
const KEEP = 5;

export function rememberResult(id: string, result: unknown): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(result));
    const index = (JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[]).filter(
      (x) => x !== id,
    );
    index.unshift(id);
    for (const old of index.splice(KEEP)) localStorage.removeItem(PREFIX + old);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // Storage unavailable: the server copy is still used when it exists.
  }
}

export function recallResult(id: string): unknown | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function forgetAllResults(): void {
  try {
    const index = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as string[];
    for (const id of index) localStorage.removeItem(PREFIX + id);
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // nothing to clear
  }
}
