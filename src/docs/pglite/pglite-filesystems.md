# PGlite Filesystems

PGlite utilizes a virtual file system (VFS) layer, enabling it to function in environments lacking traditional filesystem access. This system is actively evolving, with future plans to expand available options and simplify the creation of custom filesystems.

**Recommendation:** The IndexedDB VFS is currently recommended for browser environments due to Safari's lack of support for OPFS.

## Available VFS Options

### 1. In-Memory FS

*   **Default:** Used when no `dataDir` option is provided.
*   **Persistence:** Data is not persisted unless explicitly dumped using `pg.dumpDataDir()` and loaded using the `loadDataDir` option on startup.
*   **Methods of Use:**
    *   No `dataDir` option:
        ```typescript
        const pg = new PGlite();
        ```
    *   `dataDir` set to `memory://`:
        ```typescript
        const pg = new PGlite('memory://');
        ```
    *   Explicitly passing `MemoryFS`:
        ```typescript
        import { MemoryFS } from '@electric-sql/pglite';
        const pg = new PGlite({ fs: new MemoryFS() });
        ```
*   **Platform Support:** All platforms (Node, Bun, Chrome, Safari, Firefox)
    | Node | Bun | Chrome | Safari | Firefox |
    | ---- | --- | ------ | ------ | ------- |
    |  ✓   |  ✓  |   ✓    |    ✓   |    ✓    |

### 2. Node FS

*   **Usage:** Leverages the Node.js filesystem API.
*   **Availability:** Node and Bun environments.
*   **Methods of Use:**
    *   `dataDir` set to a filesystem directory:
        ```typescript
        const pg = new PGlite('./path/to/datadir/');
        ```
    *   Explicitly passing `NodeFS`:
        ```typescript
        import { NodeFS } from '@electric-sql/pglite';
        const pg = new PGlite({ fs: new NodeFS('./path/to/datadir/') });
        ```
*   **Platform Support:** Node and Bun only
    | Node | Bun | Chrome | Safari | Firefox |
    | ---- | --- | ------ | ------ | ------- |
    |  ✓   |  ✓  |        |        |         |

### 3. IndexedDB FS

*   **Persistence:** Stores the database in IndexedDB in the browser.
*   **Mechanism:** Acts as a layer over the in-memory filesystem, loading files into memory on start, and flushing changes to IndexedDB after each query.
*   **File-Level Storage:** Each Postgres table/index file is stored as a blob in IndexedDB.
*   **Flushing:** Flushing changes can take milliseconds, especially for many small writes, potentially impacting UI responsiveness.
*   **Relaxed Durability Mode:**  A configurable option that returns query results immediately and schedules flushing to IndexedDB asynchronously afterward.
*   **Methods of Use:**
    *   `dataDir` set with `idb://` prefix:
        ```typescript
        const pg = new PGlite('idb://my-database');
        ```
    *   Explicitly passing `IdbFs`:
        ```typescript
        import { IdbFs } from '@electric-sql/pglite';
        const pg = new PGlite({ fs: new IdbFs('my-database') });
        ```

*   **Platform Support:** All browser platforms (Chrome, Safari, Firefox) with Node and Bun.
        | Node | Bun | Chrome | Safari | Firefox |
    | ---- | --- | ------ | ------ | ------- |
    |  ✓   |  ✓  |   ✓    |    ✓   |    ✓    |

### 4. OPFS AHP FS (Origin Private Filesystem Access Handle Pool FS)

*   **Basis:** Built on the Origin Private Filesystem (OPFS) in the browser.
*   **Requirement:** Requires a Web Worker environment.
*   **Access Handle Pool:** Utilizes a pool of pre-opened OPFS access handles with random filenames for synchronous operations (due to limitations on async methods within synchronous WASM Postgres).
*   **Directory Structure:**  Does not preserve the standard Postgres directory structure in OPFS. Instead, it uses a pool of files and a state file for mapping file metadata.
*   **Inspiration:** Inspired by the wa-sqlite access handle pool filesystem.
*   **Safari Limitation:**  Safari has a limit of 252 open sync access handles, preventing its use with a standard Postgres install (which uses over 300 files).
*   **Methods of Use:**
    *   `dataDir` set to an OPFS path:
        ```typescript
        const pg = new PGlite('opfs-ahp://path/to/datadir/');
        ```
    *   Explicitly passing `OpfsAhpFS`:
        ```typescript
        import { OpfsAhpFS } from '@electric-sql/pglite/opfs-ahp';
        const pg = new PGlite({ fs: new OpfsAhpFS('./path/to/datadir/') });
        ```
*   **Platform Support:** Chrome only, Node and Bun as well.
    | Node | Bun | Chrome | Safari | Firefox |
    | ---- | --- | ------ | ------ | ------- |
    |  ✓   |     |   ✓    |       |         |

## Key Concepts Explained

*   **VFS (Virtual File System):** A software abstraction that allows PGlite to interact with storage mediums (memory, IndexedDB, filesystems) in a consistent way, regardless of the underlying implementation.
*   **Access Handle Pool (in OPFS AHP FS):** A pool of pre-opened OPFS access handles with randomly generated filenames that is used to work around the limitations of synchronous file operations in WASM.