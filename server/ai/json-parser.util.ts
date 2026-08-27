import { AIError, AIErrorCategory } from './ai.errors';

/**
 * Safely cleans and extracts JSON strings from LLM text responses,
 * stripping markdown code fences, conversational prose, and trailing delimiters.
 */
export function extractJsonString(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    throw new AIError({
      message: 'Cannot extract JSON from empty or non-string AI response.',
      category: AIErrorCategory.MALFORMED_OUTPUT,
    });
  }

  let text = rawText.trim();

  // 1. Remove Markdown code blocks: ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = codeBlockRegex.exec(text);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // 2. If already valid JSON starting with { or [, return it
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    return text;
  }

  // 3. Fallback: Search for outer JSON object or array in surrounding prose
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  // Determine whether an object or array is the primary structure
  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

  if (hasObject && hasArray) {
    // Whichever starts first
    if (firstBrace < firstBracket) {
      return text.substring(firstBrace, lastBrace + 1).trim();
    } else {
      return text.substring(firstBracket, lastBracket + 1).trim();
    }
  } else if (hasObject) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  } else if (hasArray) {
    return text.substring(firstBracket, lastBracket + 1).trim();
  }

  return text;
}

/**
 * Safely parses raw AI output into a JavaScript object/array.
 * Throws a categorized AIError if JSON parsing fails.
 */
export function safeJsonParse<T = unknown>(rawText: string): T {
  const cleaned = extractJsonString(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    throw new AIError({
      message: `Failed to parse AI output as JSON: ${err.message}`,
      category: AIErrorCategory.MALFORMED_OUTPUT,
      originalError: err,
      details: { rawSample: rawText.slice(0, 300) },
    });
  }
}
