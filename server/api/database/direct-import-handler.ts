// server/api/database/direct-import-handler.ts
import { prisma } from '../../../src/db/prisma';

// Add emotion analysis helper
async function analyzeEmotions(text: string, headers: HeadersInit) {
  try {
    const response = await fetch('http://localhost:3001/api/chat/emotions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Emotion analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing emotions:', error);
    return {}; // Return empty object if analysis fails
  }
}

// Add this interface for the incoming data format
interface IncomingSession {
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
    account: {
        uuid: string;
    };
    chat_messages: Array<{
        uuid: string;
        text: string;
        content: Array<{ type: string; text: string }>;
        sender: 'human' | 'assistant';
        created_at: string;
        updated_at: string;
        attachments: Array<any>;
        files: Array<any>;
    }>;
}

// Add transformation helper
function transformMessages(rawData: IncomingSession | IncomingSession[]) {
    // If single session, wrap in array
    const sessions = Array.isArray(rawData) ? rawData : [rawData];
    
    return sessions.map(session => ({
        timestamp: session.created_at,
        name: session.name,
        messages: session.chat_messages.map(msg => ({
            message: {
                role: msg.sender === 'human' ? 'user' : 'assistant',
                content: msg.text
            },
            timestamp: msg.created_at,
            expressions: {},
            labels: {},
            prosody: {},
            metadata: {
                originalId: msg.uuid,
                lastModified: msg.updated_at,
                attachments: msg.attachments || [],
                files: msg.files || []
            }
        }))
    }));
}

export async function handleDirectImport(req: Request) {
  try {
    console.log('Direct chat import request received');
    
    const userId = req.headers.get('x-user-id');
    const authToken = req.headers.get('Authorization');
    
    if (!userId || !authToken) {
      console.log('Unauthorized: Missing credentials');
      return new Response('Unauthorized: Missing credentials', { status: 401 });
    }

    // Headers for internal requests
    const internalHeaders = {
      'x-user-id': userId,
      'Authorization': authToken
    };

    let rawData: IncomingSession;
    try {
      const rawText = await req.text();
      rawData = JSON.parse(rawText);
      console.log('Received raw text (first 100 chars):', rawText.substring(0, 100));
    } catch (error) {
      console.error('Error reading request body:', error);
      return new Response(`Error reading request body: ${(error as Error).message}`, { status: 400 });
    }

    // Transform the data
    const chatHistory = transformMessages(rawData);

    if (!Array.isArray(chatHistory)) {
      console.log('Invalid data format:', typeof chatHistory);
      return new Response('Invalid chat history format, expected an array', { status: 400 });
    }

    console.log(`Processing ${chatHistory.length} sessions`);

    let importedSessions = 0;
    let importedMessages = 0;
    let failedAnalyses = 0;

    try {
      // Process each chat session
      for (const session of chatHistory) {
        if (!session.messages || !Array.isArray(session.messages)) {
          console.log('Skipping invalid session:', JSON.stringify(session).substring(0, 100));
          continue;
        }

        console.log(`Creating session for user ${userId}`);

        // Create session with original timestamp if available
        const newSession = await prisma.session.create({
          data: {
            userId,
            timestamp: new Date(session.timestamp || Date.now())
          }
        });

        importedSessions++;
        console.log(`Created session: ${newSession.id}`);

        // Process messages with emotion analysis
        for (const msg of session.messages) {
          if (!msg.message?.content) {
            console.log('Skipping invalid message:', JSON.stringify(msg).substring(0, 100));
            continue;
          }

          try {
            // Analyze emotions for the message
            const emotionScores = await analyzeEmotions(msg.message.content, internalHeaders);
            console.log('Emotion analysis completed:');

            // Create message with emotion data
            await prisma.message.create({
              data: {
                sessionId: newSession.id,
                role: msg.message.role || 'user',
                content: msg.message.content,
                timestamp: new Date(msg.timestamp || Date.now()),
                metadata: {
                  expressions: msg.expressions || {},
                  labels: msg.labels || {},
                  prosody: {
                    ...msg.prosody || {},
                    scores: emotionScores // Add analyzed emotions
                  },
                  originalId: msg.metadata?.originalId,
                  lastModified: msg.metadata?.lastModified,
                  attachments: msg.metadata?.attachments || [],
                  files: msg.metadata?.files || []
                }
              }
            });

            importedMessages++;
          } catch (error) {
            console.error('Error processing message:', error);
            failedAnalyses++;
          }

          // Add a small delay between emotion analysis requests to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Added ${importedMessages} messages to session ${newSession.id}`);
      }

      const summary = {
        success: true,
        message: `Successfully imported ${importedSessions} sessions with ${importedMessages} messages` +
                (failedAnalyses > 0 ? ` (${failedAnalyses} messages had analysis errors)` : '')
      };

      console.log('Import complete:', summary);
      return new Response(JSON.stringify(summary), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error importing chat history:', error);
      return new Response(`Error importing chat history: ${(error as Error).message}`, { status: 500 });
    }
  } catch (error) {
    console.error('Error in handleDirectImport:', error);
    return new Response(`Internal Server Error: ${(error as Error).message}`, { status: 500 });
  }
}