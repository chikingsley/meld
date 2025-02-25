// server/api/database/import-handler.ts
import { prisma } from '../../../src/db/prisma';

export async function handleChatImport(req: Request) {
  try {
    console.log('Chat import request received');
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.log('Unauthorized: Missing userId');
      return new Response('Unauthorized: Missing userId', { status: 401 });
    }

    // Check if the request is multipart form data
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    // FilePond sends multipart/form-data, but it might not have the exact boundary syntax in the check
    if (!contentType.includes('multipart/form-data') && !contentType.includes('form-data')) {
      console.log('Unsupported Media Type:', contentType);
      return new Response(`Unsupported Media Type: ${contentType}`, { status: 415 });
    }

    // Parse the multipart form data
    let formData;
    try {
      formData = await req.formData();
      console.log('FormData keys:', [...formData.keys()]);
    } catch (error) {
      console.error('Error parsing form data:', error);
      return new Response(`Error parsing form data: ${(error as Error).message}`, { status: 400 });
    }
    
    const file = formData.get('file') as File;
    if (!file) {
      console.log('No file found in form data. Available keys:', [...formData.keys()]);
      return new Response('No file found in form data', { status: 400 });
    }

    console.log('File found:', file.name, 'size:', file.size, 'type:', file.type);

    // Check file type - be more lenient with type checking
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return new Response(`Invalid file type: ${file.type}, only JSON files are supported`, { status: 400 });
    }

    // Read the file
    const fileContent = await file.text();
    
    // Parse the JSON
    let chatHistory;
    try {
      chatHistory = JSON.parse(fileContent);
    } catch (error) {
      return new Response('Invalid JSON file', { status: 400 });
    }

    // Validate the chat history format
    if (!Array.isArray(chatHistory)) {
      return new Response('Invalid chat history format, expected an array', { status: 400 });
    }

    // Process and import the chat history
    let importedSessions = 0;
    let importedMessages = 0;

    try {
      // Start a transaction
      await prisma.$transaction(async (prisma) => {
        // Process each chat session
        for (const session of chatHistory) {
          if (!session.id || !session.messages || !Array.isArray(session.messages)) {
            continue; // Skip invalid sessions
          }

          // Create a new session
          const newSession = await prisma.session.create({
            data: {
              userId,
              timestamp: new Date(session.timestamp || Date.now()),
              title: session.title || 'Imported Chat',
              lastMessage: session.lastMessage || ''
            }
          });

          importedSessions++;

          // Process messages
          for (const msg of session.messages) {
            if (!msg.message || !msg.message.role || !msg.message.content) {
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
        }
      });

      return Response.json({ 
        success: true, 
        message: `Successfully imported ${importedSessions} sessions with ${importedMessages} messages`
      });
    } catch (error) {
      console.error('Error importing chat history:', error);
      return new Response('Error importing chat history: ' + (error as Error).message, { status: 500 });
    }
  } catch (error) {
    console.error('Error in handleChatImport:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}