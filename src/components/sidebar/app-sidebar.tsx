import * as React from "react"
import { Command, LogIn } from "lucide-react"
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react"
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
import { useSessionContext } from "@/providers/SessionProvider"

export default React.memo(function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    isVoiceMode,
    setVoiceMode,
  } = useSessionContext();

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
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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