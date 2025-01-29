# Syncing with ElectricSQL and PGlite

ElectricSQL is developing a sync engine for real-time partial replication from Postgres to various data stores (e.g., JavaScript framework state, edge databases, mobile embedded databases).

To facilitate this, a sync extension for PGlite is under development, enabling synchronization between a remote Postgres and PGlite.

This alpha version of the sync plugin allows syncing a "shape" from Electric into a PGlite table. Currently, syncing local writes out and conflict resolution are not supported, but these features are actively being developed.

## Using the Sync Plugin (Alpha)

### Installation

Install the `@electric-sql/pglite-sync` package:

```sh
npm install @electric-sql/pglite-sync
```

### Setup

Add the plugin to your PGlite instance and create necessary local tables:

```typescript
import { electricSync } from '@electric-sql/pglite-sync';

const pg = await PGlite.create({
  extensions: {
    electric: electricSync(),
  },
});

await pg.exec(`
  CREATE TABLE IF NOT EXISTS todo (
    id SERIAL PRIMARY KEY,
    task TEXT,
    done BOOLEAN
  );
`);
```

### Syncing a Table

Use the `syncShapeToTable` method to sync a table from Electric:

```typescript
const shape = await pg.electric.syncShapeToTable({
  shape: {
    url: 'http://localhost:3000/v1/shape',
    params: {
      table: 'todo',
    },
  },
  table: 'todo',
  primaryKey: ['id'],
});
```

### Stopping Synchronization

To stop syncing, call `unsubscribe` on the shape:

```typescript
shape.unsubscribe();
```

### Full Example

A complete runnable example is available in the GitHub repository.

## `electricSync` API

The `electricSync` plugin accepts configuration options to customize the sync process:

*   **`metadataSchema?: string`**:  The Postgres schema for shape metadata tables. Defaults to `"electric"`.
*   **`debug?: boolean`**: Enables debug logging. Defaults to `false`.

## `syncShapeToTable` API

This method wraps the Electric ShapeStream API for minimal effort in syncing a shape to a table. It accepts an object with the following options:

*   **`shape: ShapeStreamOptions`**: Shape stream specification based on the Electric ShapeStream API (refer to the ShapeStream API documentation for details).
*   **`table: string`**: The name of the table to sync into.
*   **`schema: string`**:  The Postgres schema of the target table. Defaults to `"public"`.
*   **`mapColumns: MapColumns`**: Column mapping from shape to local table. Can be:
    *   A simple object: `{ localColumnName: shapeColumnName }`
    *   A function: `(replicationMessage) => { localColumnName: newValue }`
*   **`primaryKey: string[]`**: An array of column names for the table's primary key (used for updates/deletes).
*   **`shapeKey?: string`**: Optional identifier for shape subscription, enabling stream resumption between sessions.
*   **`useCopy?: boolean`**: Uses `COPY FROM` command for initial data insertion, which can be faster. Defaults to `false`.
*   **`commitGranularity: CommitGranularity`**: Controls commit frequency. Defaults to `"up-to-date"`. Options:
    *   `"up-to-date"`: Commit all messages on the up-to-date message.
    *   `"operation"`: Commit each message in its own transaction.
    *   `number`: Commit every N messages.
*   **`commitThrottle?: number`**: Milliseconds to wait between commits. Defaults to `0`.
*   **`onInitialSync?: () => void`**: Callback when the initial sync completes.

### Returned `shape` Object

The `syncShapeToTable` method returns an object with:

*   **`isUpToDate: boolean`**: Indicates if the stream has caught up with the main Postgres.
*   **`shapeId: string`**: The server-side shapeId.
*   **`subscribe(cb: () => void, error: (err: FetchError | Error) => void)`**: A callback triggered when the shape is up-to-date. Includes an error callback.
*   **`unsubscribe()`**: Unsubscribes from the shape. Doesn't clear synced table data.
*   **`stream: ShapeStream`**: Underlying `ShapeStream` instance. Refer to the ShapeStream API for more information.

## Limitations (Alpha Version)

*   **Multiple Shapes to Same Table:** Syncing multiple shapes to the same table is currently not supported due to the need to drop and restart data for subscriptions.  This will throw an error if attempted.
*   **Memory Usage:** Initial sync data is buffered in-memory until consistency can be guaranteed, potentially causing high memory usage for large shapes during initial sync. Ongoing development is addressing this issue.