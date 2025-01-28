import { ToolCall, ToolCallResult, ToolDefinition, UserProfileArgs } from './types';
import fs from 'fs/promises';
import path from 'path';

// Export the user profile tool definition
export const userProfileTool: ToolDefinition = {
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
    let profile: Record<string, any> = {};
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