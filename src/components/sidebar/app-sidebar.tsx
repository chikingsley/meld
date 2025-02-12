// src/components/sidebar/app-sidebar.tsx
import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
import { NavSessions } from "@/components/sidebar/nav-sessions"
import { NavUser } from "@/components/sidebar/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { useSessions } from "@/hooks/use-sessions"
import { sessionStore } from "@/lib/session-store"
import { useVoice } from "@/lib/hume-lib/VoiceProvider"
import { useNavigate } from "react-router-dom"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sessions, createSession, selectSession, deleteSession, updateSession } = useSessions();
  const { status, disconnect, clearMessages } = useVoice();
  const navigate = useNavigate();

  const handleNewChat = React.useCallback(async () => {
    // End current call if any
    if (status.value === 'connected') {
      await disconnect();
    }
    // Clear current messages
    clearMessages();
    // Create new session and navigate
    const newSessionId = createSession();
    if (newSessionId) {
      navigate(`/session/${newSessionId}`);
    }
  }, [createSession, status.value, disconnect, clearMessages, navigate]);

  const handleSelectSession = React.useCallback(async (sessionId: string) => {
    // If we're in a call, end it before switching sessions
    if (status.value === 'connected') {
      await disconnect();
    }
    clearMessages();
    selectSession(sessionId);
    navigate(`/session/${sessionId}`);
  }, [selectSession, navigate, status.value, disconnect, clearMessages]);

  const handleDeleteSession = React.useCallback((sessionId: string) => {
    deleteSession(sessionId);
    // If we deleted the active session, create a new one
    if (sessions.find(s => s.id === sessionId)?.isActive) {
      handleNewChat();
    }
  }, [sessions, handleNewChat, deleteSession]);

  const handleRenameSession = React.useCallback((sessionId: string, newTitle: string) => {
    updateSession(sessionId, { title: newTitle });
  }, [updateSession]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hume Voice</span>
                  <span className="truncate text-xs">AI Chat</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="px-2">
              <div className="my-2 border-t" />
              <Button 
                variant="default" 
                onClick={handleNewChat} 
                className="w-full flex items-center gap-1.5 rounded-lg"
              >
                <Command className="size-4" />
                Start New Chat 
              </Button>
              <div className="my-2 border-t" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSessions 
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
        />
      </SidebarContent>
      <SidebarFooter>
        <SignedIn>
          <NavUser />
        </SignedIn>
        <SignedOut>
          <SignInButton 
            mode="modal"
            fallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          >
            <Button variant="default" className="w-full justify-start rounded-lg gap-2 p-4 h-14 font-normal">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
                <LogIn className="size-4" />  
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Sign In</p>
                <p className="text-xs text-muted-foreground">to start chatting</p>
              </div>
            </Button>
          </SignInButton>
        </SignedOut>
      </SidebarFooter>
    </Sidebar>
  )
}
