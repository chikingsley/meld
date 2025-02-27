import { memo, useCallback } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Mic, MicOff } from "lucide-react";
import { useMuteStore } from "@/stores/useMuteStore";

export const MuteToggle = memo(() => {
  const { isMicMuted, mute, unmute } = useMuteStore();

  const handleMuteChange = useCallback(() => {
    if (isMicMuted) {
      unmute();
    } else {
      mute();
    }
  }, [isMicMuted, mute, unmute]);

  return (
    <Toggle pressed={!isMicMuted} onPressedChange={handleMuteChange}>
      {isMicMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </Toggle>
  );
});
