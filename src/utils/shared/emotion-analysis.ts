// src/utils/shared/emotion-analysis.ts

export interface EmotionScores {
  [key: string]: number;
}

export const emotions = [
  'Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger',
  'Annoyance', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness',
  'Concentration', 'Confusion', 'Contemplation', 'Contempt', 'Contentment',
  'Craving', 'Desire', 'Determination', 'Disappointment', 'Disapproval',
  'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain',
  'Enthusiasm', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Gratitude',
  'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride',
  'Realization', 'Relief', 'Romance', 'Sadness', 'Sarcasm', 'Satisfaction',
  'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness',
  'Triumph'
];

// Simple keyword-based emotion analysis
const emotionKeywords: Record<string, string[]> = {
  'Joy': ['happy', 'joy', 'delighted', 'wonderful', 'great'],
  'Sadness': ['sad', 'unhappy', 'depressed', 'miserable'],
  'Anger': ['angry', 'mad', 'furious', 'annoyed'],
  'Fear': ['afraid', 'scared', 'terrified', 'worried'],
  'Surprise (positive)': ['wow', 'amazing', 'incredible', 'awesome'],
  'Surprise (negative)': ['shocking', 'terrible', 'awful'],
  'Love': ['love', 'adore', 'cherish', 'heart'],
  'Gratitude': ['thank', 'grateful', 'appreciate'],
  'Interest': ['interesting', 'curious', 'fascinated'],
  'Enthusiasm': ['excited', 'enthusiastic', 'eager'],
  // Add more emotions and their keywords
};

export function analyzeEmotions(text: string): EmotionScores {
  const scores: EmotionScores = {};
  const lowercaseText = text.toLowerCase();
  
  // Initialize all emotions with a base score
  emotions.forEach(emotion => {
    scores[emotion] = 0.1; // Base score
  });

  // Analyze text for each emotion's keywords
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    keywords.forEach(keyword => {
      if (lowercaseText.includes(keyword)) {
        scores[emotion] = (scores[emotion] || 0) + 0.3;
      }
    });
  });

  // Normalize scores
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore > 0) {
    Object.keys(scores).forEach(emotion => {
      scores[emotion] = scores[emotion] / maxScore;
    });
  }

  return scores;
}

export function getTopEmotions(scores: EmotionScores, count: number = 3): [string, number][] {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count);
}
