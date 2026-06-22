# Migrating a service to PersistentMap

A 5-step recipe for converting in-memory `new Map()` storage to file-backed
persistent storage that survives process restarts.

## When to do this

Your service has any of:

```js
const X = new Map();              // Top-level state
const Y = new Set();              // (less common; PersistentMap not for sets)
```

…that's actually used to store user data, business state, transactions, etc.
If losing the data on restart is unacceptable, migrate to `PersistentMap`.

## When NOT to do this

- The Map holds a fixed lookup table that's defined at module load (just leave it as `new Map()`).
- The Map is purely a cache (use a TTL-based cache pattern instead).
- The data is truly ephemeral (in-flight request state, etc.).

## The 5 steps

### 1. Add the import

```js
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
```

### 2. Replace `new Map()` with `new PersistentMap(name, options)`

```js
// BEFORE
const users = new Map();

// AFTER
const users = new PersistentMap('users', { serviceName: 'my-service' });
```

The `serviceName` should match your service (this controls the data directory).
The data is written to:

- `<cwd>/data/users.json` (if `./data` exists), or
- `/tmp/hojai-<serviceName>/users.json` (fallback), or
- `$HOJAI_DATA_DIR/users.json` (if `HOJAI_DATA_DIR` env var is set)

### 3. (Recommended) Add graceful shutdown

```js
// BEFORE
app.listen(PORT, () => console.log('ready'));

// AFTER
const server = app.listen(PORT, () => console.log('ready'));
installGracefulShutdown(server, async () => {
  // Flush all PersistentMaps to disk
  await Promise.allSettled([users.flush()]);
  // Stop the auto-flush timers
  users.stopAutoFlush();
});
```

This ensures data is durably written on `SIGTERM`/`SIGINT` (e.g., during
container shutdown or `kill <pid>`).

### 4. Done. No other changes needed.

`PersistentMap` is a **drop-in replacement** for `Map`. The synchronous API
is identical:

| Map method | PersistentMap | Notes |
|---|---|---|
| `get(key)` | ✅ | identical |
| `set(key, value)` | ✅ | identical (returns `this` for chaining) |
| `has(key)` | ✅ | identical |
| `delete(key)` | ✅ | identical |
| `clear()` | ✅ | identical |
| `size` | ✅ | identical getter |
| `keys()` | ✅ | identical iterator |
| `values()` | ✅ | identical iterator |
| `entries()` | ✅ | identical iterator |
| `forEach(cb)` | ✅ | identical |
| `for (const [k, v] of m)` | ✅ | identical (Symbol.iterator) |
| `newId(prefix)` | ➕ | PersistentMap-only helper |

### 5. Verify

Start the service, exercise the routes, send `SIGTERM`, restart, and confirm
the data is still there.

```bash
# Start
PORT=5000 node src/index.js &
PID=$!

# Exercise
curl -X POST http://localhost:5000/api/users -d '{"name":"Alice"}' -H "Content-Type: application/json"

# Graceful shutdown
kill -TERM $PID
wait $PID

# Restart
PORT=5000 node src/index.js &
PID=$!
curl http://localhost:5000/api/users  # Should return Alice

# Cleanup
kill $PID
```

## Common gotchas

### "My Map has thousands of entries — won't the JSON file be huge?"

Yes. If your Map has >10,000 entries, consider:
- Using a smaller, more targeted collection (don't dump everything into one Map)
- Migrating to the async `PersistentStore` which has `find()` and MongoDB-style queries
- Using a real database (MongoDB, Postgres) for that scale

### "What if two service instances write to the same file?"

`PersistentMap` is **not** designed for multi-instance concurrency. The
write-queue pattern serializes writes within a single process, but if two
processes point at the same data file, the last writer wins. For multi-instance
deployments, use a real database.

### "I need stronger durability than 'flush every 2s'."

Set `flushOnWrite: true`:

```js
const users = new PersistentMap('users', {
  serviceName: 'my-service',
  flushOnWrite: true,  // write to disk on every set/delete
});
```

This is slower (every set is a fsync) but guarantees each write survives a
crash. Use this for financial or auth data.

## Reference: meeting-os migration

The canonical example. See `products/board-intelligence/meeting-os/src/index.js`.

Before:
```js
const meetings = new Map();
const participants = new Map();
const actionItems = new Map();
app.listen(PORT, () => console.log('ready'));
```

After:
```js
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');

const meetings = new PersistentMap('meetings', { serviceName: 'meeting-os' });
const participants = new PersistentMap('participants', { serviceName: 'meeting-os' });
const actionItems = new PersistentMap('action-items', { serviceName: 'meeting-os' });

const server = app.listen(PORT, () => console.log('ready'));
installGracefulShutdown(server, async () => {
  await Promise.allSettled([meetings.flush(), participants.flush(), actionItems.flush()]);
  meetings.stopAutoFlush();
  participants.stopAutoFlush();
  actionItems.stopAutoFlush();
});
```

No other code changes were needed — every existing `meetings.get()`,
`meetings.set()`, `meetings.size`, `for (const [k, v] of meetings)` call
worked unchanged.
