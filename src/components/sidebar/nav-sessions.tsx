// src/components/sidebar/nav-sessions.tsx
"use client"

import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react"
import { useState } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ChatSession {
  id: string
  title: string
  timestamp: string
  isActive?: boolean
}

interface SessionItemProps {
  session: ChatSession
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
}

function SessionItem({ session, onSelect, onDelete, onRename }: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newTitle, setNewTitle] = useState(session.title)

  const handleRename = () => {
    onRename(session.id, newTitle)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setNewTitle(session.title)
    setIsEditing(false)
  }

  return (
    <SidebarMenuItem className="group relative">
      {isEditing ? (
        <div className="flex items-center gap-1 px-4 py-2">
          <MessageSquare className="size-4 shrink-0" />
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-1">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-6 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleRename}
              >
                <Check className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleCancel}
              >
                <X className="size-3" />
              </Button>
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {session.timestamp}
            </span>
          </div>
        </div>
      ) : (
        <>
          <SidebarMenuButton 
            onClick={() => onSelect(session.id)}
            data-active={session.isActive}
            className="w-full pr-20" // Make room for action buttons
          >
            <MessageSquare className="size-4 shrink-0" />
            <div className="flex flex-1 flex-col min-w-0">
              <span className="truncate">{session.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {session.timestamp}
              </span>
            </div>
          </SidebarMenuButton>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </>
      )}
    </SidebarMenuItem>
  )
}

export function NavSessions({
  sessions,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: {
  sessions: ChatSession[]
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newTitle: string) => void
}) {
  return (
    <SidebarGroup className="py-4">
      <SidebarGroupLabel className="px-4 mb-2">Chat Sessions</SidebarGroupLabel>
      <SidebarMenu className="space-y-1 px-2">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onSelect={onSelectSession}
            onDelete={onDeleteSession}
            onRename={onRenameSession}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 