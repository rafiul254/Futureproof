import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { findResidualPii, scrubPii } from './scrub';

const SAMPLES = JSON.parse(
  readFileSync(path.join(process.cwd(), 'data', 'seed', 'sample_profiles.json'), 'utf8'),
) as Array<{ key: string; text: string }>;

describe('scrubPii', () => {
  it('removes email addresses', () => {
    const result = scrubPii('Contact me at tanvir.rahman@example.com today.');
    expect(result.text).not.toContain('example.com');
    expect(result.redactions.some((r) => r.type === 'email')).toBe(true);
  });

  it('removes Bangladeshi phone numbers in common formats', () => {
    for (const phone of [
      '+880 1712 345 678',
      '01712-345-678',
      '01712345678',
      '01819 987 654',
      '+8801555112233',
    ]) {
      expect(scrubPii(`Call ${phone} now`).text).not.toContain(phone);
    }
  });

  it('removes national ID numbers', () => {
    const result = scrubPii('National ID: 2003 1234 5678');
    expect(result.text).not.toContain('1234 5678');
  });

  it('removes dates of birth', () => {
    const result = scrubPii('Date of birth: 14 March 2003');
    expect(result.text).not.toContain('14 March 2003');
  });

  it('removes gender and other protected attributes', () => {
    expect(scrubPii('Gender: Female').text).not.toContain('Female');
    expect(scrubPii('Marital status: Single').text).not.toContain('Single');
    expect(scrubPii('Religion: Islam').text).not.toContain('Islam');
  });

  it('removes street and postal addresses', () => {
    const result = scrubPii('House 12, Road 4, Dhanmondi, Dhaka 1205');
    expect(result.text).not.toContain('Dhanmondi');
  });

  it('removes the leading candidate name', () => {
    const result = scrubPii('Md. Tanvir Rahman\nEmail: a@b.com\nSkills: Python');
    expect(result.text).not.toContain('Tanvir');
    expect(result.text).toContain('[NAME]');
  });

  it('removes institution names', () => {
    const result = scrubPii('BSc, University of Dhaka, 2026');
    expect(result.text).not.toContain('Dhaka');
  });

  it('keeps skills, tools and years intact', () => {
    const result = scrubPii(
      'Name: Test Person\nEmail: t@example.com\nSkills: Python, React, SQL, Docker\nExperience 2022 - 2025',
    );
    expect(result.text).toContain('Python');
    expect(result.text).toContain('React');
    expect(result.text).toContain('SQL');
    expect(result.text).toContain('2022');
  });

  it('leaves no residual identifiers in any sample CV', () => {
    for (const sample of SAMPLES) {
      const scrubbed = scrubPii(sample.text);
      expect(findResidualPii(scrubbed.text), `${sample.key} residual PII`).toEqual([]);
      expect(scrubbed.text).not.toMatch(/Tanvir|Nusrat|Shipra/);
    }
  });

  it('reports what it removed', () => {
    const result = scrubPii(SAMPLES[0]?.text ?? '');
    const types = result.redactions.map((r) => r.type);
    expect(types).toContain('email');
    expect(types).toContain('phone');
    expect(types).toContain('name');
  });

  it('is deterministic', () => {
    const text = SAMPLES[0]?.text ?? '';
    expect(scrubPii(text).text).toBe(scrubPii(text).text);
  });

  it('never throws on empty or odd input', () => {
    expect(scrubPii('').text).toBe('');
    expect(() => scrubPii('!!!\n\n\n@@@')).not.toThrow();
  });
});

describe('fairness guarantee', () => {
  it('produces identical scrubbed text for CVs differing only in identity fields', () => {
    const base = 'Skills: Python, SQL\nExperience: 3 years\n';
    const personA = scrubPii(
      `Rahima Akter\nEmail: rahima@example.com\nPhone: 01711111111\n${base}`,
    );
    const personB = scrubPii(`Karim Ahmed\nEmail: karim@example.com\nPhone: 01822222222\n${base}`);
    expect(personA.text).toBe(personB.text);
  });

  it('produces identical scrubbed text when only the university differs', () => {
    const a = scrubPii('BSc in CSE, University of Dhaka\nSkills: Python');
    const b = scrubPii('BSc in CSE, University of Rajshahi\nSkills: Python');
    expect(a.text).toBe(b.text);
  });
});
