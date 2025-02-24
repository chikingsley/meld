# Memory System Implementation Plan

## Overview
Building an intelligent memory system for MindPattern that combines RAG-based retrieval with pattern detection and memory chains. The system integrates with our Prisma schema and enhances the chat experience through multi-layered memory processing and analysis.

## Architecture

### 1. Base Layer: RAG Storage
```prisma
model Message {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  content   String   @db.Text
  sessionId String   @map("session_id") @db.Uuid
  timestamp DateTime @default(now()) @db.Timestamptz(6)
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  vector    MessageVector?
}

model MessageVector {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  messageId String   @unique @map("message_id") @db.Uuid
  embedding Unsupported("vector(1024)")
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  @@index([embedding], type: IvfFlat)
}
```

### 2. Memory Chain Structure
```prisma
model MemoryChain {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String    @map("user_id")
  type        String    // emotional, behavioral, relational
  pattern     Json      // Pattern details
  confidence  Float     // 0.0 to 1.0
  verified    Boolean   @default(false)
  occurrences Json[]    // Array of supporting evidence
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Type Definitions
```typescript
interface Pattern {
  type: 'emotional' | 'behavioral' | 'relational';
  description: string;
  triggers: {
    conditions: string[];
    timeContext?: {
      timeOfDay?: string[];
      dayOfWeek?: string[];
      frequency?: number;
    };
  };
  metadata: {
    firstDetected: Date;
    lastVerified: Date;
    updateCount: number;
  };
}

interface MemoryChainOccurrence {
  timestamp: Date;
  messageIds: string[];  // Related messages
  confidence: number;
  context: {
    emotion?: string;
    topic?: string;
    entities?: string[];
  };
}

interface SessionAnalysis {
  patterns: {
    emotional: EmotionalPattern[];
    behavioral: BehavioralPattern[];
    relational: RelationalPattern[];
  };
  metrics: {
    emotionalIntensity: number;
    topicCoherence: number;
    patternStrength: number;
  };
}
```

## Processing Layers

### 1. Real-time Processing
- Message vectorization and storage
- Quick pattern matching against active chains
- Immediate context enhancement
- Verification triggers

### 2. Session-End Processing
- Full session analysis
- Pattern detection across session
- Chain formation and updates
- Summary generation

### 3. Background Processing
- Cross-session pattern analysis
- Chain validation and pruning
- Global insight generation
- Long-term trend detection

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Base RAG Implementation
  - [ ] Message and vector storage
  - [ ] Basic retrieval functionality
  - [ ] Vector similarity search
- [ ] Schema Updates
  - [ ] Add MemoryChain model
  - [ ] Create necessary indexes
  - [ ] Type definitions

### Phase 2: Pattern Detection (Week 3-4)
- [ ] Real-time Processing
  - [ ] Message processor implementation
  - [ ] Quick pattern matching
  - [ ] Chain update triggers
- [ ] Pattern Detectors
  - [ ] Emotional pattern detection
  - [ ] Behavioral pattern detection
  - [ ] Relational pattern detection
- [ ] Tests:
  - [ ] Pattern detection accuracy
  - [ ] Processing performance
  - [ ] Chain formation logic

### Phase 3: Analysis & Integration (Week 5-6)
- [ ] Session Analysis
  - [ ] End-of-session processing
  - [ ] Chain formation rules
  - [ ] Summary generation
- [ ] Background Processing
  - [ ] Periodic analysis jobs
  - [ ] Cross-session patterns
  - [ ] Chain validation
- [ ] Tests:
  - [ ] Analysis accuracy
  - [ ] Chain validation
  - [ ] System performance

### Phase 4: Verification & Refinement (Week 7-8)
- [ ] User Verification System
  - [ ] Verification triggers
  - [ ] User feedback integration
  - [ ] Confidence scoring
- [ ] Memory Chain Management
  - [ ] Chain pruning
  - [ ] Merge similar patterns
  - [ ] Version tracking
- [ ] Tests:
  - [ ] Verification workflow
  - [ ] Chain management
  - [ ] System reliability

## Usage Examples

### Pattern Detection
```typescript
// Real-time pattern detection
async function processMessage(message: Message) {
  // Store for RAG
  await storeMessageWithVector(message);
  
  // Quick pattern check
  const patterns = await detectPatterns({
    message,
    activeChains: await getActiveChains(message.userId)
  });
  
  // Update chains
  if (patterns.length > 0) {
    await updateMemoryChains(patterns);
  }
}

// Session analysis
async function analyzeSession(sessionId: string) {
  const messages = await getSessionMessages(sessionId);
  
  const analysis = {
    emotional: await analyzeEmotionalPatterns(messages),
    behavioral: await analyzeBehavioralPatterns(messages),
    relational: await analyzeRelationalPatterns(messages)
  };
  
  await processSessionInsights(analysis);
}
```

### Memory Chain Usage
```typescript
// Enhance context retrieval
async function getEnhancedContext(query: string, userId: string) {
  // Get RAG results
  const ragResults = await vectorSearch(query);
  
  // Get relevant chains
  const relevantChains = await findRelevantChains(query, userId);
  
  // Combine and enhance
  return enhanceResults(ragResults, relevantChains);
}
```

## Future Expansion
- Advanced Pattern Recognition
  - Complex emotional patterns
  - Multi-session behavioral analysis
  - Relationship network mapping
- Interactive Verification
  - Smart verification triggers
  - User feedback learning
  - Confidence scoring refinement
- Memory Chain Evolution
  - Pattern merging and splitting
  - Chain relationship mapping
  - Temporal pattern analysis

## Understanding the Memory System (Plain Language)

Think of this memory system as having three key parts working together, like different parts of a human brain:

### 1. Basic Memory (RAG)
This is like your basic ability to recall facts. When you ask a question, it quickly finds relevant past conversations using AI to match similar meanings. It's fast but simple - just matching what's most similar to what you're asking about.

### 2. Pattern Recognition (Memory Chains)
This is where things get interesting. Instead of just remembering individual conversations, the system starts to notice patterns, like:
- "You often feel anxious late at night"
- "Talking about work usually leads to stress discussions"
- "Exercise discussions typically happen in the morning and are positive"

These patterns form "memory chains" - connected pieces of information that tell a bigger story about you. They're not just individual memories, but insights about your behaviors, emotions, and relationships.

### 3. Multi-Level Processing
The system processes information in three ways:
1. **Instant Processing**: While you're chatting, it's quickly checking if what you're saying fits into any known patterns.
2. **End of Conversation**: After each chat, it looks back at the whole conversation to spot new patterns or confirm existing ones.
3. **Background Analysis**: Regularly reviews all conversations to find deeper, long-term patterns you might not notice day-to-day.

### How It All Works Together

Imagine you're talking about feeling stressed. The system:
1. Uses RAG to find similar past conversations about stress
2. Checks existing memory chains about your stress patterns
3. Might notice this is the third time you've mentioned stress late at night
4. Could spot that these stress discussions often follow work conversations
5. Gradually builds up a picture of your stress triggers and patterns

Over time, it gets better at:
- Predicting when you might need support
- Understanding the context behind your emotions
- Connecting different aspects of your life
- Providing more personalized responses

The system is constantly learning and updating its understanding, but it also checks with you to make sure its patterns are correct. It's like having a friend who not only remembers your conversations but understands the deeper patterns in your life.

This helps create a more meaningful and supportive conversation experience, where the AI isn't just responding to your immediate words, but understanding the broader context of your life and patterns.
