import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import fs from 'fs/promises';
import path from 'path';

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

// Export the weather tool definition
export const weatherTool: ChatCompletionTool = {
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

// Export the user profile tool definition
export const userProfileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "update_user_profile",
    description: "ALWAYS use this tool to store information when users share ANY of the following:\n- Personal details (name, age, location, job)\n- Interests and hobbies\n- Preferences (favorite things, likes/dislikes)\n- Skills and expertise\n- Background information\n- Personality traits\nStore each piece of information separately with appropriate keys.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "The attribute name (e.g., 'name', 'age', 'occupation', 'location', 'interests', 'favorite_genre', etc.). Use snake_case for compound names.",
        },
        value: {
          type: "string",
          description: "The value for this attribute",
        },
        confidence: {
          type: "number",
          description: "How confident you are about this information (0-1)",
        },
        context: {
          type: "string",
          description: "Optional context about where this information came from (e.g., 'User directly stated', 'Inferred from conversation')",
        }
      },
      required: ["key", "value"],
    },
  },
};

// User profile tool implementation
export async function handleUserProfile(toolCall: ToolCall, testFilePath?: string): Promise<ToolCallResult> {
  try {
    const args = JSON.parse(toolCall.function.arguments) as UserProfileArgs;
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Path to user profile JSON
    const profilePath = testFilePath || path.join(dataDir, 'user_profile.json');
    
    // Read existing profile or create new one
    let profile: UserProfileData = {};
    try {
      const data = await fs.readFile(profilePath, 'utf-8');
      profile = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, use empty profile
    }
    
    // Update profile with new information
    profile[args.key] = args.value;
    
    // Save updated profile
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
    
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ success: true, key: args.key, value: args.value })
    };
  } catch (error) {
    console.error('User profile tool error:', error);
    throw error;
  }
}

export const tools: ChatCompletionTool[] = [weatherTool, userProfileTool]; 