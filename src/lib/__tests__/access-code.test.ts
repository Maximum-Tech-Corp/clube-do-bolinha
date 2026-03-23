import { describe, it, expect } from 'vitest';
import { generateAccessCode } from '@/lib/access-code';

const VALID_CHARS = /^[A-Z0-9]+$/;

describe('generateAccessCode', () => {
  it('returns prefix of length 4', () => {
    const { prefix } = generateAccessCode();
    expect(prefix).toHaveLength(4);
  });

  it('returns suffix of length 6', () => {
    const { suffix } = generateAccessCode();
    expect(suffix).toHaveLength(6);
  });

  it('full code matches PREFIX-SUFFIX format', () => {
    const { full } = generateAccessCode();
    expect(full).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{6}$/);
  });

  it('full code equals prefix + hyphen + suffix', () => {
    const { prefix, suffix, full } = generateAccessCode();
    expect(full).toBe(`${prefix}-${suffix}`);
  });

  it('prefix contains only uppercase alphanumeric chars', () => {
    const { prefix } = generateAccessCode();
    expect(VALID_CHARS.test(prefix)).toBe(true);
  });

  it('suffix contains only uppercase alphanumeric chars', () => {
    const { suffix } = generateAccessCode();
    expect(VALID_CHARS.test(suffix)).toBe(true);
  });

  it('multiple calls produce different full codes (uniqueness check)', () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateAccessCode().full),
    );
    expect(codes.size).toBeGreaterThan(1);
  });

  it('multiple calls produce different suffixes', () => {
    const suffixes = new Set(
      Array.from({ length: 20 }, () => generateAccessCode().suffix),
    );
    expect(suffixes.size).toBeGreaterThan(1);
  });
});
