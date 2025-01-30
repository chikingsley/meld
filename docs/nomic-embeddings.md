# Embed Text

**POST** `https://api-atlas.nomic.ai/v1/embedding/text`

Generates text embeddings using Nomic's text embedding models.

`nomic-embed-text` models are trained to support various tasks:

- `search_document`: Embedding document chunks for search and retrieval.
- `search_query`: Embedding queries for search and retrieval.
- `classification`: Embeddings for text classification.
- `clustering`: Embeddings for cluster visualization.

In the Nomic API or Python client, specify your task using the `task_type` parameter. If no `task_type` is provided, it defaults to `search_document`.

When using `nomic-embed-text` with other libraries, you may need to use a prefix to specify the embedding task. Refer to the [HuggingFace model card](link-to-huggingface-model-card) for details.

## Request

**Headers:**

- `Content-Type`: `application/json`
- `Authorization`: `Bearer {your_api_key}` (using Auth0ImplicitBearer)

**Body:**

```json
{
  "texts": ["string"],  // Required: An array of strings to be embedded.
  "model": "nomic-embed-text-v1.5", // Optional:  The embedding model to use. Options: "nomic-embed-text-v1", "nomic-embed-text-v1.5". Defaults to nomic-embed-text-v1 if not provided.
  "task_type": "search_document", // Optional: The downstream task. Options: "search_document", "search_query", "classification", "clustering". Default is "search_document".
    "long_text_mode": "truncate", // Optional: How to handle input texts longer than context length. Options: "truncate", "mean". Default is "truncate".
  "max_tokens_per_text": 8192, // Optional: Maximum number of tokens per text. Defaults to 8192 if long_text_mode is "mean", or the maximum model input size if long_text_mode is "truncate".
   "dimensionality": 768 // Optional: Reduce the embedding dimensionality (only applicable to nomic-embed-text-v1.5). Default to full-size embeddings if unspecified
}
```

### Body Parameters:

-   `texts`: **Required** `string[]`
    -   A batch of text you want to embed.
-   `model`: **Optional** `NomicTextEmbeddingModel`
    -   Possible values: `nomic-embed-text-v1`, `nomic-embed-text-v1.5`.
    -   An enumeration specifying the model to use. Defaults to `nomic-embed-text-v1` if not provided
-   `task_type`: **Optional** `string`
    -   Default value: `search_document`
    -   The downstream task to generate embeddings for. Options are: `search_document`, `search_query`, `classification`, and `clustering`.
- `long_text_mode`: **Optional** `string`
     -  Possible values: `truncate`, `mean`
    -   How to handle input texts longer than the context length. Use `truncate` to cut off text after the context length, or `mean` to get the mean of embedding vectors of chunks from your input text.
- `max_tokens_per_text`: **Optional** `integer`
    -  Default value: `8192`
    -  Maximum amount of tokens per text. Defaults to `8192` if `long_text_mode` is `mean`, or the maximum model input size if `long_text_mode` is `truncate`.
-   `dimensionality`: **Optional** `integer`
    -   Default value: `768`
    -   Optionally reduce embedding dimensionality. Defaults to full-size embeddings if unspecified. Only applies to `nomic-embed-text-v1.5`.

## Responses

### 200 Success

**Headers:**

-   `Content-Type`: `application/json`

**Body:**

```json
{
  "embeddings": [[0], ...], // Array of embedding vectors
    "usage": {
        "model": "nomic-embed-text-v1.5", // The model used for embedding
      "prompt_tokens": 0, // Number of tokens in the prompt
        "total_tokens": 0 // Total number of tokens processed
  }
}
```

**Schema:**

- `embeddings`: `array[]`
   -  The embeddings generated for the input text.
- `usage`: `object`
    - `model`: `NomicTextEmbeddingModel`
       -   Possible values: `nomic-embed-text-v1`, `nomic-embed-text-v1.5`
        -   The model used for the embedding process
    - `prompt_tokens`: `integer`
       -  The number of tokens from prompt.
     - `total_tokens`: `integer`
       - Total number of tokens processed

### 422 Validation Error

**Headers:**

-   `Content-Type`: `application/json`

**Body:**

```json
{
  "detail": [
    {
      "loc": ["string", 0],
      "msg": "string",
      "type": "string"
    }
    ,...
  ]
}
```

**Schema:**

-   `detail`: `object[]`
    -   An array of validation error objects. Each object contains:
        -   `loc`: `object[]` - An array indicating the location of the error.
        -   `msg`: `string` - The error message.
        -   `type`: `string` - The type of error.

## Example

**Request (Python):**
```python
from nomic import embed
            
output = embed.text(
    texts=['document 1', 'document 2'],
    model='nomic-embed-text-v1.5',
    task_type='search_document', 
)

print(output)
```

**Request (cURL):**

```bash
curl -X POST \
  'https://api-atlas.nomic.ai/v1/embedding/text' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
  "texts": [
    "This is document 1.",
    "This is document 2."
  ],
  "model": "nomic-embed-text-v1.5",
  "task_type": "search_document",
  "max_tokens_per_text": 8192,
  "dimensionality": 768
}'
```