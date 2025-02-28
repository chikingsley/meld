// Available models and their token limits
export const MODEL_LIMITS = {
  'gpt-4o': 128000,
  'chatgpt-4o-latest': 128000,
  'gpt-4o-mini': 128000,
  'o1': 128000,
  'o1-mini': 128000,
  'o1-preview': 128000,
  'gpt-4o-realtime-preview': 128000,
  'gpt-4o-mini-realtime-preview': 128000,
  'gpt-4o-audio-preview': 128000,
  'google/gemini-flash-1.5-8b': 1000000,
  'google/gemini-flash-1.5': 1000000,
  'deepseek/deepseek-chat': 64000,
  'deepseek/deepseek-r1': 64000,
  'anthropic/claude-3.5-sonnet': 200000,
  'anthropic/claude-3.5-sonnet-20240620': 200000,
  'anthropic/claude-3.5-haiku-20241022': 200000,
  'gryphe/mythomax-l2-13b': 4096,
  'openai/o1': 200000,
  'openai/o1-mini': 128000,
  'openai/gpt-4o': 128000,
  'openai/gpt-4o-mini': 128000,
  'mistral-large-latest': 131000,
  'mistral-large-2411': 131000
} as const;

export type SupportedModel = keyof typeof MODEL_LIMITS;

// Stats interface for token usage tracking
export interface ContextStats {
  totalTokens: number;     // Total tokens used in the conversation
  messageTokens: number;   // Tokens used in the prompt/messages
  maxTokens: number;       // Maximum tokens allowed by the model
  remainingTokens: number; // Available tokens in the context window
  cachedTokens?: number;   // Number of tokens that were cached (if supported)
}

// Message interface matching OpenAI's chat format
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export class ContextTracker {
  private maxTokens: number;
  // Rough estimate of tokens per word - most models use 4-5 tokens per word
  private messageTokenEstimate: number = 4;

  constructor(model: SupportedModel) {
    // Set token limits based on model
    this.maxTokens = this.getModelTokenLimit(model);
  }

  /**
   * Get the maximum token limit for a specific model
   */
  private getModelTokenLimit(model: SupportedModel): number {
    // Log the model name resolution
    // console.log('🤖 Model token limit:', {
    //   model,
    //   tokenLimit: MODEL_LIMITS[model]
    // });
    
    return MODEL_LIMITS[model];
  }

  /**
   * Extract token usage statistics from a completion response
   * Handles cases where usage data might be missing
   */
  async getStats(completionResponse: any): Promise<ContextStats> {
    const usage = completionResponse.usage || {
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0
    };
    
    return {
      totalTokens: usage.total_tokens,
      messageTokens: usage.prompt_tokens,
      maxTokens: this.maxTokens,
      remainingTokens: this.maxTokens - usage.total_tokens,
      cachedTokens: usage.prompt_tokens_details?.cached_tokens
    };
  }

  /**
   * Determine if messages need truncation based on estimated token count
   * Uses a simple word-count based estimation before making the API call
   * 
   * @param messages - Array of conversation messages
   * @returns boolean - True if messages should be truncated
   */
  shouldTruncate(messages: Message[]): boolean {
    // console.log('🔍 Checking if messages need truncation...');
    
    // Estimate tokens by counting words and multiplying by average tokens per word
    const estimatedTokens = messages.reduce((acc, msg) => {
      const wordCount = msg.content.split(/\s+/).length;
      return acc + (wordCount * this.messageTokenEstimate);
    }, 0);

    // Reserve 10% for response buffer instead of 20%
    const bufferTokens = Math.max(Math.floor(this.maxTokens * 0.1), 500);
    const shouldTruncate = estimatedTokens > (this.maxTokens - bufferTokens);
    
    // console.log({
    //   estimatedTokens,
    //   maxTokens: this.maxTokens,
    //   bufferTokens,
    //   remainingTokens: this.maxTokens - estimatedTokens,
    //   shouldTruncate
    // });

    return shouldTruncate;
  }

  /**
   * Truncate message history while preserving important context
   * Keeps system messages and the most recent conversation turns
   * 
   * @param messages - Array of conversation messages
   * @returns Message[] - Truncated message array
   */
  truncateMessages(messages: Message[]): Message[] {
    console.log('✂️ Truncating messages...');
    console.log('📥 Original message count:', messages.length);
    
    // Always keep system messages as they define core behavior
    const systemMessages = messages.filter(m => m.role === 'system');
    console.log('💾 System messages kept:', systemMessages.length);
    
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    console.log('💬 Non-system messages:', nonSystemMessages.length);
    
    // Keep more context - last 8 messages or 75% of messages, whichever is larger
    const messagesToKeep = Math.max(8, Math.floor(nonSystemMessages.length * 0.75));
    const recentMessages = nonSystemMessages.slice(-messagesToKeep);
    console.log('🔄 Recent messages kept:', recentMessages.length);
    
    // Combine system messages with recent messages
    const truncatedMessages = [...systemMessages, ...recentMessages];
    console.log('📤 Final message count:', truncatedMessages.length);
    
    return truncatedMessages;
  }
}
