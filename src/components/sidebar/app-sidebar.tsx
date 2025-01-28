import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
import { NavSessions } from "@/components/sidebar/nav-sessions"
import { NavUser } from "@/components/sidebar/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Button } from "../ui/button"

const data = {
  sessions: [
    {
      id: "1",
      title: "Chat about React Performance",
      timestamp: "2 hours ago",
      isActive: true,
    },
    {
      id: "2",
      title: "TypeScript Discussion",
      timestamp: "Yesterday",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const handleNewChat = React.useCallback(() => {
    console.log("New chat clicked")
  }, [])

  const handleSelectSession = React.useCallback((sessionId: string) => {
    console.log("Selected session:", sessionId)
  }, [])

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
              <Button variant="default" onClick={handleNewChat} className="w-full flex items-center gap-1.5 rounded-lg">
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
          sessions={data.sessions}
          onSelectSession={handleSelectSession}
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
