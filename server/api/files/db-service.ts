// server/api/dbhandlers/combinedImport.ts
import { prisma } from '../../../src/db/prisma';
import { ChatSession, ChatMessage, normalizeTranscript } from '../files/normalizer';
import { analyzeEmotions } from '../chat/emotions/hume-text-client';

/**
 * Helper function to create a new session record.
 */
async function createSession(userId: string, sessionData: ChatSession) {
    console.log('Creating session with userId:', userId);
    try {
        if (!userId) {
            console.error('No userId provided in headers');
            throw new Error('Unauthorized - No userId provided');
        }

        // Verify database connection and user existence
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            console.log('Found user:', user ? 'yes' : 'no');
            
            if (!user) {
                // Create user if doesn't exist (since this is import functionality)
                console.log('Creating user:', userId);
                await prisma.user.create({
                    data: { id: userId }
                });
            }
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            throw new Error('Database connection failed');
        }

        // Debug log before Prisma operation
        console.log('About to create session in Prisma with data:', {
            userId,
            timestamp: new Date(sessionData.created_at || sessionData.timestamp || Date.now())
        });

        const newSession = await prisma.session.create({
            data: {
                userId,
                timestamp: new Date(sessionData.created_at || sessionData.timestamp || Date.now()),
            },
            include: { messages: true }
        });
        console.log("Created session with ID:", newSession.id, "Full session:", newSession);

        // Verify session was created
        const verifySession = await prisma.session.findUnique({
            where: { id: newSession.id },
            include: { messages: true }
        });
        console.log('Session verification:', verifySession ? 'success' : 'failed');

        return newSession;
    } catch (error) {
        console.error("Error creating session:", error);
        throw error;
    }
}

/**
 * Helper function to add a message to a session.
 * Computes the prosody by running emotion analysis on the message content,
 * and stores it in the metadata.
 */
async function addMessage(sessionId: string, msg: ChatMessage) {
    try {
        // Verify session exists
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const content = msg.message?.content || msg.text || "";
        let computedProsody = {};
        if (content.trim()) {
            computedProsody = await analyzeEmotions(content);
        }
        
        const role = msg.message?.role || (msg.sender === 'human' ? 'user' : 'assistant');

        const newMessage = await prisma.message.create({
            data: {
                sessionId,
                role,
                content,
                timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
                metadata: { prosody: computedProsody }
            },
        });

        // Verify message was created
        const verifyMessage = await prisma.message.findUnique({
            where: { id: newMessage.id }
        });
        console.log('Message verification:', verifyMessage ? 'success' : 'failed');

        return newMessage;
    } catch (error) {
        console.error("Error adding message:", error);
        throw error;
    }
}

/**
 * Process a transcript uploaded via FilePond.
 * 
 * This function handles multipart/form-data uploads, extracts the JSON file,
 * parses it, normalizes the data, and stores it in the database.
 */
export async function processTranscript(req: Request) {
    // Timing metrics
    const startTime = Date.now();
    let normalizationTime = 0;
    let sessionProcessingTimes: number[] = [];
    let messageProcessingTimes: number[] = [];
    
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            throw new Error("Unauthorized: Missing user ID in headers");
        }
        
        // Parse the URL to get query parameters
        const url = new URL(req.url);
        const noLimitParam = url.searchParams.get('noLimit');
        const limitParam = url.searchParams.get('limit');
        
        // Determine if limits should be applied:
        // - If noLimitParam is 'true', we disable the message limit
        // - If limitParam is undefined/empty, we also disable the limit since no explicit limit was requested
        // This gives two ways to disable the limit: ?noLimit=true or by not providing a limit parameter
        const applyNoLimit = noLimitParam === '' || !limitParam;
        
        // Set message limit based on parameters:
        // 1. If applyNoLimit is true, use MAX_SAFE_INTEGER (effectively unlimited)
        // 2. If limitParam exists and is a valid number, use that as the limit
        // 3. Otherwise fall back to default limit of 5 messages
        let MESSAGE_LIMIT;
        if (applyNoLimit) {
            MESSAGE_LIMIT = Number.MAX_SAFE_INTEGER; // Effectively no limit
        } else if (limitParam && !isNaN(Number(limitParam))) {
            MESSAGE_LIMIT = Number(limitParam);
        } else {
            MESSAGE_LIMIT = 5; // Default limit
        }
        
        console.log(`Processing transcript for user: ${userId} with ${applyNoLimit ? 'no limit' : `limit of ${MESSAGE_LIMIT}`}`);

        // Handle multipart form data
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof Blob)) {
            return Response.json(
                { success: false, message: "No file found in the request" },
                { status: 400 }
            );
        }

        console.log("Received file:", (file as any).name);

        // Read the file content
        const fileContent = await file.text();
        console.log("File content length:", fileContent.length);

        // Parse and normalize the transcript - time this operation
        let normalizeStartTime = Date.now();
        let normalizedSessions;
        try {
            normalizedSessions = normalizeTranscript(fileContent);
            normalizationTime = Date.now() - normalizeStartTime;
            console.log(`Normalized ${normalizedSessions.length} sessions in ${normalizationTime}ms`);
        } catch (error) {
            console.error("Error normalizing transcript:", error);
            return Response.json(
                { success: false, message: `Failed to normalize transcript: ${(error as Error).message}` },
                { status: 400 }
            );
        }

        if (normalizedSessions.length === 0) {
            return Response.json(
                { success: false, message: "No valid sessions found in transcript" },
                { status: 400 }
            );
        }

        // Calculate total messages to process
        let totalSessions = normalizedSessions.length;
        let totalAvailableMessages = 0;
        let totalMessagesToProcess = 0;
        
        normalizedSessions.forEach(session => {
            const messages = session.chat_messages || session.messages || [];
            totalAvailableMessages += messages.length;
            totalMessagesToProcess += Math.min(messages.length, MESSAGE_LIMIT);
        });
        
        console.log(`Total sessions: ${totalSessions}, Total messages available: ${totalAvailableMessages}, Will process: ${totalMessagesToProcess}`);

        let processedSessions = 0;
        let processedMessages = 0;
        
        for (const session of normalizedSessions) {
            const sessionStartTime = Date.now();
            console.log(`Processing session ${processedSessions + 1}/${totalSessions}: ${session.name || session.uuid || "Unnamed session"}`);
            
            const createdSession = await createSession(userId, session);
            processedSessions++;

            const messages = session.chat_messages || session.messages || [];
            
            // Only process up to MESSAGE_LIMIT messages per session
            const messagesToProcess = messages.slice(0, MESSAGE_LIMIT);
            console.log(`Processing ${messagesToProcess.length} out of ${messages.length} messages for this session`);
            
            for (const [index, msg] of messagesToProcess.entries()) {
                const messageStartTime = Date.now();
                await addMessage(createdSession.id, msg);
                
                processedMessages++;
                const messageTime = Date.now() - messageStartTime;
                messageProcessingTimes.push(messageTime);
                
                // Calculate and log progress
                const percentComplete = ((processedMessages / totalMessagesToProcess) * 100).toFixed(1);
                const avgMessageTime = messageProcessingTimes.reduce((sum, time) => sum + time, 0) / messageProcessingTimes.length;
                const remainingMessages = totalMessagesToProcess - processedMessages;
                const estimatedRemainingTime = (remainingMessages * avgMessageTime) / 1000; // in seconds
                
                console.log(`Progress: ${processedMessages}/${totalMessagesToProcess} messages (${percentComplete}%)`);
                console.log(`Avg time per msg: ${avgMessageTime.toFixed(0)}ms - Est. time: ${estimatedRemainingTime.toFixed(1)}s`);
            }
            
            const sessionTime = Date.now() - sessionStartTime;
            sessionProcessingTimes.push(sessionTime);
            console.log(`Completed session in ${sessionTime}ms - Avg session time: ${(sessionProcessingTimes.reduce((sum, time) => sum + time, 0) / sessionProcessingTimes.length).toFixed(0)}ms`);
        }

        const totalTime = Date.now() - startTime;
        const avgMessageTime = messageProcessingTimes.length > 0 ? 
            messageProcessingTimes.reduce((sum, time) => sum + time, 0) / messageProcessingTimes.length : 0;
        const avgSessionTime = sessionProcessingTimes.length > 0 ?
            sessionProcessingTimes.reduce((sum, time) => sum + time, 0) / sessionProcessingTimes.length : 0;

        return Response.json({
            success: true,
            message: `Successfully imported ${processedSessions} sessions with ${processedMessages} messages (limited to ${MESSAGE_LIMIT} messages per session, ${totalAvailableMessages} messages were available in total)`,
            sessionCount: processedSessions,
            messageCount: processedMessages,
            totalAvailableMessages: totalAvailableMessages,
            messageLimit: MESSAGE_LIMIT,
            timing: {
                totalProcessingTime: totalTime,
                normalizationTime: normalizationTime,
                averageMessageProcessingTime: avgMessageTime,
                averageSessionProcessingTime: avgSessionTime,
                messagesPerSecond: (processedMessages / (totalTime / 1000)).toFixed(2)
            },
            progress: {
                processedMessages,
                totalMessagesToProcess,
                percentComplete: ((processedMessages / totalMessagesToProcess) * 100).toFixed(1)
            }
        });
    } catch (error) {
        console.error("Error in processTranscript:", error);
        const totalTime = Date.now() - startTime;
        
        return Response.json(
            { 
                success: false, 
                message: `Error processing transcript: ${(error as Error).message}`,
                timing: {
                    totalProcessingTime: totalTime,
                    normalizationTime
                }
            },
            { status: 400 }
        );
    }
}
