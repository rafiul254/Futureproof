# AI exposure rubric

Status: **stub — written in full in Phase 1 (item 2).**

Used only for tasks that no published dataset covers. Those rows are stored with
`exposure_method = 'llm_estimated'`, a reduced `exposure_confidence`, and are
tagged **AI-estimated** everywhere they appear in the UI.

## Rubric (0 = unaffected, 1 = fully automatable today)

| Value | Meaning |
| --- | --- |
| 0.0–0.2 | Requires physical presence, trusted relationships, or legal accountability |
| 0.2–0.4 | Mostly human judgement; AI assists with drafts or lookups |
| 0.4–0.6 | Routine digital work; AI completes parts with human review |
| 0.6–0.8 | Structured digital work; AI completes most with light review |
| 0.8–1.0 | Fully digital, verifiable output; AI completes end to end today |

## Process

1. Two independent estimates per task; if they differ by more than 0.2, a human
   reviews the task.
2. The model must return a one-sentence justification with each estimate.
3. Estimates are versioned: re-running the rubric never silently overwrites
   a `published_dataset` value.
