// src/components/sidebar/app-sidebar.tsx
import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
import { NavSessions } from "@/components/sidebar/nav-sessions"
import { NavUser } from "@/components/sidebar/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { useVoice } from "@/lib/hume-lib/VoiceProvider"
import { useNavigate } from "react-router-dom"
import { useSessionContext } from "@/contexts/SessionContext"

const AppSidebarComponent = ({ className, ...props }: React.ComponentProps<typeof Sidebar>) => {
  console.log("AppSidebar rendering");  // Add logging to track renders
  const { sessions, createSession, selectSession, deleteSession, updateSession, loading, error } = useSessionContext();
  const { status, disconnect, clearMessages } = useVoice();
  const navigate = useNavigate();

  const handleNewChat = React.useCallback(async () => {
    // End current call if any
    if (status.value === 'connected') {
      await disconnect();
    }
    // Clear current messages
    clearMessages();
    // Create new session and navigate (createSession now handles navigation)
    await createSession();
  }, [createSession, status.value, disconnect, clearMessages]);

  const handleSelectSession = React.useCallback(async (sessionId: string) => {
    // If we're in a call, end it before switching sessions
    if (status.value === 'connected') {
      await disconnect();
    }
    clearMessages();
    selectSession(sessionId);
    navigate(`/session/${sessionId}`);
  }, [selectSession, navigate, status.value, disconnect, clearMessages]);

  const handleDeleteSession = React.useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      // If we deleted the active session, create a new one
      if (sessions.find(s => s.id === sessionId)?.isActive) {
        await handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [sessions, handleNewChat, deleteSession]);

  const handleRenameSession = React.useCallback(async (sessionId: string, newTitle: string) => {
    try {
      await updateSession(sessionId, { title: newTitle });
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  }, [updateSession]);

  return (
    <Sidebar variant="inset" className={className} {...props}>
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
                disabled={loading}
              >
                <Command className="size-4" />
                {loading ? 'Creating Chat...' : 'Start New Chat'}
              </Button>
              {error && (
                <p className="text-xs text-destructive mt-2">{error}</p>
              )}
              <div className="my-2 border-t" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading && sessions.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Loading sessions...</div>
        ) : error && sessions.length === 0 ? (
          <div className="p-4 text-sm text-destructive">{error}</div>
        ) : (
          <NavSessions 
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRename={handleRenameSession}
          />
        )}
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

// Memoize the entire component
export const AppSidebar = React.memo(AppSidebarComponent);
