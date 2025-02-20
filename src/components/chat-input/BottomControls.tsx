// src/components/chat-input/BottomControls.tsx
import { AnimatePresence, motion } from "framer-motion"
import React from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChatInputForm } from "@/components/chat-input/ChatInputForm"
import Controls from "@/components/chat-input/controls"
import { cn } from "@/utils"
import { useVoice } from "@/lib/VoiceProvider"

interface BottomControlsProps {
  sessionId?: string;
  hasMessages?: boolean;
}

const BottomControls = React.memo(({ sessionId, hasMessages }: BottomControlsProps) => {
  // Split state subscriptions for better performance
  const { status, connect, disconnect, sendSessionSettings } = useVoice();
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [isPostCall, setIsPostCall] = React.useState(false)
  const isMobile = useIsMobile()

  const handleEndCall = React.useCallback(async () => {
    setIsTransitioning(true)
    setIsPostCall(true)
    try {
      await disconnect()
    } catch (error) {
      console.error('Disconnect failed:', error)
    } finally {
      setIsTransitioning(false)
    }
  }, [disconnect])

  // Reset post-call state when changing sessions
  React.useEffect(() => {
    if (sessionId) {
      setIsPostCall(false)
    }
  }, [sessionId])

  const handleStartCall = async () => {
    console.log('Starting call with sessionId:', sessionId);
    setIsTransitioning(true)
    try {
      if (sessionId) {
        // Always set session ID before connecting
        await sendSessionSettings({ customSessionId: sessionId })
        // Don't clear messages when starting call
        await connect()
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsTransitioning(false)
    }
  }
  
  // Show controls during connection process and connected state
  const showControls = status.value === "connected" || status.value === "connecting" || isTransitioning
  
  return (
    <div className="fixed bottom-10 right-0 w-full flex items-center justify-center bg-gradient-to-t from-background via-background/90 to-background/0">
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed left-4 bottom-4 z-50"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-0">
            {/* We'll need to import and add the Sidebar component here */}
          </SheetContent>
        </Sheet>
      )}
      <div className={cn(
        "w-full transition-all duration-200 flex justify-center",
        !isMobile ? "pl-64" : ""
      )}>
        <div className="w-full max-w-2xl px-4">
          <AnimatePresence mode="wait" initial={false}>
            {(showControls || (status.value === "disconnected" && !isPostCall && !hasMessages)) ? (
              <motion.div
                key="control-container"
                layoutId="control-box"
                className={cn(
                  "w-full",
                  showControls ? "max-w-sm mx-auto" : ""
                )}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ 
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                  layout: { duration: 0.2 }
                }}
              >
                {showControls ? (
                  <Controls onEndCall={handleEndCall} />
                ) : (
                  <ChatInputForm onStartCall={handleStartCall} />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
});

export default BottomControls;