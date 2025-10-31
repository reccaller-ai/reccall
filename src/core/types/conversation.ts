/**
 * Conversation message types for dynamic context creation
 */

import { z } from 'zod';

/**
 * A message in a conversation (user or assistant)
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Zod schema for ConversationMessage
 */
export const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Array of conversation messages
 */
export type ConversationMessages = ConversationMessage[];

/**
 * Zod schema for conversation messages array
 */
export const ConversationMessagesSchema = z.array(ConversationMessageSchema);

/**
 * Validate a conversation message
 */
export function validateConversationMessage(message: unknown): ConversationMessage {
  const parsed = ConversationMessageSchema.parse(message);
  const result: ConversationMessage = {
    role: parsed.role,
    content: parsed.content,
    timestamp: parsed.timestamp,
  };
  if (parsed.metadata !== undefined) {
    result.metadata = parsed.metadata;
  }
  return result;
}

/**
 * Validate conversation messages array
 */
export function validateConversationMessages(messages: unknown): ConversationMessages {
  const parsed = ConversationMessagesSchema.parse(messages);
  return parsed.map(msg => {
    const result: ConversationMessage = {
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    };
    if (msg.metadata !== undefined) {
      result.metadata = msg.metadata;
    }
    return result;
  });
}

