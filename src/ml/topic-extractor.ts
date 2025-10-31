/**
 * Topic extraction from conversations
 * Phase 2: ML Intelligence Layer
 */

import type { ConversationMessage } from '../core/types/conversation.js';

/**
 * Topic extractor - extracts topics/keywords from conversation
 */
export class TopicExtractor {
  /**
   * Extract topics from conversation messages
   */
  extractTopics(messages: ConversationMessage[]): string[] {
    const allText = messages.map(m => m.content).join(' ');
    const words = allText.toLowerCase().split(/\s+/);

    // Count word frequency
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were',
      'this', 'that', 'these', 'those', 'it', 'they', 'we', 'you',
    ]);

    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
      }
    });

    // Get top topics
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}
