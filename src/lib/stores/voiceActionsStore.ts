import { create } from 'zustand';
import { Hume } from 'hume';

interface VoiceActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendUserInput: (text: string) => void;
  sendAssistantInput: (text: string) => void;
  sendSessionSettings: (settings: Hume.empathicVoice.SessionSettings) => void;
  sendToolMessage: (
    message:
      | Hume.empathicVoice.ToolResponseMessage
      | Hume.empathicVoice.ToolErrorMessage,
  ) => void;
  pauseAssistant: () => void;
  resumeAssistant: () => void;
  setActions: (actions: Partial<VoiceActions>) => void;
}

export const useVoiceActionsStore = create<VoiceActions>((set) => ({
  connect: async () => { /* Will be set by VoiceProvider */ },
  disconnect: () => { /* Will be set by VoiceProvider */ },
  sendUserInput: () => { /* Will be set by VoiceProvider */ },
  sendAssistantInput: () => { /* Will be set by VoiceProvider */ },
  sendSessionSettings: () => { /* Will be set by VoiceProvider */ },
  sendToolMessage: () => { /* Will be set by VoiceProvider */ },
  pauseAssistant: () => { /* Will be set by VoiceProvider */ },
  resumeAssistant: () => { /* Will be set by VoiceProvider */ },
  setActions: (actions) => set(actions)
}));
