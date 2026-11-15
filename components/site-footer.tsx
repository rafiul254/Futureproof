import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  const links = [
    { href: '/analyze', label: tNav('analyze') },
    { href: '/settings', label: tNav('settings') },
  ] as const;

  const dataLinks = [
    { href: '/methodology', label: tNav('methodology') },
    { href: '/docs', label: tNav('docs') },
    { href: '/privacy', label: tNav('privacy') },
  ] as const;

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="container grid gap-8 py-10 md:grid-cols-3">
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-small.png"
            alt="FutureProof"
            width={270}
            height={180}
            className="h-8 w-auto rounded-md"
          />
          <p className="max-w-sm text-sm text-muted-foreground">{t('builtFor')}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t('links')}</p>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">{t('dataAndMethod')}</p>
          <ul className="space-y-2">
            {dataLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <LocaleSwitcher />
        </div>
      </div>

      <div className="border-t border-border/70 py-6">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} FutureProof. {t('rights')}
        </p>
      </div>
    </footer>
  );
}
