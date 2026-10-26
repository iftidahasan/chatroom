# Graph Report - chatroom  (2026-10-26)

## Corpus Check
- 3 files · ~11,287 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 179 nodes · 403 edges · 13 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `766ab3f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `handleEvent()` - 16 edges
2. `switchRoom()` - 16 edges
3. `init()` - 16 edges
4. `handleMessage()` - 14 edges
5. `requestHandler()` - 11 edges
6. `json()` - 10 edges
7. `openEvents()` - 10 edges
8. `handleTyping()` - 9 edges
9. `handleCreateRoom()` - 9 edges
10. `showToast()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `handleMessage()` --calls--> `normalizeName()`  [EXTRACTED]
  server.js → server.js  _Bridges community 9 → community 8_
- `openEvents()` --calls--> `normalizeName()`  [EXTRACTED]
  server.js → server.js  _Bridges community 9 → community 10_
- `handleMessage()` --calls--> `normalizeCid()`  [EXTRACTED]
  server.js → server.js  _Bridges community 5 → community 8_
- `handleTyping()` --calls--> `normalizeCid()`  [EXTRACTED]
  server.js → server.js  _Bridges community 5 → community 9_
- `openEvents()` --calls--> `normalizeCid()`  [EXTRACTED]
  server.js → server.js  _Bridges community 5 → community 10_

## Communities (13 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): BASE_HEADERS, cleanupUploads(), clients, crypto, fileIndex, fs, fsp, heartbeat (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (27): applyProfile(), avatarGradient(), connect(), handleEvent(), hashString(), ingestMessage(), init(), initials() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (22): activeRoom(), applyRoomState(), closeSidebar(), createRoom(), deleteRoom(), inviteUrl(), loadMedia(), normalizeRoomName() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (12): dateFormatter, el, fullFormatter, ICONS, mobileRoomQuery, NAME_WORDS_A, NAME_WORDS_B, PREVIEW_AUDIO_TYPES (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (16): Architecture, code:bash (npm start                 # node server.js), code:bash (curl -s http://localhost:4242/api/health), code:block3 (server.js          HTTP server, API, SSE, static serving, pe), code:bash (# Rebuild/refresh the graph (AST-only for code; no LLM neede), Commands, Conventions, Gotchas (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (12): attachmentForMessage(), contentDisposition(), handleMedia(), handleUpload(), json(), mediaItem(), normalizeCid(), normalizeFilename() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.2
Nodes (11): appendAttachments(), createMediaCard(), fileExtension(), fileUrl(), formatBytes(), mediaKind(), messageCopyText(), openLightbox() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.28
Nodes (9): autoResizeInput(), clearPendingFiles(), discardPendingKeys(), removePendingFile(), renderPendingFiles(), sendMessage(), updatePendingChip(), updateSendButton() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.43
Nodes (8): broadcast(), broadcastRooms(), handleDeleteRoom(), handleMessage(), removeFiles(), roomById(), scheduleSave(), trimMessages()

### Community 9 - "Community 9"
Cohesion: 0.43
Nodes (7): handleCreateRoom(), handleTyping(), normalizeName(), normalizeRoomId(), normalizeRoomName(), normalizeStoredRoom(), readJson()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (6): broadcastPresence(), broadcastToRoom(), onlineUsers(), openEvents(), roomSnapshot(), sendEvent()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (6): appendDateDivider(), appendLinkifiedText(), appendMessage(), dateKey(), dateLabel(), formatTime()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (4): addFiles(), getOrCreateCid(), randomId(), readStorage()

## Knowledge Gaps
- **47 isolated node(s):** `http`, `fs`, `fsp`, `path`, `crypto` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `init()` connect `Community 1` to `Community 2`, `Community 3`, `Community 7`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `handleEvent()` connect `Community 1` to `Community 2`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `fsp` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._