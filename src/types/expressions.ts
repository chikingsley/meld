/**
 * Mapping of emotion names to their display colors in the UI.
 * Used primarily by the Expressions.tsx component for visualization.
 */
export const expressionColors = {
    admiration: "#ffc58f",
    adoration: "#ffc6cc",
    aestheticAppreciation: "#e2cbff",
    amusement: "#febf52",
    anger: "#b21816",
    annoyance: "#ffffff",
    anxiety: "#6e42cc",
    awe: "#7dabd3",
    awkwardness: "#d7d99d",
    boredom: "#a4a4a4",
    calmness: "#a9cce1",
    concentration: "#336cff",
    contemplation: "#b0aeef",
    confusion: "#c66a26",
    contempt: "#76842d",
    contentment: "#e5c6b4",
    craving: "#54591c",
    determination: "#ff5c00",
    disappointment: "#006c7c",
    disapproval: "#ffffff",
    disgust: "#1a7a41",
    distress: "#c5f264",
    doubt: "#998644",
    ecstasy: "#ff48a4",
    embarrassment: "#63c653",
    empathicPain: "#ca5555",
    enthusiasm: "#ffffff",
    entrancement: "#7554d6",
    envy: "#1d4921",
    excitement: "#fff974",
    fear: "#d1c9ef",
    gratitude: "#ffffff",
    guilt: "#879aa1",
    horror: "#772e7a",
    interest: "#a9cce1",
    joy: "#ffd600",
    love: "#f44f4c",
    neutral: "#879aa1",
    nostalgia: "#b087a1",
    pain: "#8c1d1d",
    pride: "#9a4cb6",
    realization: "#217aa8",
    relief: "#fe927a",
    romance: "#f0cc86",
    sadness: "#305575",
    sarcasm: "#ffffff",
    satisfaction: "#a6ddaf",
    sexualDesire: "#aa0d59",
    shame: "#8a6262",
    surprise: "#70e63a",
    surpriseNegative: "#70e63a",
    surprisePositive: "#7affff",
    sympathy: "#7f88e0",
    tiredness: "#757575",
    triumph: "#ec8132",
} as const;

/**
 * Mapping of emotion keys to their human-readable labels.
 * This is our primary source of truth for what emotions we support.
 * The type system is built from these keys.
 */
export const expressionLabels: Record<string, string> = {
    admiration: "Admiration",
    adoration: "Adoration",
    aestheticAppreciation: "Aesthetic Appreciation",
    amusement: "Amusement",
    anger: "Anger",
    annoyance: "Annoyance",
    anxiety: "Anxiety",
    awe: "Awe",
    awkwardness: "Awkwardness",
    boredom: "Boredom",
    calmness: "Calmness",
    concentration: "Concentration",
    contemplation: "Contemplation",
    confusion: "Confusion",
    contempt: "Contempt",
    contentment: "Contentment",
    craving: "Craving",
    determination: "Determination",
    disappointment: "Disappointment",
    disapproval: "Disapproval",
    disgust: "Disgust",
    distress: "Distress",
    doubt: "Doubt",
    ecstasy: "Ecstasy",
    embarrassment: "Embarrassment",
    empathicPain: "Empathic Pain",
    enthusiasm: "Enthusiasm",
    entrancement: "Entrancement",
    envy: "Envy",
    excitement: "Excitement",
    fear: "Fear",
    gratitude: "Gratitude",
    guilt: "Guilt",
    horror: "Horror",
    interest: "Interest",
    joy: "Joy",
    love: "Love",
    neutral: "Neutral",
    nostalgia: "Nostalgia",
    pain: "Pain",
    pride: "Pride",
    realization: "Realization",
    relief: "Relief",
    romance: "Romance",
    sadness: "Sadness",
    sarcasm: "Sarcasm",
    satisfaction: "Satisfaction",
    sexualDesire: "Sexual Desire",
    shame: "Shame",
    surprise: "Surprise",
    surpriseNegative: "Surprise (Negative)",
    surprisePositive: "Surprise (Positive)",
    sympathy: "Sympathy",
    tiredness: "Tiredness",
    triumph: "Triumph",
};

/**
 * Type representing all possible emotion/expression names.
 * Generated from the keys of expressionLabels to ensure type safety.
 * Example: "joy" | "anger" | "fear" | etc.
 */
export type Expression = keyof typeof expressionLabels;

/**
 * Type guard to check if a string is a valid expression name.
 * Usage:
 * ```
 * const someString = "joy";
 * if (isExpression(someString)) {
 *   // TypeScript now knows someString is a valid emotion name
 *   const label = expressionLabels[someString]; // ✅ Safe
 * }
 * ```
 */
export const isExpression = (value: string): value is Expression => {
    return value in expressionLabels;
};

/**
 * Type guard specifically for checking if a string is a valid color key.
 * Used primarily in the Expressions.tsx component.
 */
export const isExpressionColor = (
    color: string,
): color is keyof typeof expressionColors => {
    return color in expressionColors;
};

/**
 * Represents the score/intensity of an emotion (0-1).
 * Using a type alias makes the code more semantic and allows
 * for future refinement (e.g., adding validation).
 */
export type ExpressionScore = number;

/**
 * Shape of the prosody data we receive from the API.
 * Each emotion name can have an optional score.
 * Example:
 * ```
 * const prosody: ProsodyData = {
 *   joy: 0.8,
 *   anger: 0.2
 * };
 * ```
 */
export type ProsodyData = {
    [K in Expression]?: ExpressionScore;
}; 