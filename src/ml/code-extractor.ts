/**
 * Code reference extraction from conversations
 * Phase 2: ML Intelligence Layer
 */

import type { ConversationMessage } from '../core/types/conversation.js';
import type { CodeRef } from '../core/types/ml.js';

/**
 * Code extractor - extracts code blocks and file references from conversation
 */
export class CodeExtractor {
  /**
   * Extract code references from conversation
   */
  async extract(messages: ConversationMessage[]): Promise<CodeRef[]> {
    const codeRefs: CodeRef[] = [];

    for (const message of messages) {
      // Extract code blocks
      const blocks = this.extractCodeBlocks(message.content);

      blocks.forEach(block => {
        const ref: CodeRef = {
          filePath: this.inferFilePath(message, block) || 'unknown',
          snippet: block.code,
          context: this.extractContext(message, block),
        };
        if (block.language) {
          ref.language = block.language;
        }
        codeRefs.push(ref);
      });

      // Extract file mentions
      const fileMentions = this.extractFileMentions(message.content);
      for (const file of fileMentions) {
        if (!codeRefs.some(ref => ref.filePath === file)) {
          codeRefs.push({
            filePath: file,
            snippet: '',
            context: this.extractFileContext(message, file),
          });
        }
      }
    }

    return this.deduplicateRefs(codeRefs);
  }

  private extractCodeBlocks(content: string): Array<{ language?: string; code: string }> {
    const blocks: Array<{ language?: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const block: { language?: string; code: string } = {
        code: match[2] || '',
      };
      if (match[1]) {
        block.language = match[1];
      }
      blocks.push(block);
    }

    return blocks;
  }

  private inferFilePath(message: ConversationMessage, block: { language?: string; code: string }): string | null {
    // Look for file path mentions near the code block
    const patterns = [
      /(?:in|from|file|at)\s+([^\s]+\.\w+)/gi,
      /([a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+)/g,
    ];

    for (const pattern of patterns) {
      const match = message.content.match(pattern);
      if (match) {
        return match[0].replace(/^(in|from|file|at)\s+/i, '');
      }
    }

    return null;
  }

  private extractContext(message: ConversationMessage, block: { code: string }): string {
    if (!block.code) return '';
    const blockIndex = message.content.indexOf(block.code);
    if (blockIndex === -1) return '';

    const before = message.content.substring(Math.max(0, blockIndex - 100), blockIndex);
    const after = message.content.substring(
      blockIndex + block.code.length,
      Math.min(message.content.length, blockIndex + block.code.length + 100)
    );

    return (before + ' [...] ' + after).trim();
  }

  private extractFileMentions(content: string): string[] {
    const mentions: string[] = [];
    const patterns = [
      /\b([a-zA-Z0-9_\-\/]+\.(ts|js|py|java|cpp|c|go|rs|tsx|jsx|md|json|yaml|yml))\b/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          mentions.push(match[1]);
        }
      }
    }

    return [...new Set(mentions)];
  }

  private extractFileContext(message: ConversationMessage, filePath: string): string {
    const index = message.content.indexOf(filePath);
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(message.content.length, index + filePath.length + 50);

    return message.content.substring(start, end).trim();
  }

  private deduplicateRefs(refs: CodeRef[]): CodeRef[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = `${ref.filePath}:${ref.snippet.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

