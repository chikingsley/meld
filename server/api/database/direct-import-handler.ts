// Update the direct import handler with better error handling
import { prisma } from '../../../src/db/prisma';

export async function handleDirectImport(req: Request) {
  try {
    console.log('Direct chat import request received');
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.log('Unauthorized: Missing userId');
      return new Response('Unauthorized: Missing userId', { status: 401 });
    }

    // Get the raw JSON content
    let chatHistory;
    let rawText = '';
    
    try {
      // First try to get the text to see what we're dealing with
      rawText = await req.text();
      console.log('Received raw text (first 100 chars):', rawText.substring(0, 100));
      
      try {
        chatHistory = JSON.parse(rawText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(`Invalid JSON format: ${(parseError as Error).message}\nReceived: ${rawText.substring(0, 100)}...`, { status: 400 });
      }
    } catch (error) {
      console.error('Error reading request body:', error);
      return new Response(`Error reading request body: ${(error as Error).message}`, { status: 400 });
    }

    // Validate the chat history format
    if (!Array.isArray(chatHistory)) {
      console.log('Invalid data format. Received:', typeof chatHistory, JSON.stringify(chatHistory).substring(0, 100));
      return new Response('Invalid chat history format, expected an array', { status: 400 });
    }

    console.log(`Processing ${chatHistory.length} sessions`);

    // Process and import the chat history
    let importedSessions = 0;
    let importedMessages = 0;

    try {
      // Process each chat session
      for (const session of chatHistory) {
        if (!session.messages || !Array.isArray(session.messages)) {
          console.log('Skipping invalid session:', JSON.stringify(session).substring(0, 100));
          continue; // Skip invalid sessions
        }

        console.log(`Creating session for user ${userId}`);

        // IMPORTANT: Only include fields that exist in your Prisma schema
        // Based on the error message, your Session model only has userId and timestamp
        const newSession = await prisma.session.create({
          data: {
            userId,
            timestamp: new Date(session.timestamp || Date.now())
            // Removed title and lastMessage as they don't exist in your schema
          }
        });

        importedSessions++;
        console.log(`Created session: ${newSession.id}`);

        // Process messages
        for (const msg of session.messages) {
          if (!msg.message || !msg.message.role || !msg.message.content) {
            console.log('Skipping invalid message:', JSON.stringify(msg).substring(0, 100));
            continue; // Skip invalid messages
          }

          // Create a new message
          await prisma.message.create({
            data: {
              sessionId: newSession.id,
              role: msg.message.role,
              content: msg.message.content,
              timestamp: new Date(msg.timestamp || Date.now()),
              metadata: {
                expressions: msg.expressions || {},
                labels: msg.labels || {},
                prosody: msg.prosody || {}
              }
            }
          });

          importedMessages++;
        }
        
        console.log(`Added ${importedMessages} messages to session ${newSession.id}`);
      }

      console.log(`Import complete: ${importedSessions} sessions, ${importedMessages} messages`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${importedSessions} sessions with ${importedMessages} messages`
      }), {
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