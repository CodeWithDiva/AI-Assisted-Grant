import type { ComplianceIssue } from '@grant/shared';
import { countWords, plainText } from '@grant/shared';

export interface CheckableSection {
  id: string;
  title: string;
  text: string;
  wordLimit: number | null;
  charLimit: number | null;
  required: boolean;
}

/** Sections shorter than this share of their limit are flagged as under-using the space. */
const UNDERUSE_RATIO = 0.4;

/**
 * The checks that do not need the AI: limits, empty sections, leftover placeholders,
 * and whether a deadline is being tracked. Pure, so it is covered by unit tests.
 */
export function runDeterministicChecks(
  sections: CheckableSection[],
  hasOpenDeadline: boolean,
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  for (const section of sections) {
    const words = countWords(section.text);

    if (!section.text.trim()) {
      if (section.required) {
        issues.push(issue(section, 'ERROR', 'This section is empty.'));
      } else {
        issues.push(issue(section, 'WARNING', 'This optional section is empty.'));
      }
      continue;
    }

    if (section.wordLimit && words > section.wordLimit) {
      issues.push(
        issue(
          section,
          'ERROR',
          `${words} words — ${words - section.wordLimit} over the ${section.wordLimit}-word limit.`,
        ),
      );
    }

    const characters = plainText(section.text).length;
    if (section.charLimit && characters > section.charLimit) {
      issues.push(
        issue(
          section,
          'ERROR',
          `${characters} characters — over the ${section.charLimit}-character limit.`,
        ),
      );
    }

    const placeholders = section.text.split('[NEEDS INPUT').length - 1;
    if (placeholders > 0) {
      issues.push(
        issue(
          section,
          'ERROR',
          `${placeholders} unfilled placeholder${placeholders > 1 ? 's' : ''} still in the text.`,
        ),
      );
    }

    if (section.wordLimit && words < section.wordLimit * UNDERUSE_RATIO) {
      issues.push(
        issue(
          section,
          'WARNING',
          `Only ${words} of ${section.wordLimit} words used — the funder allows much more.`,
        ),
      );
    }
  }

  if (!hasOpenDeadline) {
    issues.push({
      sectionId: null,
      sectionTitle: null,
      severity: 'WARNING',
      message: 'No submission deadline is being tracked for this proposal.',
    });
  }

  return issues;
}

function issue(
  section: CheckableSection,
  severity: ComplianceIssue['severity'],
  message: string,
): ComplianceIssue {
  return { sectionId: section.id, sectionTitle: section.title, severity, message };
}
