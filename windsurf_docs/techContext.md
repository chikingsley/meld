# Technical Context

## Core Technologies
### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Framer Motion

### Backend
- Bun Runtime
- Supabase (planned)
- PGLite (local/IndexedDB)
- WebSocket/ElectricSQL (sync layer planned)

### AI & Data Layer
- Hume AI (voice-to-text, emotion analysis)
- Claude API (core interaction)
- PGVector (embeddings storage)
- Memory Chain System

## Database Architecture
### Local Storage
- PGLite for client-side persistence
- IndexedDB integration
- Vector operations support

### Server Storage
- Supabase (planned)
- Real-time communication
- Data synchronization

### Memory System
1. Base Layer: RAG Storage
   - Message and vector storage
   - Similarity search capabilities
   - Pattern detection system

2. Processing Layers
   - Real-time processing
   - Session-end analysis
   - Background pattern detection

## Environment Setup
- Required Variables:
  - CLERK_SECRET_KEY
  - CLERK_WEBHOOK_SECRET
  - VITE_HUME_API_KEY
  - OPENAI_API_KEY
  - SUPABASE_URL (planned)
  - SUPABASE_KEY (planned)

## Technical Constraints
1. Data Synchronization:
   - Need robust sync between client/server
   - Handle offline capabilities
   - Manage conflict resolution

2. Memory Management:
   - Efficient pattern detection
   - Context preservation
   - Resource optimization

3. Real-time Processing:
   - Stream handling
   - WebSocket stability
   - Performance optimization
