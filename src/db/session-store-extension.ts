import { sessionStore } from './session-store';
import { generateSessionTitle } from '@/lib/title-generator';

// Extend the session store with title generation
export const sessionStoreExtended = {
  ...sessionStore,
  
  /**
   * Generate and update the title for a specific session
   */
  async generateAndUpdateTitle(
    sessionId: string, 
    isVoiceMode: boolean
  ): Promise<string | null> {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      console.error('Session not found for title generation:', sessionId);
      return null;
    }
    
    const session = sessions[sessionIndex];
    const messages = session.messages || [];
    
    // Skip if we already have a custom title (not the default ones)
    const isDefaultTitle = !session.title || 
      session.title === 'New Chat' || 
      session.title === 'New Voice Chat' ||
      session.title === 'Untitled Conversation' ||
      session.title.startsWith('Chat Conversation') ||
      session.title.startsWith('Voice Conversation');
      
    if (!isDefaultTitle && messages.length <= 5) {
      // Keep existing title for short conversations
      return session.title || null;
    }
    
    try {
      // Generate title
      const { title, isVoiceSession } = await generateSessionTitle(messages, isVoiceMode);
      
      // Add emoji prefix for voice sessions
      const finalTitle = isVoiceSession ? `🎤 ${title}` : title;
      
      // Update session with new title
      const updatedSession = {
        ...session,
        title: finalTitle
      };
      
      sessions[sessionIndex] = updatedSession;
      sessionStore.updateSession(sessionId, { title: finalTitle });
      
      return finalTitle;
    } catch (error) {
      console.error('Title generation failed:', error);
      return null;
    }
  },
  
  /**
   * Process all sessions without titles to generate them
   */
  async batchGenerateTitles(userId: string, isVoiceMode: boolean): Promise<void> {
    const userSessions = this.getUserSessions(userId);
    
    // Filter sessions needing titles (missing or default titles)
    const sessionsNeedingTitles = userSessions.filter(session => {
      return !session.title || 
        session.title === 'New Chat' || 
        session.title === 'New Voice Chat' ||
        session.title === 'Untitled Conversation';
    });
    
    if (sessionsNeedingTitles.length === 0) {
      console.log('No sessions need title generation');
      return;
    }
    
    console.log(`Generating titles for ${sessionsNeedingTitles.length} sessions`);
    
    // Process sessions sequentially to avoid too many API calls at once
    for (const session of sessionsNeedingTitles) {
      // Use the current voice mode state
      const isVoiceSession = isVoiceMode;
      
      await this.generateAndUpdateTitle(session.id, isVoiceSession);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Batch title generation complete');
  }
};

// Create hook for title generation
export function useTitleGeneration() {
  return {
    generateTitleForSession: async (sessionId: string, isVoiceMode: boolean) => {
      return await sessionStoreExtended.generateAndUpdateTitle(sessionId, isVoiceMode);
    },
    
    batchGenerateTitles: async (userId: string, isVoiceMode: boolean) => {
      return await sessionStoreExtended.batchGenerateTitles(userId, isVoiceMode);
    }
  };
}