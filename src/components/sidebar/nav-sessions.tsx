// src/components/sidebar/nav-sessions.tsx
"use client"

import {
  SidebarGroup,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { SessionItem, type ChatSession } from "./session-item"; // Import SessionItem
import React, { memo, useCallback } from "react";

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

  // No real need to useMemo here anymore, SessionItem is already memoized
  const sessionList = React.useMemo(() => (
    // Filter out any duplicate sessions by id
    sessions
      .filter((session, index, self) => 
        index === self.findIndex((s) => s.id === session.id)
      )
      .map((session) => (
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
    <SidebarGroup>
      <SidebarMenu className="space-y-0.5 px-2">
        {sessionList}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// Memoize the entire component
export const NavSessions = memo(NavSessionsComponent);