import { countWords, parseInline, parseRichText, plainText } from '@grant/shared';
import { describe, expect, it } from 'vitest';

describe('parseInline', () => {
  it('reads bold, italic and bold-italic runs', () => {
    expect(parseInline('We **served** 1,180 *girls* in ***2025***.')).toEqual([
      { text: 'We ' },
      { text: 'served', bold: true },
      { text: ' 1,180 ' },
      { text: 'girls', italic: true },
      { text: ' in ' },
      { text: '2025', bold: true, italic: true },
      { text: '.' },
    ]);
  });

  it('leaves arithmetic and stray asterisks alone', () => {
    expect(parseInline('3 * 4 = 12 and a lone * star')).toEqual([
      { text: '3 * 4 = 12 and a lone * star' },
    ]);
  });
});

describe('parseRichText', () => {
  it('joins wrapped lines into one paragraph and splits on blank lines', () => {
    expect(parseRichText('First line\ncontinues here.\n\nSecond paragraph.')).toEqual([
      { type: 'paragraph', runs: [{ text: 'First line continues here.' }] },
      { type: 'paragraph', runs: [{ text: 'Second paragraph.' }] },
    ]);
  });

  it('groups consecutive bullet and numbered lines into lists', () => {
    const blocks = parseRichText(
      'Outcomes:\n- 400 girls enrolled\n* 30 villages\n\n1. Hire\n2) Train',
    );
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'bullets', 'numbers']);
    expect(blocks[1]).toEqual({
      type: 'bullets',
      items: [[{ text: '400 girls enrolled' }], [{ text: '30 villages' }]],
    });
    expect(blocks[2]).toMatchObject({ items: [[{ text: 'Hire' }], [{ text: 'Train' }]] });
  });

  it('keeps two lists apart when a blank line separates them', () => {
    expect(parseRichText('- a\n\n- b').filter((block) => block.type === 'bullets')).toHaveLength(2);
  });

  it('handles Windows line endings', () => {
    expect(parseRichText('One\r\n\r\nTwo')).toHaveLength(2);
  });
});

describe('plainText and countWords', () => {
  it('drops formatting markers and bullets', () => {
    expect(plainText('**Bold** start\n- item one\n- *item* two')).toBe(
      'Bold start\n\nitem one\nitem two',
    );
  });

  it('counts words the way a reader sees them', () => {
    expect(countWords('**Twelve** staff\n- 38 teachers\n- *five* board members')).toBe(7);
    expect(countWords('   ')).toBe(0);
  });
});
