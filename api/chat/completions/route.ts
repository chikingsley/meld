import OpenAI from 'openai';
import { BASE_PROMPT } from './prompts/base-prompt';
import { ContextTracker } from './hume-context-tracker';
import { toolRegistry } from './tools/tool-registry';
import type { ToolCall, ToolCallResult } from './tools/base/BaseTool';
import { config, getBaseUrl, getApiKey, getModelName } from './llm-model-choice-helper';

const openai = new OpenAI({
  apiKey: getApiKey(config.USE_OPENROUTER),
  baseURL: getBaseUrl(config.USE_OPENROUTER)
});

// Use the helper function instead
const validatedModel = getModelName(config.USE_OPENROUTER);

// Helper function to setup SSE response headers
function setupSSEResponse(stream: TransformStream) {
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// Process tool calls using the registry
async function handleToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];
  
  for (const toolCall of toolCalls) {
    try {
      const result = await toolRegistry.executeTool(toolCall);
      console.log(`Successfully processed ${toolCall.function.name} request`);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error processing tool call ${toolCall.function.name}:`, {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        toolCall: {
          name: toolCall.function.name,
          args: toolCall.function.arguments?.substring(0, 100) + '...'
        }
      });
    }
  }
  
  return results;
}

export async function POST(req: Request) {
  console.log('🚀 POST request received at /api/chat/completions');
  console.log('📨 Headers:', Object.fromEntries(req.headers.entries()));
  console.log('🌐 URL:', req.url);
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  console.log('💫 Stream initialized');

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    if (authHeader) {
      console.log('🔍 Validating auth format...');
      const token = authHeader.split(' ')[1];
      
      if (!authHeader.startsWith('Bearer ') || !token) {
        console.error('❌ Authentication failed:', {
          hasBearer: authHeader.startsWith('Bearer '),
          hasToken: !!token,
          authHeader: authHeader.substring(0, 20) + '...' // Log first 20 chars for debugging
        });
        return new Response(
          JSON.stringify({ error: 'Invalid authorization format' }), 
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
      console.log('✅ Authentication successful');
      console.log('🎫 Token format valid:', token.substring(0, 10) + '...');
    }

    const body = await req.json();
    console.log('📦 Request body:', {
      messageCount: body.messages?.length || 0,
      lastMessage: body.messages?.[body.messages?.length - 1]?.content?.substring(0, 100) + '...',
      modelConfig: {
        model: getModelName(config.USE_OPENROUTER),
        useOpenRouter: config.USE_OPENROUTER
      }
    });

    // Get custom session ID if provided
    const customSessionId = new URL(req.url).searchParams.get('custom_session_id');
    // if (customSessionId) console.log('Custom session ID:', customSessionId);

    // Store prosody data to use in responses
    const prosodyData: { [key: string]: any } = {};
    
    // Initialize context tracker with the specified model
    const contextTracker = new ContextTracker(validatedModel);

    // Handle Hume message format
    const messages = [
      { role: 'system', content: BASE_PROMPT },
      ...body.messages.map((msg: any) => {
      // Store prosody data for this message if available
      if (msg.models?.prosody?.scores) {
        prosodyData[msg.content] = msg.models.prosody.scores;
      }
      // Return only role and content as required by OpenAI
      return {
        role: msg.role,
        content: msg.content
      };
    })];

    // console.log('Processing messages:', messages);
    // console.log('Prosody data:', prosodyData);
    
    console.log('🤖 Starting chat completion with model:', getModelName(config.USE_OPENROUTER));
    console.log('📝 Using messages:', messages.length, 'messages in context');
    
    // Start OpenAI stream with configured model
    const stream2 = await openai.chat.completions.create({
      model: getModelName(config.USE_OPENROUTER),
      messages: contextTracker.shouldTruncate(messages) ? 
        contextTracker.truncateMessages(messages) : 
        messages,
      tools: toolRegistry.getTools(),
      tool_choice: 'auto',
      stream: true,
      ...(config.USE_OPENROUTER && {
        headers: {
          'HTTP-Referer': 'https://github.com/mindpattern',
          'X-Title': 'MindPattern'
        }
      })
    });

    // Process the stream
    (async () => {
      try {
        let fullResponse = '';
        let startTime = Date.now();
        let lastProsody = Object.values(prosodyData).pop() || {};
        
        let finalToolCalls: Record<number, ToolCall> = {};
        let toolCallsProcessed = false;  // Add flag to track if we've processed tools
        
        for await (const chunk of stream2) {
          if (chunk.choices[0]?.delta?.tool_calls && !toolCallsProcessed) {
            const toolCalls = chunk.choices[0].delta.tool_calls;
            console.log('Received tool call chunk:', {
              toolCalls,
              finish_reason: chunk.choices[0]?.finish_reason
            });
            
            for (const toolCall of toolCalls) {
              if (!toolCall.function) continue;
              
              const index = toolCall.index || 0;
              if (!finalToolCalls[index]) {
                console.log('Initializing new tool call:', {
                  id: toolCall.id,
                  index,
                  function: toolCall.function
                });
                finalToolCalls[index] = {
                  id: toolCall.id || '',
                  index,
                  function: {
                    name: toolCall.function.name || '',
                    arguments: ''
                  }
                };
              }
              
              if (toolCall.function.arguments) {
                console.log('Accumulating arguments for tool call:', {
                  index,
                  newArguments: toolCall.function.arguments,
                  currentArguments: finalToolCalls[index].function.arguments
                });
                finalToolCalls[index].function.arguments += toolCall.function.arguments;
              }

              // Move isComplete check inside the loop where we have access to toolCall
              const currentToolCall = finalToolCalls[index];
              const isComplete = currentToolCall.function.arguments?.endsWith('}') || 
                                chunk.choices[0]?.finish_reason === 'tool_calls' || 
                                chunk.choices[0]?.delta?.content;
                                
              if (isComplete) {
                console.log('Tool calls complete, processing:', {
                  finish_reason: chunk.choices[0]?.finish_reason,
                  hasContent: !!chunk.choices[0]?.delta?.content,
                  accumulatedToolCalls: finalToolCalls
                });
                
                const completedCalls = Object.values(finalToolCalls);
                if (completedCalls.length > 0) {
                  console.log('Processing completed tool calls:', completedCalls);
                  const results = await handleToolCalls(completedCalls);
                  
                  if (results.length > 0) {
                    console.log('Tool call results:', results);
                    
                    const toolMessage = {
                      role: "assistant",
                      tool_calls: completedCalls.map(call => ({
                        id: call.id,
                        type: "function",
                        function: {
                          name: call.function.name,
                          arguments: call.function.arguments
                        }
                      }))
                    };
                    
                    const toolResults = results.map((result: ToolCallResult) => ({
                      role: "tool",
                      tool_call_id: result.tool_call_id,
                      content: result.output
                    }));
                    
                    messages.push(toolMessage, ...toolResults);
                    
                    // Make one final call after tool processing
                    const finalResponse = await openai.chat.completions.create({
                      model: validatedModel,
                      messages: messages,
                      stream: true
                    });
                    
                    // Process the final response
                    for await (const finalChunk of finalResponse) {
                      if (finalChunk.choices[0]?.delta?.content) {
                        console.log('Final response chunk:', {
                          content: finalChunk.choices[0].delta.content,
                          finish_reason: finalChunk.choices[0]?.finish_reason
                        });
                        const content = finalChunk.choices[0].delta.content;
                        fullResponse += content;
                        
                        const data = {
                          id: finalChunk.id,
                          object: 'chat.stream.chunk',
                          created: finalChunk.created,
                          model: validatedModel,
                          choices: [{
                            index: 0,
                            delta: {
                              role: 'assistant',
                              content: content
                            },
                            finish_reason: null,
                            logprobs: null,
                            models: {
                              prosody: {
                                scores: lastProsody
                              }
                            },
                            time: {
                              begin: startTime,
                              end: Date.now()
                            }
                          }],
                          type: 'assistant_input',
                          system_fingerprint: customSessionId
                        };
                        
                        await writer.write(
                          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                        );
                      }
                    }
                    
                    toolCallsProcessed = true;  // Mark tools as processed
                    break;  // Exit the main stream loop
                  }
                }
              }
            }
          }

          // Handle regular content if no tool calls
          if (chunk.choices[0]?.delta?.content && !toolCallsProcessed) {
            console.log('Regular content chunk:', {
              content: chunk.choices[0].delta.content,
              toolCallsProcessed
            });
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            
            console.log('LLM response after tool use:', {
              content,
              fullResponseSoFar: fullResponse
            });
            
            // Format response to match Hume's expectations
            const data = {
              id: chunk.id,
              object: 'chat.stream.chunk',
              created: chunk.created,
              model: validatedModel,
              choices: [{
                index: 0,
                delta: {
                  role: 'assistant',
                  content: content
                },
                finish_reason: null,
                logprobs: null,
                // Add Hume-specific fields with last known prosody scores
                models: {
                  prosody: {
                    scores: lastProsody
                  }
                },
                time: {
                  begin: startTime,
                  end: Date.now()
                }
              }],
              type: 'assistant_input',  // Required by Hume
              system_fingerprint: customSessionId // Include session ID if provided
            };
            
            console.log('Sending chunk:', content);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        }
        
        // Send final message
        const endMessage = {
          type: 'assistant_end',
          time: {
            begin: startTime,
            end: Date.now()
          },
          models: {
            prosody: {
              scores: lastProsody
            }
          }
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(endMessage)}\n\n`));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        
        console.log('Full response:', fullResponse);
      } catch (error) {
        console.error('Streaming error:', error);
        const errorData = {
          type: 'error',
          error: error instanceof Error ? error.message : 'An error occurred while streaming'
        };
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return setupSSEResponse(stream);
  } catch (error) {
    console.error('POST Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        }
      }
    );
  }
}