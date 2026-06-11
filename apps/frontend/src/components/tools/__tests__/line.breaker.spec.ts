import { describe, it, expect } from 'vitest';
import { addInstagramLineBreaks, INVISIBLE_CHAR } from '../line.breaker';

describe('addInstagramLineBreaks', () => {
  it('fills empty lines with invisible char', () => {
    const out = addInstagramLineBreaks('hola\n\nmundo');
    expect(out).toBe(`hola\n${INVISIBLE_CHAR}\nmundo`);
  });

  it('handles multiple consecutive empty lines', () => {
    const out = addInstagramLineBreaks('a\n\n\nb');
    expect(out).toBe(`a\n${INVISIBLE_CHAR}\n${INVISIBLE_CHAR}\nb`);
  });

  it('leaves text without empty lines untouched', () => {
    expect(addInstagramLineBreaks('a\nb')).toBe('a\nb');
  });

  it('is idempotent', () => {
    const once = addInstagramLineBreaks('a\n\nb');
    expect(addInstagramLineBreaks(once)).toBe(once);
  });
});
