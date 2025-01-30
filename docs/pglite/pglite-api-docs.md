# PGlite API

This document outlines the API for the PGlite library, a lightweight Postgres database for various environments.

## Main Constructor

The primary way to create a PGlite instance is through the static `PGlite.create()` method:

```typescript
import { PGlite } from '@electric-sql/pglite'

// Preferred method with dataDir and options
await PGlite.create(dataDir: string, options: PGliteOptions)
// Preferred method with options only
await PGlite.create(options: PGliteOptions)
```

Alternatively, you can use the `new PGlite()` constructor:

```typescript
new PGlite(dataDir: string, options: PGliteOptions)
new PGlite(options: PGliteOptions)
```

### Data Directory (`dataDir`)

The `dataDir` argument specifies the storage location for the database. It can be a path or a URI:

-   `file://` or unprefixed: File system storage (Node and Bun).
-   `idb://`: IndexedDB storage (browser).
-   `memory://`: In-memory ephemeral storage (all platforms).

### Options (`PGliteOptions`)

The `options` object provides various configurations:

-   `dataDir?: string`:  The directory in which to store the Postgres database when not provided as the first argument.
-   `debug?: 1-5`: Postgres debug level (logs to console).
-   `relaxedDurability?: boolean`: If `true`, PGlite won't wait for storage flushes after each query, improving performance. Useful for IndexedDB.
-   `fs?: Filesystem`: An alternative to providing a `dataDir` with a filesystem prefix is to initialise a `Filesystem` yourself.
-   `loadDataDir?: Blob | File`: A tarball of a previous datadir, created with `.dumpDataDir()`, to load when the database starts.
-   `extensions?: Extensions`: An object containing extension namespaces and plugins/WASM builds.
-   `username?: string`: The username to connect to the database as.
-  `database?: string`: The database from the Postgres cluster within the dataDir to connect to.
-  `initialMemory?: number`: The initial memory allocation for PGlite in bytes.
-  `wasmModule?: WebAssembly.Module`: A precompiled WASM module.
-  `fsBundle?: Blob | File`: A filesystem bundle when a default download is not possible such as in an edge worker.
-   `parsers: ParserOptions`: An object mapping Postgres data type IDs to parser functions.
-   `serializers: SerializerOptions`: An object mapping Postgres data type IDs to serializer functions.

#### Example with custom parsers:

```typescript
import { PGlite, types } from '@electric-sql/pglite'

const pg = await PGlite.create({
  parsers: {
    [types.TEXT]: (value) => value.toUpperCase(),
  },
});
```

#### Example with custom serializers:
```typescript
import { PGlite, types } from '@electric-sql/pglite'

const pg = await PGlite.create({
  serializers: {
    [types.NUMERIC]: (value) => value.toString(),
  },
})
```

#### Example with extensions:

```typescript
import { PGlite } from '@electric-sql/pglite'
import { live } from '@electric-sql/pglite/live'
import { vector } from '@electric-sql/pglite/vector'

const pg = await PGlite.create({
  extensions: {
    live,
    vector,
  },
});

pg.live.query('...')
```

## Methods

### `query`

```typescript
.query<T>(query: string, params?: any[], options?: QueryOptions): Promise<Results<T>>
```

Executes a single SQL statement with optional parameters. Uses the extended query protocol. Returns a single result object.

**Example:**

```typescript
await pg.query('INSERT INTO test (name) VALUES ($1);', ['test'])
```

**`QueryOptions`:**

-   `rowMode?: "object" | "array"`: The row object type, default `"object"`.
-   `parsers?: ParserOptions`: Override instance-level parsers.
-   `serializers?: SerializerOptions`: Override instance-level serializers.
-   `blob?: Blob | File`: Attach a Blob for use with `COPY FROM /dev/blob`.

### `sql`

```typescript
.sql<T>``: Promise<Results<T>>
.sql<T>(strings: TemplateStringsArray, ...params: any[]): Promise<Results<T>>
```

Executes SQL queries using tagged template literals.  Substitutions are automatically converted to query parameters.

**Example:**

```typescript
await pg.sql`SELECT * FROM test WHERE name = ${'test'}`
```

### `exec`

```typescript
.exec(query: string, options?: QueryOptions): Promise<Array<Results>>
```

Executes one or more SQL statements. Does not support parameters. Useful for migrations. Uses the simple query protocol.

**Example:**

```typescript
await pg.exec(`
  CREATE TABLE IF NOT EXISTS test (
    id SERIAL PRIMARY KEY,
    name TEXT
  );
  INSERT INTO test (name) VALUES ('test');
  SELECT * FROM test;
`)
```

### `transaction`

```typescript
.transaction<T>(callback: (tx: Transaction) => Promise<T>)
```

Starts an interactive transaction. The transaction is committed on success or rolled back on failure.

**`Transaction` methods:**

-   `tx.query<T>(...)`: Same as the main `.query` method.
-   `tx.sql<T>``: Same as the main `.sql` template string method.
-   `tx.exec(...)`: Same as the main `.exec` method.
-   `tx.rollback()`: Rolls back and closes the current transaction.

**Example:**

```typescript
await pg.transaction(async (tx) => {
  await tx.query(
    'INSERT INTO test (name) VALUES ($1);',
    [ 'test' ]
  );
  return await tx.query('SELECT * FROM test;');
});
```

### `close`

```typescript
.close(): Promise<void>
```

Closes the database, ensuring a clean shutdown.

### `listen`

```typescript
.listen(channel: string, callback: (payload: string) => void): Promise<(() => Promise<void>>
```

Subscribes to a `pg_notify` channel. Returns an unsubscribe function.

**Example:**

```typescript
const unsub = await pg.listen('test', (payload) => {
  console.log('Received:', payload)
})
await pg.query("NOTIFY test, 'Hello, world!'")
```

### `unlisten`

```typescript
.unlisten(channel: string, callback?: (payload: string) => void): Promise<void>
```

Unsubscribes from a channel. Removes a specific callback if provided, otherwise unsubscribes all callbacks.

### `onNotification`

```typescript
onNotification(callback: (channel: string, payload: string) => void): () => void
```

Adds an event handler for all notifications received. Requires manually subscribing with `LISTEN channel_name`.

### `offNotification`

```typescript
offNotification(callback: (channel: string, payload: string) => void): void
```

Removes an event handler added with `onNotification`.

### `dumpDataDir`

```typescript
dumpDataDir(compression?: 'auto' | 'gzip' | 'none'): Promise<File | Blob>
```

Dumps the datadir to a Gzipped tarball, for use with the `loadDataDir` option. Compression defaults to `auto`.

### `execProtocol`

```typescript
execProtocol(message: Uint8Array, options?: ExecProtocolOptions): Promise<Array<[BackendMessage, Uint8Array]>>
```

Executes a Postgres wire protocol message, returning an array of result messages with parsed message objects and their raw `Uint8Array` representation.

### `execProtocolRaw`

```typescript
execProtocolRaw(message: Uint8Array, options?: ExecProtocolOptions): Promise<Uint8Array>
```

Executes a Postgres wire protocol message, returning the raw, unparsed result as a `Uint8Array`.  Bypasses PGlite's error handling and notification listeners.

### `describeQuery`

```typescript
.describeQuery(query: string, options?: QueryOptions): Promise<DescribeQueryResult>
```

Gets type information about a query's parameters and result fields without executing it.

**Returns:**

-   `queryParams`: Array of parameter type information.
-   `resultFields`: Array of result field type information.

### `refreshArrayTypes`

```typescript
.refreshArrayTypes(): Promise<void>
```

Refreshes the internal array type cache.  Useful when new array-type columns (i.e array of enums) are added.

## Properties

### `ready`

```typescript
.ready boolean (read only)
```

Indicates if the database is ready to accept queries.

### `closed`

```typescript
.closed boolean (read only)
```

Indicates if the database is closed.

### `waitReady`

```typescript
.waitReady Promise<void>
```

A promise that resolves when the database is ready. Query methods wait automatically.

## Results<T> Objects

Result objects from queries have the following properties:

-   `rows: Row<T>[]`: The rows returned.
-   `affectedRows?: number`: The count of rows affected by the query.
-   `fields: { name: string; dataTypeID: number }[]`: Field names and data type IDs.
-   `blob?: Blob`: Data written to the `/dev/blob` device.

## Row<T> Objects

Rows are key/value mappings representing each row.  The `query<T>` method can take a TypeScript type to describe the shape of the returned rows.

## Tagged Template Queries

PGlite uses tagged template literals via the `.sql`` method to construct parametrized SQL queries.

### Helpers
-   `identifier``: Tags identifiers to escape them with quotes.
-   `raw``: Tags raw strings to avoid parameter interpretation, allowing string templating.
-   `sql``: Tags nested templated literals to preserve behaviour and parametrization.
-   `query``: Top-level tag for a parametrized query object of { query: string, params: any[] } without using the query API.

**Example:**

```typescript
import { identifier, raw, sql, query } from '@electric-sql/pglite/template'

await pg.sql`SELECT * FROM ${identifier`test`} WHERE name = ${'test'}`

const filterStmt = (filterVar?: string) =>
  filterVar ? sql`WHERE name = ${filterVar}` : raw`WHERE 1=1`

await pg.sql`SELECT * FROM test ${filterStmt('test')}`
await pg.sql`SELECT * FROM test ${filterStmt(null)}`

query`SELECT * FROM ${identifier`test`} WHERE name = ${'test'}`
```

## `/dev/blob`

PGlite uses a virtual `/dev/blob` device for importing and exporting via the SQL `COPY` command.

**Example Import:**

```typescript
await pg.query("COPY my_table FROM '/dev/blob';", [], {
  blob: MyBlob,
})
```

**Example Export:**

```typescript
const ret = await pg.query("COPY my_table TO '/dev/blob';")
// ret.blob is a `Blob` object
```
