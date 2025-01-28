import { ContextTracker } from "./tracker";
import { ToolCall, ToolCallResult } from './types';
import { handleWeather } from './weather';
import { handleUserProfile } from './userProfile';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

const contextManagerTool = {
  type: "function",
  function: {
    name: "manage_context",
    description: "Manage the conversation context when it becomes too long or complex. Use this to maintain relevant context while staying within token limits.",
    parameters: {
      type: "object",
      properties: {
        strategy: {
          type: "string",
          enum: ["truncate", "summarize"],
          description: "The strategy to use for context management. 'truncate' removes older messages while keeping system and recent messages. 'summarize' creates a summary of older context."
        },
        reason: {
          type: "string",
          description: "Explanation of why context management is needed at this point"
        }
      },
      required: ["strategy", "reason"]
    }
  }
} as const;

class ToolRegistry {
  private testProfilePath?: string;
  private contextTracker: ContextTracker | null = null;
  private messages: any[] = [];

  setTestProfilePath(path: string) {
    this.testProfilePath = path;
  }

  setContextTracker(tracker: ContextTracker) {
    this.contextTracker = tracker;
  }

  setMessages(messages: any[]) {
    this.messages = messages;
  }

  async handleToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const call of toolCalls) {
      if (call.function.name === 'manage_context') {
        if (!this.contextTracker) {
          throw new Error('Context tracker not initialized');
        }

        const args = JSON.parse(call.function.arguments);
        console.log('📝 Context management requested:', args);

        let managedMessages;
        if (args.strategy === "truncate") {
          managedMessages = this.contextTracker.truncateMessages(this.messages);
        } else if (args.strategy === "summarize") {
          // For now, fall back to truncation
          // TODO: Implement summarization strategy
          managedMessages = this.contextTracker.truncateMessages(this.messages);
        }

        this.messages = managedMessages || this.messages;
        
        results.push({
          tool_call_id: call.id,
          output: JSON.stringify({
            success: true,
            strategy: args.strategy,
            messageCount: this.messages.length
          })
        });
      } else {
        switch (call.function.name) {
          case 'get_current_weather':
            results.push(await handleWeather(call));
            break;
          case 'update_user_profile':
            results.push(await handleUserProfile(call, this.testProfilePath));
            break;
          default:
            throw new Error(`Unknown tool: ${call.function.name}`);
        }
      }
    }

    return results;
  }

  getToolDefinitions(): ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA',
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'The unit for the temperature',
              },
            },
            required: ['location'],
          },
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_user_profile',
          description: 'Update user profile information',
          parameters: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The profile field to update',
              },
              value: {
                type: 'string',
                description: 'The value to set',
              },
              confidence: {
                type: 'number',
                description: 'Confidence in the value (0-1)',
              },
              context: {
                type: 'string',
                description: 'Context about where this information came from',
              },
            },
            required: ['key', 'value'],
          },
        }
      },
      contextManagerTool
    ];
  }

  getMessages() {
    return this.messages;
  }
}

export const toolRegistry = new ToolRegistry(); 