import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface EndCallButtonProps {
  onEndCall: () => void;
}

// Custom equality function that considers all EndCallButton props equal
// This is safe because the button only needs onClick functionality
const propsAreEqual = (prevProps: EndCallButtonProps, nextProps: EndCallButtonProps) => true;

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
), propsAreEqual);
