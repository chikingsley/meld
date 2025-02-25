// src/workers/chat-import-worker.ts
// This worker handles chat import processing
import { prisma } from '../../src/db/prisma';

// Define the structure of messages we expect
interface MessageStructure {
  message: {
    role: string;
    content: string;
  };
  expressions?: Record<string, number>;
  labels?: Record<string, number>;
  prosody?: Record<string, number>;
  timestamp: string;
}

interface SessionStructure {
  id: string;
  userId: string;
  timestamp: string;
  title?: string;
  lastMessage?: string;
  messages: MessageStructure[];
}

// Track task state
let auth = {
  userId: '',
  token: ''
};

// Listen for messages from the main thread
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'AUTH_UPDATE':
      auth = payload.auth;
      self.postMessage({ type: 'AUTH_UPDATE_COMPLETE' });
      break;
      
    case 'PROCESS_CHAT_IMPORT':
      try {
        const { taskId, fileContent, userId } = payload;
        
        // Parse the JSON content
        let chatHistory;
        try {
          chatHistory = JSON.parse(fileContent);
        } catch (error) {
          self.postMessage({ 
            type: 'PROCESS_CHAT_IMPORT_ERROR', 
            taskId, 
            error: 'Invalid JSON format'
          });
          return;
        }
        
        // Validate the chat history format
        if (!Array.isArray(chatHistory)) {
          self.postMessage({ 
            type: 'PROCESS_CHAT_IMPORT_ERROR', 
            taskId, 
            error: 'Invalid chat history format, expected an array'
          });
          return;
        }
        
        // Process progress updates
        const totalSessions = chatHistory.length;
        let processedSessions = 0;
        
        // Report initial progress
        self.postMessage({
          type: 'PROCESS_CHAT_IMPORT_PROGRESS',
          taskId,
          progress: {
            processedSessions,
            totalSessions,
            percentage: 0
          }
        });
        
        // Process and import the chat history
        let importedSessions = 0;
        let importedMessages = 0;
        
        try {
          // Process each chat session
          for (const session of chatHistory) {
            if (!session.id || !session.messages || !Array.isArray(session.messages)) {
              processedSessions++;
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
            
            // Update progress
            processedSessions++;
            self.postMessage({
              type: 'PROCESS_CHAT_IMPORT_PROGRESS',
              taskId,
              progress: {
                processedSessions,
                totalSessions,
                percentage: Math.round((processedSessions / totalSessions) * 100)
              }
            });
          }
          
          // Report success
          self.postMessage({
            type: 'PROCESS_CHAT_IMPORT_COMPLETE',
            taskId,
            result: {
              importedSessions,
              importedMessages,
              message: `Successfully imported ${importedSessions} sessions with ${importedMessages} messages`
            }
          });
          
        } catch (error) {
          self.postMessage({
            type: 'PROCESS_CHAT_IMPORT_ERROR',
            taskId,
            error: `Error processing import: ${(error as Error).message}`
          });
        }
        
      } catch (error) {
        self.postMessage({
          type: 'PROCESS_CHAT_IMPORT_ERROR',
          taskId,
          error: `Unexpected error: ${(error as Error).message}`
        });
      }
      break;
      
    default:
      self.postMessage({
        type: 'UNKNOWN_COMMAND_ERROR',
        error: `Unknown command: ${type}`
      });
  }
};

// Notify that the worker is ready
self.postMessage({ type: 'WORKER_READY' });