import { useTranslations } from 'next-intl';

/**
 * Decorative illustration of the Future-Proof quadrant model.
 * Contains no user data and no numbers — it only shows the axes and quadrant names.
 */
export function QuadrantIllustration() {
  const t = useTranslations('quadrant');

  const quadrants = [
    { key: 'adapt', x: 8, y: 8, variant: 'text-quadrant-adapt' },
    { key: 'invest', x: 52, y: 8, variant: 'text-quadrant-invest' },
    { key: 'transition', x: 8, y: 52, variant: 'text-quadrant-transition' },
    { key: 'niche', x: 52, y: 52, variant: 'text-quadrant-niche' },
  ] as const;

  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={t('title')}
        className="h-auto w-full rounded-xl border border-border bg-card/60"
      >
        <defs>
          <pattern id="fp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.2"
              className="text-border"
            />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#fp-grid)" />

        {/* Quadrant tints */}
        <rect x="4" y="4" width="46" height="46" className="fill-quadrant-adapt/10" />
        <rect x="50" y="4" width="46" height="46" className="fill-quadrant-invest/10" />
        <rect x="4" y="50" width="46" height="46" className="fill-quadrant-transition/10" />
        <rect x="50" y="50" width="46" height="46" className="fill-quadrant-niche/10" />

        {/* Axes */}
        <line x1="50" y1="4" x2="50" y2="96" className="stroke-border" strokeWidth="0.6" />
        <line x1="4" y1="50" x2="96" y2="50" className="stroke-border" strokeWidth="0.6" />

        {quadrants.map((q) => (
          <text
            key={q.key}
            x={q.x + 3}
            y={q.y + 8}
            className={`${q.variant} fill-current text-[5px] font-semibold`}
          >
            {t(q.key)}
          </text>
        ))}

        {/* Axis labels */}
        <text x="50" y="99" textAnchor="middle" className="fill-muted-foreground text-[4px]">
          AI resilience →
        </text>
        <text
          x="3"
          y="50"
          textAnchor="middle"
          transform="rotate(-90 3 50)"
          className="fill-muted-foreground text-[4px]"
        >
          Market demand →
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        {t('title')}
      </figcaption>
    </figure>
  );
}

