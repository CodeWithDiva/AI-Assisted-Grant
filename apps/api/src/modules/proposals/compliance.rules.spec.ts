import { describe, expect, it } from 'vitest';
import { runDeterministicChecks, type CheckableSection } from './compliance.rules';

function section(overrides: Partial<CheckableSection> = {}): CheckableSection {
  return {
    id: 's1',
    title: 'Statement of Need',
    text: 'one two three four five six seven eight nine ten',
    wordLimit: null,
    charLimit: null,
    required: true,
    ...overrides,
  };
}

describe('runDeterministicChecks', () => {
  it('reports an empty required section as an error', () => {
    const issues = runDeterministicChecks([section({ text: '   ' })], true);
    expect(issues).toEqual([
      expect.objectContaining({ severity: 'ERROR', message: 'This section is empty.' }),
    ]);
  });

  it('downgrades an empty optional section to a warning', () => {
    const issues = runDeterministicChecks([section({ text: '', required: false })], true);
    expect(issues[0].severity).toBe('WARNING');
  });

  it('counts how far over the word limit a section is', () => {
    const issues = runDeterministicChecks([section({ wordLimit: 6 })], true);
    expect(issues[0]).toMatchObject({ severity: 'ERROR' });
    expect(issues[0].message).toContain('10 words');
    expect(issues[0].message).toContain('4 over');
  });

  it('flags the character limit separately from the word limit', () => {
    const issues = runDeterministicChecks([section({ charLimit: 10 })], true);
    expect(issues.some((issue) => issue.message.includes('characters'))).toBe(true);
  });

  it('counts leftover AI placeholders', () => {
    const issues = runDeterministicChecks(
      [section({ text: 'We served [NEEDS INPUT: number] girls in [NEEDS INPUT: year].' })],
      true,
    );
    expect(issues[0].message).toBe('2 unfilled placeholders still in the text.');
  });

  it('warns when far less than the allowed length is used', () => {
    const issues = runDeterministicChecks([section({ wordLimit: 100 })], true);
    expect(issues).toEqual([
      expect.objectContaining({ severity: 'WARNING', message: expect.stringContaining('Only 10') }),
    ]);
  });

  it('stays quiet when the section fits its limit', () => {
    const issues = runDeterministicChecks([section({ wordLimit: 12 })], true);
    expect(issues).toEqual([]);
  });

  it('warns once when no deadline is tracked', () => {
    const issues = runDeterministicChecks([section({ wordLimit: 12 })], false);
    expect(issues).toEqual([expect.objectContaining({ sectionId: null, severity: 'WARNING' })]);
  });
});
