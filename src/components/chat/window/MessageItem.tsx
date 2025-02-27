// src/components/chat/window/MessageItem.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/classNames';
import { formatDistanceToNow } from 'date-fns';

interface MessageItemProps {
  message: any; // Type this more specifically based on your message structure
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  // Determine if this is a user or assistant message
  const isUser = message.message?.role === 'user' || message.type === 'user_message';
  const isSystem = message.message?.role === 'system' || message.type === 'system_message';
  
  // Format timestamp
  const timestamp = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true }) 
    : '';

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-2">
        <div className="text-xs text-gray-500">{message.message.content}</div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "p-4 flex items-start gap-4 text-sm", 
        isUser ? "justify-end" : ""
      )}
    >
      {!isUser && (
        <Avatar className="mt-0.5 size-8">
          <AvatarFallback>AI</AvatarFallback>
          <AvatarImage src="/ai-avatar.png" />
        </Avatar>
      )}
      
      <div className={cn(
        "rounded-lg p-3 max-w-[85%]",
        isUser 
          ? "bg-primary text-primary-foreground ml-12" 
          : "bg-muted"
      )}>
        <div className="whitespace-pre-wrap">{message.message.content}</div>
        <div className={cn(
          "text-xs mt-1.5",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {timestamp}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="mt-0.5 size-8">
          <AvatarFallback>You</AvatarFallback>
          <AvatarImage src="/user-avatar.png" />
        </Avatar>
      )}
    </div>
  );
};

export default MessageItem;