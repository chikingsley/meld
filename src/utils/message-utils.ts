import type { Message } from '@/types/messages';
import type { JSONMessage, ConnectionMessage } from '@/types/hume-messages';

type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Creates a unique ID for a message based on its content, role, and optional session ID
 */
export const createMessageId = (msg: Message | JSONMessage | ConnectionMessage, sessionId?: string): string => {
  // Handle socket connection messages
  if ('type' in msg && (msg.type === 'socket_connected' || msg.type === 'socket_disconnected')) {
    return `${msg.type}-${msg.receivedAt.toISOString()}`;
  }
  
  // Handle JSON messages (with message property)
  if ('message' in msg) {
    const content = typeof msg.message === 'object' && msg.message && 'content' in msg.message ? msg.message.content : '';
    const role = typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : '';
    const sessionPrefix = sessionId ? `${sessionId}-` : '';
    return `${sessionPrefix}${role}-${content}`;
  }
  
  // Handle direct Message objects
  if ('role' in msg && 'content' in msg) {
    const sessionPrefix = sessionId ? `${sessionId}-` : '';
    return `${sessionPrefix}${msg.role}-${msg.content}`;
  }
  
  // Fallback for unknown message types
  return `unknown-${new Date().toISOString()}`;
};