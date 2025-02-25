// server/api/chat/emotions/hume-text-client.ts
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

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY
});

export async function analyzeEmotions(text: string) {
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