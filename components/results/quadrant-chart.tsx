'use client';

import { useTranslations } from 'next-intl';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import type { Quadrant } from '@/lib/scoring/config';
import type { SkillScoreBreakdown } from '@/lib/scoring/score';

/**
 * Demand (y) vs AI resilience (x).
 * Colour is never the only signal: the tooltip and the table repeat the quadrant name.
 */
export function QuadrantChart({
  skills,
  skillNames,
}: {
  skills: SkillScoreBreakdown[];
  skillNames: Record<string, string>;
}) {
  const t = useTranslations('quadrant');
  const tResults = useTranslations('results');

  // Skills with no linked task data have no defensible position on this chart,
  // so they are counted in the note below instead of being plotted.
  const plotted = skills.filter((skill) => skill.includedInOverall);
  const hidden = skills.length - plotted.length;

  const data = plotted.map((skill) => ({
    x: Number((skill.resilience * 100).toFixed(1)),
    y: Number((skill.demand.value * 100).toFixed(1)),
    z: skill.score,
    quadrant: skill.quadrant,
    name: skillNames[skill.skillId] ?? skill.skillId,
    score: skill.score,
  }));

  const groups: Array<{ quadrant: Quadrant; colour: string }> = [
    { quadrant: 'invest', colour: 'hsl(var(--quadrant-invest))' },
    { quadrant: 'adapt', colour: 'hsl(var(--quadrant-adapt))' },
    { quadrant: 'niche', colour: 'hsl(var(--quadrant-niche))' },
    { quadrant: 'transition', colour: 'hsl(var(--quadrant-transition))' },
  ];

  return (
    <div className="space-y-3">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              label={{
                value: t('axisResilience'),
                position: 'insideBottom',
                offset: -24,
                style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              label={{
                value: t('axisDemand'),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <ZAxis dataKey="z" range={[60, 220]} />
            <ReferenceLine x={50} stroke="hsl(var(--border))" strokeWidth={1.5} />
            <ReferenceLine y={50} stroke="hsl(var(--border))" strokeWidth={1.5} />

            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const numeric = typeof value === 'number' ? value : Number(value);
                if (name === 'x') return [`${numeric.toFixed(0)}%`, t('axisResilience')];
                if (name === 'y') return [`${numeric.toFixed(0)}%`, t('axisDemand')];
                return [String(value), String(name)];
              }}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as
                  { name?: string; quadrant?: Quadrant } | undefined;
                return point?.name ? `${point.name} — ${t(point.quadrant ?? 'invest')}` : '';
              }}
            />

            {groups.map(({ quadrant, colour }) => (
              <Scatter
                key={quadrant}
                name={t(quadrant)}
                data={data.filter((d) => d.quadrant === quadrant)}
                fill={colour}
                shape="circle"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {groups.map(({ quadrant, colour }) => (
          <span key={quadrant} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: colour }}
              aria-hidden="true"
            />
            <span className="font-medium">{t(quadrant)}</span>
          </span>
        ))}
      </div>

      {hidden > 0 ? (
        <p className="text-xs text-muted-foreground">
          {tResults('quadrantHidden', { count: hidden })}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">{tResults('quadrantHint')}</p>
    </div>
  );
}
