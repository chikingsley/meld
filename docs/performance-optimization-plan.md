# Performance Optimization Plan

## Problem Statement
The application is experiencing excessive re-renders during voice calls due to a monolithic context provider (VoiceProvider) that combines frequently updating audio data with stable application state. This causes unnecessary re-renders in components that only need access to stable state values.

## Component Analysis

### VoiceProvider Issues
1. Combines all voice-related state into a single context:
   - Frequently updating FFT data (micFft, fft)
   - Stable state (status, error, isPaused)
   - Message state (messages, lastVoiceMessage)
   - Audio control state (isMuted, isPlaying)

2. Context value includes too many dependencies in useMemo:
```typescript
const ctx = useMemo(
  () => ({
    connect,
    disconnect,
    fft: player.fft,          // Updates frequently
    micFft: mic.fft,          // Updates frequently
    isMuted: mic.isMuted,     // Stable
    messages: messageStore.messages,  // Updates with messages
    status,                   // Stable
    // ... many more values
  }),
  [/* long list of dependencies */]
);
```

### Component Re-render Chain
```
VoiceProvider (context updates frequently)
├── AppSidebar (re-renders on status changes)
│   └── NavSessions (memoized, but parent re-renders)
├── BottomControls (unmemoized, uses status)
│   └── Controls (unmemoized, uses micFft)
│       └── MicFFT (receives new FFT data constantly)
└── Other components using useVoice()
```

## Optimization Strategy

### 1. Context Segregation
Split VoiceProvider into multiple specialized contexts based on update frequency:

```typescript
// High-frequency updates (audio visualization)
const AudioVisualizationContext = createContext<{
  fft: number[];
  micFft: number[];
} | null>(null);

// Medium-frequency updates (messages)
const VoiceMessagesContext = createContext<{
  messages: Message[];
  lastVoiceMessage: Message | null;
  lastUserMessage: Message | null;
} | null>(null);

// Low-frequency updates (connection state)
const VoiceStateContext = createContext<{
  status: VoiceStatus;
  error: VoiceError | null;
  isMuted: boolean;
  isPlaying: boolean;
  isPaused: boolean;
} | null>(null);

// Actions (no state, just methods)
const VoiceActionsContext = createContext<{
  connect: () => Promise<void>;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  sendUserInput: (text: string) => void;
} | null>(null);
```

### 2. Component Optimizations

#### BottomControls.tsx
```typescript
const BottomControls = React.memo(({ sessionId, onNewSession }: BottomControlsProps) => {
  // Only subscribe to needed state
  const { status } = useVoiceState();
  const { connect, disconnect } = useVoiceActions();
  
  // ... rest of component
});
```

#### Controls.tsx
```typescript
const Controls = React.memo(({ onEndCall }: ControlsProps) => {
  // Split state subscriptions
  const { isMuted } = useVoiceState();
  const { mute, unmute } = useVoiceActions();
  const { micFft } = useAudioVisualization();
  
  // ... rest of component
});
```

#### MicFFT.tsx
```typescript
// Convert to canvas-based rendering
const MicFFT = React.memo(({ fft, className }: MicFFTProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Render FFT data to canvas
    renderFFT(ctx, fft);
  }, [fft]);
  
  return <canvas ref={canvasRef} className={className} />;
});
```

### 3. Implementation Steps

1. Create new context files:
   - src/lib/hume-lib/contexts/AudioVisualizationContext.tsx
   - src/lib/hume-lib/contexts/VoiceMessagesContext.tsx
   - src/lib/hume-lib/contexts/VoiceStateContext.tsx
   - src/lib/hume-lib/contexts/VoiceActionsContext.tsx

2. Refactor VoiceProvider to use new contexts:
```typescript
export const VoiceProvider = ({ children }: PropsWithChildren) => {
  // ... existing state management ...
  
  return (
    <VoiceStateContext.Provider value={stateValue}>
      <VoiceActionsContext.Provider value={actionsValue}>
        <VoiceMessagesContext.Provider value={messagesValue}>
          <AudioVisualizationContext.Provider value={visualizationValue}>
            {children}
          </AudioVisualizationContext.Provider>
        </VoiceMessagesContext.Provider>
      </VoiceActionsContext.Provider>
    </VoiceStateContext.Provider>
  );
};
```

3. Add memoization to all components using voice contexts

4. Convert MicFFT to canvas-based rendering

### 4. Performance Monitoring

1. Add render logging in development:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(`[${componentName}] rendering`, {
    props,
    state
  });
}
```

2. Use React DevTools Profiler to:
   - Measure render counts
   - Identify unnecessary re-renders
   - Verify context splitting effectiveness

3. Monitor frame rate during voice calls

### 5. Additional Optimizations

1. Consider using Web Workers for FFT processing
2. Implement request animation frame throttling for FFT updates
3. Add virtualization for message lists
4. Use transition API for non-urgent state updates

## Implementation Status

### Completed
1. Context Segregation
   - ✅ AudioVisualizationContext implemented for FFT data
   - ✅ VoiceMessagesContext implemented for message state
   - ✅ VoiceStateContext implemented for connection state
   - ✅ VoiceActionsContext implemented for methods
   - ✅ VoiceProvider updated to use nested context providers

### In Progress
1. Component Optimizations
   - 🟡 Memoization of components using voice contexts
   - 🟡 Canvas-based rendering for MicFFT
   - 🟡 Optimizing re-render chains

### Not Started
1. Performance Monitoring
   - ⭕ Development render logging
   - ⭕ React DevTools Profiler integration
   - ⭕ Frame rate monitoring during voice calls

2. Additional Optimizations
   - ⭕ Web Workers for FFT processing
   - ⭕ RequestAnimationFrame throttling
   - ⭕ Message list virtualization
   - ⭕ React Transition API implementation

### Next Steps
1. Implement component-level optimizations:
   - Add React.memo to components using voice contexts
   - Convert MicFFT to canvas-based rendering
   - Review and optimize re-render chains

2. Set up performance monitoring:
   - Add development render logging
   - Configure React DevTools Profiler
   - Implement frame rate monitoring

3. Evaluate and implement additional optimizations based on monitoring results
