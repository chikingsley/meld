// src/App.tsx
import { VoiceProvider } from '@/providers/VoiceProvider';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react-router'
import { getHumeAccessToken } from './utils/getHumeAccessToken';
import { Layout } from '@/layout';
import Session from '@/pages/Session';
import Settings from '@/pages/Settings';
import Test from '@/pages/Test';
import { SessionProvider } from '@/providers/SessionProvider';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useUserStore } from '@/stores/useUserStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
// import { Analytics } from '@vercel/analytics/react';
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Inner component that uses Clerk hooks
function AppContent() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const configId = useUserStore((state) => state.configId);

  useEffect(() => {
    const initialize = async () => {
      try {
        const [token] = await Promise.all([
          getHumeAccessToken(),
          // Add other initialization tasks here
        ]);
        setAccessToken(token);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(error as Error);
      }
    };

    initialize();
  }, []);

  // Log whenever configId changes
  useEffect(() => {
    console.log('[AppContent] Current configId:', configId);
  }, [configId]);

  // This will automatically load configId from Clerk metadata
  useUserConfig();

  if (initError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          Failed to initialize app: {initError.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <VoiceProvider
      auth={{ type: 'accessToken', value: accessToken || '' }}
      configId={configId || undefined}
    >
      <SessionProvider>
        <ErrorBoundary>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Session />} />
              <Route path="/session" element={<Session />} />
              <Route path="/session/:sessionId" element={<Session />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/test" element={<Test />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </SessionProvider>
    </VoiceProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkProvider publishableKey={clerkPubKey}>
        <ErrorBoundary>
          <AppContent />
          {/* <Analytics /> */}
        </ErrorBoundary>
      </ClerkProvider>
    </BrowserRouter>
  );
}

export default App;
