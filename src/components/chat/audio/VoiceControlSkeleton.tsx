// VoiceControlSkeleton.tsx
import React from "react";
import { Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const VoiceControlSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card shadow">
      {/* Microphone skeleton */}
      <div className="flex w-12 h-12 items-center justify-center rounded-full bg-muted">
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
      
      {/* MicFTT skeleton */}
      <Skeleton className="flex-1 h-8 rounded-md" />
      
      {/* End call button skeleton */}
      <div className="w-12 h-12 rounded-full bg-red-500/70 flex items-center justify-center">
        <Phone className="size-5 rotate-135 text-background/70" />
      </div>
    </div>
  );
};

export default VoiceControlSkeleton;