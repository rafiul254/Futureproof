import { describe, expect, it } from 'vitest';

import { clamp, cn, groupBy, round } from '@/lib/utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('lets the later Tailwind class win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });
});

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('clamps below the minimum', () => {
    expect(clamp(-3, 0, 1)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clamp(2, 0, 1)).toBe(1);
  });
});

describe('round', () => {
  it('rounds to two decimals by default', () => {
    expect(round(1.23456)).toBe(1.23);
  });

  it('rounds to the requested number of decimals', () => {
    expect(round(1.23456, 3)).toBe(1.235);
  });

  it('avoids binary floating point artefacts', () => {
    expect(round(1.005, 2)).toBe(1.01);
  });
});

describe('groupBy', () => {
  it('groups items by the selected key', () => {
    const items = [
      { name: 'sql', kind: 'tech' },
      { name: 'python', kind: 'tech' },
      { name: 'communication', kind: 'soft' },
    ];

    const groups = groupBy(items, (item) => item.kind);

    expect(groups.get('tech')?.map((i) => i.name)).toEqual(['sql', 'python']);
    expect(groups.get('soft')?.map((i) => i.name)).toEqual(['communication']);
  });

  it('returns an empty map for no items', () => {
    expect(groupBy([], (x: string) => x).size).toBe(0);
  });
});
