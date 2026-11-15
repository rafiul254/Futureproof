/**
 * Every weight and threshold used by the Future-Proof Score.
 *
 * These are the ONLY knobs. They are rendered on the Methodology page, so the
 * page and the code can never disagree.
 */

export const SCORING_WEIGHTS = {
  /** Demand = percentile share + trend share. */
  demand: {
    percentile: 0.7,
    trend: 0.3,
  },
  /** SkillScore = 100 * (demand share + resilience share). */
  skillScore: {
    demand: 0.5,
    resilience: 0.5,
  },
  /** Split point between high/low on both axes. */
  quadrantThreshold: 0.5,
  /** w_s is the proficiency level itself (1 = coursework, 3 = professional use). */
  proficiencyWeight: { 1: 1, 2: 2, 3: 3 } as Record<1 | 2 | 3, number>,
  /** Numeric value of each confidence label, used for the overall aggregate. */
  confidenceValue: { high: 1, medium: 0.6, low: 0.3, insufficient: 0 } as Record<string, number>,
  /** At least this many linked tasks before we call a skill high confidence. */
  minTasksForHighConfidence: 3,
  /** Share of task exposure that must come from a published dataset for "high". */
  minPublishedShareForHigh: 0.7,
} as const;

export const QUADRANTS = ['invest', 'adapt', 'niche', 'transition'] as const;

export type Quadrant = (typeof QUADRANTS)[number];

export const QUADRANT_LABELS: Record<Quadrant, { en: string; bn: string }> = {
  invest: { en: 'Invest', bn: 'বিনিয়োগ করুন' },
  adapt: { en: 'Adapt with AI', bn: 'AI দিয়ে মানিয়ে নিন' },
  niche: { en: 'Niche', bn: 'নিশ' },
  transition: { en: 'Transition', bn: 'পরিবর্তন করুন' },
};

export const QUADRANT_MEANING: Record<Quadrant, { en: string; bn: string }> = {
  invest: {
    en: 'High demand and hard to automate. Keep going deeper here.',
    bn: 'চাহিদা বেশি, AI দিয়ে করা কঠিন। এখানে আরও গভীর হন।',
  },
  adapt: {
    en: 'High demand but AI does much of it. Learn to work alongside AI tools.',
    bn: 'চাহিদা বেশি, কিন্তু AI অনেকটাই করতে পারে। AI টুলের সাথে কাজ করতে শিখুন।',
  },
  niche: {
    en: 'Hard to automate but low demand right now. Valuable in the right role.',
    bn: 'AI দিয়ে করা কঠিন, তবে চাহিদা কম। সঠিক ভূমিকায় মূল্যবান।',
  },
  transition: {
    en: 'Low demand and highly automatable. Plan to move out of this.',
    bn: 'চাহিদা কম এবং AI সহজে করতে পারে। এখান থেকে সরে আসার পরিকল্পনা করুন।',
  },
};
