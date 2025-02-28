// src/lib/hume-lib/hooks/useMessages.ts
import type { CloseEvent } from 'hume/core';
import { useCallback, useState } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import type {
  AssistantTranscriptMessage,
  JSONMessage,
  UserTranscriptMessage,
} from '../../types/hume-messages';
// import { keepLastN } from '@/lib/hume/keepLastN';

export const useMessages = ({
  sendMessageToParent,
  // messageHistoryLimit,
}: {
  sendMessageToParent?: (message: JSONMessage) => void;
  // messageHistoryLimit: number;
}) => {
  const [voiceMessageMap, setVoiceMessageMap] = useState<
    Record<string, AssistantTranscriptMessage>
  >({});

  const { setMessages, setChatMetadata } = useSessionStore();

  const [lastVoiceMessage, setLastVoiceMessage] =
    useState<AssistantTranscriptMessage | null>(null);
  const [lastUserMessage, setLastUserMessage] =
    useState<UserTranscriptMessage | null>(null);

  const createConnectMessage = useCallback(() => {
    setMessages((prev) =>
      prev.concat([
        {
          type: 'socket_connected',
          receivedAt: new Date(),
        },
      ]),
    );
  }, []);

  const createDisconnectMessage = useCallback((event: CloseEvent) => {
    setMessages((prev) =>
      prev.concat([
        {
          type: 'socket_disconnected',
          code: event.code,
          reason: event.reason,
          receivedAt: new Date(),
        },
      ]),
    );
  }, []);

  const onMessage = useCallback(
    (message: JSONMessage) => {
      /* 
      1. message comes in from the backend
        - if the message IS NOT AssistantTranscriptMessage, store in `messages` immediately  
        - if the message is an AssistantTranscriptMessage, stored in `voiceMessageMap`
      2. audio clip plays
        - find the AssistantTranscriptMessage with a matching ID, and store it in `messages`
        - remove the AssistantTranscriptMessage from `voiceMessageMap`
    */
      switch (message.type) {
        case 'assistant_message':
          // for assistant messages, `sendMessageToParent` is called in `onPlayAudio`
          // in order to line up the transcript event with the correct audio clip
          setVoiceMessageMap((prev) => ({
            ...prev,
            [`${message.id}`]: message,
          }));
          break;
        case 'user_message':
          sendMessageToParent?.(message);

          // Exclude interim messages from the messages array.
          // If end users want to see interim messages, they can use the onMessage
          // callback because we are still sending them via `sendMessageToParent`.
          if (message.interim === false) {
            setLastUserMessage(message);
            setMessages((prev) => {
              return [...prev, message];
            });
            // setMessages((prev) => {
            //   return keepLastN(messageHistoryLimit, prev.concat([message]));
            // });
          }

          break;
        case 'user_interruption':
        case 'error':
        case 'tool_call':
        case 'tool_response':
        case 'tool_error':
        case 'assistant_end':
          sendMessageToParent?.(message);
          setMessages((prev) => {
            return [...prev, message];
          });
          // setMessages((prev) => {
          //   return keepLastN(messageHistoryLimit, prev.concat([message]));
          // });
          break;
        case 'chat_metadata':
          console.log('Setting chat metadata:', message);
          sendMessageToParent?.(message);
          setMessages((prev) => {
            return [...prev, message];
          });
          // setMessages((prev) => {
          //   return keepLastN(messageHistoryLimit, prev.concat([message]));
          // });
          setChatMetadata(message);
          break;
        default:
          break;
      }
    },
    // [messageHistoryLimit, sendMessageToParent],
    [sendMessageToParent],
  );

  const onPlayAudio = useCallback(
    (id: string) => {
      const matchingTranscript = voiceMessageMap[id];
      if (matchingTranscript) {
        sendMessageToParent?.(matchingTranscript);
        setLastVoiceMessage(matchingTranscript);
        setMessages((prev) => {
          return [...prev, matchingTranscript];
        });
        // setMessages((prev) => {
        //   return keepLastN(
        //     messageHistoryLimit,
        //     prev.concat([matchingTranscript]),
        //   );
        // });
        // remove the message from the map to ensure we don't
        // accidentally push it to the messages array more than once
        setVoiceMessageMap((prev) => {
          const newMap = { ...prev };
          delete newMap[id];
          return newMap;
        });
      }
    },
    // [voiceMessageMap, sendMessageToParent, messageHistoryLimit],
    [voiceMessageMap, sendMessageToParent],
  );

  // const clearMessages = useCallback(() => {
  //   setMessages([]);
  //   setLastVoiceMessage(null);
  //   setLastUserMessage(null);
  //   setVoiceMessageMap({});
  // }, []);

  return {
    createConnectMessage,
    createDisconnectMessage,
    onMessage,
    onPlayAudio,
    // clearMessages,
    lastVoiceMessage,
    lastUserMessage,
  };
};
