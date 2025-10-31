/**
 * Hybrid search engine for contexts (keyword + semantic)
 * Phase 2: ML Intelligence Layer
 */

import type { Context, SearchFilters } from './types/context.js';
import type { IContextStorage } from './interfaces/context-storage.js';
import { EmbeddingModel } from '../ml/embedder.js';

/**
 * Simple in-memory vector store for semantic search
 * Phase 2: Basic implementation
 * Future: Replace with ChromaDB or similar
 */
class SimpleVectorStore {
  private vectors: Map<string, number[]> = new Map();

  index(id: string, embedding: number[]): void {
    this.vectors.set(id, embedding);
  }

  search(queryEmbedding: number[], limit: number = 5): Array<{ id: string; score: number }> {
    const results: Array<{ id: string; score: number }> = [];

    for (const [id, embedding] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({ id, score });
    }

    // Sort by score descending and return top results
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  delete(id: string): void {
    this.vectors.delete(id);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

export class SearchEngine {
  private store: IContextStorage;
  private vectorStore: SimpleVectorStore;
  private embedder: EmbeddingModel;

  constructor(store: IContextStorage) {
    this.store = store;
    this.vectorStore = new SimpleVectorStore();
    this.embedder = new EmbeddingModel();
  }

  /**
   * Index a context for semantic search
   */
  async indexContext(context: Context): Promise<void> {
    if (context.ml?.embedding) {
      this.vectorStore.index(context.id, context.ml.embedding);
    } else {
      // Generate embedding for contexts without ML artifacts
      const embedding = await this.embedder.embed(context.content);
      this.vectorStore.index(context.id, embedding);
    }
  }

  /**
   * Hybrid search (keyword + semantic)
   */
  async search(query: string, filters?: SearchFilters): Promise<Context[]> {
    // Perform both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.store.search(query, filters),
      this.semanticSearch(query, filters),
    ]);

    // Merge results
    return this.mergeResults(keywordResults, semanticResults);
  }

  /**
   * Semantic search
   */
  private async semanticSearch(query: string, filters?: SearchFilters): Promise<Context[]> {
    // Generate query embedding
    const queryEmbedding = await this.embedder.embed(query);

    // Search vector store
    const vectorResults = await this.vectorStore.search(queryEmbedding, 10);

    // Load full contexts
    const contexts = await Promise.all(
      vectorResults.map(r => this.store.getById(r.id))
    );

    // Filter out nulls and apply filters
    const valid = contexts.filter((ctx): ctx is Context => {
      if (!ctx) return false;
      if (filters?.source && filters.source !== 'all' && ctx.source !== filters.source) {
        return false;
      }
      if (filters?.type && filters.type !== 'all' && ctx.type !== filters.type) {
        return false;
      }
      return true;
    });

    return valid;
  }

  /**
   * Merge keyword and semantic results
   */
  private mergeResults(keyword: Context[], semantic: Context[]): Context[] {
    const merged = new Map<string, Context>();

    // Add keyword results first (higher priority)
    keyword.forEach(ctx => merged.set(ctx.id, ctx));

    // Add semantic results (avoid duplicates)
    semantic.forEach(ctx => {
      if (!merged.has(ctx.id)) {
        merged.set(ctx.id, ctx);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Remove context from search index
   */
  async removeFromIndex(contextId: string): Promise<void> {
    this.vectorStore.delete(contextId);
  }
}

