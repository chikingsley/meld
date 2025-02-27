import { Expression, ExpressionScore, ProsodyData } from './expressions';

export interface MessageMetadata {
  emotions?: Record<Expression, ExpressionScore>;
  prosody?: ProsodyData;
}

export interface Message {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date | string;
  metadata?: MessageMetadata;
}