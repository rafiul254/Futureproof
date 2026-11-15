import { describe, expect, it } from 'vitest';

import { applyKAnonymity, isPublishable, MIN_COHORT, type Cohort } from '@/lib/aggregates';
import { hasPdfMagicBytes, validateUpload } from '@/lib/cv/pdf';

describe('k-anonymity', () => {
  const cohorts: Array<Cohort<string>> = [
    { key: 'Software Developer', count: 41, value: 'sd' },
    { key: 'Data Analyst', count: 12, value: 'da' },
    { key: 'Cybersecurity Analyst', count: 4, value: 'sec' },
    { key: 'Ship Captain', count: 1, value: 'cap' },
  ];

  it('withholds every cohort smaller than the minimum', () => {
    const result = applyKAnonymity(cohorts);
    expect(result.visible.map((c) => c.key)).toEqual(['Software Developer', 'Data Analyst']);
    expect(result.suppressedCohorts).toBe(2);
    expect(result.suppressedPeople).toBe(5);
  });

  it('respects a stricter minimum when a caller asks for one', () => {
    const result = applyKAnonymity(cohorts, 20);
    expect(result.visible.map((c) => c.key)).toEqual(['Software Developer']);
  });

  it('never publishes a headline count below the minimum', () => {
    expect(isPublishable(12)).toBe(true);
    expect(isPublishable(MIN_COHORT - 1)).toBe(false);
    expect(isPublishable(0)).toBe(false);
  });
});

describe('upload validation', () => {
  it('accepts a normal PDF', () => {
    expect(
      validateUpload({ size: 120_000, type: 'application/pdf', filename: 'cv.pdf' }),
    ).toBeNull();
  });

  it('rejects everything that is not a PDF', () => {
    for (const input of [
      { size: 1000, type: 'application/msword', filename: 'cv.doc' },
      { size: 1000, type: 'application/pdf', filename: 'cv.exe' },
      { size: 0, type: 'application/pdf', filename: 'empty.pdf' },
      { size: 6 * 1024 * 1024, type: 'application/pdf', filename: 'huge.pdf' },
    ]) {
      expect(validateUpload(input), JSON.stringify(input)).not.toBeNull();
    }
  });

  it('checks the file header, not just the declared type', () => {
    const realPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const spoofed = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]); // a PE executable
    expect(hasPdfMagicBytes(realPdf)).toBe(true);
    expect(hasPdfMagicBytes(spoofed)).toBe(false);
    expect(hasPdfMagicBytes(new Uint8Array(3))).toBe(false);
  });
});
