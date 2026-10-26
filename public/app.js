(() => {
  'use strict';

  const MAX_FILE_BYTES = 512 * 1024 * 1024;
  const MAX_ATTACHMENTS = 12;
  const COLLAPSE_TEXT_LENGTH = 420;
  const COLLAPSE_LINE_COUNT = 9;
  const PREVIEW_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
  const PREVIEW_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
  const PREVIEW_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']);
  const NAME_WORDS_A = ['Blue', 'Quiet', 'Neon', 'Lunar', 'Amber', 'Swift', 'Cozy', 'Pixel', 'Velvet', 'Cosmic', 'Mellow', 'Turbo', 'Silver', 'Sunny', 'Midnight', 'Coral'];
  const NAME_WORDS_B = ['Fox', 'Comet', 'Otter', 'Finch', 'Panda', 'Nova', 'Echo', 'Drift', 'Lynx', 'Sparrow', 'Orbit', 'Mango', 'Wolf', 'Pebble', 'Raven', 'Tiger'];
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  const $ = (id) => document.getElementById(id);

  const el = {
    connectionChip: $('connectionChip'),
    connectionLabel: $('connectionLabel'),
    peopleButton: $('peopleButton'),
    peopleMenu: $('peopleMenu'),
    peopleCount: $('peopleCount'),
    peopleList: $('peopleList'),
    avatarStack: $('avatarStack'),
    onlineLabel: $('onlineLabel'),
    profileButton: $('profileButton'),
    myAvatar: $('myAvatar'),
    inviteButton: $('inviteButton'),
    roomAddress: $('roomAddress'),
    copyAddressButton: $('copyAddressButton'),
    scroller: $('scroller'),
    welcome: $('welcome'),
    messageList: $('messageList'),
    typingRow: $('typingRow'),
    typingText: $('typingText'),
    scrollButton: $('scrollButton'),
    newMessageCount: $('newMessageCount'),
    pendingFiles: $('pendingFiles'),
    composer: $('composer'),
    attachButton: $('attachButton'),
    messageInput: $('messageInput'),
    sendButton: $('sendButton'),
    fileInput: $('fileInput'),
    dragOverlay: $('dragOverlay'),
    identityDialog: $('identityDialog'),
    identityForm: $('identityForm'),
    identityClose: $('identityClose'),
    identityTitle: $('identityTitle'),
    identityEyebrow: $('identityEyebrow'),
    identityCopy: $('identityCopy'),
    nameInput: $('nameInput'),
    namePreview: $('namePreview'),
    nameError: $('nameError'),
    shuffleButton: $('shuffleButton'),
    joinButton: $('joinButton'),
    lightbox: $('lightbox'),
    lightboxName: $('lightboxName'),
    lightboxCopy: $('lightboxCopy'),
    lightboxDownload: $('lightboxDownload'),
    lightboxClose: $('lightboxClose'),
    lightboxStage: $('lightboxStage'),
    lightboxImage: $('lightboxImage'),
    toast: $('toast'),
    toastText: $('toastText'),
    toastIcon: document.querySelector('.toast-icon path'),
    sidebarToggle: $('sidebarToggle'),
    sidebar: $('sidebar'),
    sidebarBackdrop: $('sidebarBackdrop'),
    sidebarClose: $('sidebarClose'),
    roomList: $('roomList'),
    newRoomButton: $('newRoomButton'),
    mediaHubButton: $('mediaHubButton'),
    mediaBadge: $('mediaBadge'),
    roomIcon: $('roomIcon'),
    roomTitle: $('roomTitle'),
    roomSubtitle: $('roomSubtitle'),
    roomMaster: $('roomMaster'),
    deleteRoomButton: $('deleteRoomButton'),
    chatShell: $('chatShell'),
    composerDock: $('composerDock'),
    mediaHub: $('mediaHub'),
    mediaGallery: $('mediaGallery'),
    mediaEmpty: $('mediaEmpty'),
    mediaEmptyTitle: $('mediaEmptyTitle'),
    mediaEmptyCopy: $('mediaEmptyCopy'),
    mediaHubCount: $('mediaHubCount'),
    mediaFilters: $('mediaFilters'),
    roomDialog: $('roomDialog'),
    roomForm: $('roomForm'),
    roomClose: $('roomClose'),
    roomNameInput: $('roomNameInput'),
    roomError: $('roomError'),
    createRoomButton: $('createRoomButton'),
    confirmDialog: $('confirmDialog'),
    confirmTitle: $('confirmTitle'),
    confirmText: $('confirmText'),
    confirmCancel: $('confirmCancel'),
    confirmDelete: $('confirmDelete'),
    searchButton: $('searchButton'),
    replyPreview: $('replyPreview'),
    replyPreviewAuthor: $('replyPreviewAuthor'),
    replyPreviewText: $('replyPreviewText'),
    replyCancel: $('replyCancel'),
    editDialog: $('editDialog'),
    editForm: $('editForm'),
    editInput: $('editInput'),
    editError: $('editError'),
    editSave: $('editSave'),
    editCancel: $('editCancel'),
    editClose: $('editClose'),
    searchDialog: $('searchDialog'),
    searchInput: $('searchInput'),
    searchClose: $('searchClose'),
    searchThisRoom: $('searchThisRoom'),
    searchRoomName: $('searchRoomName'),
    searchStatus: $('searchStatus'),
    searchResults: $('searchResults'),
    reactionPalette: $('reactionPalette')
  };

  const state = {
    cid: getOrCreateCid(),
    name: readStorage('localStorage', 'pulse.name') || '',
    source: null,
    initialized: false,
    sending: false,
    pinToBottom: true,
    users: [],
    messageIds: new Set(),
    messages: [],
    lastRender: null,
    typingUsers: new Map(),
    selected: [],
    unread: 0,
    identityFirst: false,
    lightboxFile: null,
    lightboxReturnFocus: null,
    lastTypingSent: 0,
    toastTimer: null,
    dragDepth: 0,
    activeRoomId: readStorage('localStorage', 'pulse.room') || 'lobby',
    rooms: [],
    view: 'room',
    mediaItems: [],
    mediaTotal: 0,
    mediaLoaded: false,
    mediaLoading: false,
    mediaFilter: 'all',
    pendingDeleteRoomId: null,
    pendingDeleteMessageId: null,
    confirmMode: 'room',
    sidebarOpen: false,
    deletingRoomId: null,
    deletingMessageId: null,
    replyTo: null,
    editingId: null,
    reactionTargetId: null,
    pendingFocusId: null,
    searchTimer: null,
    searchSeq: 0
  };

  const DEFAULT_ROOM_ID = 'lobby';
  const mobileRoomQuery = window.matchMedia('(max-width: 900px)');

  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const fullFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6.5A2.5 2.5 0 0013.5 4h-7A2.5 2.5 0 004 6.5v7A2.5 2.5 0 006.5 16H8" stroke="currentColor" stroke-width="1.7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    reply: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7L4 12l5 5M4 12h9a6 6 0 016 6v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM13.5 6.5l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M7.5 7l.8 12h7.4l.8-12M10 11v4M14 11v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    smile: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 14.5c.8 1.2 2 1.9 3.5 1.9s2.7-.7 3.5-1.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>'
  };

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];
  const SEARCH_MIN_LENGTH = 1;

  function readStorage(type, key) {
    try {
      return window[type].getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(type, key, value) {
    try {
      window[type].setItem(key, value);
    } catch {}
  }

  function randomId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  function getOrCreateCid() {
    const existing = readStorage('sessionStorage', 'pulse.cid');
    if (existing && /^[a-zA-Z0-9-]{8,80}$/.test(existing)) return existing;
    const cid = randomId();
    writeStorage('sessionStorage', 'pulse.cid', cid);
    return cid;
  }

  function normalizeName(value) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  }

  function normalizeReactions(value) {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [emoji, cids] of Object.entries(value)) {
      if (typeof emoji !== 'string' || !emoji || emoji.length > 16) continue;
      if (!Array.isArray(cids)) continue;
      const unique = [...new Set(cids.filter((cid) => typeof cid === 'string' && cid))];
      if (unique.length) out[emoji] = unique;
    }
    return out;
  }

  function normalizeReply(value) {
    if (!value || typeof value !== 'object' || !value.id) return null;
    return {
      id: String(value.id),
      author: normalizeName(value.author) || 'Unknown',
      text: String(value.text || '').slice(0, 160),
      roomId: String(value.roomId || '')
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function avatarGradient(name) {
    const hue = hashString(name || '?') % 360;
    const second = (hue + 54) % 360;
    return `linear-gradient(145deg, hsl(${hue} 74% 63%), hsl(${second} 72% 47%))`;
  }

  function initials(name) {
    const clean = String(name || '').trim();
    if (!clean) return '?';
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return `${Array.from(words[0])[0] || ''}${Array.from(words[1])[0] || ''}`.toUpperCase();
    }
    return Array.from(clean).slice(0, 2).join('').toUpperCase();
  }

  function setAvatar(element, name) {
    if (!element) return;
    element.textContent = initials(name);
    element.style.setProperty('--avatar', avatarGradient(name));
  }

  function suggestedName() {
    const first = NAME_WORDS_A[Math.floor(Math.random() * NAME_WORDS_A.length)];
    const second = NAME_WORDS_B[Math.floor(Math.random() * NAME_WORDS_B.length)];
    return `${first} ${second}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10240 ? 1 : 0)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function formatTime(timestamp) {
    return timeFormatter.format(new Date(timestamp));
  }

  function dateKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function dateLabel(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((today - target) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return dateFormatter.format(date);
  }

  function normalizeRoomName(value) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/^#+\s*/, '')
      .trim()
      .slice(0, 60);
  }

  function roomById(id) {
    return state.rooms.find((room) => room.id === id) || null;
  }

  function activeRoom() {
    return roomById(state.activeRoomId)
      || roomById(DEFAULT_ROOM_ID)
      || { id: DEFAULT_ROOM_ID, name: 'Lobby', master: true, messageCount: 0, createdAt: Date.now() };
  }

  function relativeTime(timestamp) {
    const value = Number(timestamp);
    if (!Number.isFinite(value)) return '';
    const diff = Math.max(0, Date.now() - value);
    if (diff < 45 * 1000) return 'now';
    if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d`;
    return dateFormatter.format(new Date(value));
  }

  function updateDocumentTitle() {
    const base = state.view === 'media' ? 'Pulse — media hub' : `Pulse — ${activeRoom().name}`;
    document.title = state.unread > 0 ? `(${state.unread > 99 ? '99+' : state.unread}) ${base}` : base;
  }

  function persistActiveRoom() {
    writeStorage('localStorage', 'pulse.room', state.activeRoomId);
    const desired = state.activeRoomId && state.activeRoomId !== DEFAULT_ROOM_ID
      ? `#room=${encodeURIComponent(state.activeRoomId)}`
      : `${location.pathname}${location.search}`;
    try {
      history.replaceState(null, '', desired);
    } catch {}
  }

  function inviteUrl() {
    const room = activeRoom();
    return room.id && room.id !== DEFAULT_ROOM_ID
      ? `${location.origin}/#room=${encodeURIComponent(room.id)}`
      : `${location.origin}/`;
  }

  function fileUrl(file, download = false) {
    return `/api/files/${encodeURIComponent(file.id)}${download ? '?download=1' : ''}`;
  }

  function fileExtension(file) {
    const name = String(file.name || '');
    if (name.includes('.')) {
      const ext = name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
      if (ext) return ext.toUpperCase();
    }
    const subtype = String(file.type || '').split('/')[1] || '';
    return (subtype.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'FILE').toUpperCase();
  }

  function showToast(message, options = {}) {
    clearTimeout(state.toastTimer);
    el.toastText.textContent = message;
    el.toast.classList.toggle('is-error', Boolean(options.error));
    if (el.toastIcon) {
      el.toastIcon.setAttribute('d', options.error ? 'M6 6l12 12M18 6L6 18' : 'M5 12.5l4 4L19 7');
    }
    el.toast.classList.add('is-visible');
    state.toastTimer = setTimeout(() => {
      el.toast.classList.remove('is-visible');
    }, options.duration || 2400);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {}
    area.remove();
    return copied;
  }

  function setConnection(mode) {
    el.connectionChip.classList.toggle('is-live', mode === 'live');
    el.connectionChip.classList.toggle('is-down', mode === 'down');
    el.profileButton.classList.toggle('is-offline', mode !== 'live');
    const labels = {
      live: 'Live',
      down: 'Reconnecting',
      connecting: 'Connecting',
      idle: 'Not connected'
    };
    el.connectionLabel.textContent = labels[mode] || 'Connecting';
  }

  function connect() {
    if (!state.name) return;
    if (state.source) {
      state.source.close();
      state.source = null;
    }
    setConnection('connecting');
    const source = new EventSource(`/api/events?cid=${encodeURIComponent(state.cid)}&name=${encodeURIComponent(state.name)}&room=${encodeURIComponent(state.activeRoomId)}`);
    state.source = source;

    source.onopen = () => {
      if (state.source === source) setConnection('live');
    };
    source.onerror = () => {
      if (state.source === source) setConnection('down');
    };
    source.onmessage = (event) => {
      if (state.source !== source) return;
      try {
        handleEvent(JSON.parse(event.data));
      } catch {}
    };
  }

  function applyRoomState(rooms, mediaCount) {
    const previousTotal = state.mediaTotal;
    if (Array.isArray(rooms)) state.rooms = rooms;
    if (Number.isFinite(Number(mediaCount))) state.mediaTotal = Number(mediaCount);
    if (!roomById(state.activeRoomId)) {
      const fallback = roomById(DEFAULT_ROOM_ID) || state.rooms[0];
      state.activeRoomId = fallback ? fallback.id : DEFAULT_ROOM_ID;
      persistActiveRoom();
    }
    renderSidebar();
    renderRoomHeader();
    updateMediaBadge();
    if (state.view === 'media' && state.mediaLoaded && previousTotal !== state.mediaTotal) {
      loadMedia({ silent: true });
    }
  }

  function handleEvent(event) {
    if (!event || !event.type) return;
    if (event.type === 'init') {
      setConnection('live');
      const roomChanged = Boolean(event.self && event.self.roomId && event.self.roomId !== state.activeRoomId);
      if (event.self && event.self.roomId) {
        state.activeRoomId = event.self.roomId;
        persistActiveRoom();
      }
      if (roomChanged && state.initialized) resetRoomState();
      applyRoomState(event.rooms, event.mediaCount);
      renderPresence(Array.isArray(event.users) ? event.users : []);
      if (!state.initialized) {
        el.messageList.replaceChildren();
        state.messages = [];
        state.messageIds.clear();
        state.lastRender = null;
        for (const message of event.messages || []) ingestMessage(message, { initial: true });
        state.initialized = true;
        updateWelcome();
        state.pinToBottom = true;
        updateDocumentTitle();
        requestAnimationFrame(() => {
          if (state.view !== 'room') return;
          if (state.messageIds.size) scrollToBottom(false);
          else el.scroller.scrollTop = 0;
          updateScrollButton();
        });
      } else {
        for (const message of event.messages || []) ingestMessage(message);
        updateWelcome();
        updateDocumentTitle();
      }
      if (state.pendingFocusId) {
        const target = state.pendingFocusId;
        state.pendingFocusId = null;
        requestAnimationFrame(() => {
          if (!focusMessage(target)) showToast('Message is outside the loaded history');
        });
      }
      return;
    }
    if (event.type === 'rooms') {
      applyRoomState(event.rooms, event.mediaCount);
      return;
    }
    if (event.type === 'presence') {
      renderPresence(Array.isArray(event.users) ? event.users : []);
      return;
    }
    if (event.type === 'message' && event.message) {
      if (event.message.roomId && event.message.roomId !== state.activeRoomId) return;
      const added = ingestMessage(event.message);
      if (added) {
        removeTyping(event.message.cid);
        updateWelcome();
      }
      return;
    }
    if (event.type === 'message-updated' && event.message) {
      if (event.message.roomId && event.message.roomId !== state.activeRoomId) return;
      applyMessageUpdate(event.message);
      return;
    }
    if (event.type === 'message-deleted' && event.id) {
      if (event.roomId && event.roomId !== state.activeRoomId) return;
      removeMessageFromView(event.id, event.fileIds || []);
      return;
    }
    if (event.type === 'message-reactions' && event.id) {
      if (event.roomId && event.roomId !== state.activeRoomId) return;
      applyReactions(event.id, event.reactions);
      return;
    }
    if (event.type === 'typing' && event.cid !== state.cid && event.name) {
      if (event.roomId && event.roomId !== state.activeRoomId) return;
      state.typingUsers.set(event.cid, {
        name: normalizeName(event.name),
        expires: Date.now() + 3200
      });
      renderTyping();
      setTimeout(renderTyping, 3300);
      return;
    }
    if (event.type === 'media-new') {
      if (!state.mediaLoaded || !Array.isArray(event.items)) return;
      const known = new Set(state.mediaItems.map((item) => item.id));
      const fresh = event.items.filter((item) => item && item.id && !known.has(item.id));
      if (!fresh.length) return;
      state.mediaItems = fresh.concat(state.mediaItems).slice(0, 400);
      updateMediaBadge();
      if (state.view === 'media') renderMediaHub();
      return;
    }
    if (event.type === 'room-deleted') {
      if (state.mediaLoaded) {
        state.mediaItems = state.mediaItems.filter((item) => item.roomId !== event.roomId);
        if (state.view === 'media') renderMediaHub();
      }
      if (state.pendingDeleteRoomId === event.roomId && state.deletingRoomId !== event.roomId) {
        state.pendingDeleteRoomId = null;
        if (el.confirmDialog.open) el.confirmDialog.close();
      }
      if (state.activeRoomId === event.roomId) {
        const fallback = event.fallbackRoomId && roomById(event.fallbackRoomId)
          ? event.fallbackRoomId
          : DEFAULT_ROOM_ID;
        switchRoom(fallback, { force: true, stayInHub: state.view === 'media' });
      }
    }
  }

  function renderPresence(users) {
    const unique = new Map();
    for (const user of users) {
      if (user && user.id && user.name) unique.set(user.id, { id: user.id, name: normalizeName(user.name) });
    }
    state.users = [...unique.values()];
    el.avatarStack.replaceChildren();
    for (const user of state.users.slice(0, 4)) {
      const mini = document.createElement('span');
      mini.className = 'mini-avatar';
      mini.title = user.name;
      setAvatar(mini, user.name);
      el.avatarStack.appendChild(mini);
    }
    if (state.users.length > 4) {
      const more = document.createElement('span');
      more.className = 'mini-avatar more';
      more.textContent = `+${state.users.length - 4}`;
      el.avatarStack.appendChild(more);
    }
    el.peopleCount.textContent = String(state.users.length);
    el.onlineLabel.textContent = `${state.users.length} online`;
    el.peopleButton.title = state.users.length ? state.users.map((user) => user.name).join(', ') : 'No one connected yet';
    renderPeople();
    if (!state.users.some((user) => user.id === state.cid)) {
      for (const cid of state.typingUsers.keys()) state.typingUsers.delete(cid);
      renderTyping();
    }
  }

  function renderPeople() {
    el.peopleList.replaceChildren();
    if (!state.users.length) {
      const item = document.createElement('li');
      item.className = 'people-item people-empty';
      item.textContent = state.name ? 'Waiting for connections…' : 'Join the conversation to see who is here.';
      el.peopleList.appendChild(item);
      return;
    }
    const ordered = [...state.users].sort((a, b) => {
      if (a.id === state.cid) return -1;
      if (b.id === state.cid) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const user of ordered) {
      const item = document.createElement('li');
      item.className = 'people-item';
      const avatar = document.createElement('span');
      avatar.className = 'people-avatar';
      setAvatar(avatar, user.name);
      const info = document.createElement('div');
      info.className = 'people-info';
      const name = document.createElement('strong');
      name.textContent = user.name;
      const status = document.createElement('span');
      status.textContent = user.id === state.cid ? 'This device' : 'Online now';
      info.append(name, status);
      item.append(avatar, info);
      if (user.id === state.cid) {
        const tag = document.createElement('span');
        tag.className = 'you-tag';
        tag.textContent = 'You';
        item.appendChild(tag);
      }
      el.peopleList.appendChild(item);
    }
  }

  function renderSidebar() {
    el.roomList.replaceChildren();
    const rooms = state.rooms.length ? state.rooms : [activeRoom()];
    const master = rooms.find((room) => room.id === DEFAULT_ROOM_ID || room.master);
    const topics = rooms.filter((room) => room !== master);

    const appendLabel = (label, count) => {
      const row = document.createElement('div');
      row.className = 'room-section-label';
      row.append(document.createTextNode(label));
      if (Number.isFinite(count)) {
        const value = document.createElement('span');
        value.textContent = String(count);
        row.appendChild(value);
      }
      el.roomList.appendChild(row);
    };

    const appendRoom = (room) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-item';
      button.dataset.roomId = room.id;
      button.title = `Open #${room.name}`;
      if (room.id === DEFAULT_ROOM_ID || room.master) button.classList.add('is-master');
      if (state.view === 'room' && room.id === state.activeRoomId) button.classList.add('is-active');

      const icon = document.createElement('span');
      icon.className = 'room-item-icon';
      icon.textContent = room.id === DEFAULT_ROOM_ID || room.master ? '✦' : '#';

      const copy = document.createElement('span');
      copy.className = 'room-item-copy';
      const name = document.createElement('strong');
      name.textContent = room.name;
      const meta = document.createElement('small');
      const count = Number(room.messageCount) || 0;
      meta.textContent = count
        ? `${count} ${count === 1 ? 'message' : 'messages'} · ${relativeTime(room.lastActivity || room.createdAt)}`
        : 'No messages yet';
      copy.append(name, meta);

      const mark = document.createElement('span');
      mark.className = 'room-item-mark';
      mark.setAttribute('aria-hidden', 'true');

      button.append(icon, copy, mark);
      el.roomList.appendChild(button);
    };

    appendLabel('Master');
    if (master) appendRoom(master);

    appendLabel('Topics', topics.length);
    if (!topics.length) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-empty';
      empty.textContent = state.rooms.length
        ? 'No topic rooms yet. Use + to start one.'
        : 'Connecting to your rooms…';
      el.roomList.appendChild(empty);
    } else {
      for (const room of topics) appendRoom(room);
    }

    el.mediaHubButton.classList.toggle('is-active', state.view === 'media');
    updateMediaBadge();
  }

  function renderRoomHeader() {
    const hub = state.view === 'media';
    const room = activeRoom();
    el.roomIcon.classList.toggle('is-master', !hub && (room.id === DEFAULT_ROOM_ID || room.master));
    el.roomIcon.classList.toggle('is-hub', hub);
    el.roomIcon.textContent = hub ? '▦' : (room.id === DEFAULT_ROOM_ID || room.master ? '✦' : '#');
    el.roomTitle.textContent = hub ? 'Media hub' : room.name;
    el.roomMaster.hidden = hub || !(room.id === DEFAULT_ROOM_ID || room.master);
    el.deleteRoomButton.hidden = hub || room.id === DEFAULT_ROOM_ID || room.master;
    if (hub) {
      el.roomSubtitle.textContent = 'Every image, video and file shared across your rooms';
    } else if (room.id === DEFAULT_ROOM_ID || room.master) {
      el.roomSubtitle.textContent = 'The main room for everyone';
    } else {
      el.roomSubtitle.textContent = room.createdBy ? `Topic room · created by ${room.createdBy}` : 'Topic room';
    }
    updateDocumentTitle();
  }

  function updateMediaBadge() {
    const count = Number(state.mediaTotal) || 0;
    el.mediaBadge.hidden = count <= 0;
    el.mediaBadge.textContent = count > 99 ? '99+' : String(count);
  }

  function openSearch() {
    if (!state.name) {
      showToast('Choose a display name first', { error: true });
      return;
    }
    const room = activeRoom();
    el.searchRoomName.textContent = room ? `#${room.name}` : 'this room';
    el.searchThisRoom.checked = true;
    el.searchInput.value = '';
    el.searchResults.replaceChildren();
    el.searchStatus.textContent = 'Type to search messages.';
    state.searchSeq += 1;
    if (!el.searchDialog.open) el.searchDialog.showModal();
    requestAnimationFrame(() => el.searchInput.focus());
  }

  function scheduleSearch() {
    if (state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(runSearch, 220);
  }

  async function runSearch() {
    const query = el.searchInput.value.trim();
    const seq = ++state.searchSeq;
    if (query.length < SEARCH_MIN_LENGTH) {
      el.searchResults.replaceChildren();
      el.searchStatus.textContent = 'Type to search messages.';
      return;
    }
    el.searchStatus.textContent = 'Searching…';
    const params = new URLSearchParams({ q: query });
    if (el.searchThisRoom.checked && state.activeRoomId) params.set('roomId', state.activeRoomId);
    try {
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      if (seq !== state.searchSeq) return;
      renderSearchResults(query, Array.isArray(data.results) ? data.results : []);
    } catch {
      if (seq !== state.searchSeq) return;
      el.searchStatus.textContent = 'Could not search. Check your connection.';
    }
  }

  function renderSearchResults(query, results) {
    el.searchResults.replaceChildren();
    if (!results.length) {
      el.searchStatus.textContent = `No messages match “${query}”.`;
      return;
    }
    el.searchStatus.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;
    const needle = query.toLowerCase();
    for (const result of results) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result';
      const top = document.createElement('div');
      top.className = 'search-result-top';
      const room = document.createElement('span');
      room.className = 'search-result-room';
      room.textContent = `#${result.roomName}`;
      const author = document.createElement('span');
      author.className = 'search-result-author';
      author.textContent = result.author;
      const time = document.createElement('time');
      time.className = 'search-result-time';
      time.textContent = fullFormatter.format(new Date(result.ts));
      top.append(room, author, time);
      const snippet = document.createElement('p');
      snippet.className = 'search-result-snippet';
      appendHighlighted(snippet, snippetAround(result.text || '(attachment)', needle), needle);
      button.append(top, snippet);
      button.addEventListener('click', () => goToSearchResult(result));
      item.appendChild(button);
      el.searchResults.appendChild(item);
    }
  }

  function snippetAround(text, needle) {
    const index = text.toLowerCase().indexOf(needle);
    if (index === -1) return text.slice(0, 200);
    const start = Math.max(0, index - 60);
    const end = Math.min(text.length, index + needle.length + 120);
    return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  function appendHighlighted(container, text, needle) {
    const lower = text.toLowerCase();
    let from = 0;
    let index = lower.indexOf(needle);
    while (index !== -1) {
      if (index > from) container.appendChild(document.createTextNode(text.slice(from, index)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(index, index + needle.length);
      container.appendChild(mark);
      from = index + needle.length;
      index = lower.indexOf(needle, from);
    }
    if (from < text.length) container.appendChild(document.createTextNode(text.slice(from)));
  }

  function goToSearchResult(result) {
    el.searchDialog.close();
    if (result.roomId !== state.activeRoomId) {
      state.pendingFocusId = result.id;
      switchRoom(result.roomId, { force: true });
      setTimeout(() => {
        if (state.pendingFocusId === result.id) {
          state.pendingFocusId = null;
          showToast('Could not open that message');
        }
      }, 4500);
      return;
    }
    if (!focusMessage(result.id)) showToast('Message is outside the loaded history');
  }

  function resetRoomState() {
    state.initialized = false;
    state.messages = [];
    state.messageIds.clear();
    state.lastRender = null;
    state.typingUsers.clear();
    state.unread = 0;
    state.pinToBottom = true;
    clearReply();
    closeReactionPalette();
    el.messageList.replaceChildren();
    el.scrollButton.hidden = true;
    el.newMessageCount.hidden = true;
    renderTyping();
    updateWelcome();
    updateDocumentTitle();
  }

  function setView(view) {
    state.view = view === 'media' ? 'media' : 'room';
    const media = state.view === 'media';
    el.chatShell.hidden = media;
    el.composerDock.hidden = media;
    el.mediaHub.hidden = !media;
    el.mediaHubButton.classList.toggle('is-active', media);
    if (media) {
      el.scrollButton.hidden = true;
      el.newMessageCount.hidden = true;
    }
    renderSidebar();
    renderRoomHeader();
    updateDocumentTitle();
  }

  function showRoomView() {
    setView('room');
    state.pinToBottom = true;
    state.unread = 0;
    requestAnimationFrame(() => {
      scrollToBottom(false);
      updateScrollButton();
    });
  }

  function switchRoom(roomId, options = {}) {
    if (!roomId) return;
    const target = roomById(roomId);
    if (!target && state.rooms.length) {
      showToast('That room no longer exists', { error: true });
      return;
    }
    const changed = roomId !== state.activeRoomId;
    if (!changed && !options.force) {
      if (state.view !== 'room' && !options.stayInHub) showRoomView();
      renderSidebar();
      renderRoomHeader();
      closeSidebar();
      return;
    }

    state.activeRoomId = roomId;
    persistActiveRoom();
    if (state.selected.length) {
      clearPendingFiles();
      showToast('Attachments cleared when changing rooms');
    }
    el.messageInput.value = '';
    autoResizeInput();
    resetRoomState();
    renderSidebar();
    renderRoomHeader();
    setView(options.stayInHub ? 'media' : 'room');
    if (state.name) connect();
    closeSidebar();
    if (!options.stayInHub && !isTouch) {
      requestAnimationFrame(() => el.messageInput.focus());
    }
  }

  function openMediaHub() {
    if (!state.name) {
      showToast('Choose a display name first', { error: true });
      return;
    }
    setView('media');
    closeSidebar();
    loadMedia({ silent: state.mediaLoaded });
  }

  function mediaKind(item) {
    const type = String(item && item.type || '').toLowerCase();
    if (PREVIEW_IMAGE_TYPES.has(type)) return 'images';
    if (PREVIEW_VIDEO_TYPES.has(type)) return 'videos';
    if (PREVIEW_AUDIO_TYPES.has(type)) return 'audio';
    return 'files';
  }

  function renderMediaHub() {
    if (state.mediaLoading) {
      el.mediaHubCount.textContent = 'Loading…';
      el.mediaEmpty.hidden = true;
      el.mediaGallery.replaceChildren();
      for (let index = 0; index < 6; index += 1) {
        const skeleton = document.createElement('div');
        skeleton.className = 'media-skeleton';
        const thumb = document.createElement('div');
        thumb.className = 'media-skeleton-thumb';
        const lines = document.createElement('div');
        lines.className = 'media-skeleton-lines';
        lines.append(document.createElement('i'), document.createElement('i'));
        skeleton.append(thumb, lines);
        el.mediaGallery.appendChild(skeleton);
      }
      return;
    }

    const items = state.mediaItems.filter((item) => state.mediaFilter === 'all' || mediaKind(item) === state.mediaFilter);
    const total = Number(state.mediaTotal) || 0;
    const filterLabels = { all: 'items', images: 'images', videos: 'videos', audio: 'audio', files: 'files' };
    el.mediaHubCount.textContent = state.mediaFilter === 'all'
      ? `${total} ${total === 1 ? 'item' : 'items'}`
      : `${items.length} ${filterLabels[state.mediaFilter]}`;

    el.mediaGallery.replaceChildren();
    if (!items.length) {
      el.mediaEmpty.hidden = false;
      if (!total) {
        el.mediaEmptyTitle.textContent = 'No media yet';
        el.mediaEmptyCopy.textContent = 'Images, videos and files shared in any room will collect here.';
      } else {
        el.mediaEmptyTitle.textContent = `No ${filterLabels[state.mediaFilter]} yet`;
        el.mediaEmptyCopy.textContent = 'Share something in a room and it will appear here.';
      }
      return;
    }
    el.mediaEmpty.hidden = true;
    for (const item of items) el.mediaGallery.appendChild(createMediaCard(item));
  }

  function createMediaCard(item) {
    const kind = mediaKind(item);
    const card = document.createElement('article');
    card.className = `media-card kind-${kind}`;

    if (kind === 'images') {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'media-thumb';
      thumb.title = `Open ${item.name}`;
      const img = document.createElement('img');
      img.src = fileUrl(item);
      img.alt = item.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      thumb.appendChild(img);
      thumb.addEventListener('click', () => openLightbox(item));
      card.appendChild(thumb);
    } else if (kind === 'videos') {
      const player = document.createElement('video');
      player.className = 'media-video-preview';
      player.src = fileUrl(item);
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      card.appendChild(player);
    } else if (kind === 'audio') {
      const preview = document.createElement('div');
      preview.className = 'media-audio-preview';
      preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V6l10-2v12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" stroke="currentColor" stroke-width="1.7"/><circle cx="16.5" cy="16" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg>';
      const player = document.createElement('audio');
      player.src = fileUrl(item);
      player.controls = true;
      player.preload = 'metadata';
      preview.appendChild(player);
      card.appendChild(preview);
    } else {
      const preview = document.createElement('a');
      preview.className = 'media-file-preview';
      preview.href = fileUrl(item, true);
      preview.download = item.name;
      preview.title = `Download ${item.name}`;
      const icon = document.createElement('span');
      icon.className = 'media-file-icon';
      icon.textContent = fileExtension(item);
      preview.appendChild(icon);
      card.appendChild(preview);
    }

    if (kind !== 'images') {
      const label = document.createElement('span');
      label.className = 'media-kind-label';
      label.textContent = kind === 'videos' ? 'Video' : kind === 'audio' ? 'Audio' : 'File';
      card.appendChild(label);
    }

    const actions = document.createElement('div');
    actions.className = 'media-card-actions';
    const download = document.createElement('a');
    download.className = 'media-icon-link';
    download.href = fileUrl(item, true);
    download.download = item.name;
    download.title = `Download ${item.name}`;
    download.setAttribute('aria-label', `Download ${item.name}`);
    download.innerHTML = ICONS.download;
    actions.appendChild(download);
    card.appendChild(actions);

    const info = document.createElement('div');
    info.className = 'media-card-info';
    const name = document.createElement('div');
    name.className = 'media-card-name';
    name.textContent = item.name;
    name.title = item.name;
    const meta = document.createElement('div');
    meta.className = 'media-card-meta';
    const roomLink = document.createElement('button');
    roomLink.type = 'button';
    roomLink.className = 'media-room-link';
    roomLink.textContent = `# ${item.roomName || 'Room'}`;
    roomLink.title = `Open #${item.roomName || 'room'}`;
    roomLink.addEventListener('click', () => switchRoom(item.roomId));
    const detail = document.createElement('span');
    detail.textContent = `${item.author || 'Unknown'} · ${relativeTime(item.ts)}`;
    detail.title = item.ts ? fullFormatter.format(new Date(item.ts)) : '';
    meta.append(roomLink, detail);
    info.append(name, meta);
    card.appendChild(info);
    return card;
  }

  async function loadMedia(options = {}) {
    const silent = Boolean(options.silent) && state.mediaLoaded;
    const token = (state.mediaRequestToken || 0) + 1;
    state.mediaRequestToken = token;
    if (!silent) {
      state.mediaLoading = true;
      renderMediaHub();
    }
    try {
      const response = await fetch('/api/media', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load media');
      const data = await response.json();
      if (token !== state.mediaRequestToken) return;
      state.mediaItems = Array.isArray(data.items) ? data.items : [];
      state.mediaTotal = Number(data.total) || state.mediaItems.length;
      state.mediaLoaded = true;
      state.mediaLoading = false;
      updateMediaBadge();
      if (state.view === 'media') renderMediaHub();
    } catch {
      if (token !== state.mediaRequestToken) return;
      state.mediaLoading = false;
      if (state.view === 'media') renderMediaHub();
      if (!silent) showToast('Could not load the media hub', { error: true });
    }
  }

  function setMediaFilter(filter) {
    state.mediaFilter = ['all', 'images', 'videos', 'audio', 'files'].includes(filter) ? filter : 'all';
    for (const button of el.mediaFilters.querySelectorAll('button[data-filter]')) {
      button.classList.toggle('is-active', button.dataset.filter === state.mediaFilter);
    }
    renderMediaHub();
  }

  function openRoomDialog() {
    el.roomError.textContent = '';
    el.roomNameInput.value = '';
    el.createRoomButton.disabled = false;
    el.createRoomButton.textContent = 'Create room';
    closeSidebar();
    if (!el.roomDialog.open) el.roomDialog.showModal();
    requestAnimationFrame(() => el.roomNameInput.focus());
  }

  async function createRoom() {
    if (!state.name) {
      showToast('Choose a display name first', { error: true });
      return;
    }
    const name = normalizeRoomName(el.roomNameInput.value);
    if (!name) {
      el.roomError.textContent = 'Give the room a name.';
      el.roomNameInput.focus();
      return;
    }
    el.createRoomButton.disabled = true;
    el.createRoomButton.textContent = 'Creating…';
    el.roomError.textContent = '';
    try {
      const data = await postJson('/api/rooms', { cid: state.cid, name: state.name, roomName: name });
      if (data.room && !roomById(data.room.id)) state.rooms.push(data.room);
      el.roomDialog.close();
      renderSidebar();
      switchRoom(data.room ? data.room.id : DEFAULT_ROOM_ID);
      showToast(`Room #${name} created`);
    } catch (error) {
      el.roomError.textContent = error.message || 'Could not create room';
    } finally {
      el.createRoomButton.disabled = false;
      el.createRoomButton.textContent = 'Create room';
    }
  }

  function openDeleteDialog() {
    const room = activeRoom();
    if (!room || room.master || room.id === DEFAULT_ROOM_ID) return;
    const count = Number(room.messageCount) || 0;
    state.confirmMode = 'room';
    state.pendingDeleteMessageId = null;
    state.pendingDeleteRoomId = room.id;
    el.confirmTitle.textContent = `Delete #${room.name}?`;
    el.confirmText.textContent = count
      ? `This removes the room and all ${count} of its messages, including every shared file. This cannot be undone.`
      : 'This removes the room for everyone. This cannot be undone.';
    el.confirmDelete.disabled = false;
    el.confirmDelete.textContent = 'Delete room';
    if (!el.confirmDialog.open) el.confirmDialog.showModal();
    requestAnimationFrame(() => el.confirmCancel.focus());
  }

  async function deleteRoom() {
    const roomId = state.pendingDeleteRoomId;
    if (!roomId) return;
    const room = roomById(roomId);
    state.deletingRoomId = roomId;
    el.confirmDelete.disabled = true;
    el.confirmDelete.textContent = 'Deleting…';
    try {
      let response;
      try {
        response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, { method: 'DELETE' });
      } catch {
        throw new Error('Could not reach the room. Check your connection.');
      }
      let data = {};
      try { data = await response.json(); } catch {}
      if (!response.ok) throw new Error(data.error || 'Could not delete room');
      state.pendingDeleteRoomId = null;
      if (el.confirmDialog.open) el.confirmDialog.close();
      if (state.activeRoomId === roomId) switchRoom(DEFAULT_ROOM_ID, { force: true, stayInHub: state.view === 'media' });
      state.rooms = state.rooms.filter((entry) => entry.id !== roomId);
      renderSidebar();
      showToast(room ? `Room #${room.name} deleted` : 'Room deleted');
    } catch (error) {
      el.confirmText.textContent = error.message || 'Could not delete room';
      el.confirmDelete.disabled = false;
      el.confirmDelete.textContent = 'Try again';
    } finally {
      state.deletingRoomId = null;
    }
  }

  function syncSidebarMode() {
    if (mobileRoomQuery.matches) {
      setSidebar(state.sidebarOpen);
    } else {
      state.sidebarOpen = false;
      el.sidebar.classList.remove('is-open');
      el.sidebar.inert = false;
      el.sidebarBackdrop.hidden = true;
      el.sidebarToggle.setAttribute('aria-expanded', 'false');
    }
  }

  function setSidebar(open) {
    if (!mobileRoomQuery.matches) {
      el.sidebar.classList.remove('is-open');
      el.sidebar.inert = false;
      el.sidebarBackdrop.hidden = true;
      state.sidebarOpen = false;
      el.sidebarToggle.setAttribute('aria-expanded', 'false');
      return;
    }
    state.sidebarOpen = Boolean(open);
    el.sidebar.classList.toggle('is-open', state.sidebarOpen);
    el.sidebar.inert = !state.sidebarOpen;
    el.sidebarBackdrop.hidden = !state.sidebarOpen;
    el.sidebarToggle.setAttribute('aria-expanded', String(state.sidebarOpen));
    if (state.sidebarOpen) requestAnimationFrame(() => el.sidebarClose.focus());
  }

  function closeSidebar() {
    if (state.sidebarOpen) setSidebar(false);
  }

  function removeTyping(cid) {
    if (state.typingUsers.delete(cid)) renderTyping();
  }

  function renderTyping() {
    const now = Date.now();
    const names = [];
    for (const [cid, entry] of state.typingUsers) {
      if (entry.expires <= now) {
        state.typingUsers.delete(cid);
        continue;
      }
      if (cid !== state.cid) names.push(entry.name);
    }
    if (!names.length) {
      el.typingRow.classList.remove('is-visible');
      el.typingText.textContent = '';
      return;
    }
    const text = names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names.length} people are typing`;
    el.typingText.textContent = text;
    el.typingRow.classList.add('is-visible');
    if (isNearBottom()) requestAnimationFrame(() => scrollToBottom(false));
  }

  function updateWelcome() {
    const hasMessages = state.messageIds.size > 0;
    el.welcome.classList.toggle('is-hidden', hasMessages);
  }

  function isNearBottom() {
    return el.scroller.scrollHeight - el.scroller.scrollTop - el.scroller.clientHeight < 95;
  }

  function scrollToBottom(smooth) {
    el.scroller.scrollTo({
      top: el.scroller.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function updateScrollButton() {
    if (state.view !== 'room') {
      el.scrollButton.hidden = true;
      el.newMessageCount.hidden = true;
      updateDocumentTitle();
      return;
    }
    const distance = el.scroller.scrollHeight - el.scroller.scrollTop - el.scroller.clientHeight;
    const show = distance > 110;
    el.scrollButton.hidden = !show;
    if (!show) state.unread = 0;
    el.newMessageCount.hidden = state.unread === 0;
    el.newMessageCount.textContent = state.unread > 99 ? '99+' : String(state.unread);
    updateDocumentTitle();
  }

  function ingestMessage(message, options = {}) {
    if (!message || !message.id || state.messageIds.has(message.id)) return false;
    const normalized = {
      id: message.id,
      cid: String(message.cid || ''),
      author: normalizeName(message.author) || 'Unknown',
      text: typeof message.text === 'string' ? message.text : '',
      ts: Number(message.ts) || Date.now(),
      editedAt: Number(message.editedAt) || null,
      reactions: normalizeReactions(message.reactions),
      replyTo: normalizeReply(message.replyTo),
      attachments: Array.isArray(message.attachments) ? message.attachments : []
    };
    const viewingRoom = state.view === 'room';
    const stick = viewingRoom && isNearBottom();
    state.pinToBottom = viewingRoom ? stick : false;
    state.messageIds.add(normalized.id);
    state.messages.push(normalized);
    appendMessage(normalized, !options.initial);
    if (options.initial) return true;

    if (viewingRoom && (stick || normalized.cid === state.cid)) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
        updateScrollButton();
      });
    } else {
      state.unread += 1;
      updateScrollButton();
    }
    return true;
  }

  function appendDateDivider(timestamp) {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.textContent = dateLabel(timestamp);
    el.messageList.appendChild(divider);
  }

  function appendMessage(message, animate) {
    if (!state.lastRender || dateKey(state.lastRender.ts) !== dateKey(message.ts)) {
      appendDateDivider(message.ts);
    }
    const firstInGroup = !state.lastRender
      || dateKey(state.lastRender.ts) !== dateKey(message.ts)
      || state.lastRender.cid !== message.cid
      || message.ts - state.lastRender.ts > 5 * 60 * 1000;

    const row = document.createElement('article');
    row.className = `message${message.cid === state.cid ? ' own' : ''}${firstInGroup ? ' first-in-group' : ''}${animate ? '' : ' no-animation'}`;
    row.dataset.id = message.id;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    setAvatar(avatar, message.author);

    const content = document.createElement('div');
    content.className = 'message-content';

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = message.cid === state.cid ? `${message.author} · you` : message.author;
    const time = document.createElement('time');
    time.className = 'message-time';
    time.dateTime = new Date(message.ts).toISOString();
    time.title = fullFormatter.format(new Date(message.ts));
    time.textContent = formatTime(message.ts);
    const edited = document.createElement('span');
    edited.className = 'message-edited';
    edited.textContent = 'edited';
    edited.hidden = !message.editedAt;
    meta.append(author, time, edited);

    const line = document.createElement('div');
    line.className = 'message-line';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    const body = renderMessageBody(bubble, message);
    const tools = buildMessageTools(message);

    line.append(bubble, tools);
    content.append(meta, line);
    row.append(avatar, content);
    el.messageList.appendChild(row);

    if (body.textEl && isLongMessage(message.text)) {
      setupMessageCollapse(bubble, body.textEl);
    }

    state.lastRender = message;
  }

  function renderMessageBody(bubble, message) {
    bubble.replaceChildren();
    const hasText = message.text.trim().length > 0;
    bubble.classList.toggle('media-only', !hasText);
    if (message.replyTo) bubble.appendChild(createReplyQuote(message.replyTo));
    let textEl = null;
    if (hasText) {
      textEl = document.createElement('div');
      textEl.className = 'message-text';
      renderMarkdown(textEl, message.text);
      bubble.appendChild(textEl);
    }
    appendAttachments(bubble, message);
    const reactions = createReactionsBar(message.id, message.reactions);
    if (reactions) bubble.appendChild(reactions);
    return { textEl, hasText };
  }

  function createReplyQuote(reply) {
    const quote = document.createElement('button');
    quote.type = 'button';
    quote.className = 'message-reply';
    quote.title = 'Jump to the replied message';
    const author = document.createElement('strong');
    author.textContent = reply.author;
    const text = document.createElement('span');
    text.textContent = reply.text || 'Message';
    quote.append(author, text);
    quote.addEventListener('click', () => {
      if (!focusMessage(reply.id)) showToast('That message is not in the loaded history');
    });
    return quote;
  }

  function buildMessageTools(message) {
    const tools = document.createElement('div');
    tools.className = 'message-tools';
    tools.appendChild(toolButton('Copy message', ICONS.copy, async () => {
      const copied = await copyText(messageCopyText(message));
      showToast(copied ? 'Message copied' : 'Could not copy message', { error: !copied });
    }));
    tools.appendChild(toolButton('Reply', ICONS.reply, () => setReplyTo(message)));
    const reactButton = toolButton('Add reaction', ICONS.smile, (event) => {
      openReactionPalette(event.currentTarget, message.id);
    });
    reactButton.dataset.reactionTrigger = 'true';
    tools.appendChild(reactButton);
    if (message.cid === state.cid) {
      tools.appendChild(toolButton('Edit message', ICONS.edit, () => openEdit(message)));
      tools.appendChild(toolButton('Delete message', ICONS.trash, () => openDeleteMessageDialog(message)));
    }
    return tools;
  }

  function toolButton(label, icon, onClick) {
    const button = document.createElement('button');
    button.className = 'tool-button';
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = icon;
    button.addEventListener('click', onClick);
    return button;
  }

  function createReactionsBar(messageId, reactions) {
    const entries = Object.entries(normalizeReactions(reactions));
    if (!entries.length) return null;
    const bar = document.createElement('div');
    bar.className = 'message-reactions';
    for (const [emoji, cids] of entries) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `reaction-chip${cids.includes(state.cid) ? ' mine' : ''}`;
      chip.title = `${cids.length} reaction${cids.length === 1 ? '' : 's'}`;
      chip.dataset.emoji = emoji;
      const emojiEl = document.createElement('span');
      emojiEl.className = 'reaction-emoji';
      emojiEl.textContent = emoji;
      const count = document.createElement('span');
      count.className = 'reaction-count';
      count.textContent = String(cids.length);
      chip.append(emojiEl, count);
      chip.addEventListener('click', () => toggleReaction(messageId, emoji));
      bar.appendChild(chip);
    }
    return bar;
  }

  function applyReactions(messageId, reactions) {
    const message = state.messages.find((entry) => entry.id === messageId);
    if (message) message.reactions = normalizeReactions(reactions);
    const row = rowForMessage(messageId);
    if (!row) return;
    const bubble = row.querySelector('.message-bubble');
    if (!bubble) return;
    const existing = bubble.querySelector('.message-reactions');
    const fresh = createReactionsBar(messageId, reactions);
    if (existing) {
      if (fresh) existing.replaceWith(fresh);
      else existing.remove();
    } else if (fresh) {
      bubble.appendChild(fresh);
    }
  }

  async function toggleReaction(messageId, emoji) {
    if (!state.name) {
      showToast('Choose a display name first', { error: true });
      return;
    }
    try {
      const data = await requestJson(`/api/messages/${encodeURIComponent(messageId)}/reactions`, 'POST', {
        cid: state.cid,
        emoji
      });
      applyReactions(messageId, data.reactions);
    } catch (error) {
      showToast(error.message || 'Could not react', { error: true });
    }
  }

  function ensureReactionPalette() {
    if (el.reactionPalette.childElementCount) return;
    for (const emoji of REACTION_EMOJIS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reaction-option';
      button.textContent = emoji;
      button.setAttribute('aria-label', `React with ${emoji}`);
      button.addEventListener('click', () => {
        const target = state.reactionTargetId;
        closeReactionPalette();
        if (target) toggleReaction(target, emoji);
      });
      el.reactionPalette.appendChild(button);
    }
  }

  function openReactionPalette(anchor, messageId) {
    ensureReactionPalette();
    state.reactionTargetId = messageId;
    const rect = anchor.getBoundingClientRect();
    el.reactionPalette.hidden = false;
    const width = el.reactionPalette.offsetWidth || 232;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
    const top = Math.min(window.innerHeight - 54, rect.bottom + 6);
    el.reactionPalette.style.left = `${left}px`;
    el.reactionPalette.style.top = `${top}px`;
  }

  function closeReactionPalette() {
    el.reactionPalette.hidden = true;
    state.reactionTargetId = null;
  }

  function setReplyTo(message) {
    state.replyTo = message;
    el.replyPreviewAuthor.textContent = message.cid === state.cid ? `${message.author} · you` : message.author;
    el.replyPreviewText.textContent = message.text.trim()
      || (message.attachments && message.attachments.length ? 'Attachment' : 'Message');
    el.replyPreview.hidden = false;
    if (!isTouch) el.messageInput.focus();
  }

  function clearReply() {
    state.replyTo = null;
    el.replyPreview.hidden = true;
    el.replyPreviewAuthor.textContent = '';
    el.replyPreviewText.textContent = '';
  }

  function openEdit(message) {
    if (message.cid !== state.cid) return;
    state.editingId = message.id;
    el.editInput.value = message.text;
    el.editError.textContent = '';
    el.editSave.disabled = false;
    el.editSave.textContent = 'Save changes';
    if (!el.editDialog.open) el.editDialog.showModal();
    requestAnimationFrame(() => {
      el.editInput.focus();
      el.editInput.setSelectionRange(el.editInput.value.length, el.editInput.value.length);
    });
  }

  async function saveEdit() {
    const id = state.editingId;
    if (!id) return;
    const message = state.messages.find((entry) => entry.id === id);
    const text = el.editInput.value.trim();
    if (!text && !(message && message.attachments && message.attachments.length)) {
      el.editError.textContent = 'Message cannot be empty.';
      return;
    }
    el.editSave.disabled = true;
    el.editSave.textContent = 'Saving…';
    el.editError.textContent = '';
    try {
      const data = await requestJson(`/api/messages/${encodeURIComponent(id)}`, 'PATCH', { cid: state.cid, text });
      el.editDialog.close();
      if (data.message) applyMessageUpdate(data.message);
      showToast('Message updated');
    } catch (error) {
      el.editError.textContent = error.message || 'Could not save message';
    } finally {
      el.editSave.disabled = false;
      el.editSave.textContent = 'Save changes';
    }
  }

  function applyMessageUpdate(message) {
    const existing = state.messages.find((entry) => entry.id === message.id);
    if (existing) {
      existing.text = message.text;
      existing.editedAt = Number(message.editedAt) || null;
      existing.reactions = normalizeReactions(message.reactions);
      existing.replyTo = normalizeReply(message.replyTo);
    }
    const row = rowForMessage(message.id);
    if (!row) return;
    const bubble = row.querySelector('.message-bubble');
    if (!bubble) return;
    const body = renderMessageBody(bubble, existing || message);
    const edited = row.querySelector('.message-edited');
    if (edited) edited.hidden = !message.editedAt;
    if (body.textEl && isLongMessage(message.text)) setupMessageCollapse(bubble, body.textEl);
  }

  function openDeleteMessageDialog(message) {
    if (message.cid !== state.cid) return;
    state.confirmMode = 'message';
    state.pendingDeleteMessageId = message.id;
    el.confirmTitle.textContent = 'Delete this message?';
    el.confirmText.textContent = 'This removes the message and its files for everyone. This cannot be undone.';
    el.confirmDelete.disabled = false;
    el.confirmDelete.textContent = 'Delete message';
    if (!el.confirmDialog.open) el.confirmDialog.showModal();
    requestAnimationFrame(() => el.confirmCancel.focus());
  }

  async function deleteMessage() {
    const id = state.pendingDeleteMessageId;
    if (!id) return;
    state.deletingMessageId = id;
    el.confirmDelete.disabled = true;
    el.confirmDelete.textContent = 'Deleting…';
    try {
      const data = await requestJson(`/api/messages/${encodeURIComponent(id)}`, 'DELETE', { cid: state.cid });
      state.pendingDeleteMessageId = null;
      state.confirmMode = 'room';
      if (el.confirmDialog.open) el.confirmDialog.close();
      removeMessageFromView(id, data.fileIds || []);
      showToast('Message deleted');
    } catch (error) {
      el.confirmText.textContent = error.message || 'Could not delete message';
      el.confirmDelete.disabled = false;
      el.confirmDelete.textContent = 'Try again';
    } finally {
      state.deletingMessageId = null;
    }
  }

  function removeMessageFromView(id, fileIds = []) {
    state.messageIds.delete(id);
    state.messages = state.messages.filter((message) => message.id !== id);
    const row = rowForMessage(id);
    if (row) row.remove();
    if (state.replyTo && state.replyTo.id === id) clearReply();
    if (Array.isArray(fileIds) && fileIds.length && state.mediaLoaded) {
      const removed = new Set(fileIds);
      state.mediaItems = state.mediaItems.filter((item) => !removed.has(item.id));
      state.mediaTotal = Math.max(0, state.mediaTotal - fileIds.length);
      updateMediaBadge();
      if (state.view === 'media') renderMediaHub();
    }
    updateWelcome();
  }

  function rowForMessage(id) {
    return el.messageList.querySelector(`.message[data-id="${id}"]`);
  }

  function focusMessage(id) {
    const row = rowForMessage(id);
    if (!row) return false;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.add('is-highlight');
    setTimeout(() => row.classList.remove('is-highlight'), 2200);
    return true;
  }

  function isLongMessage(text) {
    if (text.length > COLLAPSE_TEXT_LENGTH) return true;
    let lines = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text.charCodeAt(index) === 10 && (lines += 1) >= COLLAPSE_LINE_COUNT) return true;
    }
    return false;
  }

  function setupMessageCollapse(bubble, paragraph) {
    paragraph.classList.add('is-collapsed');
    if (paragraph.scrollHeight - paragraph.clientHeight < 8) {
      paragraph.classList.remove('is-collapsed');
      return;
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'message-expand';
    toggle.textContent = 'Show more';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const collapsed = paragraph.classList.toggle('is-collapsed');
      toggle.textContent = collapsed ? 'Show more' : 'Show less';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      bubble.classList.toggle('has-expanded-text', !collapsed);
      updateScrollButton();
    });
    paragraph.after(toggle);
  }

  function renderMarkdown(container, text) {
    container.replaceChildren();
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    let paragraph = [];
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const block = document.createElement('div');
      block.className = 'md-paragraph';
      paragraph.forEach((line, index) => {
        if (index) block.appendChild(document.createElement('br'));
        renderInline(block, line);
      });
      container.appendChild(block);
      paragraph = [];
    };
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      const fence = /^```([\w+-]*)\s*$/.exec(line);
      if (fence) {
        flushParagraph();
        const lang = fence[1] || '';
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```\s*$/.test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        index += 1;
        renderCodeBlock(container, codeLines.join('\n'), lang);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        index += 1;
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) {
        flushParagraph();
        const list = document.createElement('ul');
        while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
          const item = document.createElement('li');
          renderInline(item, lines[index].replace(/^\s*[-*+]\s+/, ''));
          list.appendChild(item);
          index += 1;
        }
        container.appendChild(list);
        continue;
      }
      if (/^\s*\d+[.)]\s+/.test(line)) {
        flushParagraph();
        const list = document.createElement('ol');
        while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
          const item = document.createElement('li');
          renderInline(item, lines[index].replace(/^\s*\d+[.)]\s+/, ''));
          list.appendChild(item);
          index += 1;
        }
        container.appendChild(list);
        continue;
      }
      const heading = /^(#{1,3})\s+(.*)$/.exec(line);
      if (heading) {
        flushParagraph();
        const block = document.createElement('div');
        block.className = `md-heading md-h${heading[1].length}`;
        renderInline(block, heading[2]);
        container.appendChild(block);
        index += 1;
        continue;
      }
      if (/^\s*>\s?/.test(line)) {
        flushParagraph();
        const quote = document.createElement('blockquote');
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          renderInline(quote, lines[index].replace(/^\s*>\s?/, ''));
          if (index + 1 < lines.length && /^\s*>\s?/.test(lines[index + 1])) {
            quote.appendChild(document.createElement('br'));
          }
          index += 1;
        }
        container.appendChild(quote);
        continue;
      }
      paragraph.push(line);
      index += 1;
    }
    flushParagraph();
  }

  function renderInline(container, text) {
    const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(_[^_\n]+_)|((?:https?:\/\/|www\.)[^\s<>"']+)|(@[A-Za-z0-9_.-]+)/g;
    let lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > lastIndex) container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const token = match[0];
      if (token.startsWith('`')) {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        container.appendChild(code);
      } else if (token.startsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        container.appendChild(strong);
      } else if (token.startsWith('*') || token.startsWith('_')) {
        const em = document.createElement('em');
        em.textContent = token.slice(1, -1);
        container.appendChild(em);
      } else if (token.startsWith('@')) {
        const mention = document.createElement('span');
        mention.className = 'mention';
        const name = token.slice(1);
        if (state.name && name.toLowerCase() === state.name.toLowerCase()) mention.classList.add('mention-me');
        mention.textContent = token;
        container.appendChild(mention);
      } else {
        let raw = token;
        let trailing = '';
        while (/[.,!?;:)\]}]$/.test(raw)) {
          trailing = raw.slice(-1) + trailing;
          raw = raw.slice(0, -1);
        }
        if (raw) {
          const link = document.createElement('a');
          link.href = raw.startsWith('www.') ? `https://${raw}` : raw;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = raw;
          container.appendChild(link);
        }
        if (trailing) container.appendChild(document.createTextNode(trailing));
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  function renderCodeBlock(container, code, lang) {
    const wrap = document.createElement('div');
    wrap.className = 'md-code';
    const head = document.createElement('div');
    head.className = 'md-code-head';
    const label = document.createElement('span');
    label.textContent = lang || 'code';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'md-code-copy';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      const ok = await copyText(code);
      copy.textContent = ok ? 'Copied' : 'Failed';
      setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
    });
    head.append(label, copy);
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    if (lang) codeEl.className = `language-${lang}`;
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    wrap.append(head, pre);
    container.appendChild(wrap);
  }

  function appendAttachments(bubble, message) {
    const attachments = message.attachments || [];
    if (!attachments.length) return;
    const images = attachments.filter((file) => PREVIEW_IMAGE_TYPES.has(String(file.type || '').toLowerCase()));
    const videos = attachments.filter((file) => PREVIEW_VIDEO_TYPES.has(String(file.type || '').toLowerCase()));
    const audio = attachments.filter((file) => PREVIEW_AUDIO_TYPES.has(String(file.type || '').toLowerCase()));
    const files = attachments.filter((file) => !images.includes(file) && !videos.includes(file) && !audio.includes(file));

    if (images.length) {
      const grid = document.createElement('div');
      grid.className = `media-grid${images.length === 1 ? ' single' : ''}`;
      for (const image of images) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'image-tile';
        tile.title = `Open ${image.name}`;
        const img = document.createElement('img');
        img.src = fileUrl(image);
        img.alt = image.name;
        img.loading = 'lazy';
        img.decoding = 'async';
        tile.appendChild(img);
        tile.addEventListener('click', () => openLightbox(image));
        grid.appendChild(tile);
      }
      bubble.appendChild(grid);
    }

    for (const video of videos) {
      const player = document.createElement('video');
      player.className = 'media-video';
      player.src = fileUrl(video);
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      bubble.appendChild(player);
    }

    for (const sound of audio) {
      const player = document.createElement('audio');
      player.className = 'media-audio';
      player.src = fileUrl(sound);
      player.controls = true;
      player.preload = 'metadata';
      bubble.appendChild(player);
    }

    if (files.length) {
      const list = document.createElement('div');
      list.className = 'file-list';
      for (const file of files) {
        const link = document.createElement('a');
        link.className = 'file-card';
        link.href = fileUrl(file, true);
        link.download = file.name;
        link.title = `Download ${file.name}`;

        const type = document.createElement('span');
        type.className = 'file-type';
        type.textContent = fileExtension(file);

        const meta = document.createElement('span');
        meta.className = 'file-meta';
        const name = document.createElement('strong');
        name.textContent = file.name;
        const size = document.createElement('span');
        size.textContent = formatBytes(file.size);
        meta.append(name, size);

        const download = document.createElement('span');
        download.className = 'file-download';
        download.innerHTML = ICONS.download;

        link.append(type, meta, download);
        list.appendChild(link);
      }
      bubble.appendChild(list);
    }
  }

  function messageCopyText(message) {
    const lines = [];
    if (message.text.trim()) lines.push(message.text);
    for (const file of message.attachments || []) {
      lines.push(`${file.name}: ${location.origin}${fileUrl(file, true)}`);
    }
    return lines.join('\n');
  }

  function openLightbox(file) {
    state.lightboxFile = file;
    state.lightboxReturnFocus = document.activeElement;
    el.lightboxName.textContent = file.name;
    el.lightboxImage.src = fileUrl(file);
    el.lightboxImage.alt = file.name;
    el.lightboxDownload.href = fileUrl(file, true);
    el.lightboxDownload.setAttribute('download', file.name);
    el.lightbox.hidden = false;
    el.lightboxClose.focus();
  }

  function closeLightbox() {
    if (el.lightbox.hidden) return;
    el.lightbox.hidden = true;
    el.lightboxImage.removeAttribute('src');
    state.lightboxFile = null;
    if (state.lightboxReturnFocus && typeof state.lightboxReturnFocus.focus === 'function') {
      state.lightboxReturnFocus.focus();
    }
    state.lightboxReturnFocus = null;
  }

  function autoResizeInput() {
    el.messageInput.style.height = 'auto';
    el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 154)}px`;
  }

  function updateSendButton() {
    const hasText = el.messageInput.value.trim().length > 0;
    const hasSelected = state.selected.length > 0;
    const allReady = hasSelected && state.selected.every((item) => item.status === 'ready');
    el.sendButton.disabled = state.sending || (!hasText && !allReady) || (hasSelected && !allReady);
  }

  function updatePendingChip(item) {
    if (!item.chip || !item.chip.isConnected) return;
    const status = item.chip.querySelector('.pending-status');
    const text = status.querySelector('.pending-text');
    const bar = status.querySelector('.upload-bar i');
    item.chip.classList.toggle('is-error', item.status === 'error');
    if (item.status === 'uploading') {
      text.textContent = `Uploading ${Math.round(item.progress)}%`;
      bar.style.width = `${Math.max(3, item.progress)}%`;
    } else if (item.status === 'ready') {
      text.textContent = 'Ready to send';
      bar.style.width = '100%';
    } else {
      text.textContent = 'Upload failed · tap to retry';
      bar.style.width = '100%';
    }
  }

  function renderPendingFiles() {
    el.pendingFiles.replaceChildren();
    if (!state.selected.length) {
      el.pendingFiles.hidden = true;
      updateSendButton();
      return;
    }
    el.pendingFiles.hidden = false;
    for (const item of state.selected) {
      const chip = document.createElement('div');
      chip.className = 'pending-chip';
      chip.dataset.key = item.key;

      const thumb = document.createElement('span');
      thumb.className = 'pending-thumb';
      if (item.previewUrl) {
        const img = document.createElement('img');
        img.src = item.previewUrl;
        img.alt = '';
        thumb.appendChild(img);
      } else {
        thumb.textContent = fileExtension({ name: item.file.name, type: item.file.type });
      }

      const info = document.createElement('span');
      info.className = 'pending-info';
      const name = document.createElement('span');
      name.className = 'pending-name';
      name.textContent = item.file.name;
      const status = document.createElement('span');
      status.className = 'pending-status';
      const bar = document.createElement('span');
      bar.className = 'upload-bar';
      bar.appendChild(document.createElement('i'));
      const statusText = document.createElement('span');
      statusText.className = 'pending-text';
      status.append(bar, statusText);
      info.append(name, status);

      const remove = document.createElement('button');
      remove.className = 'pending-remove';
      remove.type = 'button';
      remove.title = 'Remove file';
      remove.setAttribute('aria-label', `Remove ${item.file.name}`);
      remove.innerHTML = ICONS.close;
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removePendingFile(item);
      });

      chip.append(thumb, info, remove);
      chip.addEventListener('click', () => {
        if (item.status === 'error') uploadItem(item);
      });
      item.chip = chip;
      el.pendingFiles.appendChild(chip);
      updatePendingChip(item);
    }
    updateSendButton();
  }

  function addFiles(files) {
    if (!state.name) {
      showToast('Choose a display name first', { error: true });
      return;
    }
    if (state.view !== 'room') {
      showToast('Open a room to share files', { error: true });
      return;
    }
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    let available = MAX_ATTACHMENTS - state.selected.length;
    for (const file of incoming) {
      if (available <= 0) {
        showToast(`You can attach up to ${MAX_ATTACHMENTS} files`, { error: true });
        break;
      }
      if (file.size === 0) {
        showToast(`${file.name} is empty`, { error: true });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showToast(`${file.name} is larger than 512 MB`, { error: true });
        continue;
      }
      const item = {
        key: randomId(),
        file,
        status: 'uploading',
        progress: 0,
        id: null,
        xhr: null,
        previewUrl: PREVIEW_IMAGE_TYPES.has(String(file.type || '').toLowerCase()) ? URL.createObjectURL(file) : null,
        chip: null
      };
      state.selected.push(item);
      available -= 1;
      uploadItem(item);
    }
    renderPendingFiles();
  }

  function uploadItem(item) {
    if (!state.selected.includes(item) || !state.name) return;
    if (item.xhr) {
      try { item.xhr.abort(); } catch {}
    }
    item.status = 'uploading';
    item.progress = 0;
    item.id = null;
    updatePendingChip(item);
    updateSendButton();

    const xhr = new XMLHttpRequest();
    item.xhr = xhr;
    xhr.open('POST', `/api/upload?name=${encodeURIComponent(item.file.name)}&cid=${encodeURIComponent(state.cid)}`);
    xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      item.progress = Math.min(99, (event.loaded / event.total) * 100);
      updatePendingChip(item);
    });
    xhr.addEventListener('load', () => {
      item.xhr = null;
      let body = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.file && body.file.id) {
        item.id = body.file.id;
        item.progress = 100;
        item.status = 'ready';
      } else {
        item.status = 'error';
        if (xhr.status === 413) showToast(`${item.file.name} is larger than 512 MB`, { error: true });
        else if (body.error) showToast(body.error, { error: true });
        else showToast(`Could not upload ${item.file.name}`, { error: true });
      }
      updatePendingChip(item);
      updateSendButton();
    });
    xhr.addEventListener('error', () => {
      item.xhr = null;
      item.status = 'error';
      updatePendingChip(item);
      updateSendButton();
      showToast(`Could not upload ${item.file.name}. Tap the file to retry.`, { error: true });
    });
    xhr.addEventListener('abort', () => {
      item.xhr = null;
    });
    xhr.send(item.file);
  }

  function removePendingFile(item) {
    if (item.xhr) {
      try { item.xhr.abort(); } catch {}
    }
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    state.selected = state.selected.filter((entry) => entry !== item);
    renderPendingFiles();
  }

  function discardPendingKeys(keys) {
    const removed = state.selected.filter((item) => keys.has(item.key));
    if (!removed.length) return;
    for (const item of removed) {
      if (item.xhr) {
        try { item.xhr.abort(); } catch {}
      }
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    state.selected = state.selected.filter((item) => !keys.has(item.key));
    renderPendingFiles();
  }

  function clearPendingFiles() {
    for (const item of state.selected) {
      if (item.xhr) {
        try { item.xhr.abort(); } catch {}
      }
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    state.selected = [];
    renderPendingFiles();
  }

  async function requestJson(url, method, payload) {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new Error('Could not reach the room. Check your connection.');
    }
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }

  function postJson(url, payload) {
    return requestJson(url, 'POST', payload);
  }

  async function sendMessage() {
    if (state.sending || !state.name || state.view !== 'room') return;
    if (state.selected.some((item) => item.status === 'uploading')) {
      showToast('Wait for uploads to finish');
      return;
    }
    if (state.selected.some((item) => item.status === 'error')) {
      showToast('Remove or retry the failed upload first', { error: true });
      return;
    }
    const draftValue = el.messageInput.value;
    const text = draftValue.trim();
    const ready = state.selected.filter((item) => item.status === 'ready');
    const sentKeys = new Set(ready.map((item) => item.key));
    if (!text && !ready.length) return;

    const replyTarget = state.replyTo;
    state.sending = true;
    updateSendButton();
    try {
      const data = await postJson('/api/messages', {
        cid: state.cid,
        name: state.name,
        roomId: state.activeRoomId,
        text,
        files: ready.map((item) => item.id),
        replyTo: replyTarget ? replyTarget.id : null
      });
      discardPendingKeys(sentKeys);
      clearReply();
      if (el.messageInput.value === draftValue) {
        el.messageInput.value = '';
        autoResizeInput();
      }
      state.lastTypingSent = 0;
      if (data.message && data.message.roomId === state.activeRoomId) {
        const added = ingestMessage(data.message);
        if (added) updateWelcome();
      }
      updateSendButton();
      if (!isTouch && state.view === 'room' && !document.querySelector('dialog[open]')) el.messageInput.focus();
    } catch (error) {
      showToast(error.message || 'Could not send message', { error: true });
    } finally {
      state.sending = false;
      updateSendButton();
    }
  }

  function sendTyping() {
    if (!state.name || !state.source || state.view !== 'room') return;
    const now = Date.now();
    if (now - state.lastTypingSent < 1800) return;
    state.lastTypingSent = now;
    fetch('/api/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid: state.cid, name: state.name, roomId: state.activeRoomId }),
      keepalive: true
    }).catch(() => {});
  }

  function applyProfile() {
    setAvatar(el.myAvatar, state.name || '?');
    el.profileButton.style.setProperty('--avatar', avatarGradient(state.name || '?'));
    el.profileButton.title = state.name ? `You are ${state.name}` : 'Set your name';
    el.profileButton.setAttribute('aria-label', state.name ? `Change name, currently ${state.name}` : 'Set your display name');
  }

  function updateNamePreview() {
    const name = normalizeName(el.nameInput.value);
    setAvatar(el.namePreview, name || '?');
    el.namePreview.textContent = initials(name || '?');
  }

  function openIdentity(first) {
    state.identityFirst = Boolean(first);
    el.identityClose.hidden = Boolean(first);
    el.identityTitle.textContent = first ? 'Join the conversation' : 'Your identity';
    el.identityEyebrow.textContent = first ? 'Welcome to Pulse' : 'Room settings';
    el.identityCopy.textContent = first
      ? 'Pick a name your other devices will recognise. You will land in the Lobby and can join or create topic rooms.'
      : 'Change how you appear to everyone in your current room. Your new name applies immediately.';
    el.joinButton.textContent = first ? 'Enter Pulse' : 'Save name';
    el.nameError.textContent = '';
    el.nameInput.value = state.name || suggestedName();
    updateNamePreview();
    if (!el.identityDialog.open) el.identityDialog.showModal();
    requestAnimationFrame(() => {
      el.nameInput.focus();
      if (!first) el.nameInput.select();
    });
  }

  function joinRoom() {
    const name = normalizeName(el.nameInput.value);
    if (!name) {
      el.nameError.textContent = 'Give yourself a name first.';
      el.nameInput.focus();
      return;
    }
    const first = state.identityFirst;
    const previous = state.name;
    state.name = name;
    writeStorage('localStorage', 'pulse.name', name);
    applyProfile();
    el.identityDialog.close();
    state.identityFirst = false;
    if (!state.source || previous !== name) connect();
    showToast(first ? `Welcome, ${name}` : 'Name updated');
    if (!isTouch) el.messageInput.focus();
  }

  function setupEvents() {
    el.inviteButton.addEventListener('click', async () => {
      const copied = await copyText(inviteUrl());
      showToast(copied ? 'Invite link copied' : 'Could not copy link', { error: !copied });
    });

    el.copyAddressButton.addEventListener('click', async () => {
      const copied = await copyText(`${location.origin}/`);
      showToast(copied ? 'Room address copied' : 'Could not copy address', { error: !copied });
    });

    el.profileButton.addEventListener('click', () => openIdentity(false));
    el.peopleButton.addEventListener('click', () => {
      const open = el.peopleMenu.hidden;
      el.peopleMenu.hidden = !open;
      el.peopleButton.setAttribute('aria-expanded', String(open));
      if (open) renderPeople();
    });

    document.addEventListener('click', (event) => {
      if (el.peopleMenu.hidden) return;
      if (el.peopleMenu.contains(event.target) || el.peopleButton.contains(event.target)) return;
      el.peopleMenu.hidden = true;
      el.peopleButton.setAttribute('aria-expanded', 'false');
    });

    el.searchButton.addEventListener('click', openSearch);
    el.searchClose.addEventListener('click', () => el.searchDialog.close());
    el.searchInput.addEventListener('input', scheduleSearch);
    el.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (state.searchTimer) clearTimeout(state.searchTimer);
        runSearch();
      }
    });
    el.searchThisRoom.addEventListener('change', runSearch);
    el.searchDialog.addEventListener('click', (event) => {
      if (event.target === el.searchDialog) el.searchDialog.close();
    });

    el.replyCancel.addEventListener('click', clearReply);

    el.editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveEdit();
    });
    el.editSave.addEventListener('click', saveEdit);
    el.editCancel.addEventListener('click', () => el.editDialog.close());
    el.editClose.addEventListener('click', () => el.editDialog.close());
    el.editInput.addEventListener('input', () => { el.editError.textContent = ''; });
    el.editDialog.addEventListener('click', (event) => {
      if (event.target === el.editDialog) el.editDialog.close();
    });

    document.addEventListener('click', (event) => {
      if (el.reactionPalette.hidden) return;
      if (el.reactionPalette.contains(event.target)) return;
      if (event.target.closest('[data-reaction-trigger]')) return;
      closeReactionPalette();
    });

    el.sidebarToggle.addEventListener('click', () => setSidebar(!state.sidebarOpen));
    el.sidebarClose.addEventListener('click', closeSidebar);
    el.sidebarBackdrop.addEventListener('click', closeSidebar);
    el.roomList.addEventListener('click', (event) => {
      const button = event.target.closest('.room-item');
      if (!button || !button.dataset.roomId) return;
      switchRoom(button.dataset.roomId);
    });

    el.newRoomButton.addEventListener('click', openRoomDialog);
    el.mediaHubButton.addEventListener('click', openMediaHub);
    el.mediaFilters.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-filter]');
      if (button) setMediaFilter(button.dataset.filter);
    });
    el.deleteRoomButton.addEventListener('click', openDeleteDialog);

    el.roomForm.addEventListener('submit', (event) => {
      event.preventDefault();
      createRoom();
    });
    el.createRoomButton.addEventListener('click', createRoom);
    el.roomClose.addEventListener('click', () => el.roomDialog.close());
    el.roomNameInput.addEventListener('input', () => {
      el.roomError.textContent = '';
    });
    el.roomDialog.addEventListener('click', (event) => {
      if (event.target === el.roomDialog) el.roomDialog.close();
    });

    el.confirmCancel.addEventListener('click', () => {
      if (state.deletingRoomId || state.deletingMessageId) return;
      state.pendingDeleteRoomId = null;
      state.pendingDeleteMessageId = null;
      state.confirmMode = 'room';
      el.confirmDialog.close();
    });
    el.confirmDelete.addEventListener('click', () => {
      if (state.confirmMode === 'message') deleteMessage();
      else deleteRoom();
    });
    el.confirmDialog.addEventListener('cancel', (event) => {
      if (state.deletingRoomId || state.deletingMessageId) {
        event.preventDefault();
        return;
      }
      state.pendingDeleteRoomId = null;
      state.pendingDeleteMessageId = null;
      state.confirmMode = 'room';
    });
    el.confirmDialog.addEventListener('click', (event) => {
      if (event.target !== el.confirmDialog || state.deletingRoomId || state.deletingMessageId) return;
      state.pendingDeleteRoomId = null;
      state.pendingDeleteMessageId = null;
      state.confirmMode = 'room';
      el.confirmDialog.close();
    });

    mobileRoomQuery.addEventListener('change', syncSidebarMode);

    el.attachButton.addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', () => {
      addFiles(el.fileInput.files);
      el.fileInput.value = '';
    });

    el.messageInput.addEventListener('input', () => {
      autoResizeInput();
      updateSendButton();
      sendTyping();
    });

    el.messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !isTouch) {
        event.preventDefault();
        sendMessage();
      }
    });

    el.messageInput.addEventListener('paste', (event) => {
      const files = event.clipboardData && event.clipboardData.files;
      if (files && files.length) {
        event.preventDefault();
        addFiles(files);
      }
    });

    el.sendButton.addEventListener('click', sendMessage);

    el.scroller.addEventListener('scroll', () => {
      state.pinToBottom = isNearBottom();
      if (state.pinToBottom) state.unread = 0;
      updateScrollButton();
    }, { passive: true });

    el.scrollButton.addEventListener('click', () => {
      state.pinToBottom = true;
      scrollToBottom(true);
      state.unread = 0;
      updateScrollButton();
    });

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        if (state.view !== 'room' || !state.pinToBottom || !state.messageIds.size) return;
        scrollToBottom(false);
        updateScrollButton();
      });
      resizeObserver.observe(el.messageList);
    }

    window.addEventListener('resize', updateScrollButton);

    window.addEventListener('dragenter', (event) => {
      if (state.view !== 'room' || !state.name || !event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      state.dragDepth += 1;
      el.dragOverlay.hidden = false;
    });

    window.addEventListener('dragover', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      if (state.name) event.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('dragleave', (event) => {
      if (el.dragOverlay.hidden || event.relatedTarget) return;
      state.dragDepth = 0;
      el.dragOverlay.hidden = true;
    });

    window.addEventListener('drop', (event) => {
      if (!event.dataTransfer) return;
      event.preventDefault();
      state.dragDepth = 0;
      el.dragOverlay.hidden = true;
      if (!state.name) {
        if (event.dataTransfer.files.length) showToast('Choose a display name first', { error: true });
        return;
      }
      if (state.view !== 'room') {
        if (event.dataTransfer.files.length) showToast('Open a room to share files', { error: true });
        return;
      }
      if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
    });

    window.addEventListener('dragend', () => {
      state.dragDepth = 0;
      el.dragOverlay.hidden = true;
    });

    el.identityForm.addEventListener('submit', (event) => {
      event.preventDefault();
      joinRoom();
    });
    el.joinButton.addEventListener('click', joinRoom);
    el.shuffleButton.addEventListener('click', () => {
      el.nameInput.value = suggestedName();
      updateNamePreview();
      el.nameError.textContent = '';
      el.nameInput.focus();
    });
    el.nameInput.addEventListener('input', () => {
      updateNamePreview();
      el.nameError.textContent = '';
    });
    el.nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        joinRoom();
      }
    });
    el.identityClose.addEventListener('click', () => el.identityDialog.close());
    el.identityDialog.addEventListener('cancel', (event) => {
      if (state.identityFirst) event.preventDefault();
    });
    el.identityDialog.addEventListener('click', (event) => {
      if (state.identityFirst || event.target !== el.identityDialog) return;
      el.identityDialog.close();
    });

    el.lightboxClose.addEventListener('click', closeLightbox);
    el.lightboxStage.addEventListener('click', closeLightbox);
    el.lightboxCopy.addEventListener('click', async () => {
      if (!state.lightboxFile) return;
      const copied = await copyText(`${location.origin}${fileUrl(state.lightboxFile)}`);
      showToast(copied ? 'Image link copied' : 'Could not copy link', { error: !copied });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!el.reactionPalette.hidden) {
        closeReactionPalette();
        return;
      }
      if (!el.lightbox.hidden) {
        closeLightbox();
        return;
      }
      if (state.sidebarOpen) {
        closeSidebar();
        return;
      }
      if (!el.peopleMenu.hidden) {
        el.peopleMenu.hidden = true;
        el.peopleButton.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateScrollButton();
    });

    window.addEventListener('beforeunload', () => {
      if (state.source) state.source.close();
    });
  }

  function init() {
    const host = location.host || 'localhost:4242';
    el.roomAddress.textContent = host;
    const hashRoom = new URLSearchParams(location.hash.replace(/^#/, '')).get('room');
    if (hashRoom && /^[a-zA-Z0-9-]{1,80}$/.test(hashRoom)) state.activeRoomId = hashRoom;
    applyProfile();
    updateNamePreview();
    renderPresence([]);
    renderTyping();
    updateWelcome();
    renderSidebar();
    renderRoomHeader();
    syncSidebarMode();
    updateDocumentTitle();
    setupEvents();
    autoResizeInput();
    updateSendButton();

    if (state.name) {
      setConnection('connecting');
      connect();
    } else {
      setConnection('idle');
      openIdentity(true);
    }
  }

  init();
})();
