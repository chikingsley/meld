export const runtime = 'edge'

if (!process.env.JINA_API_KEY) {
  throw new Error('JINA_API_KEY environment variable is required');
}

const JINA_API_KEY = process.env.JINA_API_KEY;

type JinaTask = 'text-matching' | 'separation' | 'classification' | 'retrieval.query' | 'retrieval.passage';

interface EmbeddingOptions {
  task?: JinaTask;
}

async function processBatch(batch: string[], task: JinaTask): Promise<number[][]> {
  try {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JINA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        task: task || 'retrieval.passage',
        late_chunking: true,
        dimensions: 1024,
        embedding_type: 'float',
        input: batch
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jina API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Jina API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    if (!result.data?.length) {
      console.error('No embeddings in response:', result);
      throw new Error('No embeddings returned from API');
    }

    const embeddings = result.data.map((item: any) => item.embedding);
    if (embeddings.some((e: number[]) => !e || !e.length)) {
      console.error('Invalid embeddings in response:', embeddings);
      throw new Error('Invalid embeddings returned from API');
    }

    return embeddings;
  } catch (error) {
    console.error('Error in processBatch:', error);
    throw error;
  }
}

export async function generateEmbeddings(inputs: string[], options?: EmbeddingOptions): Promise<number[][]> {
  try {
    const validInputs = inputs.filter(input => input && input.trim());
    if (!validInputs.length) {
      console.error('No valid inputs provided for embedding generation');
      throw new Error('No valid inputs provided for embedding generation');
    }

    const BATCH_SIZE = 10;
    const task = options?.task || 'retrieval.passage';
    const batches: string[][] = [];
    
    for (let i = 0; i < validInputs.length; i += BATCH_SIZE) {
      batches.push(validInputs.slice(i, i + BATCH_SIZE));
    }

    const results: number[][] = [];
    for (const batch of batches) {
      const batchResults = await processBatch(batch, task);
      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    console.error('Error in generateEmbeddings:', error);
    throw error;
  }
}
