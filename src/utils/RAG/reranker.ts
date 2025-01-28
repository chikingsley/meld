export const runtime = 'edge'

if (!process.env.JINA_API_KEY) {
  throw new Error('JINA_API_KEY environment variable is required');
}

const JINA_API_KEY = process.env.JINA_API_KEY;

// Constants for reranking
const RERANK_MODEL = 'jina-reranker-v2-base-multilingual';
const DEFAULT_CANDIDATES = 20;  // Get more candidates for better coverage
const DEFAULT_FINAL_RESULTS = 5;  // Return top 5 after reranking

interface RerankerOptions {
  model?: string;
  limit?: number;
}

interface RerankerResponse {
  scores: number[];
}

interface JinaRerankerResult {
  index: number;
  relevance_score: number;
}

export async function rerank(
  query: string,
  documents: string[],
  options: RerankerOptions = {}
): Promise<RerankerResponse> {
  if (!documents.length) {
    return { scores: [] };
  }

  const top_n = Math.min(Math.max(1, options.limit || documents.length), documents.length);
  const model = options.model || RERANK_MODEL;

  console.log('Reranking request:', {
    model,
    query,
    documents,
    top_n
  });

  const response = await fetch('https://api.jina.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`
    },
    body: JSON.stringify({
      model,
      query,
      documents,
      top_n
    })
  });

  if (!response.ok) {
    throw new Error(`Reranker API error: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Reranker response:', result);

  if (!result.results?.length) {
    throw new Error('No scores returned from reranker API');
  }

  // Map the results to scores, preserving the original order
  const scoreMap = new Map<number, number>(
    result.results.map((item: JinaRerankerResult) => [item.index, item.relevance_score])
  );

  return {
    scores: documents.map((_, index) => scoreMap.get(index) || 0)
  };
}
