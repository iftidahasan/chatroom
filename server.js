'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const PORT = Number(process.env.PORT) || 4242;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'messages.json');

const DEFAULT_ROOM_ID = 'lobby';
const MAX_ROOMS = 60;
const MAX_ROOM_NAME = 60;
const MAX_FILE_BYTES = 512 * 1024 * 1024;
const MAX_TEXT_LENGTH = 12000;
const MAX_NAME_LENGTH = 40;
const MAX_ATTACHMENTS = 12;
const MAX_MESSAGES = 1000;
const HISTORY_LIMIT = 500;
const MEDIA_LIMIT = 400;
const JSON_LIMIT = 64 * 1024;
const MAX_REACTIONS = 12;
const MAX_REACTION_LENGTH = 16;
const MAX_REPLY_SNIPPET = 160;
const SEARCH_LIMIT = 60;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const INLINE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'application/pdf'
]);

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

const PAGE_HEADERS = {
  ...BASE_HEADERS,
  'Content-Security-Policy': "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-cache'
};

let rooms = [newLobby()];
let messages = [];
const pendingFiles = new Map();
const fileIndex = new Map();
const clients = new Map();

let saveTimer = null;
let saveChain = Promise.resolve();

function newLobby() {
  return { id: DEFAULT_ROOM_ID, name: 'Lobby', master: true, createdBy: 'Pulse', createdAt: Date.now() };
}

function normalizeName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function normalizeRoomName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ROOM_NAME);
}

function normalizeCid(value) {
  const cid = String(value || '');
  return /^[a-zA-Z0-9-]{8,80}$/.test(cid) ? cid : null;
}

function normalizeRoomId(value) {
  const id = String(value || '');
  return /^[a-z0-9-]{1,80}$/.test(id) ? id : null;
}

function normalizeFilename(value) {
  const base = path.basename(String(value || 'file')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (base || 'file').slice(0, 200);
}

function normalizeMime(value) {
  const mime = String(value || '').split(';')[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(mime) ? mime : 'application/octet-stream';
}

function normalizeReactions(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  let count = 0;
  for (const [emoji, cids] of Object.entries(value)) {
    if (count >= MAX_REACTIONS) break;
    if (typeof emoji !== 'string' || !emoji || emoji.length > MAX_REACTION_LENGTH) continue;
    if (!Array.isArray(cids)) continue;
    const unique = [...new Set(cids.filter((cid) => typeof cid === 'string' && cid))].slice(0, 500);
    if (!unique.length) continue;
    out[emoji] = unique;
    count += 1;
  }
  return out;
}

function normalizeReply(value) {
  if (!value || typeof value !== 'object') return null;
  const id = typeof value.id === 'string' && /^[a-f0-9-]{36}$/.test(value.id) ? value.id : null;
  if (!id) return null;
  return {
    id,
    author: normalizeName(value.author) || 'Unknown',
    text: String(value.text || '').slice(0, MAX_REPLY_SNIPPET),
    roomId: normalizeRoomId(value.roomId) || DEFAULT_ROOM_ID
  };
}

function findMessage(id) {
  return messages.find((message) => message.id === id) || null;
}

function roomById(roomId) {
  return rooms.find((room) => room.id === roomId) || null;
}

function attachmentForMessage(file) {
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type
  };
}

function mediaItem(file, message, room) {
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type,
    roomId: room.id,
    roomName: room.name,
    author: message.author,
    messageId: message.id,
    ts: message.ts
  };
}

function roomSnapshot() {
  const stats = new Map();
  for (const room of rooms) {
    stats.set(room.id, { messageCount: 0, mediaCount: 0, lastActivity: room.createdAt });
  }
  let mediaCount = 0;
  for (const message of messages) {
    const stat = stats.get(message.roomId);
    if (!stat) continue;
    stat.messageCount += 1;
    stat.lastActivity = Math.max(stat.lastActivity, message.ts);
    stat.mediaCount += message.attachments.length;
    mediaCount += message.attachments.length;
  }
  return {
    rooms: rooms.map((room) => ({ ...room, ...stats.get(room.id) })),
    mediaCount
  };
}

function json(res, status, payload) {
  if (res.writableEnded) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...BASE_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > JSON_LIMIT) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sendEvent(res, event) {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    clients.delete(res);
  }
}

function broadcast(event) {
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  for (const [res] of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

function broadcastToRoom(roomId, event) {
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  for (const [res, client] of clients) {
    if (client.roomId !== roomId) continue;
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

function onlineUsers(roomId) {
  const users = new Map();
  for (const client of clients.values()) {
    if (client.roomId !== roomId) continue;
    users.set(client.cid, { id: client.cid, name: client.name });
  }
  return [...users.values()];
}

function broadcastPresence(roomId) {
  broadcastToRoom(roomId, { type: 'presence', roomId, users: onlineUsers(roomId) });
}

function broadcastRooms() {
  broadcast({ type: 'rooms', ...roomSnapshot() });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveChain = saveChain.then(writeStore).catch((error) => {
      console.error('Could not save data:', error.message);
    });
  }, 180);
}

async function writeStore() {
  const temp = `${STORE_FILE}.tmp`;
  const body = JSON.stringify({ version: 2, rooms, messages }, null, 2);
  await fsp.writeFile(temp, body, 'utf8');
  await fsp.rename(temp, STORE_FILE);
}

function normalizeStoredRoom(room) {
  const id = normalizeRoomId(room && room.id);
  const name = normalizeRoomName(room && room.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    master: id === DEFAULT_ROOM_ID,
    createdBy: normalizeName(room.createdBy) || 'Pulse',
    createdAt: Number(room.createdAt) || Date.now()
  };
}

async function loadStore() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    const raw = await fsp.readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const storedRooms = Array.isArray(parsed.rooms)
      ? parsed.rooms.map(normalizeStoredRoom).filter(Boolean)
      : [];
    const unique = new Map();
    for (const room of storedRooms) {
      if (!unique.has(room.id)) unique.set(room.id, room);
    }
    if (!unique.has(DEFAULT_ROOM_ID)) unique.set(DEFAULT_ROOM_ID, newLobby());
    rooms = [unique.get(DEFAULT_ROOM_ID), ...[...unique.values()].filter((room) => room.id !== DEFAULT_ROOM_ID)]
      .slice(0, MAX_ROOMS);

    const roomIds = new Set(rooms.map((room) => room.id));
    if (Array.isArray(parsed.messages)) {
      messages = parsed.messages
        .filter((message) => message && typeof message.id === 'string' && typeof message.text === 'string')
        .slice(-MAX_MESSAGES)
        .map((message) => {
          const messageRoom = normalizeRoomId(message.roomId);
          return {
            id: message.id,
            cid: String(message.cid || ''),
            author: normalizeName(message.author) || 'Unknown',
            text: String(message.text).slice(0, MAX_TEXT_LENGTH),
            ts: Number(message.ts) || Date.now(),
            roomId: messageRoom && roomIds.has(messageRoom) ? messageRoom : DEFAULT_ROOM_ID,
            editedAt: Number(message.editedAt) || null,
            reactions: normalizeReactions(message.reactions),
            replyTo: normalizeReply(message.replyTo),
            attachments: Array.isArray(message.attachments)
              ? message.attachments.filter((file) => file && typeof file.id === 'string').map((file) => ({
                  id: file.id,
                  name: normalizeFilename(file.name),
                  size: Number(file.size) || 0,
                  type: normalizeMime(file.type)
                }))
              : []
          };
        })
        .sort((a, b) => a.ts - b.ts);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Could not load data:', error.message);
  }
  for (const message of messages) {
    for (const file of message.attachments) fileIndex.set(file.id, file);
  }
}

function removeFiles(fileIds) {
  for (const id of fileIds) {
    fileIndex.delete(id);
    fsp.unlink(path.join(UPLOAD_DIR, id)).catch(() => {});
  }
}

function trimMessages() {
  if (messages.length <= MAX_MESSAGES) return;
  const removed = messages.splice(0, messages.length - MAX_MESSAGES);
  const ids = removed.flatMap((message) => message.attachments.map((file) => file.id));
  removeFiles(ids);
}

async function cleanupUploads() {
  try {
    const referenced = new Set();
    for (const message of messages) {
      for (const file of message.attachments) referenced.add(file.id);
    }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, file] of pendingFiles) {
      if (file.createdAt < cutoff) pendingFiles.delete(id);
      else referenced.add(id);
    }
    const entries = await fsp.readdir(UPLOAD_DIR);
    for (const entry of entries) {
      if (referenced.has(entry)) continue;
      const filePath = path.join(UPLOAD_DIR, entry);
      try {
        const stat = await fsp.stat(filePath);
        if (stat.mtimeMs < cutoff) await fsp.unlink(filePath);
      } catch {}
    }
  } catch {}
}

async function handleUpload(req, res, url) {
  const cid = normalizeCid(url.searchParams.get('cid'));
  if (!cid) return json(res, 400, { error: 'Missing client id' });
  const declaredLength = Number(req.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FILE_BYTES) {
    return json(res, 413, { error: 'File is larger than the 512 MB limit' });
  }
  const name = normalizeFilename(url.searchParams.get('name'));
  const type = normalizeMime(req.headers['content-type']);
  const id = crypto.randomUUID();
  const finalPath = path.join(UPLOAD_DIR, id);
  const tempPath = `${finalPath}.part`;
  let size = 0;

  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > MAX_FILE_BYTES) {
        callback(Object.assign(new Error('File too large'), { code: 'TOO_LARGE' }));
        return;
      }
      callback(null, chunk);
    }
  });

  try {
    await pipeline(req, limiter, fs.createWriteStream(tempPath, { flags: 'wx' }));
    if (!size) throw Object.assign(new Error('Empty file'), { code: 'EMPTY' });
    await fsp.rename(tempPath, finalPath);
    const file = { id, name, size, type, cid, createdAt: Date.now() };
    pendingFiles.set(id, file);
    json(res, 201, { file: attachmentForMessage(file) });
  } catch (error) {
    await fsp.unlink(tempPath).catch(() => {});
    await fsp.unlink(finalPath).catch(() => {});
    const status = error.code === 'TOO_LARGE' ? 413 : error.code === 'EMPTY' ? 400 : 500;
    const message = error.code === 'TOO_LARGE'
      ? 'File is larger than the 512 MB limit'
      : error.code === 'EMPTY' ? 'The file is empty' : 'Upload failed';
    json(res, status, { error: message });
  }
}

async function handleMessage(req, res) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const author = normalizeName(payload.name);
    const room = roomById(normalizeRoomId(payload.roomId));
    const text = typeof payload.text === 'string' ? payload.text.slice(0, MAX_TEXT_LENGTH).trim() : '';
    const requested = Array.isArray(payload.files)
      ? [...new Set(payload.files.filter((id) => typeof id === 'string'))].slice(0, MAX_ATTACHMENTS)
      : [];

    if (!cid) return json(res, 400, { error: 'Missing client id' });
    if (!author) return json(res, 400, { error: 'Choose a display name first' });
    if (!room) return json(res, 400, { error: 'That room no longer exists' });
    if (!text && !requested.length) return json(res, 400, { error: 'Message is empty' });

    const attachments = [];
    for (const id of requested) {
      const file = pendingFiles.get(id);
      if (!file || file.cid !== cid) {
        return json(res, 400, { error: 'One of the files is no longer available' });
      }
      attachments.push(attachmentForMessage(file));
    }

    for (const id of requested) pendingFiles.delete(id);

    const replyTarget = typeof payload.replyTo === 'string'
      ? messages.find((entry) => entry.id === payload.replyTo && entry.roomId === room.id)
      : null;

    const message = {
      id: crypto.randomUUID(),
      cid,
      author,
      text,
      ts: Date.now(),
      roomId: room.id,
      editedAt: null,
      reactions: {},
      replyTo: replyTarget
        ? { id: replyTarget.id, author: replyTarget.author, text: replyTarget.text.slice(0, MAX_REPLY_SNIPPET), roomId: replyTarget.roomId }
        : null,
      attachments
    };

    messages.push(message);
    trimMessages();
    for (const file of attachments) fileIndex.set(file.id, file);
    scheduleSave();
    broadcastToRoom(room.id, { type: 'message', message });
    broadcastRooms();
    if (attachments.length) {
      broadcast({ type: 'media-new', items: attachments.map((file) => mediaItem(file, message, room)) });
    }
    json(res, 201, { message });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Could not send message' });
  }
}

async function handleTyping(req, res) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const name = normalizeName(payload.name);
    const room = roomById(normalizeRoomId(payload.roomId));
    if (!cid || !name || !room) return json(res, 400, { error: 'Invalid typing event' });
    broadcastToRoom(room.id, { type: 'typing', cid, name, roomId: room.id });
    res.writeHead(204, BASE_HEADERS);
    res.end();
  } catch (error) {
    json(res, error.statusCode || 500, { error: 'Could not update typing state' });
  }
}

async function handleCreateRoom(req, res) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const author = normalizeName(payload.name);
    const name = normalizeRoomName(payload.roomName || payload.title);
    if (!cid || !author) return json(res, 400, { error: 'Missing identity' });
    if (!name) return json(res, 400, { error: 'Give the room a name' });
    if (rooms.length >= MAX_ROOMS) return json(res, 400, { error: `You can create up to ${MAX_ROOMS} rooms` });
    if (rooms.some((room) => room.name.toLowerCase() === name.toLowerCase())) {
      return json(res, 409, { error: 'A room with that name already exists' });
    }
    const room = {
      id: crypto.randomUUID(),
      name,
      master: false,
      createdBy: author,
      createdAt: Date.now()
    };
    rooms.push(room);
    scheduleSave();
    broadcastRooms();
    json(res, 201, { room: { ...room, messageCount: 0, mediaCount: 0, lastActivity: room.createdAt } });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Could not create room' });
  }
}

async function handleDeleteRoom(req, res, roomId) {
  const room = roomById(roomId);
  if (!room) return json(res, 404, { error: 'Room not found' });
  if (room.master) return json(res, 403, { error: 'The master room cannot be deleted' });

  const removed = messages.filter((message) => message.roomId === room.id);
  const fileIds = removed.flatMap((message) => message.attachments.map((file) => file.id));
  messages = messages.filter((message) => message.roomId !== room.id);
  rooms = rooms.filter((entry) => entry.id !== room.id);
  removeFiles(fileIds);
  scheduleSave();
  broadcast({ type: 'room-deleted', roomId: room.id, fallbackRoomId: DEFAULT_ROOM_ID });
  broadcastRooms();
  json(res, 200, { ok: true });
}

async function handleEditMessage(req, res, id) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const message = findMessage(id);
    if (!message) return json(res, 404, { error: 'Message not found' });
    if (!cid || message.cid !== cid) return json(res, 403, { error: 'You can only edit your own messages' });
    const text = typeof payload.text === 'string' ? payload.text.slice(0, MAX_TEXT_LENGTH).trim() : '';
    if (!text && !message.attachments.length) return json(res, 400, { error: 'Message cannot be empty' });
    message.text = text;
    message.editedAt = Date.now();
    const snippet = text.slice(0, MAX_REPLY_SNIPPET);
    for (const entry of messages) {
      if (entry.replyTo && entry.replyTo.id === message.id) entry.replyTo.text = snippet;
    }
    scheduleSave();
    broadcastToRoom(message.roomId, { type: 'message-updated', message });
    json(res, 200, { message });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Could not edit message' });
  }
}

async function handleDeleteMessage(req, res, id) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const index = messages.findIndex((entry) => entry.id === id);
    if (index === -1) return json(res, 404, { error: 'Message not found' });
    const message = messages[index];
    if (!cid || message.cid !== cid) return json(res, 403, { error: 'You can only delete your own messages' });
    messages.splice(index, 1);
    const fileIds = message.attachments.map((file) => file.id);
    removeFiles(fileIds);
    scheduleSave();
    broadcastToRoom(message.roomId, { type: 'message-deleted', id: message.id, roomId: message.roomId, fileIds });
    broadcastRooms();
    json(res, 200, { ok: true, fileIds });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Could not delete message' });
  }
}

async function handleReaction(req, res, id) {
  try {
    const payload = await readJson(req);
    const cid = normalizeCid(payload.cid);
    const message = findMessage(id);
    if (!message) return json(res, 404, { error: 'Message not found' });
    if (!cid) return json(res, 400, { error: 'Missing client id' });
    const emoji = typeof payload.emoji === 'string' ? payload.emoji.trim() : '';
    if (!emoji || emoji.length > MAX_REACTION_LENGTH) return json(res, 400, { error: 'Invalid reaction' });
    message.reactions = normalizeReactions(message.reactions);
    const existing = message.reactions[emoji] || [];
    const at = existing.indexOf(cid);
    if (at === -1) {
      if (!message.reactions[emoji] && Object.keys(message.reactions).length >= MAX_REACTIONS) {
        return json(res, 400, { error: 'Too many reaction types on this message' });
      }
      existing.push(cid);
    } else {
      existing.splice(at, 1);
    }
    if (existing.length) message.reactions[emoji] = existing;
    else delete message.reactions[emoji];
    scheduleSave();
    broadcastToRoom(message.roomId, { type: 'message-reactions', id: message.id, roomId: message.roomId, reactions: message.reactions });
    json(res, 200, { reactions: message.reactions });
  } catch (error) {
    json(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'Could not react' });
  }
}

function handleSearch(res, url) {
  const query = String(url.searchParams.get('q') || '').trim().slice(0, 200);
  const roomFilter = normalizeRoomId(url.searchParams.get('roomId'));
  if (!query) return json(res, 200, { results: [], total: 0 });
  const needle = query.toLowerCase();
  const results = [];
  for (let index = messages.length - 1; index >= 0 && results.length < SEARCH_LIMIT; index -= 1) {
    const message = messages[index];
    if (roomFilter && message.roomId !== roomFilter) continue;
    const haystack = `${message.author}\n${message.text}`.toLowerCase();
    if (!haystack.includes(needle)) continue;
    const room = roomById(message.roomId);
    results.push({
      id: message.id,
      roomId: message.roomId,
      roomName: room ? room.name : 'Unknown',
      author: message.author,
      text: message.text,
      ts: message.ts,
      attachments: message.attachments.length
    });
  }
  json(res, 200, { results, total: results.length, query });
}

function handleMedia(res, url) {
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(MEDIA_LIMIT, requested)) : MEDIA_LIMIT;
  const items = [];
  for (let index = messages.length - 1; index >= 0 && items.length < limit; index -= 1) {
    const message = messages[index];
    const room = roomById(message.roomId);
    if (!room) continue;
    for (let fileIndexValue = message.attachments.length - 1; fileIndexValue >= 0 && items.length < limit; fileIndexValue -= 1) {
      items.push(mediaItem(message.attachments[fileIndexValue], message, room));
    }
  }
  json(res, 200, { items, total: roomSnapshot().mediaCount });
}

function contentDisposition(type, name, forceDownload) {
  const disposition = forceDownload || !INLINE_TYPES.has(type) ? 'attachment' : 'inline';
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'file';
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

async function serveFile(req, res, url, id) {
  const file = fileIndex.get(id);
  if (!file) return json(res, 404, { error: 'File not found' });
  const filePath = path.join(UPLOAD_DIR, id);
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    return json(res, 404, { error: 'File not found' });
  }

  const download = url.searchParams.get('download') === '1';
  const type = normalizeMime(file.type);
  const headers = {
    ...BASE_HEADERS,
    'Content-Type': type,
    'Content-Disposition': contentDisposition(type, file.name, download),
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes'
  };

  const range = req.headers.range;
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stat.size) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  headers['Content-Length'] = stat.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) return json(res, 403, { error: 'Forbidden' });
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    return json(res, 404, { error: 'Not found' });
  }
  if (!stat.isFile()) return json(res, 404, { error: 'Not found' });
  const ext = path.extname(filePath).toLowerCase();
  const isPage = ext === '.html';
  const headers = isPage ? PAGE_HEADERS : { ...BASE_HEADERS, 'Cache-Control': 'no-cache' };
  headers['Content-Type'] = MIME_TYPES[ext] || 'application/octet-stream';
  headers['Content-Length'] = stat.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function openEvents(req, res, url) {
  const cid = normalizeCid(url.searchParams.get('cid')) || crypto.randomUUID();
  const name = normalizeName(url.searchParams.get('name')) || 'Anonymous';
  const requestedRoom = roomById(normalizeRoomId(url.searchParams.get('room')));
  const room = requestedRoom || roomById(DEFAULT_ROOM_ID);
  const snapshot = roomSnapshot();
  const roomMessages = messages.filter((message) => message.roomId === room.id).slice(-HISTORY_LIMIT);

  res.writeHead(200, {
    ...BASE_HEADERS,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 1800\n\n');
  const client = { cid, name, roomId: room.id };
  clients.set(res, client);
  sendEvent(res, {
    type: 'init',
    messages: roomMessages,
    users: onlineUsers(room.id),
    rooms: snapshot.rooms,
    mediaCount: snapshot.mediaCount,
    room: snapshot.rooms.find((entry) => entry.id === room.id) || null,
    self: { id: cid, name, roomId: room.id }
  });
  broadcastPresence(room.id);

  req.on('close', () => {
    clients.delete(res);
    broadcastPresence(room.id);
  });
  res.on('error', () => {
    clients.delete(res);
  });
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { error: 'Bad request' });
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, rooms: rooms.length, messages: messages.length, online: clients.size, ts: Date.now() });
  }
  if (req.method === 'GET' && pathname === '/api/events') {
    return openEvents(req, res, url);
  }
  if (req.method === 'GET' && pathname === '/api/media') {
    return handleMedia(res, url);
  }
  if (req.method === 'GET' && pathname === '/api/search') {
    return handleSearch(res, url);
  }
  if (req.method === 'POST' && pathname === '/api/messages') {
    return handleMessage(req, res);
  }
  const reactionMatch = /^\/api\/messages\/([a-f0-9-]{36})\/reactions$/.exec(pathname);
  if (req.method === 'POST' && reactionMatch) {
    return handleReaction(req, res, reactionMatch[1]);
  }
  const messageMatch = /^\/api\/messages\/([a-f0-9-]{36})$/.exec(pathname);
  if (messageMatch) {
    if (req.method === 'PATCH') return handleEditMessage(req, res, messageMatch[1]);
    if (req.method === 'DELETE') return handleDeleteMessage(req, res, messageMatch[1]);
  }
  if (req.method === 'POST' && pathname === '/api/upload') {
    return handleUpload(req, res, url);
  }
  if (req.method === 'POST' && pathname === '/api/typing') {
    return handleTyping(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/rooms') {
    return handleCreateRoom(req, res);
  }
  const roomMatch = /^\/api\/rooms\/([a-z0-9-]{1,80})$/.exec(pathname);
  if (req.method === 'DELETE' && roomMatch) {
    return handleDeleteRoom(req, res, roomMatch[1]);
  }
  const fileMatch = /^\/api\/files\/([a-f0-9-]{36})$/.exec(pathname);
  if ((req.method === 'GET' || req.method === 'HEAD') && fileMatch) {
    return serveFile(req, res, url, fileMatch[1]);
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && !pathname.startsWith('/api/')) {
    return serveStatic(req, res, pathname);
  }
  json(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    console.error('Request error:', error);
    if (!res.headersSent) json(res, 500, { error: 'Internal server error' });
    else res.destroy();
  });
});

server.on('clientError', (error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const heartbeat = setInterval(() => {
  for (const [res] of clients) {
    try {
      res.write(': ping\n\n');
    } catch {
      clients.delete(res);
    }
  }
}, 20000);
heartbeat.unref();

function localAddresses() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address);
    }
  }
  return [...new Set(addresses)];
}

async function start() {
  await loadStore();
  cleanupUploads();
  setInterval(cleanupUploads, 6 * 60 * 60 * 1000).unref();
  server.listen(PORT, HOST, () => {
    console.log(`Pulse is live on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    for (const address of localAddresses()) console.log(`  http://${address}:${PORT}`);
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

async function shutdown() {
  clearInterval(heartbeat);
  if (saveTimer) clearTimeout(saveTimer);
  await saveChain.catch(() => {});
  await writeStore().catch(() => {});
  for (const res of clients.keys()) {
    try { res.end(); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((error) => {
  console.error('Could not start Pulse:', error);
  process.exit(1);
});
