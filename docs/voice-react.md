# Integrate Hume's Empathic Voice Interface in Your React Application

## Overview
This package simplifies state management for client-side applications using the EVI Chat WebSocket through a `<VoiceProvider>` component and `useVoice()` hook. It includes:

- WebSocket
- Microphone Interface
- Audio Playback Queue
- Message History

**Note:** This package is not compatible with React Native as it relies on Web APIs for microphone input and audio playback.

---

## Prerequisites
Ensure your development environment meets the following requirements:

- **Node.js (v18.0.0 or higher):**
  To check your Node.js version, run:

  ```bash
  node --version
  ```

  If your version is below 18.0.0, update via the [Node.js official site](https://nodejs.org/) or a version management tool like `nvm`.

---

## Installation
Add the package to your project:

```bash
npm install @humeai/voice-react
```

---

## Usage

### Quickstart
Wrap your components in the `<VoiceProvider>` to access voice methods:

```jsx
import { VoiceProvider } from '@humeai/voice-react';

function App() {
  const apiKey = process.env.HUME_API_KEY;

  return (
    <VoiceProvider
      auth={{ type: 'apiKey', value: apiKey }}
      configId={/* Optional: Your EVI Configuration ID */}
    >
      {/* Your components */}
    </VoiceProvider>
  );
}
```

### Configuring VoiceProvider

#### Props
- **`auth`** *(Required)*: Authentication strategy.
  - `{ value: string; type: "apiKey"; }` or `{ value: string; type: "accessToken"; }`
- **`hostname`** *(Optional)*: API hostname (default: `"api.hume.ai"`).
- **`reconnectAttempts`** *(Optional)*: Reconnection attempts (default: `30`).
- **`debug`** *(Optional)*: Enable debug mode (default: `false`).
- **`configId`** *(Optional)*: Voice preset configuration ID.
- **`configVersion`** *(Optional)*: Specific config version ID.
- **`verboseTranscription`** *(Optional)*: Enable verbose transcription (default: `true`).
- **Callbacks** *(Optional)*:
  - `onMessage`
  - `onToolCall`
  - `onAudioReceived`
  - `onAudioStart`
  - `onAudioEnd`
  - `onInterruption`
  - `onClose`
- **`clearMessagesOnDisconnect`** *(Optional)*: Clear message history on disconnect.
- **`messageHistoryLimit`** *(Optional)*: Message history limit (default: `100`).
- **`sessionSettings`** *(Optional)*: Custom session values.
- **`resumedGroupChatId`** *(Optional)*: Chat group ID for resuming previous conversations.

### Using Voice in Components
Access voice methods using `useVoice()`:

#### Example: Start a Call Button

```jsx
import { useVoice } from '@humeai/voice-react';

export function StartCallButton() {
  const { connect } = useVoice();

  return <button onClick={() => connect()}>Start Call</button>;
}
```

**Important:** Use a user gesture (e.g., button click) to initialize `connect()`.

---

## Methods

### Voice Control
- **`connect`**: Opens a socket connection and initializes the microphone.
- **`disconnect`**: Disconnects from the API and microphone.
- **`clearMessages`**: Clears message history.
- **`mute`**: Mutes the microphone.
- **`unmute`**: Unmutes the microphone.
- **`muteAudio`**: Mutes the assistant audio.
- **`unmuteAudio`**: Unmutes the assistant audio.
- **`sendSessionSettings`**: Sends new session settings.
- **`sendUserInput`**: Sends a user input message.
- **`sendAssistantInput`**: Sends a text string for the assistant to read aloud.
- **`sendToolMessage`**: Sends tool responses or errors.
- **`pauseAssistant`**: Pauses assistant responses.
- **`resumeAssistant`**: Resumes assistant responses.

### Properties

| Property                  | Description                                  |
|---------------------------|----------------------------------------------|
| `isMuted`                 | Microphone mute status.                     |
| `isAudioMuted`            | Assistant audio mute status.                |
| `isPlaying`               | Indicates if assistant audio is playing.    |
| `isPaused`                | Indicates if assistant is paused.           |
| `fft`                     | Assistant audio FFT values.                 |
| `micFft`                  | Microphone input FFT values.                |
| `messages`                | Conversation message history.               |
| `lastVoiceMessage`        | Last transcript from the assistant.         |
| `lastUserMessage`         | Last transcript from the user.              |
| `readyState`              | WebSocket connection state.                 |
| `status`                  | Voice connection status.                    |
| `error`                   | Detailed error information.                 |
| `isError`                 | Indicates if there is an error.             |
| `isAudioError`            | Indicates audio playback errors.            |
| `isMicrophoneError`       | Indicates microphone errors.                |
| `isSocketError`           | Indicates WebSocket connection errors.      |
| `callDurationTimestamp`   | Call duration.                              |
| `toolStatusStore`         | Tool call messages and statuses.            |
| `chatMetadata`            | Metadata about the current chat.            |
| `playerQueueLength`       | Number of audio clips queued.               |

---

## Notes
- Use Web APIs for microphone input and audio playback.
- Requires user gestures to initialize audio contexts.
