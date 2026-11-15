import { describe, expect, it } from 'vitest';

import bn from '../messages/bn.json';
import en from '../messages/en.json';
import { defaultLocale, locales } from '@/i18n/routing';

type Messages = Record<string, unknown>;

/** Flattens nested message objects into dot paths, e.g. `home.title`. */
function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return prefix ? [prefix] : [];
  return Object.entries(value as Messages).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const enKeys = flatten(en).sort();
const bnKeys = flatten(bn).sort();

describe('translation files', () => {
  it('cover every supported locale', () => {
    expect(locales).toEqual(['en', 'bn']);
    expect(defaultLocale).toBe('bn');
  });

  it('have identical key sets in English and Bangla', () => {
    expect(bnKeys).toEqual(enKeys);
  });

  it('have no empty strings', () => {
    for (const [locale, messages] of [
      ['en', en],
      ['bn', bn],
    ] as const) {
      const empty = flatten(messages).filter((key) => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (acc, part) => (acc as Messages)?.[part as keyof typeof acc],
            messages as unknown,
          );
        return typeof value === 'string' && value.trim().length === 0;
      });
      expect(empty, `${locale} empty strings`).toEqual([]);
    }
  });

  it('use the same placeholders in both languages', () => {
    const placeholdersOf = (messages: Messages) => {
      const flat = flatten(messages);
      const result = new Map<string, string[]>();
      for (const key of flat) {
        const value = key
          .split('.')
          .reduce<unknown>(
            (acc, part) => (acc as Messages)?.[part as keyof typeof acc],
            messages as unknown,
          );
        if (typeof value !== 'string') continue;
        const found = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
        if (found.length > 0) result.set(key, found);
      }
      return result;
    };

    const enPlaceholders = placeholdersOf(en as Messages);
    const bnPlaceholders = placeholdersOf(bn as Messages);

    expect([...bnPlaceholders.keys()].sort()).toEqual([...enPlaceholders.keys()].sort());
    for (const [key, value] of enPlaceholders) {
      expect(bnPlaceholders.get(key), `placeholders for ${key}`).toEqual(value);
    }
  });
});
