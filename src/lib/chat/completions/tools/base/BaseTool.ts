import { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface ToolCallResult {
  tool_call_id: string;
  output: string;
}

export interface ToolCall {
  id: string;
  index: number;
  function: {
    name: string;
    arguments: string;
  };
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, any>;

  abstract execute(toolCall: ToolCall): Promise<ToolCallResult>;

  getTool(): ChatCompletionTool {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: "object",
          properties: this.parameters,
          required: Object.keys(this.parameters).filter(key => 
            !this.parameters[key].optional
          ),
        },
      },
    };
  }

  protected validateArgs(args: any): boolean {
    // Basic validation - can be extended in specific tools
    return true;
  }

  protected handleError(error: Error): ToolCallResult {
    console.error(`Tool error (${this.name}):`, error);
    return {
      tool_call_id: '',
      output: JSON.stringify({ error: error.message })
    };
  }
}
