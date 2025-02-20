// src/components/sidebar/session-item.tsx
"use client"

import { useReducer, useCallback, memo } from "react"
import { MessageSquare, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

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

type EditingState = {
  isEditing: boolean
  title: string // Store the title directly in the state
}

type EditingAction =
  | { type: 'START_EDITING' }
  | { type: 'UPDATE_TITLE'; title: string }
  | { type: 'CONFIRM_EDIT' }
  | { type: 'CANCEL_EDIT' }

const editingReducer = (state: EditingState, action: EditingAction): EditingState => {
  switch (action.type) {
    case 'START_EDITING':
      return { isEditing: true, title: state.title }; // Keep the current title
    case 'UPDATE_TITLE':
      return { ...state, title: action.title };
    case 'CONFIRM_EDIT':
      return { isEditing: false, title: state.title }; // Keep title after confirm
    case 'CANCEL_EDIT':
      return { isEditing: false, title: state.title }; // Keep the title on cancel
    default:
      return state
  }
}

export const SessionItem = memo(({
  session,
  onSelect,
  onDelete,
  onRename
}: SessionItemProps) => {
  const [state, dispatch] = useReducer(editingReducer, {
    isEditing: false,
    title: session.title // Initialize with session's title
  });

  const handleRename = useCallback(() => {
    onRename(session.id, state.title); // Use the title from the reducer state
    dispatch({ type: 'CONFIRM_EDIT' });
  }, [session.id, state.title, onRename]);

  const handleCancel = useCallback(() => {
    dispatch({ type: 'CANCEL_EDIT' });
  }, []);

  const handleStartEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'START_EDITING' });
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(session.id);
  }, [session.id, onDelete]);

  const handleSelect = useCallback(() => {
    onSelect(session.id);
  }, [session.id, onSelect]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'UPDATE_TITLE', title: e.target.value });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') handleCancel();
  }, [handleRename, handleCancel]);

  return (
    <SidebarMenuItem className="relative hover:bg-accent/50">
      {state.isEditing ? (
        <div className="flex items-center gap-1 px-4 py-6">
          <MessageSquare className="size-4 shrink-0" />
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-1">
              <Input
                value={state.title}
                onChange={handleTitleChange}
                className="h-6 text-sm"
                autoFocus
                onKeyDown={handleKeyDown}
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
            onClick={handleSelect}
            data-active={session.isActive}
            size="md"
            className="peer w-full pr-20 transition-colors hover:bg-accent/50"
          >
            <MessageSquare className="size-4 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-1 flex-col min-w-0 gap-0.5">
              <span className="truncate font-medium">{session.title}</span>
              <span className="truncate text-xs text-muted-foreground/80">
                {session.timestamp}
              </span>
            </div>
          </SidebarMenuButton>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 peer-hover:opacity-100 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={handleStartEditing}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleDelete}
              title="Delete session"
            >
              <Trash2 className="size-3" strokeWidth={1.5} />
            </Button>
          </div>
        </>
      )}
    </SidebarMenuItem>
  );
});