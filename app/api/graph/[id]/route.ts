import { NextResponse } from 'next/server';

import { getDataProvider } from '@/lib/data';
import { getAnalysis } from '@/lib/analysis/store';
import { getIdentity, ownerKey } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface GraphNode {
  id: string;
  label: string;
  labelBn: string | null;
  type: 'skill' | 'task' | 'occupation';
  /** For skills: the quadrant. For tasks: AI exposure. For occupations: resilience. */
  value: number | null;
  quadrant?: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: 'skill-task' | 'task-occupation';
}

/**
 * GET /api/graph/[id] — nodes and edges for the skill graph:
 * user skills -> tasks -> occupations.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getIdentity();

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }
  if (analysis.userId && analysis.userId !== ownerKey(identity)) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  const provider = await getDataProvider();
  const skillIds = analysis.result.mappedSkills.map((s) => s.skillId);
  const evidence = await provider.getTasksForSkills(skillIds);
  const occupations = await provider.listOccupations();

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seenNodes = new Set<string>();

  const quadrantBySkill = new Map(
    analysis.result.score.skills.map((s) => [s.skillId, s.quadrant] as const),
  );
  const scoreBySkill = new Map(
    analysis.result.score.skills.map((s) => [s.skillId, s.score] as const),
  );

  for (const mapped of analysis.result.mappedSkills) {
    if (seenNodes.has(mapped.skillId)) continue;
    seenNodes.add(mapped.skillId);
    nodes.push({
      id: mapped.skillId,
      label: mapped.name,
      labelBn: mapped.nameBn,
      type: 'skill',
      value: scoreBySkill.get(mapped.skillId) ?? null,
      quadrant: quadrantBySkill.get(mapped.skillId) ?? null,
    });
  }

  const taskIds = new Set<string>();
  for (const item of evidence.slice(0, 120)) {
    if (!seenNodes.has(item.task.id)) {
      seenNodes.add(item.task.id);
      taskIds.add(item.task.id);
      nodes.push({
        id: item.task.id,
        label: item.task.description,
        labelBn: null,
        type: 'task',
        value: item.task.aiExposure,
      });
    }
    links.push({ source: item.skillId, target: item.task.id, kind: 'skill-task' });
  }

  // Tasks -> their occupation, so the graph shows where a skill is used.
  const occupationById = new Map(occupations.map((o) => [o.id, o]));
  const linkedOccupations = new Set<string>();
  const allTasks = await provider.getTasksForOccupations([
    ...new Set(evidence.map((e) => e.task.occupationId)),
  ]);

  for (const task of allTasks) {
    if (!taskIds.has(task.id)) continue;
    const occupation = occupationById.get(task.occupationId);
    if (!occupation) continue;
    if (!linkedOccupations.has(occupation.id)) {
      linkedOccupations.add(occupation.id);
      nodes.push({
        id: occupation.id,
        label: occupation.title,
        labelBn: occupation.titleBn,
        type: 'occupation',
        value: null,
      });
      seenNodes.add(occupation.id);
    }
    links.push({ source: task.id, target: occupation.id, kind: 'task-occupation' });
  }

  return NextResponse.json({ nodes, links });
}
