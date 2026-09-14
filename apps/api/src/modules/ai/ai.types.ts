import type Anthropic from '@anthropic-ai/sdk';

export type AiKind =
  'TEMPLATE_EXTRACTION' | 'SECTION_DRAFT' | 'SECTION_REFINE' | 'COMPLIANCE_REVIEW' | 'FIT_SCORE';

export type AiEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

interface BaseRequest {
  organizationId: string;
  userId?: string;
  kind: AiKind;
  /** Bumped whenever a prompt changes, so logged generations stay traceable. */
  promptVersion: string;
  system: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  effort?: AiEffort;
}

export type TextRequest = BaseRequest;

export interface JsonRequest extends BaseRequest {
  /** Claude returns the JSON by calling this tool, which keeps the output schema-valid. */
  toolName: string;
  toolDescription: string;
  schema: Anthropic.Tool['input_schema'];
}

export interface AiResult<T> {
  data: T;
  generationId: string;
  inputTokens: number;
  outputTokens: number;
}
