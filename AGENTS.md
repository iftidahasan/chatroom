# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## What this is

**Pulse** — a zero-dependency LAN chat, topic-room and file-sharing hub. One Node.js
process serves a vanilla-JS single-page client over HTTP and pushes live updates with
Server-Sent Events (SSE). Everything stays on the local network; there is no auth,
database, or cloud service.

## Stack

- **Runtime:** Node.js >= 18 (no npm dependencies, no build step)
- **Backend:** `node:http` + `node:fs`/`fs/promises` + SSE (`text/event-stream`)
- **Frontend:** plain HTML/CSS/JS in `public/` (no framework, no bundler)
- **Storage:** flat JSON file + uploads directory on disk
- **Port:** `4242` by default (`PORT` env overrides)

## Commands

```bash
npm start                 # node server.js
./start.sh                # same, cd's to repo root first
PORT=8080 npm start       # custom port
DATA_DIR=/tmp/pulse npm start   # custom data dir
```

There is no test runner, linter, or build configured. Verify changes by running the
server and exercising the UI/API manually. A health check is available:

```bash
curl -s http://localhost:4242/api/health
```

## Repository layout

```
server.js          HTTP server, API, SSE, static serving, persistence
public/index.html  Single-page app markup (dialogs, sidebar, composer, media hub)
public/app.js      All client logic (IIFE, ~2k lines, no modules)
public/style.css   Dark-theme UI, CSS custom properties in :root
public/favicon.svg
start.sh           Convenience launcher
data/              RUNTIME DATA — gitignored, never commit
  messages.json    Persisted rooms + messages
  uploads/         Uploaded files named by UUID
```

## Architecture

### Request flow (`server.js`)

`requestHandler` (server.js:648) routes everything:

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/health` | inline | Liveness + counters |
| GET | `/api/events` | `openEvents` | SSE stream; sends `init`, then live events |
| GET | `/api/media` | `handleMedia` | Recent shared files across rooms |
| POST | `/api/messages` | `handleMessage` | Create message (text + attachment ids) |
| POST | `/api/upload` | `handleUpload` | Stream upload to `data/uploads` |
| POST | `/api/typing` | `handleTyping` | Broadcast typing state |
| POST | `/api/rooms` | `handleCreateRoom` | Create topic room |
| DELETE | `/api/rooms/:id` | `handleDeleteRoom` | Delete non-master room + its files |
| GET/HEAD | `/api/files/:id` | `serveFile` | Serve upload with Range + inline/download |
| GET/HEAD | `*` | `serveStatic` | Serve `public/` |

### Live updates

- Clients hold one SSE connection. `clients` maps response → `{cid, name, roomId}`.
- Event types: `init`, `message`, `presence`, `typing`, `rooms`, `media-new`,
  `room-deleted`.
- `broadcast` = all clients; `broadcastToRoom` = matching `roomId`.
- Heartbeat comment (`: ping`) every 20s keeps proxies from closing the stream.

### State and persistence

- In-memory: `rooms`, `messages`, `pendingFiles`, `fileIndex`, `clients`.
- `scheduleSave` debounces 180ms, then `writeStore` writes `messages.json` atomically
  (temp file + rename). Saves are chained through `saveChain` to avoid interleaving.
- `pendingFiles` holds uploads not yet attached to a message (24h TTL cleanup).
- `trimMessages` caps history at `MAX_MESSAGES` (1000) and deletes orphaned uploads.
- `cleanupUploads` runs at boot and every 6h.

### Identity model

- No accounts. Client generates/persists a `cid` in `localStorage` (`pulse.cid`).
- Display name lives in `localStorage` (`pulse.name`); active room in `pulse.room`.
- The server trusts `cid`/`name` supplied by the client — this is LAN-only by design.

## Conventions

- **No dependencies.** Do not add npm packages or a build step unless explicitly asked.
- **No comments** unless they clarify non-obvious logic; match the existing terse style.
- CommonJS on the server (`require`), IIFE + `'use strict'` on the client.
- Client code is one file. Add helpers near related functions; use the `el` map and
  `state` object rather than ad-hoc globals.
- **Never inject untrusted text with `innerHTML`.** Use `textContent` /
  `document.createTextNode` (see `appendLinkifiedText`, `appendMessage`). Linkify only
  safe `http(s)` URLs.
- Escape/validate all input server-side with the `normalize*` helpers; enforce the
  `MAX_*` limits.
- Preserve the security headers: `BASE_HEADERS`, `PAGE_HEADERS` (CSP), `nosniff`,
  sandboxed file responses, and the `serveStatic` path-traversal check.
- CSS uses `:root` custom properties; reuse existing tokens/variables instead of
  hard-coding colors or radii.
- Keep it LAN-first: no telemetry, no external requests, no CDN assets.

## Gotchas

- `data/` contains real messages, uploads, and possibly secrets. It is gitignored —
  never add, print, or commit its contents.
- `serveStatic` resolves paths and rejects anything outside `public/`; keep that check.
- `serveFile` sets `Content-Security-Policy: default-src 'none'; sandbox` and
  `Cross-Origin-Resource-Policy: same-origin`.
- Uploads are streamed with a 512 MB hard cap (`MAX_FILE_BYTES`); temp `.part` files
  are cleaned on failure.
- Room names are unique (case-insensitive) and capped at 60 rooms; `lobby` is the
  master room and cannot be deleted.
- SSE responses are long-lived; clean up on `close`/`error` and never buffer.

## Knowledge graph (graphify)

A persistent graph of this codebase lives in `graphify-out/` (generated, safe to
regenerate). Prefer querying it before reading many files.

```bash
# Rebuild/refresh the graph (AST-only for code; no LLM needed)
graphify update .

# Ask a question (BFS, token-capped)
graphify query "how are uploads attached to messages" --budget 1200

# Trace a dependency path
graphify path "handleUpload" "serveFile"

# Explain a single symbol and its neighbours
graphify explain "openEvents"

# Re-cluster and regenerate report/html without re-extracting
graphify cluster-only .
```

Outputs: `graphify-out/graph.json` (data), `graphify-out/GRAPH_REPORT.md` (audit
report), `graphify-out/graph.html` (interactive, open in a browser).

When changing code, run `graphify update .` afterward so the graph stays accurate.
