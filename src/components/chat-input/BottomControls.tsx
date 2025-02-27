// src/components/chat-input/BottomControls.tsx
import React from "react"
import { cn } from "@/utils/classNames"
import { Menu } from "lucide-react"
import { useVoice } from "@/providers/VoiceProvider"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/useMobile"
import VoiceControlSkeleton from "./controls/VoiceControlSkeleton"
import { AnimatePresence, motion } from "framer-motion"
import Controls from "@/components/chat-input/controls"
import { ChatInputForm } from "@/components/chat-input/ChatInputForm"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useSessionContext } from "@/providers/SessionProvider"
import { useText } from "@/providers/TextProvider"

interface BottomControlsProps {
  sessionId?: string;
  hasMessages?: boolean;
}

const BottomControls = React.memo(({ sessionId }: BottomControlsProps) => {
  // Split state subscriptions for better performance
  const { status, connect, disconnect, sendSessionSettings } = useVoice();
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [isPostCall, setIsPostCall] = React.useState(false)
  const isMobile = useIsMobile()
  const { isVoiceMode, createSession } = useSessionContext();

  // Use text mode handler from hook
  const { sendMessage: handleTextSubmit } = useText({
    messageHistoryLimit: 100
  });

  // Reset post-call state when changing sessions
  React.useEffect(() => {
    if (sessionId) {
      setIsPostCall(false)
    }
  }, [sessionId])

  const handleStartCall = async () => {
    setIsTransitioning(true)
    try {
      // Create a new session for this voice call
      const newSessionId = await createSession();
      if (newSessionId) {
        await sendSessionSettings({ customSessionId: newSessionId })
        await connect()
      }
    } catch (error) {
      console.error('Connection failed:', error)
    } finally {
      setIsTransitioning(false)
    }
  }

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

  // Show voice controls only when in voice mode and connected/connecting
  const showVoiceControls = isVoiceMode && (status.value === "connected" || status.value === "connecting" || isTransitioning);

  return (
    <div className="fixed bottom-6 right-0 w-full flex items-center justify-center bg-gradient-to-t from-background via-background/90 to-background/0">
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
            <motion.div
              key="control-container"
              layoutId="control-box"
              className={cn(
                "w-full",
                showVoiceControls ? "max-w-sm mx-auto" : ""
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
              {showVoiceControls ? (
                isTransitioning ? (
                  <VoiceControlSkeleton />
                ) : (
                  <Controls onEndCall={handleEndCall} isTransitioning={isTransitioning} />
                )
              ) : isVoiceMode ? (
                <ChatInputForm onStartCall={handleStartCall} mode="voice" isLoading={isTransitioning} />
              ) : (
                <ChatInputForm onSubmit={handleTextSubmit} mode="text" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
});

export default BottomControls;