import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// Tool call interfaces
export interface ToolCall {
  id: string;
  index: number;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  output: string;
}

// Weather specific interfaces
export interface WeatherArgs {
  location: string;
  unit?: 'celsius' | 'fahrenheit';
}

// User profile interfaces
export interface UserProfileData {
  [key: string]: string | number | boolean | null;
}

export interface UserProfileArgs {
  key: string;
  value: string | number | boolean | null;
  confidence?: number;  // How confident the LLM is about this information (0-1)
  context?: string;     // Optional context about where this info came from
}

// Tool definition type
export type ToolDefinition = ChatCompletionTool; 