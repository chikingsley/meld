# Lessons Learned

## Ngrok Configuration Issues (2025-01-28)

### Problem
When running ngrok through `bunx` in package.json scripts, we encountered version compatibility issues between:
- System ngrok (v3.19.1) which supports config version 3
- Bundled ngrok through `bunx` (v3.2.2) which only supports config versions 1 and 2

The error manifested as:
```
ERROR: Error reading configuration file '/Users/simonpeacocks/Library/Application Support/ngrok/ngrok.yml': unknown version '3'. valid versions are: [1 2]
```

### Solution
1. Created a local `ngrok.yml` in the project root using version 2 format:
```yaml
version: "2"
authtoken: 2QNP5kGEJyzxcWCV98IOCAQq80m_3Xk1z47dxX1DPRhn4naC4
api_key: 2oLyEEJ0kvos1mm4ubCupPWY72P_59NZLLmKe6fEAoiNdvS8C
```

2. Updated package.json scripts to explicitly use this config:
```json
"dev": "concurrently \"bunx --bun vite\" \"bun --watch server/index.ts\" \"bunx ngrok http --config=ngrok.yml --domain=tolerant-bengal-hideously.ngrok-free.app 3001\""
```

### Key Takeaways
1. When using tools through bundlers (`bunx`, `npx`), version mismatches can occur with system installations
2. Ngrok v3.2.2 (bundled) doesn't support version 3 config files, while system ngrok v3.19.1 does
3. Solution options:
   - Use local config file with version 2 format (chosen solution)
   - Install ngrok directly in project dependencies
   - Use system ngrok instead of bundled version

### Alternative Approaches
1. Use system ngrok directly (remove `bunx`):
```json
"dev": "concurrently \"bunx --bun vite\" \"bun --watch server/index.ts\" \"ngrok http --domain=tolerant-bengal-hideously.ngrok-free.app 3001\""
```

2. Install specific ngrok version as project dependency:
```bash
bun add ngrok@3.2.2
```

## SidebarProvider/SidebarInset Component Visibility Issues (2025-01-28)

### Problem
When using SidebarProvider/SidebarInset components from @radix-ui/react-toolbar, components would sometimes become invisible despite being mounted in the DOM. This occurred particularly after state changes or re-renders.

### Investigation
1. Components were properly mounted in the DOM (verified through React DevTools)
2. CSS styles were being applied correctly
3. Issue seemed related to how Radix UI handles component visibility and transitions

### Solution
Switched from using SidebarProvider/SidebarInset pattern to a custom implementation using:
- CSS Grid for layout
- CSS transitions for animations
- Direct state management through React context

### Key Takeaways
1. When using UI component libraries, test thoroughly with state changes and re-renders
2. Complex component patterns (like Provider/Inset) can have unexpected edge cases
3. Sometimes a simpler, custom implementation is more reliable than a third-party solution
4. Always maintain a fallback plan when adopting third-party UI components

### Implementation Details
```tsx
// Before (problematic)
<SidebarProvider>
  <MainContent />
  <SidebarInset>
    <Sidebar />
  </SidebarInset>
</SidebarProvider>

// After (reliable)
<div className="grid grid-cols-[1fr,auto]">
  <MainContent />
  {showSidebar && (
    <div className="transition-all">
      <Sidebar />
    </div>
  )}
</div>

```

## PGlite Database Shutdown Issues (2025-01-28)

### Problem
PGlite database logs showed improper shutdown warnings:
```
database system was interrupted; last known up at 2025-01-28 06:47:40 GMT
database system was not properly shut down; automatic recovery in progress
```

This occurred due to:
1. Lack of proper cleanup when browser window closes
2. Missing checkpoint before database shutdown
3. Insufficient error handling during cleanup

### Solution
1. Enhanced `closeDB` function with checkpoint and error handling:
```typescript
export async function closeDB() {
  if (dbInstance?.ready && !dbInstance.closed) {
    try {
      await dbInstance.exec('CHECKPOINT');
      await dbInstance.close();
      dbInstance = null;
    } catch (error) {
      console.error('Error during database shutdown:', error);
      throw new DatabaseError('Failed to close database properly', error);
    }
  }
}
```

2. Added window unload handler in DatabaseProvider:
```typescript
const cleanup = useCallback(async () => {
  try {
    await closeDB();
  } catch (error) {
    console.error('Failed to close database:', error);
  }
}, []);

useEffect(() => {
  const handleUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    cleanup();
    event.returnValue = '';
  };

  window.addEventListener('beforeunload', handleUnload);
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    cleanup();
  };
}, [cleanup]);
```

### Key Takeaways
1. Browser-based databases need explicit cleanup on both component unmount and window close
2. Always ensure data is written to disk (CHECKPOINT) before shutdown
3. Handle cleanup errors gracefully to prevent data corruption
4. Use `beforeunload` event to catch browser window closures
5. Implement proper error boundaries and retry mechanisms for database operations

### Impact
- More reliable data persistence
- Reduced risk of database corruption
- Better error handling and recovery
- Improved debugging through proper error logging
- Smoother user experience with automatic recovery
