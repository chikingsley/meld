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
    console.log("Received message request for session:", sessionId);
    try {
        // Verify session exists
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        console.log('Session exists:', session ? 'yes' : 'no');

        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const content = msg.message?.content || msg.text || "";
        let computedProsody = {};
        if (content.trim()) {
            computedProsody = await analyzeEmotions(content);
            console.log("Computed prosody - DONE");
        }
        
        const role = msg.message?.role || (msg.sender === 'human' ? 'user' : 'assistant');
        
        // Debug log before Prisma operation
        console.log('About to create message in Prisma with data:', {
            sessionId,
            role,
            content,
            timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
            metadata: { prosody: computedProsody }
        });

        const newMessage = await prisma.message.create({
            data: {
                sessionId,
                role,
                content,
                timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
                metadata: { prosody: computedProsody }
            },
        });
        console.log("Added message with ID:", newMessage.id, "Full message:", newMessage);

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
    try {
        const userId = req.headers.get("x-user-id");
        if (!userId) {
            throw new Error("Unauthorized: Missing user ID in headers");
        }
        
        // Parse the URL to get query parameters
        const url = new URL(req.url);
        const noLimitParam = url.searchParams.get('noLimit');
        const limitParam = url.searchParams.get('limit');
        
        // Determine if limits should be applied
        const applyNoLimit = noLimitParam === 'true';
        
        // Set message limit - either from query param, default, or unlimited
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

        // Parse and normalize the transcript
        let normalizedSessions;
        try {
            normalizedSessions = normalizeTranscript(fileContent);
            console.log("Normalized sessions:", normalizedSessions.length);
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

        let totalSessions = 0;
        let totalMessages = 0;
        let totalAvailableMessages = 0;

        for (const session of normalizedSessions) {
            console.log("Processing session:", session.name || session.uuid || "Unnamed session");
            const createdSession = await createSession(userId, session);
            totalSessions++;

            const messages = session.chat_messages || session.messages || [];
            totalAvailableMessages += messages.length;
            
            // Only process up to MESSAGE_LIMIT messages per session
            const messagesToProcess = messages.slice(0, MESSAGE_LIMIT);
            console.log(`Processing ${messagesToProcess.length} out of ${messages.length} messages for this session`);
            
            for (const msg of messagesToProcess) {
                await addMessage(createdSession.id, msg);
                totalMessages++;
            }
        }

        return Response.json({
            success: true,
            message: `Successfully imported ${totalSessions} sessions with ${totalMessages} messages (limited to ${MESSAGE_LIMIT} messages per session, ${totalAvailableMessages} messages were available in total)`,
            sessionCount: totalSessions,
            messageCount: totalMessages,
            totalAvailableMessages: totalAvailableMessages,
            messageLimit: MESSAGE_LIMIT
        });
    } catch (error) {
        console.error("Error in processTranscript:", error);
        return Response.json(
            { success: false, message: `Error processing transcript: ${(error as Error).message}` },
            { status: 400 }
        );
    }
}
