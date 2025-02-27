// src/components/chat/window/SessionMarker.tsx
import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';

interface SessionMarkerProps {
  type: 'call_start' | 'call_end' | 'text_start' | 'text_end';
  duration?: string;
}

const SessionMarker: React.FC<SessionMarkerProps> = ({ type, duration }) => {
  // Style based on type
  let icon = null;
  let text = '';
  let bgColor = 'bg-muted';
  let textColor = 'text-muted-foreground';
  let iconColor = 'text-muted-foreground';
  
  switch (type) {
    case 'call_start':
      icon = <Phone size={16} />;
      text = 'Voice call started';
      bgColor = 'bg-blue-100 dark:bg-blue-900/20';
      textColor = 'text-blue-700 dark:text-blue-300';
      iconColor = 'text-blue-500';
      break;
    
    case 'call_end':
      icon = <PhoneOff size={16} />;
      text = `Voice call ended${duration ? ` · ${duration}` : ''}`;
      bgColor = 'bg-blue-100 dark:bg-blue-900/20';
      textColor = 'text-blue-700 dark:text-blue-300';
      iconColor = 'text-blue-500';
      break;
    
    case 'text_start':
      text = 'Text chat started';
      break;
    
    case 'text_end':
      text = 'Text chat ended';
      break;
  }
  
  return (
    <div className="flex items-center justify-center my-3">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 ${bgColor} rounded-full text-xs font-medium ${textColor}`}>
        {icon && <span className={iconColor}>{icon}</span>}
        {text}
      </div>
    </div>
  );
};

export default SessionMarker;