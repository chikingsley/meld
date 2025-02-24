import { useUser, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/useUserStore';

export function useUserConfig() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { setConfigId, setUserId, setToken } = useUserStore();
  
  useEffect(() => {
    console.log('[useUserConfig] User state:', {
      userLoaded,
      authLoaded,
      hasUser: !!user,
      userId: user?.id
    });

    if (!userLoaded || !authLoaded) {
      console.log('[useUserConfig] Still loading Clerk user/auth...');
      return;
    }
    
    if (user) {
      // Set userId from Clerk
      console.log('[useUserConfig] Setting userId:', user.id);
      setUserId(user.id);
            
      // Get and set token
      const syncToken = async () => {
        console.log('[useUserConfig] Getting token...');
        const token = await getToken();
        console.log('[useUserConfig] Got token:', !!token);
        setToken(token);
      };
      syncToken();
      // Get humeConfigId from Clerk's user metadata
      const configId = user.publicMetadata.humeConfigId as string;
      console.log('[useUserConfig] Loading configId from Clerk metadata:', configId);
      console.log('[useUserConfig] Full user metadata:', user.publicMetadata);
      setConfigId(configId || null);

      // If no configId in metadata, check if we're a new user by listening for webhook response
      if (!configId) {
        const eventSource = new EventSource(`/api/clerk/webhook-events?userId=${user.id}`);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.configId) {
            console.log('[useUserConfig] Received new configId from webhook:', data.configId);
            setConfigId(data.configId);
            eventSource.close();
          }
        };

        return () => eventSource.close();
      }
    } else {
      console.log('[useUserConfig] No user available, clearing user data');
      // Clear user data when user is not available
      setConfigId(null);
      setUserId(null);
      setToken(null);
    }
  }, [user, getToken, setConfigId, setUserId, setToken, userLoaded, authLoaded]);
}
