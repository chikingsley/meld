# Voice React Library Structure

## Library Files

```
empathic-voice-api-js/packages/react/src/lib/
├── Core Components
│   └── VoiceProvider.tsx           # Main voice context provider
│
├── Message Handling
│   ├── audio-message.ts            # Audio message type definitions
│   ├── connection-message.ts       # Connection message handling
│   └── messages.ts                 # Message type definitions and utilities
│
├── Authentication
│   └── auth.ts                     # Authentication utilities
│
├── Audio Processing
│   ├── convertFrequencyScale.ts    # FFT frequency scale conversion
│   └── generateEmptyFft.ts         # Empty FFT array generation
│
├── Hooks
│   ├── useCallDuration.ts          # Call duration tracking
│   ├── useEncoding.ts             # Audio encoding utilities
│   ├── useMessages.ts             # Message state management
│   ├── useMicrophone.ts           # Microphone access and control
│   ├── useSoundPlayer.ts          # Audio playback
│   ├── useToolStatus.ts           # Tool status tracking
│   └── useVoiceClient.ts          # Voice client connection
│
├── Tests
│   ├── VoiceProvider.test.tsx
│   ├── useEncoding.test.ts
│   ├── useMessages.test.ts
│   ├── useToolStatus.test.ts
│   └── useVoiceClient.test.ts
│
└── Utilities
    ├── errors.ts                  # Error handling
    └── noop.ts                    # No-operation utility

```