// src/App.tsx
import { VoiceProvider } from '@/lib/VoiceProvider';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react-router'
import { getHumeAccessToken } from './utils/getHumeAccessToken';
import { Layout } from '@/layout';
import VoiceSession from '@/pages/Session';
import Settings from '@/pages/Settings';
import Test from '@/pages/Test';
import { SessionProvider } from '@/db/SessionContext';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useUserStore } from '@/stores/useUserStore';
// import { Analytics } from '@vercel/analytics/react';
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Inner component that uses Clerk hooks
function AppContent() {
  const [accessToken, setAccessToken] = useState<string | null>('');
  const configId = useUserStore((state) => state.configId);

  useEffect(() => {
    getHumeAccessToken().then(setAccessToken);
  }, []);

  // Log whenever configId changes
  useEffect(() => {
    console.log('[AppContent] Current configId:', configId);
  }, [configId]);

  // This will automatically load configId from Clerk metadata
  useUserConfig();

  return (
    <VoiceProvider 
      auth={{ type: 'accessToken', value: accessToken || '' }}
      configId={configId || undefined}
    >
      <SessionProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/session" replace />} />
          <Route element={<Layout />}>
            <Route path="/session" element={<VoiceSession />} />
            <Route path="/session/:sessionId" element={<VoiceSession />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/test" element={<Test />} />
          </Route>
        </Routes>
      </SessionProvider>
    </VoiceProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkProvider publishableKey={clerkPubKey}>
        <AppContent />
        {/* <Analytics /> */}
      </ClerkProvider>
    </BrowserRouter>
  );
}

export default App;
