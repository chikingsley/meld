import { VoiceProvider } from '@humeai/voice-react';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react-router'
import { getHumeAccessToken } from './utils/getHumeAccessToken';
import { Layout } from '@/components/layout/layout';
import Session from '@/pages/Session';
import Settings from '@/pages/Settings';
import { DatabaseProvider } from '@/components/providers/DatabaseProvider';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  const [accessToken, setAccessToken] = useState<string | null>('');

  useEffect(() => {
    getHumeAccessToken().then(setAccessToken);
  }, []);

  return (
    <BrowserRouter>
      <ClerkProvider publishableKey={clerkPubKey}>
        <DatabaseProvider>
          <VoiceProvider auth={{ type: 'accessToken', value: accessToken || '' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/session" replace />} />
              <Route element={<Layout />}>
                <Route path="/session" element={<Session />} />
                <Route path="/session/:sessionId" element={<Session />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </VoiceProvider>
        </DatabaseProvider>
      </ClerkProvider>
    </BrowserRouter>
  );
}

export default App;
