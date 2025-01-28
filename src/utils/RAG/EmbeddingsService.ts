export const runtime = 'edge'

import { generateEmbeddings } from './embeddings';
import { rerank } from './reranker';
import { getDB } from '@/lib/db';

interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata: Record<string, any>;
  embedding: number[];
  hume_config_id?: string;
}

interface MessageWithSimilarity extends Message {
  similarity: number;
}

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

    const db = await getDB();
    
    // First verify the session belongs to the user
    const sessionCheck = await db.query(
      `SELECT id FROM sessions 
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (!sessionCheck.rows?.length) {
      throw new Error('Invalid session ID or user ID');
    }
    
    // Insert message with embedding
    const result = await db.query<Message>(
      `INSERT INTO messages (
        session_id,
        role,
        content,
        metadata,
        embedding,
        hume_config_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        sessionId,
        role,
        content,
        JSON.stringify(metadata),
        embedding,
        metadata.humeConfigId || null
      ]
    );

    if (!result.rows?.[0]) {
      throw new Error('Failed to store message and vector');
    }

    return result.rows[0];
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
    
    const db = await getDB();

    // First verify the session belongs to the user
    const sessionCheck = await db.query(
      `SELECT id FROM sessions 
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (!sessionCheck.rows?.length) {
      throw new Error('Invalid session ID or user ID');
    }
    
    // Query using vector similarity with inner product (IP) distance
    const result = await db.query<MessageWithSimilarity>(
      `SELECT m.*,
        1 - (m.embedding <=> $1) as similarity
       FROM messages m
       INNER JOIN sessions s ON m.session_id = s.id
       WHERE s.id = $2 
         AND s.user_id = $3
         AND 1 - (m.embedding <=> $1) > $4
       ORDER BY similarity DESC
       LIMIT $5`,
      [
        embedding,
        sessionId,
        userId,
        SCORING_CONFIG.similarityThreshold,
        candidateLimit
      ]
    );

    if (!result.rows?.length) return [];

    const candidates = result.rows.map((msg) => ({
      message: msg,
      similarity: msg.similarity
    }));

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
    
    for (const message of testMessages) {
      const start = performance.now();
      
      // Test store
      const storeStart = performance.now();
      await this.storeMessageAndVector(message, userId, sessionId, 'user', {});
      const storeLatency = performance.now() - storeStart;
      
      // Test retrieve
      const retrieveStart = performance.now();
      await this.getRelevantContext(message, userId, sessionId);
      const retrieveLatency = performance.now() - retrieveStart;
      
      results.push({
        messageLength: message.length,
        storeLatency,
        retrieveLatency,
        totalLatency: performance.now() - start
      });
    }
    
    return results;
  }
}

export const embeddingsService = EmbeddingsService.getInstance();

// Hook for React components
export function useEmbeddingsService() {
  return embeddingsService;
}
