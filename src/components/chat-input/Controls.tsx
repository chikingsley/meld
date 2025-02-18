// src/components/chat-input/Controls.tsx
import { useVoiceState } from "@/lib/hume-lib/contexts/VoiceStateContext";
import { useVoiceActions } from "@/lib/hume-lib/contexts/VoiceActionsContext";
import { useAudioVisualization } from "@/lib/hume-lib/contexts/AudioVisualizationContext";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import MicFFT from "./MicFFT";
import React from "react";

interface ControlsProps {
  onEndCall: () => void;
}

const Controls = React.memo(({ onEndCall }: ControlsProps) => {
  // Split state subscriptions for better performance
  const { isMuted } = useVoiceState();
  const { mute, unmute } = useVoiceActions();
  const { micFft } = useAudioVisualization();

  return (
    <div className="p-4 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex items-center gap-4">
      <Toggle
        pressed={!isMuted}
        onPressedChange={() => {
          if (isMuted) {
            unmute();
          } else {
            mute();
          }
        }}
      >
        {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      </Toggle>

      <div className="relative grid h-8 w-48 shrink grow-0">
        <MicFFT fft={micFft} className="fill-current text-foreground" />
      </div>

      <Button
        data-component="end-call"
        className="flex items-center gap-1"
        onClick={onEndCall}
        variant="destructive"
      >
        <Phone className="size-4 opacity-50" strokeWidth={2} />
        <span>End Call</span>
      </Button>
    </div>
  );
});

export default Controls;
