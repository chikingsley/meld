// src/layout.tsx
import { Outlet } from 'react-router-dom'
import AppSidebar from '@/components/sidebar/app-sidebar'
import { SidebarProvider } from "@/components/ui/sidebar"

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar className="h-screen shrink-0" />
        <main className="flex-1 h-screen overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}