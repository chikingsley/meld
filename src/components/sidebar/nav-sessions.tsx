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
  onSelectSession: (sessionId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRenameSession: (sessionId: string, newTitle: string) => Promise<void>;
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

  // console.log("NavSessions rendering", {
  //   sessionsLength: sessions.length,
  //   sessionIds: sessions.map(s => s.id),
  //   hasCallbacks: {
  //     onSelectSession: !!onSelectSession,
  //     onDeleteSession: !!onDeleteSession,
  //     onRenameSession: !!onRenameSession
  //   }
  // });

    // No real need to useMemo here anymore, SessionItem is already memoized
  const sessionList = React.useMemo(() => (
    sessions.map((session) => (
      <SessionItem
        key={session.id}
        session={session}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onRename={handleRename}
      />
    ))
  ), [sessions, handleSelect, handleDelete, handleRename]);

  return (
    <SidebarGroup className="py-4">
      <SidebarGroupLabel className="px-4 mb-2">Chat Sessions</SidebarGroupLabel>
      <SidebarMenu className="space-y-1 px-2">
        {sessionList}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// Memoize the entire component
export const NavSessions = memo(NavSessionsComponent);