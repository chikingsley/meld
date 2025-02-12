# Performance Optimization Plan

## Problem Statement
Several components are re-rendering excessively during voice calls, particularly components using the `useVoice` hook. This is impacting performance and needs to be optimized.

## Components to Optimize

### 1. Chat Component (`Chat.tsx`)
#### Current Issues:
- Re-renders on every message change
- Complex message processing on every render
- Multiple useEffects watching messages/status

#### Optimizations:
```typescript
// 1. Move message processing into useMemo
const processedMessages = useMemo(() => {
  const converted = storedMessages.map(/* conversion logic */);
  const withIds = messages.map(/* id logic */);
  return deduplicateMessages(converted, withIds);
}, [storedMessages, messages]);

// 2. Memoize child components
const MemoizedMessages = memo(Messages);
const MemoizedBottomControls = memo(BottomControls);

// 3. Use useReducer for message state
const [messageState, dispatch] = useReducer(messageReducer, initialState);

// 4. Debounce scroll effect
const debouncedScroll = useMemo(
  () => debounce((ref) => {
    /* scroll logic */
  }, 200),
  []
);
```

### 2. BottomControls Component (`BottomControls.tsx`)
#### Current Issues:
- Re-renders on every status change
- Unmemoized handlers
- Nested animation components

#### Optimizations:
```typescript
// 1. Memoize handlers
const handleStartCall = useCallback(async () => {
  /* existing logic */
}, [sessionId, sendSessionSettings, connect]);

// 2. Extract Controls component
const MemoizedControls = memo(Controls);

// 3. Memoize computed values
const showControls = useMemo(() => 
  status.value === "connected" || isTransitioning,
  [status.value, isTransitioning]
);
```

### 3. NavSessions Component (`nav-sessions.tsx`)
#### Current Issues:
- Each SessionItem re-renders on parent updates
- Unmemoized event handlers
- Editing state causes unnecessary re-renders

#### Optimizations:
```typescript
// 1. Memoize SessionItem component
const MemoizedSessionItem = memo(SessionItem);

// 2. Memoize handlers at parent level
const handleSelect = useCallback((id: string) => {
  onSelectSession(id);
}, [onSelectSession]);

// 3. Optimize editing state
const [editingState, dispatch] = useReducer(editingReducer, {});
```

### 4. AppSidebar Component (`app-sidebar.tsx`)
#### Current Issues:
- Re-renders on voice status changes
- Unmemoized session handlers
- Deep prop drilling

#### Optimizations:
```typescript
// 1. Extract voice-dependent logic
const VoiceStatus = memo(({ status, onDisconnect }) => {
  /* voice status logic */
});

// 2. Create session context
const SessionContext = createContext({
  sessions: [],
  actions: { /* ... */ }
});

// 3. Memoize session handlers
const sessionHandlers = useMemo(() => ({
  onSelect: handleSelectSession,
  onDelete: handleDeleteSession,
  onRename: handleRenameSession
}), [handleSelectSession, handleDeleteSession, handleRenameSession]);
```

### 5. Controls Component (`Controls.tsx`)
#### Current Issues:
- Frequent FFT updates causing re-renders
- Unmemoized voice controls
- Unnecessary parent re-renders

#### Optimizations:
```typescript
// 1. Optimize FFT visualization
const FFTVisualizer = memo(({ fft }) => {
  /* FFT visualization with RAF */
}, (prev, next) => {
  // Custom comparison for FFT data
  return areFFTArraysSimilar(prev.fft, next.fft);
});

// 2. Memoize voice controls
const VoiceControls = memo(({ isMuted, onToggle }) => {
  /* voice control UI */
});
```

## New Components/Contexts to Create

### 1. Voice Context
```typescript
const VoiceContext = createContext({
  status: null,
  messages: [],
  isMuted: false,
  // ... other voice state
});
```

### 2. Session Context
```typescript
const SessionContext = createContext({
  sessions: [],
  currentSession: null,
  actions: {
    select: () => {},
    create: () => {},
    delete: () => {},
    rename: () => {}
  }
});
```

### 3. Message Context
```typescript
const MessageContext = createContext({
  messages: [],
  storedMessages: [],
  actions: {
    add: () => {},
    clear: () => {},
    save: () => {}
  }
});
```

## Implementation Strategy

### Phase 1: Context Setup
1. Create Voice, Session, and Message contexts
2. Move state management to contexts
3. Update components to use context instead of props

### Phase 2: Component Optimization
1. Implement memoization for all components
2. Add proper dependency arrays to hooks
3. Extract and optimize FFT visualization

### Phase 3: Performance Monitoring
1. Add React profiler measurements
2. Monitor re-render frequency
3. Verify optimization impact

### Phase 4: Additional Optimizations
1. Implement debouncing/throttling where needed
2. Add virtualization for long lists
3. Optimize animations and transitions

## Success Metrics
- Reduced number of re-renders during voice calls
- Smooth FFT visualization without impacting other components
- Improved overall application responsiveness
