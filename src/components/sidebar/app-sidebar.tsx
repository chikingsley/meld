import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
import { useNavigate } from "react-router-dom"

import { NavSessions } from "@/components/sidebar/nav-sessions"
import { NavUser } from "@/components/sidebar/nav-user"
import { TextVoiceSwitch } from "@/components/ui/text-voice-switch"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { useSessionContext } from "@/lib/SessionProvider"
import { useSessionHandlers } from "@/components/sidebar/session-handler"

export default React.memo(function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    selectSession,
    isVoiceMode,
    setVoiceMode,
    loading,
    error
  } = useSessionContext();

  const navigate = useNavigate();

  // Combined handlers that include navigation
  const handleCreateSession = async () => {
    const sessionId = await createSession();
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    }
  };

  const handleSelectSession = async (id: string) => {
    await selectSession(id);
    navigate(`/session/${id}`);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    // After deleting, navigate to root if we were viewing that session
    const currentPath = window.location.pathname;
    if (currentPath.includes(id)) {
      navigate('/');
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    await updateSession(id, { title: newTitle });
  };

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
                  <span className="truncate font-semibold">Rivena AI</span>
                  <span className="truncate text-xs">Therapy Chat</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="mt-2 px-2">
              <Button
                variant="default"
                onClick={handleCreateSession}
                className="w-full flex items-center gap-1.5 rounded-lg"
                disabled={loading}
              >
                <Command className="size-4" />
                {loading ? 'Creating Chat...' : 'Start New Chat'}
              </Button>
              {error && (
                <p className="text-xs text-destructive mt-2">{error.toString()}</p>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading && sessions.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Loading sessions...</div>
        ) : error && sessions.length === 0 ? (
          <p className="text-xs text-destructive mt-2">{error.toString()}</p>
        ) : (
          <NavSessions
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SignedIn>
          <TextVoiceSwitch isVoiceMode={isVoiceMode} onModeChange={setVoiceMode} />
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
  );
});