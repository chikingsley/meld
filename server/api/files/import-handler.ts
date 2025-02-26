// server/api/database/import-handler.ts
import { prisma } from '../../../src/db/prisma';
import { generateEmbeddings } from '../../../src/utils/RAG/jina-embeddings';

// Define interfaces for expected data formats
interface ChatMessage {
  uuid?: string;
  text?: string;
  content?: Array<{ type: string; text: string }>;
  sender?: 'human' | 'assistant';
  created_at?: string;
  updated_at?: string;
  attachments?: Array<any>;
  files?: Array<any>;
  message?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  timestamp?: string;
  expressions?: Record<string, number>;
  labels?: Record<string, number>;
  prosody?: Record<string, number>;
}

interface ChatSession {
  uuid?: string;
  id?: string;
  name?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  timestamp?: string;
  lastMessage?: string;
  account?: {
    uuid: string;
  };
  chat_messages?: Array<ChatMessage>;
  messages?: Array<ChatMessage>;
}

// Helper function to normalize input data
function normalizeData(inputData: any): ChatSession[] {
  console.log('Normalizing input data...');

  if (Array.isArray(inputData)) {
    console.log('Input is an array with', inputData.length, 'items');
    return inputData;
  }

  if (typeof inputData === 'object' && inputData !== null) {
    console.log('Input is a single object, converting to array format');

    if (Array.isArray(inputData.chat_messages) || Array.isArray(inputData.messages)) {
      return [inputData];
    }

    console.log('WARNING: Object doesn\'t appear to be a chat session, but will process anyway');
    return [inputData];
  }

  console.log('Input is not a valid object or array');
  return [];
}

// Helper function to normalize messages
function normalizeMessages(session: ChatSession): ChatMessage[] {
  if (Array.isArray(session.chat_messages)) {
    console.log('Using chat_messages array with', session.chat_messages.length, 'messages');

    return session.chat_messages.map(msg => {
      if (msg.sender) {
        return {
          message: {
            role: msg.sender === 'human' ? 'user' : 'assistant',
            content: msg.text || (msg.content ? msg.content.map(c => c.text).join('\n') : '')
          },
          timestamp: msg.created_at || new Date().toISOString(),
          expressions: {},
          labels: {},
          prosody: {}
        };
      }
      return msg;
    });
  }

  if (Array.isArray(session.messages)) {
    console.log('Using messages array with', session.messages.length, 'messages');
    return session.messages;
  }

  console.log('No messages array found in session');
  return [];
}

// Function to add delay between operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Process messages without using transactions
async function processWithoutTransactions(userId: string, session: ChatSession, batchSize: number = 10) {
  const normalizedMessages = normalizeMessages(session);

  if (normalizedMessages.length === 0) {
    console.log('No messages to process');
    return { sessionId: null, messageCount: 0, embeddingCount: 0 };
  }

  console.log(`Processing ${normalizedMessages.length} messages in batches of ${batchSize}`);

  // Create the session first
  const sessionTimestamp = session.created_at || session.timestamp || new Date().toISOString();
  let newSession;
  try {
    newSession = await prisma.session.create({
      data: {
        userId,
        timestamp: new Date(sessionTimestamp)
      }
    });
    console.log(`Created session with ID: ${newSession.id}`);
  } catch (error) {
    console.error('Failed to create session:', error);
    return { sessionId: null, messageCount: 0, embeddingCount: 0 };
  }

  // Process messages in smaller batches
  let processedCount = 0;
  let embeddingCount = 0;
  const totalMessages = normalizedMessages.length;
  const batches = Math.ceil(totalMessages / batchSize);

  // Add this code to your import handler after creating a session and messages

  // Verify the session was created
  try {
    const verifySession = await prisma.session.findUnique({
      where: { id: newSession.id }
    });

    console.log('VERIFICATION - Session in database:', verifySession ? 'YES' : 'NO', {
      id: newSession.id,
      userId: verifySession?.userId,
      timestamp: verifySession?.timestamp
    });

    // Verify messages were created
    const messageCount = await prisma.message.count({
      where: { sessionId: newSession.id }
    });

    console.log('VERIFICATION - Messages in database:', {
      sessionId: newSession.id,
      count: messageCount,
      expected: processedCount
    });

    // Get a sample message to verify content
    if (messageCount > 0) {
      const sampleMessage = await prisma.message.findFirst({
        where: { sessionId: newSession.id }
      });

      console.log('VERIFICATION - Sample message:', {
        id: sampleMessage?.id,
        role: sampleMessage?.role,
        contentPreview: sampleMessage?.content.substring(0, 50) + '...',
        timestamp: sampleMessage?.timestamp
      });
    }
  } catch (error) {
    console.error('VERIFICATION ERROR:', error);
  }

  // Process messages in batches, generating and storing embeddings for each batch
  // This helps prevent overwhelming the database and allows for better error handling
  // Each batch:
  // 1. Creates messages in the database
  // 2. Generates embeddings for all messages in the batch
  // 3. Stores the embeddings in message_vectors table
  // 4. Adds delays between operations to prevent overload
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, totalMessages);
    const batch = normalizedMessages.slice(start, end);

    console.log(`Processing batch ${i + 1}/${batches} (messages ${start} to ${end - 1})`);

    // Collect messages for batch embedding generation
    const batchTexts: string[] = [];
    const batchMessages: { id: string; content: string }[] = [];

    // Process each message in the batch
    for (const msg of batch) {
      if (!msg.message?.role || !msg.message?.content) {
        console.log('Skipping invalid message (missing required fields)');
        continue;
      }

      try {
        // Create message without transaction
        const msgTimestamp = msg.timestamp || msg.created_at || new Date().toISOString();
        console.log('Creating message with data:', {
          sessionId: newSession.id,
          role: msg.message.role,
          contentPreview: msg.message.content.substring(0, 30) + '...',
          timestamp: msgTimestamp
        });
        const createdMessage = await prisma.message.create({
          data: {
            sessionId: newSession.id,
            role: msg.message.role,
            content: msg.message.content,
            timestamp: new Date(msgTimestamp),
            metadata: {
              expressions: msg.expressions || {},
              labels: msg.labels || {},
              prosody: msg.prosody || {}
            }
          }
        });

        // Verify the message was created by its ID
        console.log(`✅ Message ${processedCount + 1} created with ID: ${createdMessage.id}`);

        // Add message to batch for embedding generation
        batchTexts.push(msg.message.content);
        batchMessages.push({
          id: createdMessage.id,
          content: msg.message.content
        });

        processedCount++;
      } catch (error) {
        console.error(`Error creating message ${processedCount + 1}:`, error);
        // Continue with next message instead of failing the entire batch
      }

      // Add a small delay between messages to prevent overwhelming the database
      await delay(10);
    }

    console.log(`Final verification for session ${newSession.id}`);

    // Generate and store embeddings for the batch
    if (batchTexts.length > 0) {
      try {
        console.log(`Generating embeddings for ${batchTexts.length} messages`);
        const embeddings = await generateEmbeddings(batchTexts);

        // Store embeddings
        for (let j = 0; j < embeddings.length; j++) {
          const messageId = batchMessages[j].id;
          const embedding = embeddings[j];

          try {
            // Create message vector
            await prisma.messageVector.create({
              data: {
                messageId: messageId,
              }
            });

            // Store vector data using raw SQL
            await prisma.$executeRaw`
              INSERT INTO message_vectors (message_id, embedding)
              VALUES (${messageId}::uuid, ${JSON.stringify(embedding)}::vector)
              ON CONFLICT (message_id)
              DO UPDATE SET embedding = ${JSON.stringify(embedding)}::vector
            `;

            embeddingCount++;
          } catch (error) {
            console.error(`Error storing embedding for message ${messageId}:`, error);
          }
        }
      } catch (error) {
        console.error('Error generating embeddings for batch:', error);
      }
    }

    console.log(`Completed batch ${i + 1}/${batches}, processed ${processedCount} messages, ${embeddingCount} embeddings so far`);

    // Add a delay between batches
    if (i < batches - 1) {
      await delay(100);
    }
  }

  console.log(`Final verification for session ${newSession.id}`);
  try {
    const finalMessageCount = await prisma.message.count({
      where: { sessionId: newSession.id }
    });

    console.log('FINAL VERIFICATION - Messages in database:', {
      sessionId: newSession.id,
      actualCount: finalMessageCount,
      expectedCount: processedCount
    });

    if (finalMessageCount > 0) {
      // Get the first and last message to verify content range
      const [firstMessage, lastMessage] = await Promise.all([
        prisma.message.findFirst({
          where: { sessionId: newSession.id },
          orderBy: { timestamp: 'asc' }
        }),
        prisma.message.findFirst({
          where: { sessionId: newSession.id },
          orderBy: { timestamp: 'desc' }
        })
      ]);

      console.log('First message in session:', {
        id: firstMessage?.id,
        role: firstMessage?.role,
        contentPreview: firstMessage?.content.substring(0, 30) + '...',
        timestamp: firstMessage?.timestamp
      });

      console.log('Last message in session:', {
        id: lastMessage?.id,
        role: lastMessage?.role,
        contentPreview: lastMessage?.content.substring(0, 30) + '...',
        timestamp: lastMessage?.timestamp
      });
    } else {
      console.log('❌ NO MESSAGES FOUND IN THE SESSION AFTER PROCESSING');
    }
  } catch (error) {
    console.error('Error in final verification:', error);
  }

  return { sessionId: newSession.id, messageCount: processedCount, embeddingCount };
}

export async function handleChatImport(req: Request) {
  try {
    console.log('Chat import request received');

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.log('Unauthorized: Missing userId');
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized: Missing userId' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check content type
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    if (!contentType.includes('multipart/form-data') && !contentType.includes('form-data')) {
      console.log('Unsupported Media Type:', contentType);
      return new Response(
        JSON.stringify({ success: false, message: `Unsupported Media Type: ${contentType}` }),
        {
          status: 415,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse form data
    let formData;
    try {
      formData = await req.formData();
      const keys = [...formData.keys()];
      console.log('FormData keys:', keys);

      for (const key of keys) {
        const values = formData.getAll(key);
        console.log(`Values for key "${key}":`, values.map(v => {
          if (v instanceof File) {
            return {
              isFile: true,
              name: v.name,
              size: v.size,
              type: v.type
            };
          }
          return { isFile: false, value: String(v) };
        }));
      }
    } catch (error) {
      console.error('Error parsing form data:', error);
      return new Response(
        JSON.stringify({ success: false, message: `Error parsing form data: ${(error as Error).message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the file
    let file: File | null = null;

    // Try standard method first
    const firstTry = formData.get('file');
    if (firstTry instanceof File) {
      file = firstTry;
    }

    // If that failed, try getting all values for the key
    if (!file) {
      console.log('Standard method failed, trying alternative');
      const allFiles = formData.getAll('file');
      for (const item of allFiles) {
        if (item instanceof File) {
          file = item;
          break;
        }
      }
    }

    // If still no file, try looking through all keys
    if (!file) {
      console.log('Alternative method failed, trying to find any file');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          file = value;
          console.log(`Found file under key: ${key}`);
          break;
        }
      }
    }

    if (!file) {
      console.log('No valid file found in form data');
      return new Response(
        JSON.stringify({ success: false, message: 'No valid file found in form data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('File found:', {
      name: file.name || 'undefined',
      size: file.size || 'undefined',
      type: file.type || 'undefined'
    });

    // Read the file
    let fileContent;
    try {
      fileContent = await file.text();
      console.log('File content (first 100 chars):', fileContent.substring(0, 100));
    } catch (error) {
      console.error('Error reading file:', error);
      return new Response(
        JSON.stringify({ success: false, message: `Error reading file: ${(error as Error).message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the JSON
    let rawData;
    try {
      rawData = JSON.parse(fileContent);
      console.log('Parsed JSON successfully, type:', typeof rawData);
    } catch (error) {
      console.error('JSON parsing error:', error);
      return new Response(
        JSON.stringify({ success: false, message: `Invalid JSON file: ${(error as Error).message}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize the data
    const chatSessions = normalizeData(rawData);

    if (chatSessions.length === 0) {
      console.log('No valid sessions found after normalization');
      return new Response(
        JSON.stringify({ success: false, message: 'No valid chat sessions found in the file' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing ${chatSessions.length} sessions after normalization`);

    // Process each session non-transactionally
    let totalSessions = 0;
    let totalMessages = 0;
    let totalEmbeddings = 0;

    try {
      // Process each session one at a time
      for (const session of chatSessions) {
        const { sessionId, messageCount, embeddingCount } = await processWithoutTransactions(userId, session, 10);

        if (sessionId) {
          totalSessions++;
          totalMessages += messageCount;
          totalEmbeddings += embeddingCount;
        }
      }

      console.log(`Import completed successfully: ${totalSessions} sessions, ${totalMessages} messages, ${totalEmbeddings} embeddings`);
      return Response.json({
        success: true,
        message: `Successfully imported ${totalSessions} sessions with ${totalMessages} messages (${totalEmbeddings} embeddings)`,
        sessions: totalSessions,
        messages: totalMessages,
        embeddings: totalEmbeddings
      });
    } catch (error) {
      console.error('Error importing chat history:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error importing chat history: ${(error as Error).message}`
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in handleChatImport:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Internal Server Error: ${(error as Error).message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}