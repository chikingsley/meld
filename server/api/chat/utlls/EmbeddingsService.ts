export const runtime = 'edge'

import { generateEmbeddings } from './embeddings';
import { rerank } from './reranker';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../prisma/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageWithSimilarity = Message & { similarity: number };

interface RankedResult {
  message: Message;
  similarity: number;
  rerankedScore?: number;
  finalScore?: number;
}

// Scoring configuration based on test results
const SCORING_CONFIG = {
  vectorWeight: 0.8,
  rerankerWeight: 0.2,
  similarityThreshold: 0.3,  // Lower threshold for candidate selection
  maxCandidates: 20,        // Get more candidates for reranking
  minSimilarityForRerank: 0.4  // Only rerank if vector similarity is good enough
};

// Initialize edge-compatible Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
    global: { 
      headers: { 'x-my-custom-header': 'mindpattern-edge' },
      fetch: fetch
    }
  }
);

export class EmbeddingsService {
  private static instance: EmbeddingsService;

  private constructor() {}

  public static getInstance(): EmbeddingsService {
    if (!this.instance) {
      this.instance = new EmbeddingsService();
    }
    return this.instance;
  }

  /**
   * Generate embeddings for one or more inputs
   * Centralizes embedding generation with consistent configuration
   */
  async generateEmbeddings(inputs: string[]): Promise<number[][]> {
    return generateEmbeddings(inputs, { task: 'retrieval.passage' });
  }

  /**
   * Generate embedding for a single input
   */
  async generateEmbedding(input: string): Promise<number[]> {
    try {
      if (!input || !input.trim()) {
        throw new Error('Empty or invalid input for embedding generation');
      }
      const embeddings = await this.generateEmbeddings([input]);
      if (!embeddings || !embeddings[0]) {
        throw new Error('Failed to generate embedding');
      }
      return embeddings[0];
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Store a message with its embedding vector atomically.
   * This ensures every message has its corresponding vector and maintains referential integrity.
   */
  async storeMessageAndVector(
    content: string,
    userId: string,
    sessionId: string,
    role: 'user' | 'assistant',
    metadata: Record<string, any> = {}
  ): Promise<Message> {
    const embedding = await this.generateEmbedding(content);
    
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1024) {
      console.error('Invalid embedding generated:', { embedding });
      throw new Error('Failed to generate valid embedding');
    }

    // Validate all values are numbers and not null
    if (embedding.some(val => typeof val !== 'number' || val === null)) {
      console.error('Invalid values in embedding:', { embedding });
      throw new Error('Embedding contains invalid values');
    }
    
    // Use a transaction to ensure atomic operations
    const { data, error } = await supabase.rpc('store_message_with_vector', {
      p_content: content,
      p_role: role,
      p_metadata: metadata,
      p_session_id: sessionId,
      p_embedding: embedding
    });

    if (error) {
      console.error('Error storing message with vector:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get relevant context based on content similarity
   */
  async getRelevantContext(
    content: string,
    userId: string,
    sessionId: string,
    limit = 5,
    useReranker = false
  ): Promise<RankedResult[]> {
    const embedding = await this.generateEmbedding(content);
    const candidateLimit = useReranker ? SCORING_CONFIG.maxCandidates : limit;
    
    const { data: messages, error } = await supabase
      .rpc('match_messages', {
        query_embedding: embedding,
        similarity_threshold: SCORING_CONFIG.similarityThreshold,
        match_count: candidateLimit,
        session_uuid: sessionId
      });

    if (error) throw error;

    const candidates = messages.map((msg: MessageWithSimilarity) => ({
      message: msg,
      similarity: msg.similarity
    }));

    if (!candidates.length) return [];

    const bestSimilarity = Math.max(...candidates.map((c: RankedResult) => c.similarity));
    const shouldRerank = useReranker && bestSimilarity >= SCORING_CONFIG.minSimilarityForRerank;

    if (!shouldRerank) {
      return candidates
        .sort((a: RankedResult, b: RankedResult) => b.similarity - a.similarity)
        .slice(0, limit);
    }

    try {
      const { scores } = await rerank(
        content,
        candidates.map((c: RankedResult) => c.message.content),
        { limit }
      );

      return candidates
        .map((result: RankedResult, i: number) => ({
          ...result,
          rerankedScore: scores[i],
          finalScore: SCORING_CONFIG.vectorWeight * result.similarity + 
                     SCORING_CONFIG.rerankerWeight * scores[i]
        }))
        .sort((a: RankedResult, b: RankedResult) => (b.finalScore! - a.finalScore!))
        .slice(0, limit);
    } catch {
      return candidates
        .sort((a: RankedResult, b: RankedResult) => b.similarity - a.similarity)
        .slice(0, limit);
    }
  }

  /**
   * Run latency tests for different message lengths
   */
  async runLatencyTest(
    userId: string,
    sessionId: string
  ): Promise<{
    messageLength: number;
    storeLatency: number;
    retrieveLatency: number;
    totalLatency: number;
  }[]> {
    const testMessages = [
      "Quick test message",
      "Medium length message about feeling anxious today",
      "Longer message discussing multiple topics and emotions in detail, including past experiences and current feelings"
    ];
    
    const results = [];
    
    for (const msg of testMessages) {
      const start = performance.now();
      
      // Test storage
      await this.storeMessageAndVector(msg, userId, sessionId, 'user');
      const storeLatency = performance.now() - start;
      
      // Test retrieval
      const retrieveStart = performance.now();
      await this.getRelevantContext(msg, userId, sessionId);
      const retrieveLatency = performance.now() - retrieveStart;
      
      results.push({
        messageLength: msg.length,
        storeLatency,
        retrieveLatency,
        totalLatency: storeLatency + retrieveLatency
      });
    }
    
    return results;
  }
}

export const embeddingsService = EmbeddingsService.getInstance();

// Hook for React components
export function useEmbeddingsService() {
  return {
    storeMessageAndVector: embeddingsService.storeMessageAndVector.bind(embeddingsService),
    getRelevantContext: embeddingsService.getRelevantContext.bind(embeddingsService),
    runLatencyTest: embeddingsService.runLatencyTest.bind(embeddingsService),
    generateEmbeddings: embeddingsService.generateEmbeddings.bind(embeddingsService)
  };
}
