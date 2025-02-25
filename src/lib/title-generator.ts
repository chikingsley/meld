import { StoredMessage } from '@/db/session-store';

// Configuration for title generation
const TITLE_MAX_LENGTH = 60;
const MIN_MESSAGES_FOR_LLM = 2; // Use simpler method for 0-1 messages

// Interface for title generation response
export interface TitleGenerationResponse {
  title: string;
  isVoiceSession: boolean;
}

/**
 * Generates a title for a session based on message content
 * Uses LLM for more complex conversations or simple extraction for brief exchanges
 */
export async function generateSessionTitle(
  messages: StoredMessage[], 
  isVoiceMode: boolean
): Promise<TitleGenerationResponse> {
  // Handle empty message case
  if (!messages || messages.length === 0) {
    return {
      title: isVoiceMode ? "New Voice Chat" : "New Chat",
      isVoiceSession: isVoiceMode
    };
  }

  try {
    // For simple cases with few messages, use heuristic approach instead of LLM
    if (messages.length < MIN_MESSAGES_FOR_LLM) {
      return generateSimpleTitle(messages, isVoiceMode);
    }
    
    // For more complex conversations, use the LLM
    return await generateLLMTitle(messages, isVoiceMode);
  } catch (error) {
    console.error('Title generation error:', error);
    // Fallback title
    return {
      title: isVoiceMode ? "Voice Conversation" : "Chat Conversation",
      isVoiceSession: isVoiceMode
    };
  }
}

/**
 * Generate a simple title based on the first few words of the first message
 */
function generateSimpleTitle(
  messages: StoredMessage[], 
  isVoiceMode: boolean
): TitleGenerationResponse {
  const firstMessage = messages[0].message.content.trim();
  let title = "";
  
  // Try to extract first sentence if it's not too long
  const firstSentenceMatch = firstMessage.match(/^.+?[.!?]/);
  if (firstSentenceMatch && firstSentenceMatch[0].length <= TITLE_MAX_LENGTH) {
    title = firstSentenceMatch[0];
  } else {
    // Otherwise take first few words
    const words = firstMessage.split(' ');
    const titleWords = words.slice(0, Math.min(7, words.length));
    title = titleWords.join(' ');
    
    // Add ellipsis if truncated
    if (titleWords.length < words.length) {
      title += "...";
    }
  }
  
  // Enforce max length
  if (title.length > TITLE_MAX_LENGTH) {
    title = title.substring(0, TITLE_MAX_LENGTH - 3) + "...";
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Check for voice-related content
  const containsVoiceTerms = firstMessage.toLowerCase().includes('voice') || 
                             firstMessage.toLowerCase().includes('speak') || 
                             firstMessage.toLowerCase().includes('talk');
  
  return {
    title: title || "Chat Conversation",
    isVoiceSession: isVoiceMode || containsVoiceTerms
  };
}

/**
 * Generate a title using a language model by analyzing message content
 */
async function generateLLMTitle(
  messages: StoredMessage[], 
  isVoiceMode: boolean
): Promise<TitleGenerationResponse> {
  // Extract content from messages (limit to first 5 for efficiency)
  const messageContents = messages
    .slice(0, 5)
    .map(m => `${m.message.role}: ${m.message.content}`)
    .join('\n\n');
  
  // Call the LLM API
  try {
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messageContents,
        isVoiceMode
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Title generation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Format the response
    return {
      title: data.title.slice(0, TITLE_MAX_LENGTH),
      isVoiceSession: data.isVoiceSession || isVoiceMode
    };
  } catch (error) {
    console.error('LLM title generation failed:', error);
    
    // Fallback to simple title generation
    return generateSimpleTitle(messages, isVoiceMode);
  }
}