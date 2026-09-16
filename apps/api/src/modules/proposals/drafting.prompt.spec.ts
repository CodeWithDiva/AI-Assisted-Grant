import { describe, expect, it } from 'vitest';
import {
  buildDraftUserMessage,
  buildRefineUserMessage,
  type DraftContext,
} from './drafting.prompt';

function context(overrides: Partial<DraftContext> = {}): DraftContext {
  return {
    organizationName: 'Roshni Foundation',
    organizationType: 'NONPROFIT',
    profile: 'Mission: educate girls in rural Sindh',
    documents: [],
    funderName: 'Test Foundation',
    templateName: 'Education Grant',
    eligibility: [],
    criteria: [],
    sectionTitle: 'Statement of Need',
    instructions: 'Describe the problem',
    wordLimit: 500,
    charLimit: null,
    writtenSections: [],
    ...overrides,
  };
}

describe('buildDraftUserMessage', () => {
  it('passes the organization facts and the funder instructions to the model', () => {
    const message = buildDraftUserMessage(context());
    expect(message).toContain('Roshni Foundation');
    expect(message).toContain('educate girls in rural Sindh');
    expect(message).toContain("Funder's instructions: Describe the problem");
    expect(message).toContain('Word limit: 500 words');
    expect(message.trim().endsWith('Output the section text only.')).toBe(true);
  });

  it('leaves out blocks that have nothing in them', () => {
    const message = buildDraftUserMessage(context({ wordLimit: null }));
    expect(message).not.toContain('<organization_documents>');
    expect(message).not.toContain('<eligibility>');
    expect(message).not.toContain('Word limit');
  });

  it('includes sections already written so the draft stays consistent', () => {
    const message = buildDraftUserMessage(
      context({
        writtenSections: [{ title: 'Executive Summary', text: 'We request 50,000 USD.' }],
      }),
    );
    expect(message).toContain('<sections_already_written>');
    expect(message).toContain('We request 50,000 USD.');
  });
});

describe('buildRefineUserMessage', () => {
  it('sends the current text and the requested change', () => {
    const message = buildRefineUserMessage(context(), 'SHORTEN', 'Existing draft text.');
    expect(message).toContain('<current_text>');
    expect(message).toContain('Existing draft text.');
    expect(message).toContain('shorter');
  });

  it('keeps placeholders when rewriting', () => {
    const message = buildRefineUserMessage(context(), 'EXPAND', 'text');
    expect(message).toContain('[NEEDS INPUT: ...]');
  });
});
