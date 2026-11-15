/**
 * k-anonymity for anything that reports counts of people.
 *
 * The MVP shows no public aggregate dashboard, but the moment it does (a
 * "how do students like you score" chart, a per-university breakdown, an
 * admin view), every group smaller than MIN_COHORT has to disappear — a
 * cohort of three in a country-scale dataset is a person, not a statistic.
 *
 * The rule lives here so it cannot be forgotten at the call site.
 */

export const MIN_COHORT = 5;

export interface Cohort<T> {
  /** The label a user would see, e.g. "Data Analyst" or "2026 graduates". */
  key: string;
  /** Number of people in the group. */
  count: number;
  /** Whatever else the caller wants to carry through. */
  value: T;
}

export interface Anonymised<T> {
  /** Cohorts big enough to show. */
  visible: Array<Cohort<T>>;
  /** How many cohorts were withheld, so the UI can say so instead of lying. */
  suppressedCohorts: number;
  /** How many people those withheld cohorts covered. */
  suppressedPeople: number;
}

export function applyKAnonymity<T>(
  cohorts: Array<Cohort<T>>,
  min: number = MIN_COHORT,
): Anonymised<T> {
  const visible: Array<Cohort<T>> = [];
  let suppressedCohorts = 0;
  let suppressedPeople = 0;

  for (const cohort of cohorts) {
    if (!Number.isFinite(cohort.count) || cohort.count < min) {
      suppressedCohorts += 1;
      suppressedPeople += Number.isFinite(cohort.count) ? cohort.count : 0;
      continue;
    }
    visible.push(cohort);
  }

  return { visible, suppressedCohorts, suppressedPeople };
}

/**
 * True when a total is safe to publish at all. Even a headline number can
 * re-identify: "1 student from Cox's Bazar" is a person.
 */
export function isPublishable(total: number, min: number = MIN_COHORT): boolean {
  return Number.isFinite(total) && total >= min;
}
