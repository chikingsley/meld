import { memo } from "react";
import { useFFTStore } from "@/lib/stores/useFFTStore";
import { MuteToggle } from "./MuteToggle";
import MicFFT from "./MicFFT";

export const AudioControls = memo(() => {
  const micFft = useFFTStore(state => state.micFft);

  return (
    <div className="flex items-center gap-4">
      <MuteToggle />
      <div className="relative grid h-8 w-48 shrink grow-0">
        <MicFFT fft={micFft} className="fill-current text-foreground" />
      </div>
    </div>
  );
});
