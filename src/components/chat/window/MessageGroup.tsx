import React from 'react';
import { Message } from '@/types/messages';
import { cn } from '@/utils/classNames';

interface MessageGroupProps {
  messages: Message[];
  isLastGroup?: boolean;
}

/**
 * MessageGroup component that groups together consecutive messages from the same sender
 * A group ends when the sender changes (e.g., from user to assistant or vice versa)
 */
const MessageGroup: React.FC<MessageGroupProps> = ({ 
  messages, 
  isLastGroup = false 
}) => {
  if (!messages.length) return null;
  
  const firstMessage = messages[0];
  const role = firstMessage.role || 'user';
  
  return (
    <div className={cn(
      'flex flex-col gap-2 py-2',
      isLastGroup ? 'mb-4' : 'mb-2'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          role === 'user' ? 'bg-blue-100' : 'bg-green-100'
        )}>
          {role === 'user' ? 'U' : 'A'}
        </div>
        <div className="font-medium">
          {role === 'user' ? 'You' : 'Assistant'}
        </div>
      </div>
      
      {messages.map((message, idx) => (
        <div 
          key={message.id || `${role}-${idx}`}
          className={cn(
            'pl-10 pr-4 py-1 rounded-lg',
            role === 'user' ? 'bg-blue-50' : 'bg-green-50'
          )}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
};

/**
 * Helper function to group messages by sender
 * A new group starts whenever the sender changes
 * @param messages Array of messages to group
 * @returns Array of message groups
 */
export const groupMessagesBySender = (messages: Message[]): Message[][] => {
  if (!messages.length) return [];
  
  const groups: Message[][] = [];
  let currentGroup: Message[] = [messages[0]];
  let currentRole = messages[0].role;
  
  for (let i = 1; i < messages.length; i++) {
    const message = messages[i];
    const isSameRole = message.role === currentRole;
    
    if (isSameRole) {
      currentGroup.push(message);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [message];
      currentRole = message.role;
    }
  }
  
  if (currentGroup.length) {
    groups.push(currentGroup);
  }
  
  return groups;
};

export default MessageGroup;
