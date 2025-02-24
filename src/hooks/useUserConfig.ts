import { useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useUserStore } from '@/stores/useUserStore';

export function useUserConfig() {
  const { user } = useUser();
  const setConfigId = useUserStore((state) => state.setConfigId);
  
  useEffect(() => {
    if (user) {
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
      console.log('[useUserConfig] No user available, clearing configId');
      // Clear configId when user is not available
      setConfigId(null);
    }
  }, [user, setConfigId]);
}
