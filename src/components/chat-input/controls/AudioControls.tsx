import { memo } from "react";
import { useAudioVisualization } from "@/lib/hume-lib/contexts/AudioVisualizationContext";
import { MuteToggle } from "./MuteToggle";
import MicFFT from "./MicFFT";

export const AudioControls = memo(() => {
  const { micFft } = useAudioVisualization();

  return (
    <div className="flex items-center gap-4">
      <MuteToggle />
      <div className="relative grid h-8 w-48 shrink grow-0">
        <MicFFT fft={micFft} className="fill-current text-foreground" />
      </div>
    </div>
  );
});
