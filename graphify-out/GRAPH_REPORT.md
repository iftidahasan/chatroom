# Graph Report - chatroom  (2026-10-26)

## Corpus Check
- 3 files · ~14,679 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 222 nodes · 530 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `856f4450`
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `handleEvent()` - 19 edges
2. `switchRoom()` - 17 edges
3. `init()` - 16 edges
4. `requestHandler()` - 15 edges
5. `json()` - 14 edges
6. `handleMessage()` - 14 edges
7. `showToast()` - 14 edges
8. `appendMessage()` - 12 edges
9. `openEvents()` - 10 edges
10. `normalizeCid()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `handleMessage()` --calls--> `normalizeName()`  [EXTRACTED]
  server.js → server.js  _Bridges community 7 → community 8_
- `handleTyping()` --calls--> `normalizeName()`  [EXTRACTED]
  server.js → server.js  _Bridges community 7 → community 5_
- `handleUpload()` --calls--> `normalizeCid()`  [EXTRACTED]
  server.js → server.js  _Bridges community 5 → community 12_
- `handleMessage()` --calls--> `normalizeCid()`  [EXTRACTED]
  server.js → server.js  _Bridges community 5 → community 8_
- `handleReaction()` --calls--> `normalizeReactions()`  [EXTRACTED]
  server.js → server.js  _Bridges community 1 → community 5_

## Communities (15 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (34): activeRoom(), applyRoomState(), autoResizeInput(), clearReply(), closeReactionPalette(), closeSidebar(), createRoom(), deleteMessage() (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (30): BASE_HEADERS, cleanupUploads(), clients, crypto, fileIndex, fs, fsp, heartbeat (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (21): dateFormatter, el, ensureReactionPalette(), fullFormatter, ICONS, inviteUrl(), mobileRoomQuery, NAME_WORDS_A (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (23): applyProfile(), avatarGradient(), connect(), hashString(), ingestMessage(), init(), initials(), isNearBottom() (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (16): Architecture, code:bash (npm start                 # node server.js), code:bash (curl -s http://localhost:4242/api/health), code:block3 (server.js          HTTP server, API, SSE, static serving, pe), code:bash (# Rebuild/refresh the graph (AST-only for code; no LLM neede), Commands, Conventions, Gotchas (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.42
Nodes (13): broadcastToRoom(), findMessage(), handleCreateRoom(), handleDeleteMessage(), handleEditMessage(), handleReaction(), handleTyping(), json() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (11): addFiles(), clearPendingFiles(), discardPendingKeys(), getOrCreateCid(), randomId(), readStorage(), removePendingFile(), renderPendingFiles() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (10): broadcastPresence(), handleSearch(), normalizeName(), normalizeReply(), normalizeRoomId(), normalizeRoomName(), normalizeStoredRoom(), onlineUsers() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.31
Nodes (10): broadcast(), broadcastRooms(), handleDeleteRoom(), handleMedia(), handleMessage(), mediaItem(), removeFiles(), roomById() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (10): applyMessageUpdate(), applyReactions(), createReactionsBar(), createReplyQuote(), focusMessage(), isLongMessage(), normalizeReactions(), renderMessageBody() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (9): appendAttachments(), createMediaCard(), fileExtension(), fileUrl(), formatBytes(), mediaKind(), messageCopyText(), openLightbox() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (8): appendDateDivider(), appendLinkifiedText(), appendMessage(), buildMessageTools(), dateKey(), dateLabel(), formatTime(), toolButton()

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (6): attachmentForMessage(), contentDisposition(), handleUpload(), normalizeFilename(), normalizeMime(), serveFile()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (4): appendHighlighted(), renderSearchResults(), runSearch(), snippetAround()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (3): renderCodeBlock(), renderInline(), renderMarkdown()

## Knowledge Gaps
- **48 isolated node(s):** `http`, `fs`, `fsp`, `path`, `crypto` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleEvent()` connect `Community 0` to `Community 9`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `switchRoom()` connect `Community 0` to `Community 2`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `fsp` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._