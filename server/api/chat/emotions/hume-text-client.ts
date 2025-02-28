import { HumeClient } from "hume";

interface HumeEmotion {
  name: string;
  score: number;
}

interface HumeResponse {
  language: {
    predictions: Array<{
      emotions: HumeEmotion[];
    }>;
  };
}

const MAX_CHUNK_SIZE = 9000;

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY
});

/**
 * Splits unstructured text into as few large chunks as possible.
 * It attempts to break near the 10,000 character mark on whitespace to avoid splitting words.
 */
function chunkText(text: string, maxLength = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end >= text.length) {
      chunks.push(text.substring(start));
      break;
    }
    // Try to find the last whitespace before the limit
    let breakPoint = text.lastIndexOf(" ", end);
    // If the breakPoint is too far from the max length, force a hard cut.
    if (breakPoint < start + maxLength * 0.8) {
      breakPoint = end;
    }
    chunks.push(text.substring(start, breakPoint));
    start = breakPoint;
  }
  return chunks;
}

/**
 * Processes a single text chunk using the Hume API.
 */
async function analyzeEmotionsChunk(text: string): Promise<Record<string, number>> {
  try {
    const socket = await client.expressionMeasurement.stream.connect({
      config: {
        language: {}
      }
    });
    const result = await socket.sendText({ text }) as HumeResponse;
    const emotions = result?.language?.predictions?.[0]?.emotions || [];
    return emotions.reduce((acc, emotion) => {
      acc[emotion.name.toLowerCase()] = emotion.score;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error('Error analyzing emotions:', error);
    return {};
  }
}

/**
 * Main exported method.
 * If the text is within the API limit, it is processed directly.
 * Otherwise, it is split into chunks (using whitespace-aware cuts), processed concurrently,
 * and the resulting emotion scores are aggregated using weighted averages.
 */
export async function analyzeEmotions(text: string): Promise<Record<string, number>> {
  if (text.length <= MAX_CHUNK_SIZE) {
    return await analyzeEmotionsChunk(text);
  }
  
  const chunks = chunkText(text);
  // Process all chunks concurrently.
  const results = await Promise.all(chunks.map(chunk => analyzeEmotionsChunk(chunk)));
  
  // Aggregate results weighted by each chunk's length.
  const combined: Record<string, { totalScore: number; totalLength: number }> = {};
  chunks.forEach((chunk, index) => {
    const weight = chunk.length;
    const emotions = results[index];
    for (const [emotion, score] of Object.entries(emotions)) {
      if (!combined[emotion]) {
        combined[emotion] = { totalScore: 0, totalLength: 0 };
      }
      combined[emotion].totalScore += score * weight;
      combined[emotion].totalLength += weight;
    }
  });
  
  return Object.fromEntries(
    Object.entries(combined).map(([emotion, { totalScore, totalLength }]) => [
      emotion,
      totalScore / totalLength
    ])
  );
}

/**
 * POST endpoint remains unchanged. It extracts the text from the request and calls analyzeEmotions.
 */
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) {
      return new Response('Missing text parameter', { status: 400 });
    }
    const emotions = await analyzeEmotions(text);
    return Response.json(emotions);
  } catch (error) {
    console.error('Error analyzing emotions:', error);
    return new Response('Internal server error', { status: 500 });
  }
}