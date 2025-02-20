import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface EndCallButtonProps {
  onEndCall: () => void;
}

export const EndCallButton = memo(({ onEndCall }: EndCallButtonProps) => (
  <Button
    data-component="end-call"
    className="flex items-center gap-2 hover:bg-destructive/90 transition-colors"
    onClick={onEndCall}
    variant="destructive"
    size="sm"
  >
    <Phone className="size-4" strokeWidth={1.5} />
    <span>End Call</span>
  </Button>
));
