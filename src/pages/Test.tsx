import ContinuousChat from '@/components/test-components/ContinuousChat';
import EnhancedSidebar from '@/components/test-components/EnhancedSidebar';

export default function Test() {
  return (
    <div className="flex h-screen">
      <EnhancedSidebar className="w-80 border-r" />
      <div className="flex-1 overflow-hidden">
        <ContinuousChat currentSessionId={null} />
      </div>
    </div>
  );
}