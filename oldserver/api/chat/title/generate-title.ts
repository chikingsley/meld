import OpenAI from 'openai';

interface TitleRequest {
  messages: string;
  isVoiceMode: boolean;
}

interface TitleResponse {
  title: string;
  isVoiceSession: boolean;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Generate a concise, meaningful title (5-7 words max) that captures the main topic or intent of this conversation.
Return ONLY the title with no quotes, prefixes, or explanations.`;

/**
 * API endpoint for generating session titles
 * Uses a language model to analyze conversation content
 */
export async function POST(
  req: Request
) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { messages, isVoiceMode } = body;
    if (!body.messages || typeof body.messages !== 'string') {
      return new Response('Valid message content is required', { status: 400 });
    }
    
    // Extract API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: body.messages },
      ],
      temperature: 0.7,
      max_tokens: 30,
    });

    let title = completion.choices[0]?.message?.content?.trim() || 
      (body.isVoiceMode ? 'Voice Conversation' : 'Chat Conversation');
    
    // Remove quotes if present
    title = title.replace(/^["'](.*)["']$/, '$1');
    
    // Detect if this is a voice-focused conversation from content
    const isVoiceSession = isVoiceMode || 
      messages.toLowerCase().includes('voice call') || 
      messages.toLowerCase().includes('speaking') ||
      messages.toLowerCase().includes('call');
    
    return Response.json({
      title: title.slice(0, 60),
      isVoiceSession
    });
  } catch (error) {
    console.error('Error in title generation endpoint:', error);
    return new Response('Internal server error', { status: 500 });
  }
}