import { useVoice } from "@humeai/voice-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import MicFFT from "./MicFFT";

interface ControlsProps {
  onEndCall: () => void;
}

export default function Controls({ onEndCall }: ControlsProps) {
  const { isMuted, unmute, mute, micFft } = useVoice();

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
}
