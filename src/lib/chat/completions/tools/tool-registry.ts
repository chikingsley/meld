import { ChatCompletionTool } from 'openai/resources/chat/completions';
import { WeatherTool } from './weather';
import { FakeWeatherTool } from './fake-weather';
import { BaseTool, ToolCall } from './base/BaseTool';

// Add new tool imports here as they are created

class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  private static instance: ToolRegistry;

  private constructor() {
    // Register tools based on environment
    if (process.env.NODE_ENV === 'production') {
      this.register(new WeatherTool());  // Real weather in production
    } else {
      this.register(new FakeWeatherTool());  // Fake weather in development
    }
    // Register new tools here as they are created
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private register(tool: BaseTool) {
    this.tools.set(tool.name, tool);
  }

  getTools(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(tool => tool.getTool());
  }

  async executeTool(toolCall: ToolCall) {
    const tool = this.tools.get(toolCall.function.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.function.name} not found`);
    }
    return tool.execute(toolCall);
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();

// Export for OpenAI chat completion
export const tools = toolRegistry.getTools();
