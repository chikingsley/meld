import { useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useUserStore } from '@/lib/stores/useUserStore';

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
    } else {
      console.log('[useUserConfig] No user available, clearing configId');
      // Clear configId when user is not available
      setConfigId(null);
    }
  }, [user, setConfigId]);
}
