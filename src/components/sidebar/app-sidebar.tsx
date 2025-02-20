// src/components/sidebar/app-sidebar.tsx
import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
import { NavSessions } from "@/components/sidebar/nav-sessions"
import { NavUser } from "@/components/sidebar/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "../ui/button"
import { useNavigate } from "react-router-dom"
import { useSessionContext } from "@/contexts/SessionContext"
import { SessionHandlerWrapper, useSessionHandlers } from "@/components/sidebar/session-handler"

const SidebarInner = ({ className, ...props }: React.ComponentProps<typeof Sidebar>) => {
  const { sessions, updateSession, loading, error } = useSessionContext();
  const sessionHandlers = useSessionHandlers();

  // Base handlers for operations that don't need voice disconnect
  const baseHandlers = React.useMemo(() => ({
    handleRenameSession: async (id: string, newTitle: string) => {
      await updateSession(id, { title: newTitle });
    }
  }), [updateSession]);

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
                onClick={sessionHandlers.handleCreateSession} 
                className="w-full flex items-center gap-1.5 rounded-lg"
                disabled={loading}
              >
                <Command className="size-4" />
                {loading ? 'Creating Chat...' : 'Start New Chat'}
              </Button>
              {error && (
                <p className="text-xs text-destructive mt-2">{error}</p>
              )}
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
            onSelectSession={sessionHandlers.handleSelectSession}
            onDeleteSession={sessionHandlers.handleDeleteSession}
            onRenameSession={baseHandlers.handleRenameSession}
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
  );
};

const AppSidebarComponent = (props: React.ComponentProps<typeof Sidebar>) => {
  const { createSession, selectSession, deleteSession } = useSessionContext();
  const navigate = useNavigate();

  return (
    <SessionHandlerWrapper
      onCreateSession={async () => {
        await createSession();
      }}
      onSelectSession={async (id: string) => {
        await selectSession(id);
        navigate(`/session/${id}`);
      }}
      onDeleteSession={async (id: string) => {
        await deleteSession(id);
      }}
    >
      <SidebarInner {...props} />
    </SessionHandlerWrapper>
  );
};

// Memoize the entire component
export const AppSidebar = React.memo(AppSidebarComponent);