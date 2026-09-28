/**
 * Models reached through the OpenAI-style API return JSON by instruction, not by a strict
 * tool as Claude does, so a key can be missing or a number can come back as "40,000".
 * conformToSchema coerces the parsed answer into the shape the schema promises.
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: unknown[];
  [key: string]: unknown;
}

export function conformToSchema(value: unknown, schema: JsonSchema): unknown {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type ?? 'object'];
  const nullable = types.includes('null');
  const type = types.find((candidate) => candidate !== 'null') ?? 'string';
  const empty = nullable ? null : undefined;

  if (value === null || value === undefined) {
    if (nullable) return null;
    if (type === 'array') return [];
    if (type === 'object') return conformObject({}, schema);
  }

  if (schema.enum) {
    if (schema.enum.includes(value)) return value;
    const match =
      typeof value === 'string'
        ? schema.enum.find((option) => String(option).toLowerCase() === value.toLowerCase())
        : undefined;
    return match ?? empty ?? schema.enum[0];
  }

  switch (type) {
    case 'object':
      return typeof value === 'object' && !Array.isArray(value)
        ? conformObject(value as Record<string, unknown>, schema)
        : (empty ?? conformObject({}, schema));
    case 'array': {
      const list = Array.isArray(value) ? value : [value];
      return schema.items ? list.map((item) => conformToSchema(item, schema.items!)) : list;
    }
    case 'number':
    case 'integer': {
      const number = typeof value === 'number' ? value : parseNumber(value);
      if (number === null) return empty ?? 0;
      return type === 'integer' ? Math.round(number) : number;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 'false') return value === 'true';
      return empty ?? false;
    default:
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return empty ?? '';
  }
}

function conformObject(value: Record<string, unknown>, schema: JsonSchema) {
  const result: Record<string, unknown> = {};
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    result[key] = conformToSchema(value[key], property);
  }
  return result;
}

/** "40,000", "USD 120000", "30%" → numbers; anything else → null. */
function parseNumber(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /-?\d+(?:\.\d+)?/.exec(value.replace(/,/g, ''));
  return match ? Number(match[0]) : null;
}

/** Pulls the JSON object out of a reply that may be wrapped in a code fence or prose. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('The reply contained no JSON object');
    return JSON.parse(candidate.slice(start, end + 1));
  }
}
