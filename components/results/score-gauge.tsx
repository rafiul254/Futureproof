'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Animated 0-100 score gauge.
 * Pure presentation: the number comes from the scoring engine, never from here.
 */
export function ScoreGauge({
  value,
  confidence,
  size = 240,
}: {
  value: number | null;
  confidence: string;
  size?: number;
}) {
  const t = useTranslations('score');
  const [displayed, setDisplayed] = useState(0);

  const target = value ?? 0;

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(target), 120);
    return () => clearTimeout(timer);
  }, [target]);

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Three quarters of a circle: 270 degrees.
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const progress = Math.max(0, Math.min(1, displayed / 100)) * arcLength;

  const band =
    value === null ? 'none' : value >= 70 ? 'invest' : value >= 50 ? 'adapt' : 'transition';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${t('label')}: ${value === null ? t('insufficient') : `${value.toFixed(1)} ${t('of')}`}`}
        >
          <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              className="stroke-border"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={arcLength - progress}
              className={cn(
                // Written as an explicit transition-duration property: the
                // shorthand arbitrary form is ambiguous with animation-duration
                // and Tailwind warns about it on every compile.
                'transition-[stroke-dashoffset] ease-out [transition-duration:1200ms]',
                band === 'invest' && 'stroke-quadrant-invest',
                band === 'adapt' && 'stroke-quadrant-adapt',
                band === 'transition' && 'stroke-quadrant-transition',
                band === 'none' && 'stroke-muted-foreground/40',
              )}
            />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {value === null ? (
            <span className="max-w-[70%] text-center text-sm text-muted-foreground">
              {t('insufficient')}
            </span>
          ) : (
            <>
              <span className="text-5xl font-bold tabular-nums tracking-tight">
                {displayed.toFixed(0)}
              </span>
              <span className="text-xs text-muted-foreground">{t('of')}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t('confidence')}:</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            confidence === 'high' && 'bg-quadrant-invest/15 text-quadrant-invest',
            confidence === 'medium' && 'bg-quadrant-adapt/15 text-quadrant-adapt',
            confidence === 'low' && 'bg-quadrant-transition/15 text-quadrant-transition',
            confidence === 'insufficient' && 'bg-muted text-muted-foreground',
          )}
        >
          {t(
            confidence === 'high'
              ? 'high'
              : confidence === 'medium'
                ? 'medium'
                : confidence === 'low'
                  ? 'low'
                  : 'insufficient',
          )}
        </span>
      </div>
    </div>
  );
}
