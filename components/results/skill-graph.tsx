'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    labelBn: string | null;
    type: 'skill' | 'task' | 'occupation';
    value: number | null;
    quadrant?: string | null;
  }>;
  links: Array<{ source: string; target: string; kind: string }>;
}

// Heavy canvas component: loaded only when the user asks for it.
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted-foreground">Loading graph…</p>,
});

const COLOURS: Record<string, string> = {
  invest: 'hsl(var(--quadrant-invest))',
  adapt: 'hsl(var(--quadrant-adapt))',
  niche: 'hsl(var(--quadrant-niche))',
  transition: 'hsl(var(--quadrant-transition))',
  task: 'hsl(var(--muted-foreground))',
  occupation: 'hsl(var(--primary))',
};

export function SkillGraph({ analysisId }: { analysisId: string }) {
  const t = useTranslations('results');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    setLoading(true);

    fetch(`/api/graph/${analysisId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((payload: GraphData) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, data, analysisId]);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.map((node) => ({
        ...node,
        color:
          node.type === 'skill'
            ? (COLOURS[node.quadrant ?? 'invest'] ?? COLOURS.invest)
            : (COLOURS[node.type] ?? COLOURS.task),
        val: node.type === 'skill' ? 3 : node.type === 'occupation' ? 4 : 1,
      })),
      links: data.links.map((link) => ({ ...link })),
    };
  }, [data]);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        {t('graphShow')}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs">
        <LegendItem colour={COLOURS.occupation ?? ''} label={t('graphLegendOccupation')} />
        <LegendItem colour={COLOURS.task ?? ''} label={t('graphLegendTask')} />
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-quadrant-invest" aria-hidden="true" />
          <span>{t('graphLegendSkill')}</span>
        </span>
      </div>

      {loading ? <p className="p-6 text-sm text-muted-foreground">{t('graphLoading')}</p> : null}
      {failed ? <p className="p-6 text-sm text-destructive">{t('graphLoading')}</p> : null}

      {data && !loading && !failed ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ForceGraph2D
            graphData={graphData as never}
            height={420}
            width={undefined as never}
            backgroundColor="transparent"
            nodeRelSize={5}
            nodeLabel={(node: Record<string, unknown>) => String(node['label'] ?? '')}
            nodeCanvasObjectMode={() => 'after'}
            linkColor={() => 'hsl(var(--border))'}
            linkWidth={0.6}
            cooldownTicks={80}
            enableNodeDrag={false}
          />
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{t('graphHint')}</p>
    </div>
  );
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: colour }} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
