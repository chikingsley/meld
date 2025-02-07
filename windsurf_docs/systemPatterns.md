# System Patterns

## Core Architecture

### 1. Memory System
- **Base Layer (RAG Storage)**
  - Message and vector storage
  - Embedding generation and retrieval
  - Late chunking implementation

- **Memory Chain Structure**
  - Pattern detection and tracking
  - User-specific memory chains
  - Confidence scoring system

- **Processing Layers**
  1. Real-time Processing
     - Message vectorization
     - Quick pattern matching
     - Immediate context enhancement
  2. Session Analysis
     - Full session pattern detection
     - Chain formation/updates
     - Summary generation
  3. Background Analysis
     - Cross-session patterns
     - Chain validation
     - Long-term trends

### 2. Data Flow
- **Client-Side**
  - PGLite for local storage
  - IndexedDB integration
  - Offline capability

- **Server-Side**
  - Supabase for persistence
  - Real-time sync via WebSocket/ElectricSQL
  - Background processing

### 3. AI Integration
- **Voice Processing**
  - Hume AI for transcription
  - Emotion analysis
  - Prosody tracking

- **Language Processing**
  - Claude API for core interaction
  - Context-aware responses
  - Pattern-based suggestions

## Key Technical Decisions

### 1. Storage Strategy
- Split storage between client/server
- Vector operations for similarity search
- Real-time sync with conflict resolution

### 2. Pattern Detection
- Multi-layer processing approach
- Confidence-based validation
- User verification integration

### 3. Performance Optimization
- Efficient memory management
- Strategic background processing
- Resource-aware operations
