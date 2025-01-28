```markdown
# In-Browser Semantic AI Search with PGlite and Transformers.js

**Date:** 29 Aug 2024  
**Author:** Thor Schaeff, DevRel & DX

A couple of weeks ago during Launch Week 12, we introduced a new in-browser Postgres sandbox experience built in collaboration with the ElectricSQL team utilizing PGlite to run Postgres and the pgvector extension in the browser.

This gave me the idea to try and build a fully local, in-browser semantic search experience, utilizing:

- PGlite to store text and embeddings locally in IndexedDB.
- pgvector to perform inner product search.
- Huggingface's Transformers.js with Supabase/gte-small to generate embeddings.

I'm thinking something like this can be great for eCommerce sites that want to surface relevant products for users' searches quickly without needing a server roundtrip, or quickly showing similar products to the customer. Any other use cases you can think of? Tweet them at us!

### Install the dependencies

In this example, we'll be using a simple static React application. If you're starting from scratch, you can use `vite create` to get started:

```bash
npm create vite@latest
```

Then go ahead and install the required dependencies: `@electric-sql/pglite` and `@huggingface/transformers`:

```bash
npm install @electric-sql/pglite @huggingface/transformers
```

### Create the Database schema

Next, create a `utils/db.js` file to set up the database schema:

```javascript
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

let dbInstance
// Implement a singleton pattern to make sure we only create one database instance.
export async function getDB() {
  if (dbInstance) {
    return dbInstance
  }
  const metaDb = new PGlite('idb://supa-semantic-search', {
    extensions: {
      vector,
    },
  })
  await metaDb.waitReady
  dbInstance = metaDb
  return metaDb
}

// Initialize the database schema.
export const initSchema = async (db) => {
  return await db.exec(`
    create extension if not exists vector;
    -- drop table if exists embeddings; -- Uncomment this line to reset the database
    create table if not exists embeddings (
      id bigint primary key generated always as identity,
      content text not null,
      embedding vector (384)
    );
    
    create index on embeddings using hnsw (embedding vector_ip_ops);
  `)
}

// Helper method to count the rows in a table.
export const countRows = async (db, table) => {
  const res = await db.query(`SELECT COUNT(*) FROM ${table};`)
  return res.rows[0].count
}
```

In your `App.jsx` file, set up the state and reference variables to set up the database:

```javascript
import { getDB, initSchema, countRows } from './utils/db'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function App() {
  const [content, setContent] = useState([])
  const initailizing = useRef(false)
  // Create a reference to the worker object.
  const worker = useRef(null)

  // Set up DB
  const db = useRef(null)
  useEffect(() => {
    const setup = async () => {
      initailizing.current = true
      db.current = await getDB()
      await initSchema(db.current)
      let count = await countRows(db.current, 'embeddings')

      if (count === 0) {
        // TODO: seed the database.
      }
      // Get Items
      const items = await db.current.query('SELECT content FROM embeddings')
      setContent(items.rows.map((x) => x.content))
    }
    if (!db.current && !initailizing.current) {
      setup()
    }
  }, [])

  // [...]

  return <pre>{JSON.stringify(content)}</pre>
}
```

### Seed the Database with text and embeddings

There are various ways of generating the embeddings to seed your database. For example, you could use a Database webhook in Supabase anytime a new item is inserted into the database. You can find an example for this here.

For easy prototyping, you can use `database.build` to generate sample data, including embeddings, and then copy and paste that into your application.

Add this `seedDb` method to your `utils/db.js` file:

```javascript
// [...]

export const seedDb = async (db) => {
  return await db.exec(`
    insert into embeddings (content, embedding) values
      ('Bed', '[-0.006822244,-0.0073390524,0.040399525,...]'),
      ('Car', '[-0.013675096,0.027324528,0.06942244,...]'),
      ('Train', '[0.008390516,-0.0316401,0.059414063,...]'),
      ('Cat', '[-0.018450698,-0.043701697,0.02752752,...]'),
      ('Dog', '[-0.03398106,-0.04587913,0.05834977,...]'),
      ('Apple', '[-0.01854126,-0.015314187,0.008172714,...]'),
      ('Boat', '[0.003451573,-0.03132442,0.041924234,...]'),
      ('Mouse', '[-0.040377103,-0.022667758,0.040733587,...]'),
      ('Chair', '[0.007242612,-0.008890708,0.07087478,...]'),
      ('Tomato', '[-0.029869203,0.015828134,-0.024596874,...]'),
      ('Banana', '[0.019635703,-0.016662825,0.0438706,...]');
  `)
}
```

### Define the inner product search function with pgvector

In PGlite, we can use pgvector just like we would in Postgres. Here we create an inner product search function that takes in three parameters:

- `embedding` - The embedding of our search term.
- `match_threshold` - The threshold for the inner product.
- `limit` - The number of results to return.

```javascript
// [...]

export const search = async (db, embedding, match_threshold = 0.8, limit = 3) => {
  const res = await db.query(
    `
    select * from embeddings

    -- The inner product is negative, so we negate match_threshold
    where embeddings.embedding <#> $1 < $2

    -- Our embeddings are normalized to length 1, so cosine similarity
    -- and inner product will produce the same query results.
    -- Using inner product which can be computed faster.
    order by embeddings.embedding <#> $1
    limit $3;
    `,
    [JSON.stringify(embedding), -Number(match_threshold), Number(limit)]
  )
  return res.rows
}
```

### Create an embedding for the search term

To generate the embedding for the search term, we set up a web worker that creates our transformers pipeline and event listeners to communicate with the main thread.

**worker.js**

```javascript
import { pipeline } from '@huggingface/transformers'

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task = 'feature-extraction'
  static model = 'Supabase/gte-small'
  static instance = null

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
        dtype: 'fp32',
        device: !!navigator.gpu ? 'webgpu' : 'wasm',
      })
    }
    return this.instance
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  let classifier = await PipelineSingleton.getInstance((x) => {
    self.postMessage(x)
  })

  let output = await classifier(event.data.text, {
    pooling: 'mean',
    normalize: true,
  })

  const embedding = Array.from(output.data)

  self.postMessage({
    status: 'complete',
    embedding,
  })
})
```

In our `App.jsx`, we set up a reference worker variable as well as the event listeners:

```javascript
import { getDB, initSchema, countRows, seedDb, search } from './utils/db'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function App() {
  const [input, setInput] = useState('')
  const [content, setContent] = useState([])
  const [result, setResult] = useState(null)
  const [ready, setReady] = useState(null)
  const initailizing = useRef(false)

  // [...]

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      })
    }

    const onMessageReceived = async (e) => {
      switch (e.data.status) {
        case 'initiate':
          setReady(false)
          break
        case 'ready':
          setReady(true)
          break
        case 'complete':
          const searchResults = await search(db.current, e.data.embedding)
          console.log({ searchResults })
          setResult(searchResults.map((x) => x.content))
          break
      }
    }

    worker.current.addEventListener('message', onMessageReceived)

    return () => worker.current.removeEventListener('message', onMessageReceived)
  })

  const classify = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ text })
    }
  }, [])

  // [...]
}
```

### Perform the search

The search is performed in the complete case above, where we provide the generated embedding and then perform the inner product search.

And that's it. You've learned about all the components necessary to build a fully local, in-browser semantic search experience. And the best part is, it's free to use!

