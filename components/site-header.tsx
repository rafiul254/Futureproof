'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle, ThemeToggleIcon } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const t = useTranslations('nav');
  const tHome = useTranslations('home');
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: '/', label: t('home') },
    { href: '/analyze', label: t('analyze') },
    { href: '/methodology', label: t('methodology') },
    { href: '/docs', label: t('docs') },
    { href: '/privacy', label: t('privacy') },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setIsOpen(false)}
        >
          {/* Pre-sized PNG rather than next/image: sharp is not a dependency,
              and the logo is 3:2 so it sits in the bar without cropping. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-small.png"
            alt="FutureProof"
            width={270}
            height={180}
            className="h-9 w-auto rounded-md"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'bg-secondary text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <div className="sm:hidden">
            <ThemeToggleIcon />
          </div>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/analyze">{tHome('ctaAnalyze')}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={isOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            {isOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <nav className="border-t border-border/70 bg-background md:hidden" aria-label="Mobile">
          <div className="container flex flex-col py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <Link href="/analyze" onClick={() => setIsOpen(false)}>
                {tHome('ctaAnalyze')}
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
