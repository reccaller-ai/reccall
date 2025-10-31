/**
 * ML artifact types for dynamic and hybrid contexts
 */

import { z } from 'zod';

/**
 * Code reference extracted from conversation
 */
export interface CodeRef {
  filePath: string;
  lineRange?: [number, number];
  snippet: string;
  language?: string;
  context: string;
}

/**
 * Zod schema for CodeRef
 */
export const CodeRefSchema = z.object({
  filePath: z.string(),
  lineRange: z.tuple([z.number(), z.number()]).optional(),
  snippet: z.string(),
  language: z.string().optional(),
  context: z.string(),
});

/**
 * ML artifacts attached to dynamic/hybrid contexts
 */
export interface MLArtifacts {
  embedding: number[]; // Semantic vector (typically 384 dimensions)
  summary: string; // Short summary of the conversation/content
  topics: string[]; // Extracted topics/keywords
  codeRefs?: CodeRef[]; // Code references found in conversation
  originalMessages?: import('./conversation.js').ConversationMessage[]; // Source conversation (optional, for dynamic contexts)
}

/**
 * Zod schema for MLArtifacts
 */
export const MLArtifactsSchema = z.object({
  embedding: z.array(z.number()),
  summary: z.string(),
  topics: z.array(z.string()),
  codeRefs: z.array(CodeRefSchema).optional(),
  originalMessages: z.array(z.any()).optional(), // Defer validation to avoid circular import
});

/**
 * Validate ML artifacts
 */
export function validateMLArtifacts(artifacts: unknown): MLArtifacts {
  const parsed = MLArtifactsSchema.parse(artifacts);
  const result: MLArtifacts = {
    embedding: parsed.embedding,
    summary: parsed.summary,
    topics: parsed.topics,
  };
  if (parsed.codeRefs !== undefined) {
    result.codeRefs = parsed.codeRefs.map(ref => {
      const codeRef: CodeRef = {
        filePath: ref.filePath,
        snippet: ref.snippet,
        context: ref.context,
      };
      if (ref.lineRange !== undefined) {
        codeRef.lineRange = ref.lineRange;
      }
      if (ref.language !== undefined) {
        codeRef.language = ref.language;
      }
      return codeRef;
    });
  }
  if (parsed.originalMessages !== undefined) {
    result.originalMessages = parsed.originalMessages;
  }
  return result;
}

