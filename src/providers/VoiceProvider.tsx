// src/providers/VoiceProvider.tsx
import { type Hume } from 'hume';
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { noop } from '@/lib/hume/noop';
import { useCallDuration } from '@/hooks/hume/useCallDuration';
import { useEncoding } from '@/hooks/hume/useEncoding';
import { useMessages } from '@/hooks/hume/useMessages';
import { useMicrophone } from '@/hooks/hume/useMicrophone';
import { useSoundPlayer } from '@/hooks/hume/useSoundPlayer';
import { useToolStatus } from '@/hooks/useToolStatus';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  SocketConfig,
  ToolCallHandler,
  useVoiceClient,
  VoiceReadyState,
} from '@/hooks/hume/useVoiceClient';
import {
  AssistantTranscriptMessage,
  AudioOutputMessage,
  JSONMessage,
  UserInterruptionMessage,
  UserTranscriptMessage,
} from '@/types/hume-messages';

type VoiceError =
  | { type: 'socket_error'; message: string; error?: Error }
  | { type: 'audio_error'; message: string; error?: Error }
  | { type: 'mic_error'; message: string; error?: Error };

type VoiceStatus =
  | {
    value: 'disconnected' | 'disconnecting' | 'connecting' | 'connected';
    reason?: never;
  }
  | {
    value: 'error';
    reason: string;
  };

export type VoiceContextType = {
  connect: () => Promise<void>;
  disconnect: () => void;
  lastVoiceMessage: AssistantTranscriptMessage | null;
  lastUserMessage: UserTranscriptMessage | null;
  clearMessages: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  readyState: VoiceReadyState;
  sendUserInput: (text: string) => void;
  sendAssistantInput: (text: string) => void;
  sendSessionSettings: Hume.empathicVoice.chat.ChatSocket['sendSessionSettings'];
  sendToolMessage: (
    type:
      | Hume.empathicVoice.ToolResponseMessage
      | Hume.empathicVoice.ToolErrorMessage,
  ) => void;
  pauseAssistant: () => void;
  resumeAssistant: () => void;
  status: VoiceStatus;
  error: VoiceError | null;
  isAudioError: boolean;
  isError: boolean;
  isMicrophoneError: boolean;
  isSocketError: boolean;
  callDurationTimestamp: string | null;
  toolStatusStore: ReturnType<typeof useToolStatus>['store'];
  isPaused: boolean;
};

const VoiceContext = createContext<VoiceContextType | null>(null);

export type VoiceProviderProps = PropsWithChildren<SocketConfig> & {
  sessionSettings?: Hume.empathicVoice.SessionSettings;
  onMessage?: (message: JSONMessage) => void;
  onError?: (err: VoiceError) => void;
  onOpen?: () => void;
  onClose?: Hume.empathicVoice.chat.ChatSocket.EventHandlers['close'];
  onToolCall?: ToolCallHandler;
  onAudioReceived?: (audioOutputMessage: AudioOutputMessage) => void;
  onAudioStart?: (clipId: string) => void;
  onAudioEnd?: (clipId: string) => void;
  onInterruption?: (
    message: UserTranscriptMessage | UserInterruptionMessage,
  ) => void;
  /**
   * @default true
   * @description Clear messages when the voice is disconnected.
   */
  clearMessagesOnDisconnect?: boolean;
  /**
   * @default 100
   * @description The maximum number of messages to keep in memory.
   */
  messageHistoryLimit?: number;
};

export const useVoice = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoice must be used within an VoiceProvider');
  }
  return ctx;
};

export const VoiceProvider: FC<VoiceProviderProps> = ({
  children,
  clearMessagesOnDisconnect = true,
  messageHistoryLimit = 100,
  sessionSettings,
  verboseTranscription = true,
  ...props
}) => {
  const {
    timestamp: callDurationTimestamp,
    start: startTimer,
    stop: stopTimer,
  } = useCallDuration();

  const [status, setStatus] = useState<VoiceStatus>({
    value: 'disconnected',
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // error handling
  const [error, setError] = useState<VoiceError | null>(null);
  const isError = error !== null;

  const onError = useRef(props.onError ?? noop);
  onError.current = props.onError ?? noop;

  const onClose = useRef(props.onClose ?? noop);
  onClose.current = props.onClose ?? noop;

  const onMessage = useRef(props.onMessage ?? noop);
  onMessage.current = props.onMessage ?? noop;

  const onAudioReceived = useRef(props.onAudioReceived ?? noop);
  onAudioReceived.current = props.onAudioReceived ?? noop;

  const onAudioStart = useRef(props.onAudioStart ?? noop);
  onAudioStart.current = props.onAudioStart ?? noop;

  const onAudioEnd = useRef(props.onAudioEnd ?? noop);
  onAudioEnd.current = props.onAudioEnd ?? noop;

  const onInterruption = useRef(props.onInterruption ?? noop);
  onInterruption.current = props.onInterruption ?? noop;

  const toolStatus = useToolStatus();

  const messageStore = useMessages({
    sendMessageToParent: onMessage.current,
    messageHistoryLimit,
  });

  const updateError = useCallback((err: VoiceError | null) => {
    setError(err);
    if (err !== null) {
      onError.current?.(err);
    }
  }, []);

  const onClientError: NonNullable<
    Parameters<typeof useVoiceClient>[0]['onError']
  > = useCallback(
    (message, err) => {
      stopTimer();
      updateError({ type: 'socket_error', message, error: err });
    },
    [stopTimer, updateError],
  );

  const config = props;

  const player = useSoundPlayer({
    onError: (message) => {
      updateError({ type: 'audio_error', message });
    },
    onPlayAudio: (id: string) => {
      messageStore.onPlayAudio(id);
      onAudioStart.current(id);
    },
    onStopAudio: (id: string) => {
      onAudioEnd.current(id);
    },
  });

  const { streamRef, getStream, permission: micPermission } = useEncoding();

  const client = useVoiceClient({
    onAudioMessage: (message: AudioOutputMessage) => {
      // console.log('[VoiceProvider] Received audio message, adding to queue');
      player.addToQueue(message);
      onAudioReceived.current(message);
    },
    onMessage: useCallback(
      (message: JSONMessage) => {
        // console.log('[VoiceProvider] Received message:', message.type);
        messageStore.onMessage(message);

        if (
          message.type === 'user_interruption' ||
          message.type === 'user_message'
        ) {
          if (usePlayerStore.getState().isPlaying) {
            onInterruption.current(message);
          }
          player.clearQueue();
        }

        if (
          message.type === 'tool_call' ||
          message.type === 'tool_response' ||
          message.type === 'tool_error'
        ) {
          // console.log('[VoiceProvider] Processing tool message:', message.type);
          toolStatus.addToStore(message);
        }
      },
      [messageStore, player, toolStatus],
    ),
    onError: onClientError,
    onOpen: useCallback(() => {
      console.log('[VoiceProvider] WebSocket connection opened');
      startTimer();
      messageStore.createConnectMessage();
      props.onOpen?.();
    }, [messageStore, props, startTimer]),
    onClose: useCallback<
      NonNullable<Hume.empathicVoice.chat.ChatSocket.EventHandlers['close']>
    >(
      (event) => {
        console.log('[VoiceProvider] WebSocket connection closed');
        stopTimer();
        messageStore.createDisconnectMessage(event);
        onClose.current?.(event);
      },
      [messageStore, stopTimer],
    ),
    onToolCall: props.onToolCall,
  });

  const {
    sendAudio: clientSendAudio,
    sendUserInput: clientSendUserInput,
    sendAssistantInput: clientSendAssistantInput,
    sendSessionSettings: clientSendSessionSettings,
    sendToolMessage: clientSendToolMessage,
    sendPauseAssistantMessage,
    sendResumeAssistantMessage,
  } = client;

  const mic = useMicrophone({
    streamRef,
    onAudioCaptured: useCallback(
      (arrayBuffer) => {
        try {
          clientSendAudio(arrayBuffer);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          updateError({ type: 'socket_error', message });
        }
      },
      [clientSendAudio, updateError],
    ),
    onError: useCallback(
      (message) => {
        updateError({ type: 'mic_error', message });
      },
      [updateError],
    ),
  });

  const { clearQueue } = player;

  const pauseAssistant = useCallback(() => {
    try {
      sendPauseAssistantMessage();
      setIsPaused(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      updateError({ type: 'socket_error', message });
    }
    clearQueue();
  }, [sendPauseAssistantMessage, clearQueue, updateError]);

  const resumeAssistant = useCallback(() => {
    try {
      sendResumeAssistantMessage();
      setIsPaused(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      updateError({ type: 'socket_error', message });
    }
  }, [sendResumeAssistantMessage, updateError]);

  const connect = useCallback(async () => {
    if (isConnecting) {
      console.log('[VoiceProvider] Connection already in progress');
      return Promise.reject(new Error('Connection already in progress'));
    }

    if (status.value === 'connected') {
      console.log('[VoiceProvider] Already connected');
      return Promise.resolve();
    }

    console.log('[VoiceProvider] Initiating connection...');
    setIsConnecting(true);
    updateError(null);
    setStatus({ value: 'connecting' });

    try {
      const permission = await getStream();

      if (permission === 'denied') {
        console.error('[VoiceProvider] Microphone permission denied');
        const error: VoiceError = {
          type: 'mic_error',
          message: 'Microphone permission denied. Please grant microphone access and try again.',
        };
        updateError(error);
        throw error;
      }
      // console.log('[VoiceProvider] Microphone permission granted');

      try {
        // console.log('[VoiceProvider] Attempting to connect to voice service...');
        await client.connect({
          ...config,
          verboseTranscription: true,
        });
        // console.log('[VoiceProvider] Successfully connected to voice service');
      } catch (e) {
        const error: VoiceError = {
          type: 'socket_error',
          message: 'Could not establish voice connection. Please try again.',
          error: e instanceof Error ? e : undefined
        };
        // console.error('[VoiceProvider] Connection failed:', e);
        updateError(error);
        throw error;
      }

      const [micPromise, playerPromise] = await Promise.allSettled([
        mic.start(),
        player.initPlayer(),
      ]);

      if (micPromise.status === 'rejected') {
        throw new Error(micPromise.reason);
      }

      if (playerPromise.status === 'rejected') {
        throw new Error(playerPromise.reason);
      }

      // console.log('[VoiceProvider] Audio system initialized successfully');
      setStatus({ value: 'connected' });
    } catch (e) {
      // console.error('[VoiceProvider] Connection failed:', e);
      const error: VoiceError = {
        type: 'audio_error',
        message: e instanceof Error ? e.message : 'Could not initialize audio system',
      };
      updateError(error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [client, config, getStream, mic, player, updateError]);

  const disconnectFromVoice = useCallback(async () => {
    console.log('[VoiceProvider] Initiating voice disconnect...');
    setStatus({ value: 'disconnecting' });

    // Clean up any error state
    updateError(null);

    const cleanupPromises = [];

    // Disconnect WebSocket first to stop incoming data
    if (client.readyState !== VoiceReadyState.CLOSED) {
      cleanupPromises.push(
        new Promise<void>((resolve) => {
          client.disconnect();
          console.log('[VoiceProvider] Client disconnected');
          resolve();
        })
      );
    }

    // Stop audio playback and microphone
    cleanupPromises.push(
      new Promise<void>((resolve) => {
        player.stopAll();
        // console.log('[VoiceProvider] Audio player stopped');
        resolve();
      }),
      new Promise<void>((resolve) => {
        mic.stop();
        // console.log('[VoiceProvider] Microphone stopped');
        resolve();
      })
    );

    // Clear state
    cleanupPromises.push(
      new Promise<void>((resolve) => {
        // if (clearMessagesOnDisconnect) {
        //   messageStore.clearMessages();
        // }
        // toolStatus.clearStore();
        setIsPaused(false);
        resolve();
      })
    );

    try {
      await Promise.all(cleanupPromises);
      // console.log('[VoiceProvider] Voice system fully disconnected');
      setStatus({ value: 'disconnected' });
    } catch (e) {
      // console.error('[VoiceProvider] Error during disconnect:', e);
      const message = e instanceof Error ? e.message : 'Error during disconnect';
      updateError({ type: 'socket_error', message });
    }
  }, [
    client,
    player,
    mic,
    // clearMessagesOnDisconnect,
    toolStatus,
    messageStore,
  ]);

  const disconnect = useCallback(
    (disconnectOnError?: boolean) => {
      if (micPermission === 'denied') {
        setStatus({ value: 'error', reason: 'Microphone permission denied' });
      }

      stopTimer();

      disconnectFromVoice();

      if (status.value !== 'error' && !disconnectOnError) {
        // if status was 'error', keep the error status so we can show the error message to the end user.
        // otherwise, set status to 'disconnected'
        setStatus({ value: 'disconnected' });
      }
    },
    [micPermission, stopTimer, disconnectFromVoice, status.value],
  );

  useEffect(() => {
    if (
      error !== null &&
      status.value !== 'error' &&
      status.value !== 'disconnected' &&
      status.value !== 'disconnecting'
    ) {
      setStatus({ value: 'error', reason: error.message });
      if (error.type !== 'mic_error') { // Don't auto-reset mic permission errors
        // Set a timeout to clear the error
        const timeoutId = setTimeout(() => {
          updateError(null);
          setStatus({ value: 'disconnected' });
        }, 1000); // Give UI time to show error
        return () => clearTimeout(timeoutId);
      }
    }
  }, [error, status.value]);

  useEffect(() => {
    // disconnect from socket when the voice provider component unmounts
    return () => {
      disconnectFromVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendUserInput = useCallback(
    (text: string) => {
      console.log('[VoiceProvider] Sending user input:', text);
      try {
        clientSendUserInput(text);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error('[VoiceProvider] Error sending user input:', message);
        updateError({ type: 'socket_error', message });
      }
    },
    [clientSendUserInput, updateError],
  );

  const sendAssistantInput = useCallback(
    (text: string) => {
      console.log('[VoiceProvider] Sending assistant input:', text);
      try {
        clientSendAssistantInput(text);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error('[VoiceProvider] Error sending assistant input:', message);
        updateError({ type: 'socket_error', message });
      }
    },
    [clientSendAssistantInput, updateError],
  );

  const sendSessionSettings = useCallback(
    (sessionSettings: Hume.empathicVoice.SessionSettings) => {
      try {
        clientSendSessionSettings(sessionSettings);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        updateError({ type: 'socket_error', message });
      }
    },
    [clientSendSessionSettings, updateError],
  );

  useEffect(() => {
    if (
      client.readyState === VoiceReadyState.OPEN &&
      sessionSettings !== undefined &&
      Object.keys(sessionSettings).length > 0
    ) {
      sendSessionSettings(sessionSettings);
    }
  }, [client.readyState, sendSessionSettings, sessionSettings]);

  const sendToolMessage = useCallback(
    (
      message:
        | Hume.empathicVoice.ToolResponseMessage
        | Hume.empathicVoice.ToolErrorMessage,
    ) => {
      try {
        clientSendToolMessage(message);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        updateError({ type: 'socket_error', message });
      }
    },
    [clientSendToolMessage, updateError],
  );

  const stateValue = useMemo(
    () => ({
      status,
      error,
      isPaused,
    }),
    [status, error, isPaused]
  );

  const actionsValue = useMemo(
    () => ({
      connect,
      disconnect,
      sendUserInput,
      clearMessages: messageStore.clearMessages,
      sendSessionSettings,
    }),
    [connect, disconnect, sendUserInput, messageStore.clearMessages, sendSessionSettings]
  );

  const contextValue = useMemo(
    () => ({
      ...stateValue,
      ...actionsValue,
      lastVoiceMessage: messageStore.lastVoiceMessage,
      lastUserMessage: messageStore.lastUserMessage,
      readyState: client.readyState,
      sendAssistantInput,
      sendSessionSettings,
      sendToolMessage,
      pauseAssistant,
      resumeAssistant,
      muteAudio: player.muteAudio,
      unmuteAudio: player.unmuteAudio,
      isAudioError: error?.type === 'audio_error',
      isMicrophoneError: error?.type === 'mic_error',
      isSocketError: error?.type === 'socket_error',
      isError,
      callDurationTimestamp,
      toolStatusStore: toolStatus.store,
    }),
    [
      stateValue,
      actionsValue,
      client.readyState,
      sendAssistantInput,
      sendSessionSettings,
      sendToolMessage,
      pauseAssistant,
      resumeAssistant,
      player.muteAudio,
      player.unmuteAudio,
      error,
      callDurationTimestamp,
      toolStatus.store,
    ]
  );

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
};