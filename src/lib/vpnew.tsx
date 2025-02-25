// src/lib/VoiceProvider.tsx
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

import { ConnectionMessage } from './connection-message';
import { useCallDuration } from '../hooks/useCallDuration';
import { useEncoding } from '../hooks/useEncoding';
import { useMessages } from '../hooks/useMessages';
import { useMicrophone } from '../hooks/useMicrophone';
import { useSoundPlayer } from '../hooks/useSoundPlayer';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useMessagePersistence } from '@/db/message-manager';
import {
  SocketConfig,
  useVoiceClient,
  VoiceReadyState,
} from '../hooks/useVoiceClient';
import {
  AssistantTranscriptMessage,
  AudioOutputMessage,
  ChatMetadataMessage,
  JSONMessage,
  UserInterruptionMessage,
  UserTranscriptMessage,
} from '../models/messages';

type VoiceError =
  | { type: 'socket_error'; message: string; error?: Error }
  | { type: 'audio_error'; message: string; error?: Error }
  | { type: 'mic_error'; message: string; error?: Error };

type VoiceStatus =
  | {
      value: 'disconnected' | 'connecting' | 'connected';
      reason?: never;
    }
  | {
      value: 'error';
      reason: string;
    };

export type VoiceContextType = {
  connect: () => Promise<void>;
  disconnect: () => void;
  messages: (JSONMessage | ConnectionMessage)[];
  lastVoiceMessage: AssistantTranscriptMessage | null;
  lastUserMessage: UserTranscriptMessage | null;
  clearMessages: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  readyState: VoiceReadyState;
  sendUserInput: (text: string) => void;
  sendAssistantInput: (text: string) => void;
  sendSessionSettings: Hume.empathicVoice.chat.ChatSocket['sendSessionSettings'];
  pauseAssistant: () => void;
  resumeAssistant: () => void;
  status: VoiceStatus;
  error: VoiceError | null;
  isAudioError: boolean;
  isError: boolean;
  isMicrophoneError: boolean;
  isSocketError: boolean;
  callDurationTimestamp: string | null;
  chatMetadata: ChatMetadataMessage | null;
  isPaused: boolean;
};

const noop = () => {};
const VoiceContext = createContext<VoiceContextType | null>(null);

export type VoiceProviderProps = PropsWithChildren<SocketConfig> & {
  sessionSettings?: Hume.empathicVoice.SessionSettings;
  onMessage?: (message: JSONMessage) => void;
  onError?: (err: VoiceError) => void;
  onOpen?: () => void;
  onClose?: Hume.empathicVoice.chat.ChatSocket.EventHandlers['close'];
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

  // Add message persistence layer
  const { persistMessage } = useMessagePersistence();

  // error handling
  const [error, setError] = useState<VoiceError | null>(null);
  const isError = error !== null;
  const isMicrophoneError = error?.type === 'mic_error';
  const isSocketError = error?.type === 'socket_error';
  const isAudioError = error?.type === 'audio_error';

  const onError = useRef(props.onError ?? noop);
  onError.current = props.onError ?? noop;

  const onClose = useRef(props.onClose ?? noop);
  onClose.current = props.onClose ?? noop;

  // Wrap the original onMessage to include persistence
  const handleParentMessage = useCallback((message: JSONMessage) => {
    props.onMessage?.(message);
    
    // Persist the message (the persistence helper handles type checking)
    persistMessage(message);
  }, [props.onMessage, persistMessage]);

  const onMessage = useRef(handleParentMessage);
  onMessage.current = handleParentMessage;

  const onAudioReceived = useRef(props.onAudioReceived ?? noop);
  onAudioReceived.current = props.onAudioReceived ?? noop;

  const onAudioStart = useRef(props.onAudioStart ?? noop);
  onAudioStart.current = props.onAudioStart ?? noop;

  const onAudioEnd = useRef(props.onAudioEnd ?? noop);
  onAudioEnd.current = props.onAudioEnd ?? noop;

  const onInterruption = useRef(props.onInterruption ?? noop);
  onInterruption.current = props.onInterruption ?? noop;

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
      player.addToQueue(message);
      onAudioReceived.current(message);
    },
    onMessage: useCallback(
      (message: JSONMessage) => {
        // store message
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
      },
      [messageStore, player],
    ),
    onError: onClientError,
    onOpen: useCallback(() => {
      startTimer();
      messageStore.createConnectMessage();
      props.onOpen?.();
    }, [messageStore, props, startTimer]),
    onClose: useCallback<
      NonNullable<Hume.empathicVoice.chat.ChatSocket.EventHandlers['close']>
    >(
      (event) => {
        stopTimer();
        messageStore.createDisconnectMessage(event);
        onClose.current?.(event);
      },
      [messageStore, stopTimer],
    ),
  });

  const {
    sendAudio: clientSendAudio,
    sendUserInput: clientSendUserInput,
    sendAssistantInput: clientSendAssistantInput,
    sendSessionSettings: clientSendSessionSettings,
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
    updateError(null);
    setStatus({ value: 'connecting' });
    const permission = await getStream();

    if (permission === 'denied') {
      const message = 'Microphone permission denied';
      const error: VoiceError = { type: 'mic_error', message };
      updateError(error);
      return Promise.reject(new Error(message));
    }

    try {
      await client.connect({
        ...config,
        verboseTranscription: true,
      });
    } catch (e) {
      const message = 'We could not connect to the voice. Please try again.';
      const error: VoiceError = { type: 'socket_error', message };
      updateError(error);
      return Promise.reject(new Error(message));
    }

    try {
      const [micPromise, playerPromise] = await Promise.allSettled([
        mic.start(),
        player.initPlayer(),
      ]);

      if (
        micPromise.status === 'fulfilled' &&
        playerPromise.status === 'fulfilled'
      ) {
        setStatus({ value: 'connected' });
      }
    } catch (e) {
      const error: VoiceError = {
        type: 'audio_error',
        message:
          e instanceof Error
            ? e.message
            : 'We could not connect to audio. Please try again.',
      };
      updateError(error);
    }
  }, [client, config, getStream, mic, player, updateError]);

  const disconnectFromVoice = useCallback(() => {
    if (client.readyState !== VoiceReadyState.CLOSED) {
      client.disconnect();
    }
    player.stopAll();
    mic.stop();
    if (clearMessagesOnDisconnect) {
      messageStore.clearMessages();
    }
    setIsPaused(false);
  }, [
    client,
    player,
    mic,
    clearMessagesOnDisconnect,
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
      status.value !== 'disconnected'
    ) {
      // If the status is ever set to `error`, disconnect the voice.
      setStatus({ value: 'error', reason: error.message });
      disconnectFromVoice();
    }
  }, [status.value, disconnect, disconnectFromVoice, error]);

  useEffect(() => {
    // disconnect from socket when the voice provider component unmounts
    return () => {
      disconnectFromVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendUserInput = useCallback(
    (text: string) => {
      try {
        clientSendUserInput(text);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        updateError({ type: 'socket_error', message });
      }
    },
    [clientSendUserInput, updateError],
  );

  const sendAssistantInput = useCallback(
    (text: string) => {
      try {
        clientSendAssistantInput(text);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
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

  const ctx = useMemo(
    () =>
      ({
        connect,
        disconnect,
        messages: messageStore.messages,
        lastVoiceMessage: messageStore.lastVoiceMessage,
        lastUserMessage: messageStore.lastUserMessage,
        clearMessages: messageStore.clearMessages,
        muteAudio: player.muteAudio,
        readyState: client.readyState,
        sendUserInput,
        sendAssistantInput,
        sendSessionSettings,
        pauseAssistant,
        resumeAssistant,
        status,
        unmuteAudio: player.unmuteAudio,
        error,
        isAudioError,
        isError,
        isMicrophoneError,
        isSocketError,
        callDurationTimestamp,
        chatMetadata: messageStore.chatMetadata,
        isPaused,
      }),
    [
      connect,
      disconnect,
      player.muteAudio,
      player.unmuteAudio,
      messageStore.messages,
      messageStore.lastVoiceMessage,
      messageStore.lastUserMessage,
      messageStore.clearMessages,
      messageStore.chatMetadata,
      client.readyState,
      sendUserInput,
      sendAssistantInput,
      sendSessionSettings,
      pauseAssistant,
      resumeAssistant,
      status,
      error,
      isAudioError,
      isError,
      isMicrophoneError,
      isSocketError,
      callDurationTimestamp,
      isPaused,
    ],
  );

  return <VoiceContext.Provider value={ctx}>{children}</VoiceContext.Provider>;
}