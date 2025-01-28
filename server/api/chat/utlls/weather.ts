import { ToolCall, ToolCallResult, ToolDefinition } from './types';

// Export the weather tool definition
export const weatherTool: ToolDefinition = {
  type: "function",
  function: {
    name: "get_current_weather",
    description: "Get the current weather in a given location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "The unit of temperature to return",
        },
      },
      required: ["location"],
    },
  },
};

// Weather tool implementation
export async function handleWeather(toolCall: ToolCall): Promise<ToolCallResult> {
  try {
    // Safely extract arguments using regex
    const argStr = toolCall.function.arguments;
    const locationMatch = argStr.match(/location["']?\s*:\s*["']([^"']+)["']/);
    const unitMatch = argStr.match(/unit["']?\s*:\s*["']([^"']+)["']/);
    
    if (!locationMatch) {
      throw new Error('No location found in arguments: ' + argStr);
    }

    const location = locationMatch[1].toLowerCase();
    const unit = unitMatch ? unitMatch[1] as 'celsius' | 'fahrenheit' : 'celsius';
    
    let result;
    if (location.includes("tokyo")) {
      result = { location, temperature: "10", unit };
    } else if (location.includes("san francisco")) {
      result = { location, temperature: "72", unit };
    } else {
      result = { location, temperature: "22", unit };
    }
    
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Weather tool error:', error);
    throw error;
  }
} 