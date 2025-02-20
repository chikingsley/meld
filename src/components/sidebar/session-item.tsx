// src/components/sidebar/session-item.tsx
"use client"

import { useReducer, useCallback, memo, useRef, useEffect } from "react"
import { MessageSquare, Trash2 } from "lucide-react"
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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'START_EDITING' });
  }, []);

  // Handle click outside
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!state.isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (state.title !== session.title) {
          handleRename();
        } else {
          handleCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.isEditing, state.title, session.title, handleRename, handleCancel]);

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
    <SidebarMenuItem className="group/item relative hover:bg-accent/50">
      {state.isEditing ? (
        <SidebarMenuButton
          data-active={session.isActive}
          size="md"
          className="w-full transition-colors group-hover/item:pr-16 [&:not(.group-hover/item)]:pr-4"
        >
          <MessageSquare className="size-4 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-1 flex-col min-w-0 gap-0.5">
            <Input
              ref={inputRef}
              value={state.title}
              onChange={handleTitleChange}
              className="h-6 min-h-0 px-0 py-0 text-sm bg-transparent border-none focus-visible:ring-0 font-medium"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <span className="truncate text-xs text-muted-foreground/80">
              {session.timestamp}
            </span>
          </div>
        </SidebarMenuButton>
      ) : (
        <>
          <SidebarMenuButton
            onClick={handleSelect}
            onDoubleClick={handleDoubleClick}
            data-active={session.isActive}
            size="md"
            className="w-full transition-colors group-hover/item:pr-16 [&:not(.group-hover/item)]:pr-4"
          >
            <MessageSquare className="size-4 shrink-0" strokeWidth={1.5} />
            <div className="flex flex-1 flex-col min-w-0 gap-0.5 transition-[padding] duration-200">
              <span className="truncate font-medium">{session.title}</span>
              <span className="truncate text-xs text-muted-foreground/80">
                {session.timestamp}
              </span>
            </div>
          </SidebarMenuButton>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
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