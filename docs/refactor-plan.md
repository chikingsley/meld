# Chat and State Management Refactor Plan

## Overview
This refactor aims to improve the state management and component structure of the chat system, following React best practices and recommendations from the Effect patterns guide. Each phase is designed to be independently implementable and testable.

## Phase 1: Core Types and Repositories
**Goal**: Establish base types and data access layer
**Files**: `src/types/`, `src/repositories/`

### Steps:
1. Create core type definitions
```typescript
// src/types/messages.ts
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    emotions?: Record<string, number>;
    prosody?: Record<string, number>;
  };
}

// src/types/session.ts
export interface Session {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}
```

2. Complete MessageRepository implementation
```typescript
// src/repositories/MessageRepository.ts
export class MessageRepository {
  async getMessages(sessionId: string): Promise<Message[]>;
  async addMessage(sessionId: string, message: Message): Promise<void>;
  async updateMessage(sessionId: string, messageId: string, updates: Partial<Message>): Promise<void>;
  async deleteMessage(sessionId: string, messageId: string): Promise<void>;
}
```

### Testing Criteria:
- [ ] All type definitions have complete TypeScript coverage
- [ ] MessageRepository methods handle both success and error cases
- [ ] Repository methods work with both local and remote storage
- [ ] Unit tests for all repository methods

## Phase 2: Core Hooks
**Goal**: Create foundational hooks for data management
**Files**: `src/hooks/`

### Steps:
1. Create useMessages hook
```typescript
// src/hooks/useMessages.ts
export function useMessages(sessionId: string | null) {
  // Returns { messages, isLoading, error }
}
```

2. Create useMessageSync hook
```typescript
// src/hooks/useMessageSync.ts
export function useMessageSync(sessionId: string | null) {
  // Handles syncing between local and remote
}
```

3. Create useMessageGroups hook
```typescript
// src/hooks/useMessageGroups.ts
export function useMessageGroups(messages: Message[]) {
  // Groups messages by date/session
}
```

### Testing Criteria:
- [ ] Hooks handle loading, error, and success states
- [ ] useMessages properly manages cache and remote data
- [ ] useMessageSync handles offline/online scenarios
- [ ] Unit tests for all hooks
- [ ] Integration tests for hook interactions

## Phase 3: Base Components
**Goal**: Create foundational UI components
**Files**: `src/components/chat-window/`

### Steps:
1. Create MessageItem component
```typescript
// src/components/chat-window/MessageItem.tsx
export function MessageItem({ message }: { message: Message }) {
  // Single message display with emotions
}
```

2. Create MessageGroup component
```typescript
// src/components/chat-window/MessageGroup.tsx
export function MessageGroup({ messages, date }: { messages: Message[], date: string }) {
  // Group of messages with date header
}
```

3. Create MessageList component
```typescript
// src/components/chat-window/MessageList.tsx
export function MessageList({ 
  messages, 
  scrollToMessageId 
}: { 
  messages: Message[], 
  scrollToMessageId?: string 
}) {
  // Virtualized list of message groups
}
```

### Testing Criteria:
- [ ] Components render correctly with different message types
- [ ] Components handle loading and error states
- [ ] Virtualization works efficiently with large message lists
- [ ] Unit tests for all components
- [ ] Storybook stories for visual testing

## Phase 4: State Management
**Goal**: Implement centralized state management
**Files**: `src/stores/`

### Steps:
1. Create message store
```typescript
// src/stores/messageStore.ts
interface MessageState {
  messages: Record<string, Message[]>;
  currentSessionId: string | null;
  isLoading: boolean;
  error: Error | null;
}
```

2. Create session store
```typescript
// src/stores/sessionStore.ts
interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  isLoading: boolean;
  error: Error | null;
}
```

### Testing Criteria:
- [ ] Stores handle all state transitions correctly
- [ ] State updates are atomic and consistent
- [ ] Proper error handling and recovery
- [ ] Unit tests for all store operations
- [ ] Integration tests for store interactions

## Phase 5: Chat Container Refactor
**Goal**: Refactor main Chat component
**Files**: `src/components/chat-window/Chat.tsx`

### Steps:
1. Create ChatContainer component
```typescript
// src/components/chat-window/ChatContainer.tsx
export function ChatContainer({ sessionId }: { sessionId: string }) {
  // Main chat layout and coordination
}
```

2. Update Chat component
```typescript
// src/components/chat-window/Chat.tsx
export function Chat({ sessionId }: { sessionId: string }) {
  // Simplified version using new components
}
```

### Testing Criteria:
- [ ] Chat handles all message operations correctly
- [ ] Proper error handling and recovery
- [ ] Performance testing with large message lists
- [ ] Integration tests for full chat functionality
- [ ] E2E tests for critical user flows

## Phase 6: Integration and Performance
**Goal**: Ensure everything works together efficiently

### Steps:
1. Implement proper error boundaries
2. Add performance monitoring
3. Implement proper loading states
4. Add retry mechanisms for failed operations

### Testing Criteria:
- [ ] No memory leaks in long chat sessions
- [ ] Smooth scrolling with large message lists
- [ ] Proper error recovery at all levels
- [ ] Performance benchmarks meet targets
- [ ] E2E tests pass consistently

## Testing Strategy
Each phase should include:
1. Unit tests for individual components/functions
2. Integration tests for related components
3. E2E tests for critical user flows
4. Performance benchmarks
5. Error handling tests

## Development Process
1. Create feature branch for each phase
2. Implement changes with tests
3. Review and benchmark
4. Merge only when all tests pass
5. Monitor in staging environment

## Rollback Plan
Each phase should include:
1. Documented rollback procedures
2. State migration plans
3. Data consistency checks
4. Monitoring alerts setup

## Success Metrics
- Test coverage > 80%
- Performance benchmarks met
- No regression in user metrics
- Improved code maintainability scores 