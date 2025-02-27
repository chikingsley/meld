// src/components/chat/window/DateMarker.tsx
import React from 'react';

interface DateMarkerProps {
  date: string;
}

const DateMarker: React.FC<DateMarkerProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-4 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
        {date}
      </div>
    </div>
  );
};

export default DateMarker;