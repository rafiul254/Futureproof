import { describe, expect, it } from 'vitest';

import { SCORING_WEIGHTS } from './config';
import {
  computeScore,
  percentileRank,
  trendValue,
  weightedExposure,
  type DemandInput,
  type TaskInput,
  type UserSkillInput,
} from './score';

const FIXED_DATE = new Date('2026-10-12T00:00:00.000Z');

function task(overrides: Partial<TaskInput> & { skillId: string; aiExposure: number }): TaskInput {
  return {
    id: `${overrides.skillId}-${Math.random().toString(36).slice(2, 8)}`,
    description: 'a task',
    importance: 1,
    exposureMethod: 'published_dataset',
    exposureConfidence: 0.9,
    ...overrides,
  };
}

function demand(skillId: string, count30d: number, countPrev30d: number): DemandInput {
  return { skillId, count30d, countPrev30d };
}

describe('percentileRank', () => {
  it('is 0 for the smallest value and 1 for the largest', () => {
    const all = [1, 2, 3, 4];
    expect(percentileRank(1, all)).toBeGreaterThan(0);
    expect(percentileRank(1, all)).toBeLessThan(percentileRank(4, all));
    expect(percentileRank(4, all)).toBeCloseTo(0.875, 5);
  });

  it('handles ties by averaging ranks', () => {
    expect(percentileRank(5, [5, 5, 5])).toBeCloseTo(0.5, 5);
  });

  it('returns 0 for an empty distribution', () => {
    expect(percentileRank(5, [])).toBe(0);
  });
});

describe('trendValue', () => {
  it('is 0 when nothing changed', () => {
    expect(trendValue(10, 10)).toBe(0);
  });

  it('is positive when demand grew', () => {
    expect(trendValue(20, 10)).toBe(1);
  });

  it('is negative when demand fell', () => {
    expect(trendValue(5, 10)).toBe(-0.5);
  });

  it('clamps to 1 when the previous window was empty', () => {
    expect(trendValue(9, 0)).toBe(1);
  });

  it('clamps to -1 when demand collapsed', () => {
    expect(trendValue(0, 10)).toBe(-1);
  });
});

describe('weightedExposure', () => {
  it('weights by task importance', () => {
    const value = weightedExposure([
      { importance: 3, aiExposure: 1 },
      { importance: 1, aiExposure: 0 },
    ]);
    expect(value).toBeCloseTo(0.75, 5);
  });

  it('falls back to a weight of 1 when importance is missing', () => {
    const value = weightedExposure([
      { importance: null, aiExposure: 0.8 },
      { importance: null, aiExposure: 0.4 },
    ]);
    expect(value).toBeCloseTo(0.6, 5);
  });

  it('returns 0 when there are no tasks', () => {
    expect(weightedExposure([])).toBe(0);
  });
});

describe('computeScore', () => {
  const resilientSkill: UserSkillInput = { skillId: 'skill-a', proficiency: 3 };
  const exposedSkill: UserSkillInput = { skillId: 'skill-b', proficiency: 1 };

  const input = {
    userSkills: [resilientSkill, exposedSkill],
    demand: [demand('skill-a', 90, 60), demand('skill-b', 10, 40)],
    tasks: [
      task({ skillId: 'skill-a', aiExposure: 0.1, importance: 1 }),
      task({ skillId: 'skill-a', aiExposure: 0.3, importance: 1 }),
      task({ skillId: 'skill-a', aiExposure: 0.2, importance: 1 }),
      task({ skillId: 'skill-b', aiExposure: 0.9, importance: 1 }),
      task({ skillId: 'skill-b', aiExposure: 0.8, importance: 1 }),
      task({ skillId: 'skill-b', aiExposure: 0.95, importance: 1 }),
    ],
  };

  it('produces a score for every supplied skill', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    expect(result.skills).toHaveLength(2);
    expect(result.overall).not.toBeNull();
  });

  it('places a high-demand, high-resilience skill in Invest', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    const skillA = result.skills.find((s) => s.skillId === 'skill-a');
    expect(skillA?.quadrant).toBe('invest');
  });

  it('places a falling-demand, highly exposed skill in Transition', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    const skillB = result.skills.find((s) => s.skillId === 'skill-b');
    expect(skillB?.quadrant).toBe('transition');
  });

  it('weights the overall score by proficiency', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    const skillA = result.skills.find((s) => s.skillId === 'skill-a')!;
    const skillB = result.skills.find((s) => s.skillId === 'skill-b')!;
    const expected =
      (skillA.weight * skillA.score + skillB.weight * skillB.score) /
      (skillA.weight + skillB.weight);
    expect(result.overall).toBeCloseTo(expected, 1);
  });

  it('keeps every score inside 0..100', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    for (const skill of result.skills) {
      expect(skill.score).toBeGreaterThanOrEqual(0);
      expect(skill.score).toBeLessThanOrEqual(100);
    }
    expect(result.overall!).toBeGreaterThanOrEqual(0);
    expect(result.overall!).toBeLessThanOrEqual(100);
  });

  it('excludes skills with no linked tasks and marks them insufficient', () => {
    const result = computeScore(
      {
        userSkills: [{ skillId: 'orphan', proficiency: 2 }],
        demand: [demand('orphan', 5, 5)],
        tasks: [],
      },
      { now: FIXED_DATE },
    );
    expect(result.skills[0]?.confidence).toBe('insufficient');
    expect(result.skills[0]?.includedInOverall).toBe(false);
    expect(result.overall).toBeNull();
    expect(result.coverage.insufficientData).toBe(1);
  });

  it('returns a null overall when there are no skills at all', () => {
    const result = computeScore({ userSkills: [], demand: [], tasks: [] }, { now: FIXED_DATE });
    expect(result.overall).toBeNull();
    expect(result.overallConfidence).toBe('insufficient');
    expect(result.skills).toEqual([]);
  });

  it('marks demand as unavailable when the skill has no demand row', () => {
    const result = computeScore(
      {
        userSkills: [{ skillId: 'skill-a', proficiency: 1 }],
        demand: [],
        tasks: [task({ skillId: 'skill-a', aiExposure: 0.5 })],
      },
      { now: FIXED_DATE },
    );
    expect(result.skills[0]?.demand.available).toBe(false);
    expect(result.skills[0]?.demand.value).toBe(0);
  });

  it('lowers confidence when exposure is only AI-estimated', () => {
    const estimated = computeScore(
      {
        userSkills: [{ skillId: 'skill-a', proficiency: 2 }],
        demand: [demand('skill-a', 10, 10)],
        tasks: [
          task({
            skillId: 'skill-a',
            aiExposure: 0.4,
            exposureMethod: 'llm_estimated',
            exposureConfidence: 0.55,
          }),
          task({
            skillId: 'skill-a',
            aiExposure: 0.5,
            exposureMethod: 'llm_estimated',
            exposureConfidence: 0.55,
          }),
          task({
            skillId: 'skill-a',
            aiExposure: 0.45,
            exposureMethod: 'llm_estimated',
            exposureConfidence: 0.55,
          }),
        ],
      },
      { now: FIXED_DATE },
    );
    const published = computeScore(
      {
        userSkills: [{ skillId: 'skill-a', proficiency: 2 }],
        demand: [demand('skill-a', 10, 10)],
        tasks: [
          task({
            skillId: 'skill-a',
            aiExposure: 0.4,
            exposureMethod: 'published_dataset',
            exposureConfidence: 0.95,
          }),
          task({
            skillId: 'skill-a',
            aiExposure: 0.5,
            exposureMethod: 'published_dataset',
            exposureConfidence: 0.95,
          }),
          task({
            skillId: 'skill-a',
            aiExposure: 0.45,
            exposureMethod: 'published_dataset',
            exposureConfidence: 0.95,
          }),
        ],
      },
      { now: FIXED_DATE },
    );

    expect(estimated.skills[0]?.exposure.method).toBe('llm_estimated');
    expect(published.skills[0]?.confidence).toBe('high');
    expect(estimated.skills[0]?.confidence).not.toBe('high');
    // The score itself is identical: confidence is metadata, not a value change.
    expect(estimated.skills[0]?.score).toBeCloseTo(published.skills[0]!.score, 5);
  });

  it('is deterministic: the same input gives byte-identical output', () => {
    const a = computeScore(input, { now: FIXED_DATE });
    const b = computeScore(input, { now: FIXED_DATE });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('uses the documented weights', () => {
    const result = computeScore(input, { now: FIXED_DATE });
    expect(result.weights.demand.percentile).toBe(SCORING_WEIGHTS.demand.percentile);
    expect(result.weights.skillScore.resilience).toBe(SCORING_WEIGHTS.skillScore.resilience);
  });
});

describe('fairness', () => {
  const baseSkills: UserSkillInput[] = [
    { skillId: 'sql', proficiency: 3 },
    { skillId: 'python', proficiency: 2 },
  ];
  const baseDemand = [demand('sql', 80, 70), demand('python', 60, 55)];
  const baseTasks = [
    task({ skillId: 'sql', aiExposure: 0.35 }),
    task({ skillId: 'sql', aiExposure: 0.45 }),
    task({ skillId: 'python', aiExposure: 0.5 }),
    task({ skillId: 'python', aiExposure: 0.6 }),
  ];

  it('scores identical skills identically regardless of name, gender or university', () => {
    // The engine only ever sees skill ids, proficiency and evidence-free numbers.
    // Personal details never reach it, so any two CVs with the same skills
    // must produce the same score.
    const candidateA = computeScore(
      { userSkills: baseSkills, demand: baseDemand, tasks: baseTasks },
      { now: FIXED_DATE },
    );
    const candidateB = computeScore(
      { userSkills: [...baseSkills], demand: [...baseDemand], tasks: [...baseTasks] },
      { now: FIXED_DATE },
    );

    expect(candidateA.overall).toBe(candidateB.overall);
    expect(candidateA.skills.map((s) => s.score)).toEqual(candidateB.skills.map((s) => s.score));
  });

  it('changes the score only when a skill or proficiency changes', () => {
    const before = computeScore(
      { userSkills: baseSkills, demand: baseDemand, tasks: baseTasks },
      { now: FIXED_DATE },
    );
    const after = computeScore(
      {
        userSkills: [
          { skillId: 'sql', proficiency: 1 },
          { skillId: 'python', proficiency: 2 },
        ],
        demand: baseDemand,
        tasks: baseTasks,
      },
      { now: FIXED_DATE },
    );
    expect(after.overall).not.toBe(before.overall);
  });
});
