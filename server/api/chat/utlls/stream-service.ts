export class StreamingService {
  private static readonly DEFAULT_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  private encoder = new TextEncoder();

  setupSSEResponse(stream: { readable: ReadableStream }): Response {
    return new Response(stream.readable, {
      headers: StreamingService.DEFAULT_HEADERS,
    });
  }

  setupCORSResponse(): Response {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  setupErrorResponse(error: string, status: number = 500): Response {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async writeChunk(writer: WritableStreamDefaultWriter, data: any): Promise<void> {
    await writer.write(
      this.encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
    );
  }

  async writeDone(writer: WritableStreamDefaultWriter): Promise<void> {
    await writer.write(this.encoder.encode('data: [DONE]\n\n'));
  }

  async writeError(writer: WritableStreamDefaultWriter, error: unknown): Promise<void> {
    const errorData = {
      type: 'error',
      error: error instanceof Error ? error.message : 'An error occurred while streaming'
    };
    await this.writeChunk(writer, errorData);
  }
} 