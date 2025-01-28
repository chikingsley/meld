# Using a Custom Language Model

Use a custom language model to generate your own text for maximum configurability.

## Overview

The custom language model (CLM) feature allows you to use your own language model to drive EVI's responses. When you configure a custom language model, EVI will send requests to your server with textual conversation history and emotional context. Your server is responsible for responding with the text that EVI should speak next.

A custom language model can be:

- A frontier model from an LLM provider like OpenAI or Anthropic "wrapped" with custom pre-processing or post-processing logic.
- A language model that you have trained and host yourself.
- Anything that produces text: it doesn't have to be an LLM.

CLMs are appropriate for use cases that involve deep configurability, for example:

- **Advanced conversation steering**: Implement complex logic to steer conversations beyond basic prompting, including managing multiple system prompts or controlling all of the text outputs.
- **Regulatory compliance**: Directly control, post-process, or modify text outputs to meet specific regulatory requirements.
- **Unreleased LLMs**: Custom language models allow organizations to use non-public, proprietary LLMs for all the text generation while using EVI.
- **Retrieval augmented generation (RAG)**: Employ retrieval augmented generation techniques to enrich conversations by integrating external data without the need to modify the system prompt.

You should prefer using conversational controls instead of a CLM for use cases that do not require deep configurability. When Hume connects to an upstream LLM provider directly, it covers the cost of usage, and this results in less latency compared to if Hume connects to your CLM which connects to an upstream LLM provider.

## Set up the config

First, **create a new config, or update an existing config** and select the "custom language model" option in the "Set up LLM" step.

### Endpoint Configuration

Type in the URL of your custom language model endpoint:

- For SSE interface (recommended):
  - URL should start with `https://`
  - URL should end with `/chat/completions`

- For WebSocket interface:
  - URL should start with `wss://`

### Public Accessibility

The endpoint needs to be accessible from the public Internet. If you are developing locally, you can use a service like **ngrok** to give your local server a publicly accessible URL.

## Server-Sent Events

The recommended way to set up a CLM is to expose a `POST /chat/completions` endpoint that responds with a stream of Server-Sent Events (SSEs) in a format compatible with OpenAI's `POST /v1/chat/completions` endpoint.

Because EVI expects the events to be in the same format as OpenAI's chat completions, it is straightforward to build a CLM that simply "wraps" an OpenAI model with preprocessing or postprocessing logic. More effort is required to build a CLM to wrap a model from a different provider: you will have to convert the output of your model to the OpenAI format.

### What are Server-Sent Events?

Server-Sent Events describe a type of HTTP response that conforms to a certain web standard where:

1. There is a `Content-Type: text/event-stream` header.
2. The body is an "Event Stream", i.e., it follows a specific format that breaks it up into discrete "events".
3. The body is transmitted in pieces, as events occur, rather than being buffered until it is complete and sent all at once.
4. There is no `Content-Length` header, as the length of the entire response is not known in advance.

### OpenAI-Compatible

The following example shows how to build a CLM by "wrapping" an upstream LLM provided by OpenAI. The steps are:

1. Listen for POST requests to `/chat/completions`.
2. Parse the request and extract only the `role` and `content` fields from each message in the message history. (Hume also supplies prosody information and other metadata. In this example, we simply discard that information, but you might attempt to reflect it by adding or modifying the messages you pass upstream.)
3. Use the OpenAI SDK to make a request to the upstream OpenAI `POST /chat/completions` endpoint, passing in the message history and `"stream": true`.
4. Reformat the data from OpenAI into Server-Side Events (while the OpenAI API originally sends data in the form of SSEs, the OpenAI SDK automatically unwraps them, and so to transmit the data back to Hume you have to rewrap it).
5. Stream the SSEs back to Hume.

```python
from typing import AsyncIterable, Optional
import fastapi
from fastapi.responses import StreamingResponse
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam
import openai
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = fastapi.FastAPI()

"""
This script creates a FastAPI server that Hume will send requests to, and
the server will stream responses back to Hume.
To run, use: uvicorn sse.sse:app --reload
"""

client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

async def get_response(
    raw_messages: list[dict],
    custom_session_id: Optional[str],
) -> AsyncIterable[str]:
    # Remove prosody scores and other Hume metadata
    messages: list[ChatCompletionMessageParam] = [
        {"role": m["role"], "content": m["content"]} for m in raw_messages
    ]
    chat_completion_chunk_stream = await client.chat.completions.create(
        messages=messages,
        model="gpt-4o",
        stream=True,
    )
    async for chunk in chat_completion_chunk_stream:
        yield "data: " + chunk.model_dump_json(exclude_none=True) + "\n\n"
    yield "data: [DONE]\n\n"

security = HTTPBearer()
API_KEY = "your-secret-key-here"  # Use environment variables in production

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return credentials.credentials

@app.post("/chat/completions", response_class=StreamingResponse)
async def root(
    request: fastapi.Request,
    token: str = Security(verify_token)
):
    """Chat completions endpoint with Bearer token authentication"""
    request_json = await request.json()
    messages = request_json["messages"]
    print(messages)
    custom_session_id = request.query_params.get("custom_session_id")
    print(custom_session_id)
    return StreamingResponse(
        get_response(messages, custom_session_id=custom_session_id),
        media_type="text/event-stream",
    )
```

### Other Provider

The following example shows how to build a CLM on top of a text stream that originates from some place other than an OpenAI-compatible LLM.

In general, this involves two more steps than the OpenAI-compatible example:

1. Convert the `role` and `content` fields sent by Hume into the format your model provider expects. (Not shown in this example, as the output is just a stream of hardcoded text.)
2. Convert the output of your LLM provider into the OpenAI format before transmitting them back to Hume. For this, we use the "tiktoken" library provided by OpenAI, as well as constructors from OpenAI's SDK.

```python
from typing import AsyncIterable, Optional
import fastapi
from fastapi.responses import StreamingResponse
from openai.types.chat import ChatCompletionChunk, ChatCompletionMessageParam
from openai.types.chat.chat_completion_chunk import Choice, ChoiceDelta
import time
import tiktoken
import openai
import os
from uuid import uuid4

app = fastapi.FastAPI()

"""
uvicorn sse.sse:app --reload
"""

def tokenize(enc: tiktoken.Encoding, text: str) -> list[str]:
    tokens = enc.encode(text)
    chunks = [enc.decode([token]) for token in tokens]
    return chunks

async def chat_completion_stream(text: str) -> AsyncIterable[str]:
    enc = tiktoken.encoding_for_model("gpt-4o")
    _id = str(uuid4())
    for char in tokenize(enc, text):
        chunk = ChatCompletionChunk(
            id=_id,
            choices=[
                Choice(
                    delta=ChoiceDelta(
                        content=char,
                        role="assistant",
                    ),
                    finish_reason=None,
                    index=0,
                    logprobs=None,
                )
            ],
            created=int(time.time()),
            model="hume",
            object="chat.completion.chunk",
        )
        yield "data: " + chunk.model_dump_json(exclude_none=True) + "\n\n"
    yield "data: [DONE]\n\n"

@app.post("/v1/chat/completions", response_class=StreamingResponse)
async def root(request: fastapi.Request):
    request_json = await request.json()
    messages = request_json["messages"]
    print(messages)
    custom_session_id = request.query_params.get("custom_session_id")
    print(custom_session_id)
    return StreamingResponse(
        chat_completion_stream(
            "I just say this sentence over and over again. I say it a lot."
        ),
        media_type="text/event-stream",
    )
```

## Testing your SSE endpoint

To verify that you have successfully implemented an OpenAI-compatible `POST /chat/completions` endpoint, you can use the OpenAI SDK but pointed at your server, not `api.openai.com`. Below is an example verification script (assumes your server is running on `localhost:8000`):

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="http://localhost:8000",
    default_query={"custom_session_id": "123"},
    api_key="your-secret-key-here",  # Sent as a Bearer token
)

async def main():
    chat_completion_chunk_stream = await client.chat.completions.create(
        model="hume",
        messages=[],
        stream=True,
        extra_body={
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, how are you?",
                    "time": {
                        "begin": 0,
                        "end": 1000,
                    },
                    "models": {
                        "prosody": {
                            "scores": {
                                "Sadness": 0.1,
                                "Joy": 0.2,
                            },
                        },
                    },
                },
            ],
        },
    )
    async for chunk in chat_completion_chunk_stream:
        print(chunk)

if __name__ == "__main__":
    asyncio.run(main())
```

## Providing an API Key

If your SSE endpoint requires an API key, send it in the `language_model_api_key` message using a **session_settings message** when a session begins:

```json
{
  "type": "session_settings",
  "language_model_api_key": "<your-secret-key-here>"
}
```

This will cause EVI to include the provided API key as a Bearer token in the Authorization header of all requests to your custom language model endpoint. The header will be formatted as:

```
Authorization: Bearer <your-secret-key-here>
```

### Security Considerations

- The API key is transmitted securely over HTTPS
- The key is only stored for the duration of the session
- Each new session requires a new key to be provided
- Keys are never logged or persisted by EVI

### Example Usage

1. Start a new EVI session
2. Send the session_settings message with your API key
3. EVI will automatically include the key in all subsequent requests to your endpoint
4. The key remains valid until the session ends or is explicitly updated

### Updating the API Key

You can update the API key during an active session by sending a new session_settings message. This is useful for:
- Key rotation
- Switching between different authentication contexts
- Updating expired keys

```json
{
  "type": "session_settings",
  "language_model_api_key": "<your-new-key-here>"
}
```

### Error Handling

If an invalid or expired API key is provided, your endpoint should return an appropriate HTTP error code (e.g., 401 Unauthorized). EVI will relay these errors back to the client for proper error handling.

## WebSockets

We recommend using the SSE interface for your CLM. SSEs are simpler, allow for better security, and have better latency properties. In the past, the WebSocket interface was the only option, so the instructions are preserved here.

Please reference the project in our examples repo for a runnable example.

To use a CLM with WebSockets, the steps are:

1. Set up an EVI config

Use the web interface or the `/v0/evi/configs` API to create a configuration. Select "custom language model" and provide the URL of your WebSocket endpoint. If you are developing locally, you can use a service like **ngrok** to give your local server a publicly accessible URL.

2. The chat starts

Next, your frontend (or Twilio, if you are using the inbound phone calling endpoint) will connect to EVI via the `/v0/evi/chat` endpoint, with `config_id` of that configuration.

3. EVI connects to your CLM WebSocket endpoint

EVI will open a WebSocket connection to your server, via the URL you provided when setting up the configuration. This connection is the *CLM socket*, as opposed to the *Chat socket* that is already open between the client and EVI.

4. EVI sends messages over the CLM socket

As the user interacts with EVI, EVI will send messages over the *CLM socket* to your server, containing the conversation history and emotional context.

### CLM incoming message data format

```typescript
/* Represents the structure of the messages sent over the CLM socket by EVI to your server */
interface IncomingMessage {
  // Array of message elements
  messages: MessageElement[];
  // Unique identifier for the session
  custom_session_id: string;
}

/* Represents a single message element within the session. */
interface MessageElement {
  // Type of the message (e.g., user_message, assistant_message)
  type: string;
  // The message content and related details
  message: Message;
  // Models related to the message, primarily prosody analysis
  models: Models;
  // Optional timestamp details for when the message was sent
  time?: Time;
}

/*
 * Represents the content of the message.
 */
interface Message {
  // Role of the sender (e.g., user, assistant)
  role: string;
  // The textual content of the message
  content: string;
}

/*
 * Represents the models associated with a message.
 */
interface Models {
  // Prosody analysis details of the message
  prosody: Prosody;
}

/*
 * Represents the prosody analysis scores.
 */
interface Prosody {
  // Dictionary of prosody scores with emotion categories as keys
  // and their respective scores as values
  scores: { [key: string]: number };
}

/*
 * Represents the timestamp details of a message.
 */
interface Time {
  // The start time of the message (in milliseconds)
  begin: number;
  // The end time of the message (in milliseconds)
  end: number;
}
```

5. Your server responds

Your server is responsible for sending two types of message back over the CLM socket to EVI:
- `assistant_input` messages containing text to speak
- `assistant_end` messages to indicate when the AI has finished responding, yielding the conversational turn back to the user

### CLM outgoing message data format

```typescript
type OutgoingCLMMessage = AssistantInputMessage | AssistantEndMessage;

interface AssistantInputMessage {
  type: "assistant_input",
  text: string
}

interface AssistantEndMessage {
  type: "assistant_end"
}
```

You can send multiple `assistant_input` payloads consecutively to stream text to the assistant. Once you are done sending inputs, you must send an `assistant_end` payload to indicate the end of your turn.

## Custom Session IDs

For managing conversational state and connecting your frontend experiences with your backend data and logic, you should set a `custom_session_id` for the chat.

Using a `custom_session_id` will enable you to:
- Maintain user state on your backend
- Pause/resume conversations
- Persist conversations across sessions
- Match frontend and backend connections

There are two ways to set a `custom_session_id`:

1. **From the client:** If your frontend connects to EVI via the `/chat` WebSocket endpoint, you can send a `session_settings` message over the WebSocket with the `custom_session_id` field set.

2. **From the CLM endpoint:** If your CLM uses the SSE interface, you can set the `custom_session_id` as a `system_fingerprint` on the `ChatCompletion` type within the message events. With WebSockets, you can include the `custom_session_id` on the `assistant_input` message. Use this option if you don't have control over the WebSocket connection to the client (for example, if you are using the `/v0/evi/twilio` endpoint for inbound phone calling).

### SSE Example

```python
async for chunk in chat_completion_chunk_stream:
    chunk.system_fingerprint = "<your_id_here>"  # Replace with your custom_session_id
    yield "data: " + chunk.model_dump_json(exclude_none=True) + "\n\n"
yield "data: [DONE]\n\n"
```

### WebSocket Example

```python
await websocket.send_text(
    json.dumps({
        "type": "assistant_input",
        "text": eliza_response(user_text),
        "custom_session_id": "<your_id_here>"
    })
)
```

You only need to set the `custom_session_id` once per chat. EVI will remember the `custom_session_id` for the duration of the conversation.

After you set the `custom_session_id`:
- For SSE endpoints: The custom_session_id will be sent as a **query parameter** to your endpoint. For example: 
  ```
  POST https://api.example.com/chat/completions?custom_session_id=123
  ```
- For WebSocket endpoints: The custom_session_id will be included as a top-level property on the incoming message.

## Important Warning

⚠️ If you are sourcing your CLM responses from OpenAI, be careful not to inadvertently override your intended `custom_session_id` with OpenAI's `system_fingerprint`. If you are setting your own `custom_session_id`, you should always either:
- Delete `system_fingerprint` from OpenAI messages before forwarding them to EVI, or
- Override them with the desired `custom_session_id`