// src/contexts/VoiceContext.tsx
import {
    createContext,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
  } from 'react';
  import {
    useVoice
    UserMessage,
    AssistantMessage,
    ConnectionMessage,
    UserInterruptionMessage,
    JSONErrorMessage,
    SessionSettings,
    ToolResponse,
    ToolError,
  } from '@/lib/hume-lib/VoiceProvider';
  
  // Define a union type for all possible message types.  This is much better
  // than `any`.
  type VoiceMessage =
    | UserMessage
    | AssistantMessage
    | ConnectionMessage
    | UserInterruptionMessage
    | JSONErrorMessage;
  
  // Define the interface for the context state, extending the useVoice hook
  interface VoiceContextState {
    status: ReturnType<typeof useVoice>['status'];
    messages: VoiceMessage[]; // Use the union type
    isMuted: ReturnType<typeof useVoice>['isMuted'];
    micFft: ReturnType<typeof useVoice>['micFft'];
    connect: ReturnType<typeof useVoice>['connect'];
    disconnect: ReturnType<typeof useVoice>['disconnect'];
    sendSessionSettings: ReturnType<typeof useVoice>['sendSessionSettings'];
    clearMessages: ReturnType<typeof useVoice>['clearMessages'];
    mute: ReturnType<typeof useVoice>['mute'];
    unmute: ReturnType<typeof useVoice>['unmute'];
    sendUserInput: ReturnType<typeof useVoice>['sendUserInput']; // Add sendUserInput
    sendAssistantInput: ReturnType<typeof useVoice>['sendAssistantInput']; // Add sendAssistantInput
    sendToolMessage: ReturnType<typeof useVoice>['sendToolMessage'];
    pauseAssistant: ReturnType<typeof useVoice>['pauseAssistant'];
    resumeAssistant: ReturnType<typeof useVoice>['resumeAssistant'];
    isPlaying: ReturnType<typeof useVoice>['isPlaying'];
    isPaused: ReturnType<typeof useVoice>['isPaused'];
    fft: ReturnType<typeof useVoice>['fft'];
    lastVoiceMessage: ReturnType<typeof useVoice>['lastVoiceMessage'];
    lastUserMessage: ReturnType<typeof useVoice>['lastUserMessage'];
    readyState: ReturnType<typeof useVoice>['readyState'];
    error: ReturnType<typeof useVoice>['error'];
    isError: ReturnType<typeof useVoice>['isError'];
    isAudioError: ReturnType<typeof useVoice>['isAudioError'];
    isMicrophoneError: ReturnType<typeof useVoice>['isMicrophoneError'];
    isSocketError: ReturnType<typeof useVoice>['isSocketError'];
    callDurationTimestamp: ReturnType<typeof useVoice>['callDurationTimestamp'];
    toolStatusStore: ReturnType<typeof useVoice>['toolStatusStore'];
    chatMetadata: ReturnType<typeof useVoice>['chatMetadata'];
    playerQueueLength: ReturnType<typeof useVoice>['playerQueueLength'];
  }
  
  // Create the context with a default (empty) state.  This is important!
  // Provide default NO-OP functions.
  const VoiceContext = createContext<VoiceContextState>({
    status: { value: 'disconnected' }, // Default status
    messages: [],
    isMuted: false,
    micFft: [],
    connect: () => Promise.resolve(), // No-op function
    disconnect: () => {}, // No-op function
    sendSessionSettings: () => {}, // No-op function
    clearMessages: () => {}, // No-op function
    mute: () => {},
    unmute: () => {},
    sendUserInput: () => {}, // Add sendUserInput
    sendAssistantInput: () => {}, // Add sendAssistantInput
    sendToolMessage: () => {},
    pauseAssistant: () => {},
    resumeAssistant: () => {},
    isPlaying: false,
    isPaused: false,
    fft: [],
    lastVoiceMessage: null,
    lastUserMessage: null,
    readyState: 0, // Assuming 0 is a valid default readyState
    error: null,
    isError: false,
    isAudioError: false,
    isMicrophoneError: false,
    isSocketError: false,
    callDurationTimestamp: null,
    toolStatusStore: {},
    chatMetadata: null,
    playerQueueLength: 0
  });
  
  // Provider component
  export const VoiceProviderWrapper: React.FC<{ children: ReactNode }> = ({
    children,
  }) => {
    const voice = useVoice(); // Use the hook within the provider
  
    // Use useMemo to prevent unnecessary re-renders of the context value.
    const value: VoiceContextState = useMemo(
      () => ({
        status: voice.status,
        messages: voice.messages as VoiceMessage[], // Cast to the union type
        isMuted: voice.isMuted,
        micFft: voice.micFft,
        connect: voice.connect,
        disconnect: voice.disconnect,
        sendSessionSettings: voice.sendSessionSettings,
        clearMessages: voice.clearMessages,
        mute: voice.mute,
        unmute: voice.unmute,
        sendUserInput: voice.sendUserInput,
        sendAssistantInput: voice.sendAssistantInput,
        sendToolMessage: voice.sendToolMessage,
        pauseAssistant: voice.pauseAssistant,
        resumeAssistant: voice.resumeAssistant,
        isPlaying: voice.isPlaying,
        isPaused: voice.isPaused,
        fft: voice.fft,
        lastVoiceMessage: voice.lastVoiceMessage,
        lastUserMessage: voice.lastUserMessage,
        readyState: voice.readyState,
        error: voice.error,
        isError: voice.isError,
        isAudioError: voice.isAudioError,
        isMicrophoneError: voice.isMicrophoneError,
        isSocketError: voice.isSocketError,
        callDurationTimestamp: voice.callDurationTimestamp,
        toolStatusStore: voice.toolStatusStore,
        chatMetadata: voice.chatMetadata,
        playerQueueLength: voice.playerQueueLength,
      }),
      [voice],
    ); // Depend on the entire `voice` object
  
    return (
      <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
    );
  };
  
  // Custom hook to use the context
  export const useVoiceContext = () => {
    const context = useContext(VoiceContext);
    if (!context) {
      throw new Error(
        'useVoiceContext must be used within a VoiceProviderWrapper',
      );
    }
    return context;
  };