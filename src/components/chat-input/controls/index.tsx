import { memo } from "react";
import { AudioControls } from "./AudioControls";
import { EndCallButton } from "./EndCallButton";

interface ControlsProps {
  onEndCall: () => void;
}

const Controls = memo(({ onEndCall }: ControlsProps) => {
  return (
    <div className="p-4 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex items-center gap-4">
      <AudioControls />
      <EndCallButton onEndCall={onEndCall} />
    </div>
  );
});

export default Controls;
