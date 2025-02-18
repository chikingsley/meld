import { memo, useCallback } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Mic, MicOff } from "lucide-react";
import { useVoiceState } from "@/lib/hume-lib/contexts/VoiceStateContext";
import { useVoiceActions } from "@/lib/hume-lib/contexts/VoiceActionsContext";

export const MuteToggle = memo(() => {
  const { isMuted } = useVoiceState();
  const { mute, unmute } = useVoiceActions();

  const handleMuteChange = useCallback(() => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  }, [isMuted, mute, unmute]);

  return (
    <Toggle pressed={!isMuted} onPressedChange={handleMuteChange}>
      {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
    </Toggle>
  );
});
