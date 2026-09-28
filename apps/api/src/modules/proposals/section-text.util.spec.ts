import { describe, expect, it } from 'vitest';
import { countWords, readSectionText } from './section-text.util';

describe('readSectionText', () => {
  it('reads the stored text', () => {
    expect(readSectionText({ text: 'hello' })).toBe('hello');
  });

  it('returns an empty string for never-written sections', () => {
    expect(readSectionText(null)).toBe('');
    expect(readSectionText(undefined)).toBe('');
    expect(readSectionText({})).toBe('');
    expect(readSectionText({ text: 42 })).toBe('');
    expect(readSectionText('plain string')).toBe('');
  });
});

describe('countWords', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('one two\nthree\tfour  five')).toBe(5);
  });

  it('counts nothing for blank text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n  ')).toBe(0);
  });
});
