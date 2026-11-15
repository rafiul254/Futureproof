import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'bn'] as const;

export type Locale = (typeof locales)[number];

/** Bangla is the default: the primary user is a Bangladeshi graduate. */
export const defaultLocale: Locale = 'bn';

export const localeLabels: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  bn: { native: 'বাংলা', english: 'Bangla' },
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Explicit prefix (/bn, /en): keeps sharing, analytics and demo URLs unambiguous.
  localePrefix: 'always',
});

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
