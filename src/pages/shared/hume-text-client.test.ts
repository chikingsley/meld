import { describe, it, expect } from 'vitest';
import { HumeClient } from 'hume';

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

const samples = [
  "I am feeling happy today!",
  "This makes me really sad.",
  "I'm so excited about this!"
];

describe('Hume Text Client', () => {
  it('should analyze text emotions', async () => {
    const client = new HumeClient({
      apiKey: import.meta.env.VITE_HUME_API_KEY
    });

    const socket = await client.expressionMeasurement.stream.connect({
      config: {
        language: {} 
      }
    });

    // Test each sample
    for (const sample of samples) {
      const result = await socket.sendText({ text: sample }) as HumeResponse;
      console.log(`Sample: "${sample}"`, result.language.predictions[0].emotions);
      
      // Verify structure
      expect(result).toHaveProperty('language.predictions[0].emotions');
      expect(Array.isArray(result.language.predictions[0].emotions)).toBe(true);
      
      // Verify emotions have correct shape
      result.language.predictions[0].emotions.forEach(emotion => {
        expect(emotion).toHaveProperty('name');
        expect(emotion).toHaveProperty('score');
        expect(typeof emotion.name).toBe('string');
        expect(typeof emotion.score).toBe('number');
        expect(emotion.score).toBeGreaterThanOrEqual(0);
        expect(emotion.score).toBeLessThanOrEqual(1);
      });
    }
  });
});
