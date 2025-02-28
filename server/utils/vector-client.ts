import { Vector } from '@upstash/vector';

let vectorClient: Vector | null = null;

export function useVectorClient() {
  if (!vectorClient) {
    // Initialize client if it doesn't exist
    vectorClient = new Vector({
      url: process.env.UPSTASH_VECTOR_REST_URL || '',
      token: process.env.UPSTASH_VECTOR_REST_TOKEN || '',
    });
  }
  
  return vectorClient;
}

/**
 * Store a vector in the Upstash Vector database
 */
export async function storeVector(id: string, vector: number[], metadata: object = {}): Promise<void> {
  try {
    const client = useVectorClient();
    
    await client.upsert({
      id,
      vector,
      metadata
    });
  } catch (error) {
    console.error(`Error storing vector for id ${id}:`, error);
    throw error;
  }
}

/**
 * Query similar vectors from the Upstash Vector database
 */
export async function querySimilarVectors(
  vector: number[],
  options: {
    topK?: number;
    includeMetadata?: boolean;
    includeVectors?: boolean;
  } = {}
) {
  try {
    const client = useVectorClient();
    const { topK = 5, includeMetadata = true, includeVectors = false } = options;
    
    const results = await client.query({
      vector,
      topK,
      includeMetadata,
      includeVectors
    });
    
    return results;
  } catch (error) {
    console.error('Error querying similar vectors:', error);
    throw error;
  }
}

/**
 * Delete a vector from the Upstash Vector database
 */
export async function deleteVector(id: string): Promise<void> {
  try {
    const client = useVectorClient();
    await client.delete({ id });
  } catch (error) {
    console.error(`Error deleting vector for id ${id}:`, error);
    throw error;
  }
} 