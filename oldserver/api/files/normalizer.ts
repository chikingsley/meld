/**
 * normalizer.ts
 *
 * This module parses a JSON transcript (from a FilePond upload)
 * and converts it into an array of ChatSession objects in our internal format.
 */

export interface ChatMessage {
  uuid?: string;
  text?: string;
  content?: Array<{ type: string; text: string }>;
  sender?: 'human' | 'assistant';
  created_at?: string;
  updated_at?: string;
  attachments?: any[];
  files?: any[];
  message?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  timestamp?: string;
  expressions?: Record<string, number>;
  labels?: Record<string, number>;
  prosody?: Record<string, number>;
}

export interface ChatSession {
  uuid?: string;
  name?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  timestamp?: string;
  lastMessage?: string;
  account?: {
    uuid: string;
  };
  chat_messages?: ChatMessage[];
  messages?: ChatMessage[];
}

/**
 * normalizeTranscript
 *
 * Parses a JSON string (from your uploaded file) and returns an array of ChatSession objects.
 * Accepts both a single object or an array of sessions.
 */
export function normalizeTranscript(fileContent: string): ChatSession[] {
  let rawData: any;
  try {
    rawData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return [];
  }

  let sessions: any[] = [];
  if (Array.isArray(rawData)) {
    sessions = rawData;
  } else if (typeof rawData === 'object' && rawData !== null) {
    sessions = [rawData];
  } else {
    console.error('Unexpected JSON format.');
    return [];
  }

  return sessions.map((session) => ({
    uuid: session.uuid,
    name: session.name || '',
    title: session.title || '',
    created_at: session.created_at,
    updated_at: session.updated_at,
    timestamp: session.created_at || session.timestamp || new Date().toISOString(),
    lastMessage: session.lastMessage,
    account: session.account,
    chat_messages: session.chat_messages ? session.chat_messages.map(normalizeMessage) : [],
    messages: session.messages ? session.messages.map(normalizeMessage) : [],
  }));
}

/**
 * normalizeMessage
 *
 * Converts a raw message object into our internal ChatMessage format.
 * It maps the sender to a role and concatenates text if a content array is provided.
 */
function normalizeMessage(msg: any): ChatMessage {
  let contentText = '';
  if (msg.text && msg.text.trim()) {
    contentText = msg.text;
  } else if (Array.isArray(msg.content)) {
    contentText = msg.content.map((item: any) => item.text).join('\n');
  }

  const role = msg.sender === 'human' ? 'user' : 'assistant';

  return {
    uuid: msg.uuid,
    text: contentText,
    content: msg.content,
    sender: msg.sender,
    created_at: msg.created_at,
    updated_at: msg.updated_at,
    attachments: msg.attachments || [],
    files: msg.files || [],
    message: {
      role,
      content: contentText,
    },
    timestamp: msg.created_at || new Date().toISOString(),
    expressions: msg.expressions || {},
    labels: msg.labels || {},
    prosody: msg.prosody || {},
  };
}