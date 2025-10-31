/**
 * Conversation summarization for dynamic context creation
 * Phase 2: ML Intelligence Layer
 */

import type { ConversationMessage } from '../core/types/conversation.js';
import type { CodeRef } from '../core/types/ml.js';

export interface SummarizationOptions {
  maxLength?: number;
  temperature?: number;
}

/**
 * Conversation summarizer
 * Phase 2: Currently uses simple text extraction
 * Future: Integrate with local ML models (transformers.js, ONNX.js)
 */
export class ConversationSummarizer {
  /**
   * Summarize a conversation
   */
  async summarize(messages: ConversationMessage[], options: SummarizationOptions = {}): Promise<string> {
    // Phase 2: Simple extraction-based summary
    // Future: Replace with ML model inference
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    if (userMessages.length === 0) {
      return 'Conversation with assistant responses only';
    }

    // Extract key points from first and last user messages
    const firstUser = userMessages[0]?.content || '';
    const lastUser = userMessages[userMessages.length - 1]?.content || firstUser;

    // Simple summary (to be enhanced with ML in future)
    const summary = `Discussion about: ${this.extractKeywords(firstUser)}. ${this.extractKeywords(lastUser)}.`;

    return summary.length > (options.maxLength || 500)
      ? summary.substring(0, (options.maxLength || 500) - 3) + '...'
      : summary;
  }

  /**
   * Generate full context content from conversation
   */
  async generateContextContent(
    messages: ConversationMessage[],
    summary: string,
    codeRefs: CodeRef[]
  ): Promise<string> {
    let markdown = `# ${summary}\n\n`;

    // Add key points
    const keyPoints = await this.extractKeyPoints(messages);
    if (keyPoints.length > 0) {
      markdown += `## Key Points\n\n`;
      keyPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += '\n';
    }

    // Add code references
    if (codeRefs.length > 0) {
      markdown += `## Code References\n\n`;
      codeRefs.forEach(ref => {
        markdown += `### ${ref.filePath}\n\n`;
        if (ref.context) {
          markdown += `${ref.context}\n\n`;
        }
        markdown += '```' + (ref.language || '') + '\n';
        markdown += ref.snippet + '\n';
        markdown += '```\n\n';
      });
    }

    // Add detailed summary
    markdown += `## Details\n\n`;
    markdown += await this.generateDetailedSummary(messages);

    return markdown;
  }

  /**
   * Extract key points from conversation (simple version)
   */
  private async extractKeyPoints(messages: ConversationMessage[]): Promise<string[]> {
    // Phase 2: Simple extraction
    // Future: Use ML model to extract key points
    const points: string[] = [];

    // Extract from user questions and assistant summaries
    for (const msg of messages) {
      if (msg.role === 'user' && msg.content.length > 20) {
        const sentences = msg.content.split(/[.!?]/);
        const firstSentence = sentences[0];
        if (firstSentence && firstSentence.length > 10) {
          points.push(firstSentence.substring(0, 100));
        }
      }
      if (points.length >= 5) break;
    }

    return points;
  }

  /**
   * Generate detailed summary
   */
  private async generateDetailedSummary(messages: ConversationMessage[]): Promise<string> {
    // Phase 2: Simple format
    // Future: Use ML model for better summarization
    return messages
      .map((msg, i) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`;
      })
      .join('\n\n');
  }

  /**
   * Extract keywords from text (simple version)
   */
  private extractKeywords(text: string): string {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    const keywords = words.filter(w => w.length > 3 && !stopWords.has(w)).slice(0, 5);
    return keywords.join(', ') || text.substring(0, 50);
  }
}

