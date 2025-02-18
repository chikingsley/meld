// src/components/sidebar/nav-sessions.tsx
"use client"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { SessionItem, type ChatSession } from "./session-item"; // Import SessionItem
import { memo, useCallback } from "react";

export interface NavSessionsProps {
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

const NavSessionsComponent = ({
  sessions,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: NavSessionsProps) => {

  // Memoize callback handlers
  const handleSelect = useCallback((id: string) => {
    onSelectSession(id);
  }, [onSelectSession]);

  const handleDelete = useCallback((id: string) => {
    onDeleteSession(id);
  }, [onDeleteSession]);

  const handleRename = useCallback((id: string, newTitle: string) => {
    onRenameSession(id, newTitle);
  }, [onRenameSession]);

  console.log("NavSessions rendering"); // Add console log

    // No real need to useMemo here anymore, SessionItem is already memoized
  return (
    <SidebarGroup className="py-4">
      <SidebarGroupLabel className="px-4 mb-2">Chat Sessions</SidebarGroupLabel>
      <SidebarMenu className="space-y-1 px-2">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// Memoize the entire component
export const NavSessions = memo(NavSessionsComponent);