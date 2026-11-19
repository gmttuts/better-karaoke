'use strict';

// Side panel (next to the video), karaoke overlay (on the video) and the
// floating lyric window (Document Picture-in-Picture). All of them live in
// shadow roots so YouTube's CSS can't reach in, and every piece of text from
// comments or websites goes in through textContent.
BYL.ui = (() => {
  const S = BYL.SOURCES;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // Material Symbols (outlined, 24px grid) used by the panel. Fixed strings,
  // so building them with innerHTML is safe.
  const ICONS = {"mic": "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z", "search": "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z", "more": "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z", "down": "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z", "up": "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z", "note": "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z", "speed": "M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z", "eq": "M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z", "minus": "M19 13H5v-2h14v2z", "plus": "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z", "tune": "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z", "check": "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z", "close": "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z", "edit": "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z", "history": "M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z", "pip": "M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z", "sync": "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z", "download": "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z", "star": "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z", "starB": "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z", "subt": "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z", "kbd": "M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z", "back": "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z", "video": "M21 3H3c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5a2 2 0 0 0-2-2zm0 14H3V5h18v12zm-5-6l-7 4V7z", "palette": "M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z", "pin": "M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z", "translate": "M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z", "refresh": "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z", "upload": "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z", "language": "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 0 1 5.08 16zm2.95-8H5.08a7.99 7.99 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"};
  ICONS.casino = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7.5 18c-.83 0-1.5-.67-1.5-1.5S6.67 15 7.5 15s1.5.67 1.5 1.5S8.33 18 7.5 18zm0-9C6.67 9 6 8.33 6 7.5S6.67 6 7.5 6 9 6.67 9 7.5 8.33 9 7.5 9zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 4.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6s1.5.67 1.5 1.5S17.33 9 16.5 9z';
  ICONS.shuffle = 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z';
  Object.assign(ICONS, {
    save: 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
    play: 'M8 5v14l11-7z',
    scan: 'M7 3H4v3H2V1h5v2zm15 3V1h-5v2h3v3h2zM7 21H4v-3H2v5h5v-2zm13-3v3h-3v2h5v-5h-2zM19 18c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v12zM15 8H9v2h6V8zm0 3H9v2h6v-2zm0 3H9v2h6v-2z',
    stop: 'M6 6h12v12H6z',
    swapH: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
    swapV: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
    timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    cloudUp: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z',
    target: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
    open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    arrUp: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
    arrDown: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  });
  ICONS.offset = 'M15 17v2h2v-2h2v-2h-2v-2h-2v2h-2v2h2zm5-15H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM5 5h6v2H5V5zm15 15H4L20 4v16z';
  ICONS.boxOff = 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z';
  ICONS.boxOn = 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
  // The panel's own words go without emoji (the icons are drawn); lyrics,
  // notes, video titles and the editor keep theirs.
  const EMOJI = /(?:\p{Extended_Pictographic}|[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF\u2600-\u26FF]|文A)\uFE0F?\s?/gu;
  const KEEP = '.lines, .note, .warn, .stale, .editor, .tapbar, .cmp, .klist, .kitem, .tile .sample';
  const deEmoji = (s) => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ');
  // A button whose label starts with a symbol gets the matching icon instead.
  const GLYPHS = [['💾', 'save'], ['🔠', 'scan'], ['▸', 'play'], ['▶', 'play'], ['■', 'stop'], ['⏹', 'stop'], ['↺', 'undo'], ['↻', 'refresh'],
    ['🔎', 'search'], ['🔍', 'search'], ['↑', 'arrUp'], ['↓', 'arrDown'], ['⇆', 'swapH'], ['⇅', 'swapV'], ['⏱', 'timer'], ['✏️', 'edit'], ['✏', 'edit'],
    ['✍', 'edit'], ['✎', 'edit'], ['📥', 'upload'], ['⬇', 'download'], ['☁', 'cloudUp'], ['🎯', 'target'], ['🌐', 'language'], ['📍', 'pin'], ['🎙', 'mic'],
    ['🎤', 'mic'], ['✕', 'close'], ['文A', 'translate'], ['🎲', 'shuffle'], ['🎨', 'palette'], ['📌', 'pin'], ['⧉', 'pip'], ['🕘', 'history'], ['📋', 'copy'], ['⏵', 'play'], ['↶', 'undo'], ['⬆', 'upload'], ['🗑', 'close'], ['🔄', 'refresh'], ['⇐', 'back'], ['✓', 'check'], ['🎚', 'tune'], ['⏩', 'speed'], ['♭', 'minus'], ['♯', 'plus'], ['★', 'star'], ['☆', 'starB'], ['🔤', 'translate']];
  function iconify(t) {
    const b = t.parentElement;
    if (!b || b.tagName !== 'BUTTON' || b.firstChild !== t || b.classList.contains('chip')) return;
    const v = t.nodeValue.replace(/^\s+/, '');
    const g = GLYPHS.find(([x]) => v.startsWith(x));
    if (!g) return;
    t.nodeValue = v.slice(g[0].length).replace(/^\uFE0F?\s*/, '');
    b.insertBefore(ico(g[1], 18), t);
    b.classList.add('wi');
    if (!t.nodeValue.trim() && !b.getAttribute('aria-label')) b.setAttribute('aria-label', b.title || g[1]);
  }
  // Inside lyrics, notes and the editor only the controls are cleaned.
  const CONTROLS = 'button, option, label, .chead b, .ccols span, h3, h4';
  function cleanText(root) {
    const scan = (n) => {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (!p || p.closest('svg, textarea, .mirror')) return;
        iconify(n);
        if (p.closest(KEEP) && !p.closest(CONTROLS)) return;
        const t = n.nodeValue;
        const c = deEmoji(t);
        if (c !== t && c.trim()) n.nodeValue = /^\s/.test(t) && !/^\s/.test(c) ? ' ' + c : c;
        return;
      }
      if (n.nodeType === 11) return n.childNodes.forEach(scan);
      if (n.nodeType === 1) {
        if (n.tagName === 'STYLE') return;
        if (n.tagName === 'OPTGROUP' && n.label) n.label = deEmoji(n.label).trim();
        if (n.placeholder) n.placeholder = deEmoji(n.placeholder).trim();
        n.childNodes.forEach(scan);
      }
    };
    scan(root);
  }
  const ico = (name, size = 20) => {
    const s = el('span', 'ico');
    s.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
    return s;
  };

  const state = {
    videoId: null,
    song: null,
    channel: '', // channel name, for styles pinned to a channel (📌)
    duration: 0,
    candidates: [],
    current: null,
    manual: false,
    offset: 0,
    anchor: null, // plain lyrics: { i, time } the user tapped
    // Timed lyrics: per-candidate sync points [{ t, d, auto? }]. A line at
    // lyric time t plays at t + offset + d, with d interpolated between points,
    // so one part of the song can be fixed without throwing off the rest.
    warps: {},
    trans: null, // candidate shown as a second language under each line
    transMap: null, // cache: { c, m: { lineIndex: text } }
    sourceStatus: {},
    sourceCount: {},
    overlayOn: false,
    karaokeLoadedFor: null,
    lastActive: -2,
    userScrollUntil: 0,
  };

  let panelHost;
  const P = {}; // panel element refs, filled in by buildPanel
  let O = null; // renderer on the video
  let F = null; // renderer in the floating window
  let pipWin = null;

  const PANEL_CSS = BYL.PANEL_CSS;
  const { BASE_LOOK, PAD_KEYS, padOf, FONTS, loadFont, compose, OVERLAY_CSS, paintLook } = BYL.look;

  // The look in use comes from a slot: the channel's own one when the user
  // pinned a style to this channel (📌), else the global one.
  // slot = { style, look } where look holds the 🎨 edits (or null).
  const chanSlot = () => (state.channel && BYL.settings.value.channelStyles?.[state.channel]) || null;
  const slot = () => chanSlot() || { style: BYL.settings.value.overlayStyle, look: BYL.settings.value.overlayLook };
  const currentLook = () => compose(slot().style, slot().look);
  // Change the slot in use. persist: false only updates memory (sliders).
  function setSlot(patch, persist = true) {
    const ch = chanSlot();
    if (ch) {
      const all = { ...BYL.settings.value.channelStyles, [state.channel]: { ...ch, ...patch } };
      if (!persist) return void (BYL.settings.value.channelStyles = all);
      return BYL.settings.set({ channelStyles: all });
    }
    const g = {};
    if ('style' in patch) g.overlayStyle = patch.style;
    if ('look' in patch) g.overlayLook = patch.look;
    if (!persist) return void Object.assign(BYL.settings.value, g);
    return BYL.settings.set(g);
  }

  // ---------- mounting ----------

  const waitFor = (sel, timeout = 15000) =>
    new Promise((resolve) => {
      const found = document.querySelector(sel);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const n = document.querySelector(sel);
        if (n) {
          obs.disconnect();
          resolve(n);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(sel));
      }, timeout);
    });

  // The panel's typeface: Google Sans Flex (bundled, OFL), loaded from bytes
  // through FontFace so YouTube's CSP doesn't apply.
  let uiFont = null;
  function loadUiFont() {
    if (uiFont) return;
    const files = [
      ['gsf-latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
      ['gsf-latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'],
      ['gsf-vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'],
    ];
    uiFont = Promise.all(
      files.map(async ([f, range]) => {
        const buf = await fetch(chrome.runtime.getURL(`fonts/${f}.woff2`)).then((r) => r.arrayBuffer());
        document.fonts.add(await new FontFace('BYL Sans', buf, { weight: '400 700', unicodeRange: range }).load());
      })
    ).catch((err) => console.debug('[Better Karaoke] ui font', err));
  }

  async function mount() {
    loadUiFont();
    const shorts = BYL.isShorts();
    const parent = shorts
      ? (await waitFor('#shorts-player')) && document.body
      : (await waitFor('#secondary')) && (document.querySelector('#secondary-inner') || document.querySelector('#secondary'));
    if (!parent) return false;
    if (!panelHost) buildPanel();
    panelHost.toggleAttribute('data-float', shorts);
    // A clear gap under the panel: YouTube's own CSS on the side column (or a
    // negative margin on what follows) can't eat it.
    panelHost.style.setProperty('margin', shorts ? '0' : '0 0 32px', 'important');
    if (!document.getElementById('byl-gap-style')) {
      const css = el('style');
      css.id = 'byl-gap-style';
      css.textContent = '#byl-panel-host:not([data-float]) + * { margin-top: 0 !important; }';
      document.head.append(css);
    }
    if (shorts) {
      if (panelHost.parentElement !== parent) parent.append(panelHost);
      placeFloat();
    } else {
      panelHost.style.left = panelHost.style.right = panelHost.style.width = '';
      if (panelHost.parentElement !== parent) parent.prepend(panelHost);
    }
    panelHost.hidden = false;
    startLoop();
    return true;
  }

  // A playlist or Mix, chat or another panel YouTube adds to the side column
  // can land above the lyrics: put them back at the top of the column. Only
  // moved when something really is above, so the lyrics keep their scroll.
  function keepOnTop() {
    if (!panelHost?.isConnected || panelHost.hasAttribute('data-float')) return;
    const parent = panelHost.parentElement;
    if (parent.firstElementChild !== panelHost) return parent.prepend(panelHost);
    const col = document.querySelector('#secondary');
    if (!col || col === parent || !col.contains(parent) || col.firstElementChild === panelHost) return;
    // Something in the column outside our box shows above us.
    const above = [...col.children].some((c) => !c.contains(panelHost) && c.offsetHeight && c.getBoundingClientRect().top < panelHost.getBoundingClientRect().top);
    if (above) col.prepend(panelHost);
  }

  // Shorts: sit right of the video's action buttons when there's room,
  // otherwise in the top-right corner.
  function placeFloat() {
    if (!panelHost?.hasAttribute('data-float')) return;
    const r = BYL.playerEl()?.getBoundingClientRect();
    const left = r && r.width ? r.right + 88 : 0;
    const room = window.innerWidth - left - 16;
    const s = panelHost.style;
    if (left && room >= 300) {
      s.left = left + 'px';
      s.right = 'auto';
      s.width = Math.min(400, room) + 'px';
    } else {
      s.left = 'auto';
      s.right = '16px';
      s.width = '320px';
    }
  }
  window.addEventListener('resize', placeFloat);

  // YouTube sometimes rebuilds the side column and drops the panel with it,
  // which left the lyrics frozen on the video with no button to turn them off.
  async function remount() {
    if (!panelHost || panelHost.hidden || panelHost.isConnected || remounting) return;
    remounting = true;
    try {
      if (await mount()) setOverlay(state.overlayOn, false);
    } finally {
      remounting = false;
    }
  }
  let remounting = false;

  // After the extension is updated or reloaded, the copy already running in
  // an open tab can't reach chrome.* any more and keeps the old look. Say so
  // instead of letting it look like the update didn't work.
  function stale() {
    if (!P || P.wrap.querySelector('.stale')) return;
    const bar = el('div', 'stale');
    const go = el('button', 'primary', L('Tải lại trang'));
    go.addEventListener('click', () => location.reload());
    bar.append(el('span', '', L('🔄 Better Karaoke vừa được cập nhật. Tải lại trang để dùng bản mới.')), go);
    P.wrap.querySelector('.body').prepend(bar);
    P.wrap.classList.remove('collapsed');
  }

  function hide() {
    if (panelHost) panelHost.hidden = true;
    if (O) O.host.remove();
    playerBtn?.remove();
    if (pipWin) pipWin.close();
  }

  // A new interface language: build the panel again in it, in the same
  // place, with the same song, lyrics, chips and timing.
  function relang() {
    if (!panelHost) return;
    closeEditor({ ocr: true });
    endTap();
    const old = panelHost;
    const collapsed = P.wrap.classList.contains('collapsed');
    buildPanel();
    panelHost.hidden = old.hidden;
    panelHost.toggleAttribute('data-float', old.hasAttribute('data-float'));
    panelHost.style.cssText = old.style.cssText;
    if (old.isConnected) old.replaceWith(panelHost);
    P.wrap.classList.toggle('collapsed', collapsed);
    applyTheme();
    if (state.song) setSong(state.song, state.duration, state.channel);
    for (const [k, st] of Object.entries(state.sourceStatus)) setSourceStatus(k, st, state.sourceCount[k]);
    renderSelect();
    renderLines();
    P.offLabel.textContent = fmtOffset(state.offset);
    showPins();
    markChips();
    state.karaokeLoadedFor = null;
    state.lastActive = -2;
    setOverlay(state.overlayOn, false);
    paintFx();
  }

  // ---------- panel ----------

  function buildPanel() {
    panelHost = el('div');
    panelHost.id = 'byl-panel-host';
    const root = panelHost.attachShadow({ mode: 'open' });
    // Typing in our inputs must not reach YouTube's hotkeys (t = theatre,
    // k = pause, m = mute…): from outside the shadow root the key looks like
    // it was pressed on a plain div, so YouTube treats it as a shortcut.
    for (const type of ['keydown', 'keypress', 'keyup']) {
      root.addEventListener(type, (e) => {
        const t = e.composedPath()[0];
        if (t?.matches?.('input[type=text], textarea, [contenteditable]')) e.stopPropagation();
      });
    }
    const style = el('style');
    style.textContent = PANEL_CSS;
    root.append(style);

    const wrap = el('div', 'byl');
    const header = el('header');
    const song = el('div', 'song');
    const songTitle = el('b', '', 'Better Karaoke');
    const songArtist = el('span', '', L('Đang tìm lời bài hát…'));
    song.append(songTitle, songArtist);
    const favBtn = el('button', 'fav', '☆');
    favBtn.title = L('Thêm vào bài yêu thích (xem ở tab "Đã xem")');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = true;
      if (!state.videoId) return;
      const on = !favBtn.classList.contains('on');
      paintFav(on);
      BYL.history.setFav(state.videoId, on);
    });
    // 🌐 Interface language, at the top, changed on the spot (main.js
    // rebuilds the panel).
    const lang = el('span', 'lang');
    lang.append(ico('language', 20), el('span', 'mt', BYL.LANGS.find(([c]) => c === BYL.lang)?.[1] || BYL.lang.toUpperCase()));
    const langSel = el('select');
    langSel.title = 'Language · ' + (BYL.LANGS.find(([c]) => c === BYL.lang)?.[1] || '');
    langSel.append(new Option('Auto (GMT+7 → Tiếng Việt, other → English)', 'auto'), ...BYL.LANGS.map(([c, n]) => new Option(n, c)));
    langSel.value = BYL.settings.value.uiLang || 'auto';
    lang.append(langSel);
    lang.addEventListener('click', (e) => e.stopPropagation());
    langSel.addEventListener('change', () => BYL.settings.set({ uiLang: langSel.value }));
    // 🎤 Karaoke on the video: one switch at the top, whatever the mode.
    const overlayBtn = el('button', 'lytg');
    overlayBtn.append(ico('subt', 22));
    overlayBtn.title = L('Hiện lời chữ to trên video (dùng được cả khi toàn màn hình)') + ' (Alt L)';
    overlayBtn.setAttribute('role', 'switch');
    // The same switch in the header, for when the panel is folded.
    const overlayBtnH = el('button', 'lytg head');
    overlayBtnH.append(ico('subt', 22));
    overlayBtnH.title = overlayBtn.title;
    overlayBtnH.setAttribute('role', 'switch');
    const menuBtn = el('button', 'iconbtn more');
    menuBtn.append(ico('more', 22));
    menuBtn.title = L('Thêm');
    const logo = el('img', 'logo');
    logo.src = chrome.runtime.getURL('icons/icon48.png');
    logo.alt = '';
    // Thu gọn / Mở: the whole header folds the panel, this says so.
    const fold = el('button', 'iconbtn fold');
    fold.title = L('Thu gọn hoặc mở panel (bấm vào thanh tiêu đề cũng được)');
    const ft = el('span', 'ft');
    ft.dataset.open = L('Thu gọn');
    ft.dataset.closed = L('Mở');
    fold.append(ico('down', 22));
    void ft;
    // First time here: point at the 🎤 Karaoke switch, until it's used once.
    const khint = el('div', 'khint');
    const khintX = el('button', '', '✕');
    khintX.title = L('Đã hiểu');
    khint.append(el('span', '', L('👇 Bật nút này để lời hiện to trên video')), khintX);
    khint.hidden = !!BYL.settings.value.karaokeHintDone || !!BYL.settings.value.karaokeAuto;
    khintX.addEventListener('click', (e) => {
      e.stopPropagation();
      khint.hidden = true;
      BYL.settings.set({ karaokeHintDone: true });
    });
    header.title = 'Better Karaoke v' + chrome.runtime.getManifest().version;

    const body = el('div', 'body');
    // Hát / Chỉnh lời: each mode shows only the rows for it (data-m on the
    // row); the lyrics, chips and notes are in both. 🎬 Karaoke puts the list
    // of karaoke videos in place of the lyrics.
    const nav = el('nav');
    const MODES = [
      ['sing', L('🎤 Hát')],
      ['edit', L('✏️ Chỉnh lời')],
      ['karaoke', '🎬 Karaoke'],
    ];
    const modeBtns = MODES.map(([m, t]) => {
      const b = el('button', '', t);
      b.dataset.mode = m;
      b.addEventListener('click', () => setMode(m, true));
      return b;
    });
    nav.append(...modeBtns);

    // Lyric tab
    const lyricTab = el('div');
    const status = el('div', 'status');
    const picks = el('div', 'picks');
    picks.hidden = true;
    // Which of the found lyrics is shown (all results of all sources).
    const row1 = el('div', 'row');
    row1.dataset.m = 'edit';
    const select = el('select', 'src');
    row1.append(el('span', 'muted', L('Lời')), select);
    const pipBtn = el('button', '', L('⧉ Cửa sổ nổi'));
    pipBtn.title = L('Mở lời trong một cửa sổ nhỏ luôn nằm trên cùng, kéo đi đâu cũng được (kể cả khi chuyển tab)');
    const rowS = el('div', 'row');
    rowS.dataset.m = 'sing';
    const scoreBtn = el('button', 'mic', L('🎙 Bật mic để hát'));
    scoreBtn.title = L('Bật micro, hát theo và được chấm điểm từng dòng (nên đeo tai nghe)');
    scoreBtn.addEventListener('click', () => BYL.score.open());
    rowS.append(scoreBtn, pipBtn);

    // 🎚 key and 🎤 vocal cut of the video's sound (audiofx.js).
    const rowK = el('div', 'row fx');
    rowK.dataset.m = 'sing';
    const keyDown = el('button', '', L('♭ Hạ tông'));
    const keyLabel = el('span', 'off', '0');
    const keyUp = el('button', '', L('♯ Nâng tông'));
    keyDown.title = L('Hạ tông nửa cung (Alt ↓)');
    keyUp.title = L('Nâng tông nửa cung (Alt ↑)');
    keyLabel.title = L('Bấm để về tông gốc');
    const vocalBtn = el('button', '', L('Bật lọc giọng'));
    vocalBtn.title = L('Giảm giọng ca sĩ để bạn tự hát, như nút lọc giọng của đầu karaoke (Alt V). Tuỳ bài, thường vẫn còn nghe vang nhẹ.');
    const vocalAmt = el('input');
    vocalAmt.type = 'range';
    vocalAmt.min = '30';
    vocalAmt.max = '100';
    vocalAmt.value = '100';
    vocalAmt.title = L('Mức lọc giọng');
    vocalAmt.hidden = true;
    rowK.append(el('span', 'muted', L('🎚 Tông')), keyDown, keyLabel, keyUp);
    // 🎤 its own row: what it does, on / off, how much.
    const rowV = el('div', 'row fx');
    rowV.dataset.m = 'sing';
    rowV.append(el('span', 'muted', L('🎤 Lọc giọng')), vocalBtn, vocalAmt);
    // ⏩ The video's speed; the lyrics follow the video's clock.
    const rowSp = el('div', 'row fx speed');
    rowSp.dataset.m = 'sing';
    rowSp.title = L('Tốc độ phát, lời chạy theo');
    rowSp.append(el('span', 'muted', L('⏩ Tốc độ')));
    // Like YouTube's own: 0.25× to 3×, dragged or nudged by 0.05, with the usual steps a tap away.
    const setRate = (r) => {
      const v = video();
      speedUntil = 0; // the user's choice, kept
      if (v) v.playbackRate = Math.round(Math.min(3, Math.max(0.25, r)) * 100) / 100;
      paintSpeed();
    };
    const speedDown = el('button', 'round', '−');
    speedDown.title = L('Chậm lại');
    const speedRange = el('input');
    speedRange.type = 'range';
    speedRange.min = '0.25';
    speedRange.max = '3';
    speedRange.step = '0.05';
    speedRange.value = '1';
    speedRange.title = L('Tốc độ phát, lời chạy theo');
    const speedUp = el('button', 'round', '+');
    speedUp.title = L('Nhanh lên');
    const speedLabel = el('span', 'off', '1×');
    speedLabel.title = L('Bấm để về tốc độ thường');
    speedDown.addEventListener('click', () => setRate((video()?.playbackRate || 1) - 0.05));
    speedUp.addEventListener('click', () => setRate((video()?.playbackRate || 1) + 0.05));
    speedRange.addEventListener('input', () => setRate(Number(speedRange.value)));
    speedLabel.addEventListener('click', () => setRate(1));
    rowSp.append(speedDown, speedRange, speedUp, speedLabel);
    const rowSp2 = el('div', 'row fx speed steps');
    rowSp2.dataset.m = 'sing';
    const speedBtns = [0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => {
      const b = el('button', '', String(r).replace('.', BYL.lang === 'vi' ? ',' : '.') + '×');
      b.dataset.rate = r;
      b.addEventListener('click', () => setRate(r));
      rowSp2.append(b);
      return b;
    });
    keyDown.addEventListener('click', () => setKey(BYL.fx.semis - 1, true));
    keyUp.addEventListener('click', () => setKey(BYL.fx.semis + 1, true));
    keyLabel.addEventListener('click', () => setKey(0, true));
    vocalBtn.addEventListener('click', () => setVocal(BYL.fx.vocal > 0 ? 0 : Number(vocalAmt.value) / 100));
    vocalAmt.addEventListener('input', () => setVocal(Number(vocalAmt.value) / 100));

    const rowT = el('div', 'row');
    rowT.dataset.m = 'sing';
    const transSel = el('select');
    transSel.title = L('Hiện thêm một bản lời khác (thường là lời dịch) dưới mỗi dòng');
    const swapBtn = el('button', '', '⇅');
    swapBtn.title = L('Đổi chỗ lời chính và lời dịch');
    rowT.append(el('span', 'muted', L('🌐 Song ngữ')), transSel, swapBtn);
    // 文A Dịch lời: its own row near the top of 🎤 Hát (with 🌐 Song ngữ, which
    // shows the translation under each line), so it is easy to find.
    const rowTr = el('div', 'row tr');
    rowTr.dataset.m = 'sing';
    const trBtn = el('button', '', L('文A Dịch lời').replace(/^文A\s*/, ''));
    trBtn.title = L('Dịch lời đang hiện sang ngôn ngữ đã chọn, giữ đúng giờ từng dòng. Bản dịch hiện dưới lời chính và được lưu thành bản lời thứ 2 của bạn. Lời được gửi tới Google Dịch.');
    const trLang = el('select');
    trLang.title = L('Dịch sang ngôn ngữ nào');
    // "Không" turns the translation off.
    const trOff = el('option', '', L('Không'));
    trOff.value = '';
    trLang.append(trOff);
    for (const [code, name] of BYL.translate.TARGETS) {
      const o = el('option', '', name);
      o.value = code;
      trLang.append(o);
    }
    trLang.value = BYL.translate.defaultLang(BYL.settings.value.transLang);
    trBtn.className = 'tonal';
    // ⇅ puts the translation in the lyrics' place, and back.
    const trSwap = el('button', 'iconbtn trswap');
    trSwap.append(ico('swapV', 20));
    trSwap.title = L('Đổi chỗ lời chính và lời dịch');
    trSwap.setAttribute('aria-label', trSwap.title);
    rowTr.append(el('span', 'muted lbl', L('Dịch sang')), trLang, trBtn, trSwap);

    const row2 = el('div', 'row');
    row2.dataset.m = 'edit';
    // 🎯 and "Lệch" belong to lining lyrics up with the captions: hidden
    // from the start unless that setting is on.
    row2.hidden = !BYL.settings.value.captionSync;
    const syncBtn = el('button', 'sync', L('🎯 Tự canh theo phụ đề'));
    syncBtn.title = L('Khớp lời với phụ đề YouTube. Đang hát mà lời lệch thì bấm lại: canh lại đúng đoạn đang hát');
    const minus = el('button', '', '−0.5s');
    const offLabel = el('span', 'off', '0.0s');
    const plus = el('button', '', '+0.5s');
    minus.title = L('Lời hiện sớm hơn (giữ Shift: 0.1s)');
    plus.title = L('Lời hiện muộn hơn (giữ Shift: 0.1s)');
    offLabel.title = L('Bấm để đưa về 0 và bỏ các mốc 📍');
    const offWrap = el('span', 'offwrap');
    const pinCount = el('span', 'muted', '');
    offWrap.append(pinCount, el('span', 'muted', L('Lệch')), minus, offLabel, plus);
    row2.append(syncBtn, offWrap);

    const row3 = el('div', 'row lookrow');
    row3.dataset.m = 'edit';
    const lookSel = el('select', 'look');
    lookSel.title = L('Kiểu chữ trên video và cửa sổ nổi');
    const fontDown = el('button', '', 'A−');
    const fontUp = el('button', '', 'A+');
    fontDown.title = fontUp.title = L('Cỡ chữ');
    // ⬆ / ⬇: where the lyrics sit on the video; the one in use is lit.
    const posBtn = el('div', 'seg pos');
    posBtn.title = L('Đặt lời ở trên hoặc dưới video (tránh che chữ có sẵn trong video)');
    for (const [where, text] of [['top', 'up'], ['bottom', 'down']]) {
      const b = el('button');
      b.append(ico(text, 18));
      b.dataset.pos = where;
      b.title = where === 'top' ? L('⬆ Trên') : L('⬇ Dưới');
      b.addEventListener('click', () => {
        BYL.settings.set({ overlayPosition: where });
        refreshLook();
      });
      posBtn.append(b);
    }
    const studioBtn = el('button', 'iconbtn');
    studioBtn.append(ico('palette', 20));
    studioBtn.title = L('Tuỳ chỉnh màu, phông, viền, nền… và lưu thành preset');
    const chanBtn = el('button', 'iconbtn chan');
    chanBtn.append(ico('pin', 20));
    row3.append(el('span', 'muted', L('Kiểu chữ')), lookSel, fontDown, fontUp, posBtn, studioBtn, chanBtn);

    const studio = el('div', 'studio');
    studio.dataset.m = 'edit';
    studio.hidden = true;

    const row4 = el('div', 'row links');
    row4.dataset.m = 'edit';
    const copy = el('button', '', L('Sao chép'));
    const open = el('a', 'muted', L('Mở nguồn ↗'));
    open.target = '_blank';
    open.rel = 'noopener';
    const editBtn = el('button', '', L('✏️ Sửa lời'));
    editBtn.title = L('Sửa lời đang hiện, hoặc tự nhập / dịch lời. Bản sửa được nhớ cho video này.');
    const tapBtn = el('button', '', L('⏱ Gõ nhịp'));
    tapBtn.title = L('Phát bài và bấm Space mỗi khi bắt đầu hát một dòng: ghi thời gian chính xác cho từng dòng');
    const againBtn = el('button', '', L('↻ Tìm lại'));
    againBtn.title = L('Kết quả tìm được lưu lại để mở video nhanh hơn. Bấm để tìm lại từ đầu ở mọi nguồn.');
    againBtn.addEventListener('click', () => api.onSearchAgain?.());
    const findBtn = el('button', '', L('🔍 Tìm theo tên'));
    findBtn.title = L('Tên bài hoặc ca sĩ bị đoán sai? Tự gõ lại rồi tìm');
    const exportBtn = el('button', '', L('⬇ Xuất'));
    exportBtn.title = L('Lưu lời ra file .lrc / .srt (giữ thời gian bạn đã canh), hoặc gửi lên LRCLIB');
    // 📥 Timed lyrics from a file someone shared (.lrc / .srt / .ass), or
    // dropped onto the panel.
    const importBtn = el('button', '', L('📥 Nhập file'));
    importBtn.title = L('Nạp lời có thời gian từ file .lrc, .srt hoặc .ass (ví dụ file người khác xuất từ Better Karaoke). Kéo thả file vào panel cũng được.');
    const importPick = el('input');
    importPick.type = 'file';
    importPick.accept = '.lrc,.srt,.vtt,.ass,.ssa,.txt';
    importPick.hidden = true;
    importBtn.addEventListener('click', () => importPick.click());
    importPick.addEventListener('change', () => {
      importFile(importPick.files[0]);
      importPick.value = '';
    });
    // ⇆ the playing lyrics against another version, editable; ↺ drop the user's own edit.
    const cmpBtn = el('button', '', L('⇆ So sánh'));
    cmpBtn.title = L('So sánh bản đang phát với một bản khác, sửa ngay trên đó');
    cmpBtn.addEventListener('click', () => openCompare());
    const resetBtn = el('button', '', L('↺ Về bản gốc'));
    resetBtn.title = L('Bỏ bản bạn đã sửa cho video này và quay về lời tìm được');
    resetBtn.hidden = true;
    resetBtn.addEventListener('click', () => resetCustom());
    row4.append(editBtn, tapBtn, cmpBtn, resetBtn, copy, exportBtn, importBtn, importPick, open);
    // ↻ searches every source again: it sits over the sources' chips.
    const srcHead = el('div', 'srchead');
    // ★ the version the user calls the right one: it opens with the video next time.
    const starBtn = el('button', 'star', '');
    starBtn.hidden = true;
    starBtn.addEventListener('click', () => toggleStar());
    srcHead.append(el('span', 'muted', L('Nguồn lời')), starBtn, againBtn);

    // Manual search: the title/artist typed here replace the guess from the
    // video title, are remembered for this video, and every source runs again.
    const findRow = el('form', 'row findrow');
    findRow.hidden = true;
    const fTitle = el('input');
    const fArtist = el('input');
    fTitle.type = fArtist.type = 'text';
    fTitle.placeholder = L('Tên bài');
    fArtist.placeholder = L('Ca sĩ');
    fTitle.maxLength = fArtist.maxLength = 120;
    const fGo = el('button', 'primary', L('Tìm'));
    fGo.type = 'submit';
    const fUndo = el('button', '', L('Dùng tên tự đoán'));
    fUndo.type = 'button';
    findRow.append(fTitle, fArtist, fGo, fUndo);
    const openFind = () => {
      findRow.hidden = !findRow.hidden;
      findBtn.classList.toggle('on', !findRow.hidden);
      if (findRow.hidden) return;
      fTitle.value = state.song?.title || '';
      fArtist.value = state.song?.artist || '';
      fUndo.hidden = !state.song?.manual;
      fTitle.focus();
    };
    findBtn.addEventListener('click', openFind);
    findRow.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = fTitle.value.trim();
      if (!title) return fTitle.focus();
      findRow.hidden = true;
      findBtn.classList.remove('on');
      api.onSearchSong?.({ title, artist: fArtist.value.trim() });
    });
    fUndo.addEventListener('click', () => {
      findRow.hidden = true;
      findBtn.classList.remove('on');
      api.onSearchSong?.(null);
    });

    const exportRow = el('div', 'row exports');
    exportRow.dataset.m = 'edit';
    exportRow.hidden = true;
    const lrcBtn = el('button', '', '⬇ File LRC');
    lrcBtn.title = L('Lời có thời gian cho trình phát nhạc (foobar, VLC, Poweramp…)');
    const srtBtn = el('button', '', '⬇ File SRT');
    srtBtn.title = L('Phụ đề cho video (VLC, CapCut, Premiere, tải lên YouTube Studio…)');
    const assBtn = el('button', '', '⬇ File ASS');
    assBtn.title = L('Phụ đề karaoke giữ đúng kiểu chữ 🎨 (màu, viền, khung, chữ chạy). Dùng với VLC, CapCut, Aegisub hoặc ffmpeg để ghép cứng vào video của bạn.');
    const pubBtn = el('button', '', L('☁ Gửi lên LRCLIB'));
    pubBtn.title = L('Chia sẻ lời có thời gian lên thư viện mở LRCLIB để người khác dùng. Sẽ hỏi lại trước khi gửi.');
    exportRow.append(el('span', 'muted', L('Xuất lời')), lrcBtn, srtBtn, assBtn, pubBtn);
    exportBtn.addEventListener('click', () => {
      exportRow.hidden = !exportRow.hidden;
      exportBtn.classList.toggle('on', !exportRow.hidden);
    });
    lrcBtn.addEventListener('click', () => exportFile('lrc'));
    srtBtn.addEventListener('click', () => exportFile('srt'));
    assBtn.addEventListener('click', () => exportFile('ass'));
    pubBtn.addEventListener('click', publishLrclib);

    const tapbar = el('div', 'tapbar');
    tapbar.hidden = true;

    const editor = el('div', 'editor');
    editor.hidden = true;

    const warn = el('div', 'warn');
    const note = el('div', 'note');
    const lines = el('div', 'lines');
    const grip = el('div', 'grip');
    grip.title = L('Kéo để thu gọn / mở rộng khung lời (nháy đúp để về mặc định)');
    void srcHead;
    makeResizable(lines, grip);

    // Pages opened from ⋯, over the lyrics, with a way back.
    const pageHead = (title) => {
      const h = el('div', 'row page');
      const back = el('button', '', '← ' + L('Quay lại'));
      back.addEventListener('click', () => showPage(null));
      h.append(back, el('b', '', title));
      return h;
    };
    // 🎬 Karaoke mode
    const karaokeTab = el('div', 'ktab');
    karaokeTab.hidden = true;
    const kchips = el('div', 'row kchips');
    const klist = el('div', 'klist');
    karaokeTab.append(kchips, klist);

    // History tab
    const historyTab = el('div', 'ktab');
    historyTab.hidden = true;
    const hFilter = el('div', 'row kchips');
    const hAll = el('button', 'on', L('Tất cả'));
    const hFav = el('button', '', L('★ Yêu thích'));
    const hClear = el('button', 'danger', L('Xoá lịch sử'));
    hClear.title = L('Xoá các bài đã xem, giữ lại bài yêu thích');
    hFilter.append(hAll, hFav, hClear);
    const hlist = el('div', 'klist');
    historyTab.append(pageHead('🕘 ' + L('Đã xem')), hFilter, hlist);
    hAll.addEventListener('click', () => ((state.favOnly = false), renderHistory()));
    hFav.addEventListener('click', () => ((state.favOnly = true), renderHistory()));
    hClear.addEventListener('click', async () => {
      await BYL.history.clear();
      renderHistory();
    });

    const menu = el('div', 'menu');
    menu.hidden = true;
    const item = (text, fn) => {
      const b = el('button', '', text);
      b.addEventListener('click', () => ((menu.hidden = true), fn()));
      return b;
    };
    findBtn.addEventListener('click', () => (menu.hidden = true));
    // Whether 🎤 Karaoke comes on by itself for each video (off at first);
    // the switch at the top only covers the video being watched.
    const autoBtn = item('', () => BYL.settings.set({ karaokeAuto: !BYL.settings.value.karaokeAuto }).then(paintAuto));
    // (menu items: see the layout block below)
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener('click', (e) => e.stopPropagation());
    root.addEventListener('click', (e) => {
      if (!menu.hidden && !e.composedPath().includes(menu)) menu.hidden = true;
      if (!picks.hidden && !e.composedPath().some((n) => n === picks || n?.classList?.contains?.('chip'))) picks.hidden = true;
    });

    body.append(nav, lyricTab, karaokeTab, historyTab);
    wrap.addEventListener('dragover', (e) => {
      if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
      e.preventDefault();
      wrap.classList.add('drop');
    });
    wrap.addEventListener('dragleave', (e) => {
      if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('drop');
    });
    wrap.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      wrap.classList.remove('drop');
      if (!file) return;
      e.preventDefault();
      importFile(file);
    });
    // ---------- v3 layout ----------
    // Header: song · Karaoke versions · ⋯ · fold. Body: lyrics on the left,
    // sources on the right (a bar over the lyrics when the column is narrow).
    // Dock: Hát cùng (singing tools) · lyrics on the video · ⚙. Speed, vocal
    // cut, sync and settings open as popovers over the panel.
    const back = el('button', 'iconbtn back');
    back.append(ico('back', 22));
    back.title = L('Quay lại');
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!historyTab.hidden) showPage(null);
      else setMode('sing', true);
    });
    const avatar = el('div', 'avatar');
    avatar.append(logo);
    const karaBtn = el('button', 'outline kara');
    karaBtn.append(ico('search', 18), el('span', '', 'Karaoke'));
    karaBtn.title = '🎬 Karaoke';
    karaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('karaoke', true);
    });
    // Folded panel: the header's own switch for the lyrics on the video
    // (it must not fold / unfold the panel as well).
    overlayBtnH.addEventListener('click', (e) => {
      e.stopPropagation();
      setOverlay(!state.overlayOn, true);
    });
    header.append(back, avatar, song, karaBtn, overlayBtnH, menuBtn, fold);

    // Sources column
    const side = el('div', 'side');
    const sideHead = el('div', 'colhead');
    const syncIcon = el('button', 'iconbtn syncbtn');
    syncIcon.append(ico('tune', 20));
    syncIcon.setAttribute('aria-haspopup', 'dialog');
    // ↻ search every source again, next to the timing (offset) button.
    const againIcon = el('button', 'iconbtn again');
    againIcon.append(ico('refresh', 20));
    againIcon.title = againBtn.title;
    againIcon.setAttribute('aria-label', L('↻ Tìm lại').replace(/^↻\s*/, ''));
    againIcon.addEventListener('click', (e) => (e.stopPropagation(), api.onSearchAgain?.()));
    sideHead.append(el('span', 'ct', L('Nguồn')), againIcon, syncIcon);
    const trRow = el('div', 'trrow');
    const transChip = el('button', 'chip2 trchip');
    transChip.title = L('Hiện thêm một bản lời khác (thường là lời dịch) dưới mỗi dòng');
    trRow.append(el('span', 'muted', L('🌐 Song ngữ')), transChip);
    side.append(sideHead, status, trRow);
    const main = el('div', 'main');
    // ⧉ Floating window, top right of the lyrics, shown while the pointer is over them.
    const lwrap = el('div', 'lwrap');
    const pipFab = el('button', 'iconbtn pipfab');
    pipFab.append(ico('pip', 20));
    pipFab.title = pipBtn.title + ' (Alt P)';
    pipFab.setAttribute('aria-label', pipFab.title);
    pipFab.hidden = !('documentPictureInPicture' in window);
    pipFab.addEventListener('click', (e) => (e.stopPropagation(), togglePip()));
    lwrap.append(pipFab, lines, grip);
    main.append(findRow, row1, row4, exportRow, warn, note, editor, tapbar, lwrap);
    lyricTab.className = 'cols';
    lyricTab.append(main, side);

    // Rows that moved into popovers show in every view (no data-m).
    for (const r of [rowK, rowV, rowSp, rowSp2, rowS, rowT, rowTr, row2, row3, studio]) delete r.dataset.m;
    // Popovers
    const pop = (cls, label) => {
      const p = el('div', 'pop ' + cls);
      p.hidden = true;
      p.setAttribute('role', 'dialog');
      if (label) p.setAttribute('aria-label', label);
      p.addEventListener('click', (e) => e.stopPropagation());
      return p;
    };
    picks.className = 'pop picks';
    picks.addEventListener('click', (e) => e.stopPropagation());
    // Speed
    const popSpeed = pop('speedpop', L('⏩ Tốc độ'));
    popSpeed.append(el('h4', '', L('⏩ Tốc độ')), rowSp, rowSp2);
    // Vocal cut
    const popVocal = pop('vocalpop', L('🎤 Lọc giọng'));
    popVocal.append(el('h4', '', L('🎤 Lọc giọng')), rowV);
    // Sync: whole-song offset, 📍 pins, 🎯 captions
    const popSync = pop('syncpop', L('Lệch'));
    const offVal = el('div', 'offval');
    offVal.append(offLabel, el('span', 'muted', 'Alt [ ]  ·  Shift 0.1s'));
    const offBtns = el('div', 'offbtns');
    const minus1 = el('button', 'outline', '−0.1s');
    const plus1 = el('button', 'outline', '+0.1s');
    minus.className = plus.className = 'outline';
    minus1.title = minus.title;
    plus1.title = plus.title;
    minus1.addEventListener('click', () => nudge(-0.1));
    plus1.addEventListener('click', () => nudge(0.1));
    offBtns.append(minus, minus1, plus1, plus);
    const pinList = el('div', 'pinlist');
    const syncReset = el('button', 'text', L('Bỏ chỉnh lệch và các mốc 📍'));
    syncReset.addEventListener('click', clearSync);
    popSync.append(el('h4', '', L('Lệch')), offVal, offBtns, pinCount, pinList, row2, syncReset);
    void offWrap;
    // Settings: Kiểu chữ · Dịch lời, one height, each tab scrolls inside.
    const popSet = pop('setpop', '⚙');
    const setTabs = el('div', 'tabs');
    const setBody = el('div', 'setbody');
    const gallery = el('div', 'gallery');
    // Styles only: the second language lives on the chip in the sources column.
    const SET_TABS = [['look', L('Kiểu chữ')]];
    const tabBtns = SET_TABS.map(([k, t]) => {
      const b = el('button', '', t);
      b.dataset.tab = k;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => showSetTab(k));
      return b;
    });
    setTabs.append(...tabBtns);
    setTabs.className = 'sethead';
    setTabs.replaceChildren(el('h4', '', L('Kiểu chữ')));
    popSet.append(setTabs, setBody);
    const showSetTab = (k) => {
      state.setTab = k;
      for (const b of tabBtns) {
        b.classList.toggle('on', b.dataset.tab === k);
        b.setAttribute('aria-selected', String(b.dataset.tab === k));
      }
      if (k === 'look') setBody.replaceChildren(gallery, row3, studio);
      else setBody.replaceChildren(rowT, rowTr);
      setBody.scrollTop = 0;
    };
    // Translation from the chip in the sources column
    const popTrans = pop('transpop', L('🌐 Song ngữ'));
    // Dock
    const dock = el('div', 'dock');
    const saBtn = el('button', 'sa');
    saBtn.setAttribute('role', 'switch');
    saBtn.append(el('span', 'sw'), el('span', '', L('Hát cùng')));
    saBtn.title = L('Hiện công cụ hát: tốc độ, lọc giọng, tông, mic');
    saBtn.addEventListener('click', () => BYL.settings.set({ singTools: !singOn() }).then(paintDock));
    const tools = el('div', 'tools');
    const speedChip = el('button', 'chip2');
    speedChip.title = rowSp.title;
    const vocalChip = el('button', 'chip2');
    vocalChip.title = vocalBtn.title;
    // 🎚 Key: a chip like the others; − / + in its popover.
    const keyStep = el('button', 'chip2 keychip');
    keyStep.title = keyUp.title + ' · ' + keyDown.title;
    const popKey = pop('keypop', L('🎚 Tông'));
    const keyRow = el('div', 'row stepper keyrow');
    keyRow.append(keyDown, keyLabel, keyUp);
    popKey.append(el('h4', '', L('🎚 Tông')), keyRow);
    scoreBtn.replaceChildren(ico('mic', 20), el('span', '', L('🎤 Hát').replace(/^🎤\s*/, '')));
    tools.append(speedChip, vocalChip, keyStep, el('span', 'grow'), scoreBtn);
    const setBtn = el('button', 'iconbtn setbtn');
    setBtn.append(ico('palette', 22));
    setBtn.title = L('Kiểu chữ');
    const editBtn2 = el('button', 'iconbtn editbtn');
    editBtn2.append(ico('edit', 22));
    editBtn2.title = L('✏️ Chỉnh lời').replace(/^✏️\s*/, '');
    editBtn2.setAttribute('aria-label', editBtn2.title);
    editBtn2.addEventListener('click', (e) => (e.stopPropagation(), setMode(wrap.dataset.mode === 'edit' ? 'sing' : 'edit', true)));
    dock.append(saBtn, tools, overlayBtn, setBtn, editBtn2, khint);

    // ⋯ menu
    const mi = (icon, text, fn, key) => {
      const b = el('button', 'mi');
      b.append(ico(icon, 20), el('span', 'mt', text));
      if (key) b.append(el('span', 'mk', key));
      b.addEventListener('click', () => ((menu.hidden = true), fn()));
      return b;
    };
    const menuSep = () => el('div', 'sep');
    findBtn.className = 'mi';
    findBtn.replaceChildren(ico('search', 20), el('span', 'mt', L('🔍 Tìm theo tên').replace(/^🔍\s*/, '')));
    favBtn.classList.add('mi');
    autoBtn.classList.add('mi');
    lang.classList.add('mi');
    menu.append(
      findBtn,
      mi('history', L('Đã xem'), () => showPage('history')),
      menuSep(),
      favBtn,
      autoBtn,
      lang
    );
    void pipBtn;

    // Popover plumbing: one open at a time, placed next to what opened it,
    // inside the panel (so it never covers the video).
    let shown = null;
    function placePop(p, anchor, where) {
      const w = wrap.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      p.style.maxHeight = Math.max(160, w.height - 16) + 'px';
      const pw = p.offsetWidth;
      const ph = p.offsetHeight;
      let x = a.right - w.left - pw;
      let y = where === 'above' ? a.top - w.top - ph - 8 : where === 'left' ? a.top - w.top - 8 : a.bottom - w.top + 6;
      if (where === 'left') x = a.left - w.left - pw - 8;
      if (x < 8) x = Math.min(8, w.width - pw - 8);
      x = Math.max(8, Math.min(x, w.width - pw - 8));
      y = Math.max(8, Math.min(y, w.height - ph - 8));
      p.style.left = x + 'px';
      p.style.top = y + 'px';
    }
    function openPop(p, anchor, where = 'above') {
      if (shown === p) return closePop();
      closePop();
      menu.hidden = true;
      shown = p;
      p._anchor = anchor;
      p._where = where;
      p.hidden = false;
      anchor.setAttribute('aria-expanded', 'true');
      if (p === popSet) {
        const w = wrap.getBoundingClientRect();
        p.style.width = Math.min(600, w.width - 16) + 'px';
        p.style.height = Math.min(440, w.height - 16) + 'px';
        showSetTab('look');
      }
      if (p === popTrans) popTrans.replaceChildren(el('h4', '', L('🌐 Song ngữ')), rowTr);
      placePop(p, anchor, where);
    }
    function closePop() {
      if (!shown) return;
      shown.hidden = true;
      shown._anchor?.setAttribute('aria-expanded', 'false');
      shown = null;
    }
    const repop = () => shown && !shown.hidden && placePop(shown, shown._anchor, shown._where);
    speedChip.addEventListener('click', (e) => (e.stopPropagation(), openPop(popSpeed, speedChip)));
    vocalChip.addEventListener('click', (e) => (e.stopPropagation(), openPop(popVocal, vocalChip)));
    keyStep.addEventListener('click', (e) => (e.stopPropagation(), openPop(popKey, keyStep)));
    syncIcon.addEventListener('click', (e) => (e.stopPropagation(), showPins(), openPop(popSync, syncIcon, wrap.classList.contains('wide') ? 'left' : 'below')));
    setBtn.addEventListener('click', (e) => (e.stopPropagation(), openPop(popSet, setBtn)));
    transChip.addEventListener('click', (e) => (e.stopPropagation(), openPop(popTrans, transChip, wrap.classList.contains('wide') ? 'left' : 'below')));
    root.addEventListener('click', (e) => {
      if (!shown) return;
      const path = e.composedPath();
      if (!path.includes(shown) && !path.includes(shown._anchor) && e.target.isConnected) closePop();
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (shown) return closePop();
      if (!menu.hidden) return (menu.hidden = true);
      if (!picks.hidden) return (picks.hidden = true);
    });
    // A click anywhere outside the panel closes what it opened.
    document.addEventListener('click', (e) => {
      if (e.composedPath().includes(panelHost)) return;
      closePop();
      menu.hidden = true;
      picks.hidden = true;
    });
    // Two columns when there's room for them.
    new ResizeObserver(() => {
      const wide = wrap.clientWidth >= 560;
      if (wide !== wrap.classList.contains('wide')) {
        wrap.classList.toggle('wide', wide);
        fitChips();
      }
      repop();
    }).observe(wrap);

    cleanText(wrap);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') cleanText(m.target);
        else m.addedNodes.forEach(cleanText);
      }
    }).observe(wrap, { subtree: true, childList: true, characterData: true });
    BYL.uiClean = (node) => {
      cleanText(node);
      new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'characterData') cleanText(m.target);
          else m.addedNodes.forEach(cleanText);
        }
      }).observe(node, { subtree: true, childList: true, characterData: true });
    };
    wrap.append(header, menu, body, dock, picks, popSpeed, popVocal, popSync, popSet, popTrans, popKey);
    root.append(wrap);

    Object.assign(P, { overlayBtnH, back, dock, saBtn, tools, speedChip, vocalChip, keyStep, syncIcon, pinList, transChip, gallery, popSet, placePop, openPop, closePop, repop, pickAnchor: null });
    Object.assign(P, { wrap, songTitle, songArtist, status, picks, autoBtn, resetBtn, khint, select, overlayBtn, pipBtn, offLabel, warn, lines, open, kchips, klist,
      row2, row3, row4, favBtn, hlist, hAll, hFav, historyTab, nav, modeBtns, lyricTab, karaokeTab, menu, lookSel, posBtn, studioBtn, chanBtn, studio, note, syncBtn, editor, grip, pinCount, rowT, transSel, swapBtn, rowTr, trBtn, trLang, trSwap,
      tapBtn, tapbar, keyLabel, vocalBtn, vocalAmt, speedBtns, speedRange, speedLabel, starBtn });
    editBtn.addEventListener('click', () => openEditor());
    tapBtn.addEventListener('click', () => (tapping() ? stopTap(false) : startTap()));
    transSel.addEventListener('change', () => {
      const id = transSel.value;
      if (id === 'roman') return state.current && romanTrans(state.current, true);
      setTrans(state.candidates.find((x) => x.id === id) || (state.trans?.id === id ? state.trans : null), true);
    });
    swapBtn.addEventListener('click', () => state.trans && choose(state.trans, true));
    trSwap.addEventListener('click', () => state.trans && choose(state.trans, true));
    trBtn.addEventListener('click', () => translateTo(trLang.value));
    trLang.addEventListener('change', () => {
      if (!trLang.value) {
        setTrans(null, true);
        return renderTransSelect();
      }
      trBtn.disabled = false;
      BYL.settings.set({ transLang: trLang.value });
    });

    syncBtn.addEventListener('click', () => state.current && syncNow(state.current));
    header.addEventListener('click', () => {
      wrap.classList.toggle('collapsed');
      BYL.settings.set({ panelCollapsed: wrap.classList.contains('collapsed') });
    });
    setMode(BYL.settings.value.panelMode, false);
    paintAuto();
    paintDock();
    menuBtn.addEventListener('click', () => closePop());
    select.addEventListener('change', () => {
      const c = state.candidates.find((x) => x.id === select.value);
      if (c) choose(c, true);
    });
    overlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOverlay(!state.overlayOn, true);
    });
    pipBtn.addEventListener('click', togglePip);
    minus.addEventListener('click', (e) => nudge(e.shiftKey ? -0.1 : -0.5));
    plus.addEventListener('click', (e) => nudge(e.shiftKey ? 0.1 : 0.5));
    offLabel.addEventListener('click', clearSync);
    fontDown.addEventListener('click', () => setFont(-4));
    fontUp.addEventListener('click', () => setFont(4));
    lookSel.addEventListener('change', () => {
      if (!lookSel.value) return;
      setSlot({ style: lookSel.value, look: null });
      refreshLook();
      if (!studio.hidden) buildStudio();
      // Show the change on this video; "Tự bật lời trên video" stays as set.
      if (!state.overlayOn && !F) setOverlay(true, false);
    });
    chanBtn.addEventListener('click', () => {
      const ch = state.channel;
      if (!ch) return;
      const all = { ...BYL.settings.value.channelStyles };
      if (all[ch]) delete all[ch];
      else all[ch] = { ...slot() };
      BYL.settings.set({ channelStyles: all });
      refreshLook();
      if (!studio.hidden) buildStudio();
      say(all[ch] ? L('📌 Kênh "{0}" giờ có kiểu chữ riêng. Đổi kiểu hay chỉnh 🎨 lúc này chỉ áp dụng cho kênh này.', ch) : L('Kênh "{0}" dùng lại kiểu chữ chung.', ch));
    });
    studioBtn.addEventListener('click', () => {
      studio.hidden = !studio.hidden;
      studioBtn.classList.toggle('on', !studio.hidden);
      if (!studio.hidden) {
        buildStudio();
        if (!state.overlayOn && !F) setOverlay(true, false);
      }
    });
    copy.addEventListener('click', async () => {
      if (!state.current) return;
      try {
        await navigator.clipboard.writeText(BYL.lyricsText(state.current.lines));
        copy.textContent = L('Đã chép ✓');
      } catch {
        copy.textContent = L('Không chép được');
      }
      setTimeout(() => (copy.textContent = L('Sao chép')), 1500);
    });
    lines.addEventListener('wheel', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    // Chips wrap onto two lines at most; the rest wait behind +N.
    const chipMore = el('button', 'chip more');
    chipMore.addEventListener('click', () => {
      state.chipsOpen = !state.chipsOpen;
      fitChips();
    });
    P.chipMore = chipMore;
    let chipsWidth = 0;
    new ResizeObserver(() => {
      if (status.clientWidth === chipsWidth) return;
      chipsWidth = status.clientWidth;
      fitChips();
    }).observe(status);
    lines.addEventListener('touchmove', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    lines.addEventListener('click', (e) => {
      const ln = e.target.closest('.ln');
      if (!ln || !ln.dataset.i) return;
      if (tapping()) tapJump(Number(ln.dataset.i));
      else if (e.target.closest('.pin')) pinLine(Number(ln.dataset.i));
      else onLineClick(Number(ln.dataset.i));
    });
    renderLookSelect();
  }

  // Drag the grip under the lyric list to make it taller or shorter.
  function makeResizable(box, grip) {
    const apply = (h) => {
      box.style.height = h ? h + 'px' : '';
      box.style.maxHeight = h ? 'none' : '';
    };
    apply(BYL.settings.value.linesHeight);
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const y0 = e.clientY;
      const h0 = box.getBoundingClientRect().height;
      const move = (ev) => apply(Math.round(Math.max(80, Math.min(window.innerHeight * 0.9, h0 + ev.clientY - y0))));
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        BYL.settings.set({ linesHeight: Math.round(box.getBoundingClientRect().height) });
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
    grip.addEventListener('dblclick', () => {
      apply(0);
      BYL.settings.set({ linesHeight: 0 });
    });
  }

  const applyTheme = () => {
    // YouTube marks dark mode with <html dark>; its CSS variables already
    // follow it, this only nudges contrast for the list background.
    P.wrap.style.setProperty('--bg', document.documentElement.hasAttribute('dark') ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)');
  };

  // ---------- style picker + 🎨 editor ----------

  function renderLookSelect() {
    const sel = P.lookSel;
    const v = BYL.settings.value;
    sel.replaceChildren();
    const add = (parent, value, text) => {
      const o = el('option', '', text);
      o.value = value;
      parent.append(o);
    };
    if (slot().look) add(sel, '', L('✎ Đang tuỳ chỉnh'));
    const builtIn = el('optgroup');
    builtIn.label = L('Có sẵn');
    for (const [k, p] of Object.entries(BYL.LOOKS)) add(builtIn, k, p.name);
    sel.append(builtIn);
    const mine = v.overlayPresets || [];
    if (mine.length) {
      const g = el('optgroup');
      g.label = L('Preset của bạn');
      for (const p of mine) add(g, 'u:' + p.name, '★ ' + p.name);
      sel.append(g);
    }
    sel.value = slot().look ? '' : slot().style;
    if (sel.selectedIndex < 0) sel.value = 'red';
    renderGallery();
    for (const b of P.posBtn.children) b.classList.toggle('on', b.dataset.pos === (v.overlayPosition === 'top' ? 'top' : 'bottom'));
    const pinned = !!chanSlot();
    P.chanBtn.hidden = !state.channel;
    P.chanBtn.classList.toggle('on', pinned);
    P.chanBtn.title = pinned
      ? L('Kênh "{0}" đang dùng kiểu chữ riêng. Bấm để dùng lại kiểu chung.', state.channel)
      : L('Ghi nhớ kiểu chữ này riêng cho kênh "{0}"', state.channel);
  }

  // The styles as tiles (Settings · Kiểu chữ): a small sample of each look.
  function renderGallery() {
    const g = P.gallery;
    if (!g) return;
    g.replaceChildren();
    const cur = slot().look ? '' : slot().style;
    const tiles = [...Object.entries(BYL.LOOKS).map(([k, p]) => [k, p.name]), ...(BYL.settings.value.overlayPresets || []).map((p) => ['u:' + p.name, '★ ' + p.name])];
    const hex = (h, a) => {
      const n = parseInt(String(h || '#000').slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    for (const [key, name] of tiles) {
      const look = compose(key, null);
      const t = el('button', 'tile' + (key === cur ? ' on' : ''));
      t.setAttribute('aria-pressed', String(key === cur));
      const prev = el('span', 'prev');
      const line = el('span', 'sample');
      const sung = el('span', '', look.upper ? 'LIGHT' : 'Light');
      const rest = el('span', '', look.upper ? ' THE WAY' : ' the way');
      sung.style.color = look.sung;
      rest.style.color = look.text;
      rest.style.opacity = Math.max(0.35, (look.dim ?? 100) / 100);
      line.style.fontWeight = look.weight;
      if (look.font) line.style.fontFamily = look.font;
      if (look.strokeW) line.style.textShadow = `0 0 1px ${look.stroke}, 0 0 2px ${look.stroke}`;
      else if (look.shadow) line.style.textShadow = '0 1px 3px rgba(0,0,0,.8)';
      if (['box', 'pill', 'lines'].includes(look.shape)) {
        line.style.background = hex(look.bg, (look.bgAlpha ?? 60) / 100);
        line.style.borderRadius = look.shape === 'pill' ? '999px' : '4px';
        line.style.padding = '2px 6px';
      } else if (look.shape === 'band') prev.style.boxShadow = `inset 0 -22px 0 ${hex(look.bg, (look.bgAlpha ?? 50) / 100)}`;
      line.style.fontSize = Math.round(11 * Math.min(1.25, Math.max(0.8, (look.scale || 100) / 100))) + 'px';
      line.append(sung, rest);
      prev.append(line);
      t.append(prev, el('span', 'tn', name));
      t.title = name;
      t.addEventListener('click', () => {
        setSlot({ style: key, look: null });
        refreshLook();
        if (!P.studio.hidden) buildStudio();
        if (!state.overlayOn && !F) setOverlay(true, false);
      });
      g.append(t);
    }
    if (slot().look) {
      const t = el('button', 'tile on custom');
      const pv = el('span', 'prev');
      pv.append(ico('palette', 24));
      t.append(pv, el('span', 'tn', L('✎ Đang tuỳ chỉnh')));
      t.addEventListener('click', () => P.studioBtn.click());
      g.prepend(t);
    }
  }

  // Re-apply the look everywhere after a settings change.
  function refreshLook() {
    renderLookSelect();
    for (const R of [O, F]) if (R) paintLook(R.host, currentLook());
    sizeAll();
    state.lastActive = -2; // rebuild lines (layout may have changed)
  }

  let saveTimer;
  function editLook(patch, persist) {
    const look = { ...currentLook(), ...patch };
    setSlot({ look }, false);
    if (persist) {
      // chrome.storage.sync has a write quota; sliders only save on release.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => setSlot({ look: slot().look }), 300);
    }
    refreshLook();
  }

  // A random look that stays readable on any video: bright sung colours,
  // and an outline, a shadow or a background behind the words.
  function randomLook() {
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    const chance = (p) => Math.random() < p;
    const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const hsl = (h, sat, l) => {
      const f = (n) => {
        const k = (n + h / 30) % 12;
        const c = l - (sat * Math.min(l, 1 - l)) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(c * 255).toString(16).padStart(2, '0');
      };
      return '#' + f(0) + f(8) + f(4);
    };
    const hue = int(0, 359);
    const shape = any(['none', 'none', 'none', 'box', 'pill', 'band', 'lines', 'fade']);
    // A highlighter carries dark words: no outline or shadow to smudge them.
    const mark = chance(0.12);
    const strokeW = mark ? 0 : shape === 'none' ? any([8, 12, 16, 20, 24]) : any([0, 0, 6, 12]);
    return {
      font: any(FONTS)[0],
      weight: any([600, 700, 800, 800, 900]),
      scale: int(90, 150),
      tracking: any([0, 1, 1, 2, 4, 8]),
      upper: chance(0.25),
      wipe: chance(0.8) ? 'word' : 'line',
      text: chance(0.75) ? '#ffffff' : hsl(hue + 180, 0.4, 0.92),
      textGrad: chance(0.4),
      dim: shape === 'fade' ? int(35, 60) : chance(0.85) ? 100 : int(50, 90),
      sung: mark ? '#111111' : hsl(hue, 0.9, 0.6),
      sung2: !mark && chance(0.35) ? hsl(hue + int(40, 120), 0.9, 0.62) : '',
      mark: mark ? hsl(hue, 0.95, 0.65) : '',
      stroke: '#101010',
      sstroke: chance(0.5) ? '#ffffff' : '#101010',
      strokeW,
      shadow: !mark && (shape === 'none' || chance(0.4)),
      glow: chance(0.2),
      shape,
      bg: chance(0.8) ? '#000000' : hsl(hue, 0.5, 0.12),
      bgAlpha: int(45, 80),
      ...Object.fromEntries(PAD_KEYS.map((k) => [k, undefined])),
      layout: any(['stagger', 'center2', 'center2', 'three', 'single']),
      nextScale: int(55, 100),
      margin: int(6, 16),
    };
  }

  function buildStudio() {
    const box = P.studio;
    box.replaceChildren();
    const look = currentLook();
    const sections = [];
    let grid;
    // Each part has 🎲 (try something at random) and ↺ (back to the chosen
    // style's values) for its own settings.
    const section = (title, keys) => {
      const s = el('section');
      s.dataset.t = title;
      const h = el('h4', '', title);
      const dice = el('button', 'mini iconbtn');
      dice.append(ico('casino', 18));
      dice.title = L('Ngẫu nhiên: {0}', title);
      dice.addEventListener('click', () => {
        const r = randomLook();
        editLook(Object.fromEntries(keys.map((k) => [k, r[k]])), true);
        buildStudio();
      });
      const back = el('button', 'mini iconbtn');
      back.append(ico('refresh', 18));
      back.title = L('Mặc định: {0}', title);
      back.addEventListener('click', () => {
        const def = compose(slot().style);
        editLook(Object.fromEntries(keys.map((k) => [k, def[k]])), true);
        buildStudio();
      });
      const acts = el('span', 'acts');
      acts.append(dice, back);
      h.append(acts);
      s.append(h);
      grid = el('div', 'grid');
      s.append(grid);
      sections.push(s);
    };
    const row = (label, ...ctl) => {
      const c = el('div', 'ctl');
      c.append(...ctl.flat());
      grid.append(el('span', 'lbl', label), c);
      return c;
    };
    const pick = (key, options) => {
      const s = el('select');
      for (const [v, t] of options) {
        const o = el('option', '', L(t));
        o.value = v;
        s.append(o);
      }
      s.value = String(look[key]);
      s.addEventListener('change', () => editLook({ [key]: typeof BASE_LOOK[key] === 'number' ? Number(s.value) : s.value }, true));
      return s;
    };
    // Segmented buttons for short option lists.
    const seg = (key, options, after) => {
      const g = el('div', 'seg');
      for (const [v, t] of options) {
        const b = el('button', String(look[key]) === v ? 'on' : '', t);
        b.addEventListener('click', () => {
          if (String(look[key]) === v) return;
          editLook({ [key]: v }, true);
          after ? after() : buildStudio();
        });
        g.append(b);
      }
      return g;
    };
    const color = (key, title) => {
      const c = el('input', 'swatch');
      c.type = 'color';
      c.value = look[key] || look.sung;
      c.title = title;
      c.addEventListener('input', () => editLook({ [key]: c.value }, false));
      c.addEventListener('change', () => editLook({ [key]: c.value }, true));
      return c;
    };
    const range = (key, min, max, unit = '%', value = look[key]) => {
      const w = el('div', 'range');
      const r = el('input');
      r.type = 'range';
      r.min = min;
      r.max = max;
      r.value = value;
      const val = el('span', 'val');
      const show = () => {
        val.textContent = r.value + unit;
        r.style.setProperty('--fill', ((r.value - min) / (max - min)) * 100 + '%');
      };
      show();
      r.addEventListener('input', () => {
        show();
        editLook({ [key]: Number(r.value) }, false);
      });
      r.addEventListener('change', () => editLook({ [key]: Number(r.value) }, true));
      // Double-click: back to the chosen style's value (padding: the shape's).
      r.title = L('Nháy đúp để về mặc định');
      r.addEventListener('dblclick', () => {
        const def = compose(slot().style)[key];
        editLook({ [key]: def }, true);
        r.value = PAD_KEYS.includes(key) ? padOf(currentLook(), key) : def;
        show();
      });
      w.append(r, val);
      return w;
    };
    const toggle = (checked, text, onChange) => {
      const l = el('label', 'tg');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = checked;
      c.addEventListener('change', () => onChange(c.checked));
      l.append(c, el('span', '', text));
      return l;
    };
    const flag = (key, text) => toggle(!!look[key], text, (on) => editLook({ [key]: on }, true));

    section(L('Chữ'), ['font', 'weight', 'scale', 'tracking', 'upper', 'wipe']);
    row(L('Phông'), pick('font', FONTS));
    row(L('Độ đậm'), pick('weight', [['400', L('Thường')], ['600', L('Vừa')], ['700', L('Đậm')], ['800', L('Rất đậm')], ['900', L('Đen')]]));
    row(L('Cỡ chữ'), range('scale', 50, 220));
    row(L('Giãn chữ'), range('tracking', -5, 30, ''), flag('upper', L('In hoa')));
    row(L('Hiệu ứng'), seg('wipe', [['word', L('Chạy từng chữ')], ['line', L('Sáng cả dòng')]]));

    section(L('Màu'), ['text', 'textGrad', 'dim', 'sung', 'sung2', 'mark', 'stroke', 'sstroke', 'strokeW', 'shadow', 'glow']);
    row(L('Chưa hát'), color('text', L('Màu chữ chưa hát')), flag('textGrad', L('Ánh bạc')));
    // 0 leaves only the outline: hollow words that fill in as they are sung.
    row(L('Độ rõ'), range('dim', 0, 100)).title = L('Độ rõ của chữ chưa hát (0: chỉ còn viền)');
    // Gradient: switch on to fade the sung colour into a second one.
    const sung2 = color('sung2', L('Màu thứ hai của dải chuyển màu'));
    sung2.hidden = !look.sung2;
    row(
      L('Đã hát'),
      color('sung', L('Màu chữ đã hát')),
      toggle(!!look.sung2, L('Chuyển màu'), (on) => {
        sung2.hidden = !on;
        editLook({ sung2: on ? sung2.value : '' }, true);
      }),
      sung2
    );
    const mark = color('mark', L('Màu tô nền chữ đã hát'));
    if (!look.mark) mark.value = '#ffe14d';
    mark.hidden = !look.mark;
    row(
      L('Tô nền'),
      toggle(!!look.mark, L('Bút dạ quang'), (on) => {
        mark.hidden = !on;
        editLook({ mark: on ? mark.value : '' }, true);
      }),
      mark
    );
    row(L('Viền'), color('stroke', L('Màu viền')), color('sstroke', L('Màu viền khi đã hát')), range('strokeW', 0, 30, ''));
    row(L('Bóng'), flag('shadow', L('Đổ bóng')), flag('glow', L('Phát sáng')));

    section(L('Nền'), ['shape', 'bg', 'bgAlpha', ...PAD_KEYS]);
    // A new shape starts from its own padding.
    const reshape = () => {
      editLook(Object.fromEntries(PAD_KEYS.map((k) => [k, undefined])), true);
      buildStudio();
    };
    // Six shapes don't fit as segmented buttons: a list.
    const shapeSel = pick('shape', [['none', 'Không'], ['box', 'Khung'], ['pill', 'Viên'], ['band', 'Dải ngang'], ['lines', 'Từng dòng'], ['fade', 'Phủ mờ']]);
    shapeSel.addEventListener('change', reshape);
    row(L('Kiểu'), shapeSel);
    if (look.shape !== 'none') {
      row(L('Màu nền'), color('bg', L('Màu nền')), range('bgAlpha', 0, 100));
      // Padding sliders follow the shape's default until the user moves them.
      const pads = el('div', 'pads');
      for (const [k, text] of [['padT', L('Trên')], ['padB', L('Dưới')], ['padL', L('Trái')], ['padR', L('Phải')]]) {
        const p = el('div', 'pad');
        p.title = L('Lề {0} trong khung, tính theo cỡ chữ', text.toLowerCase());
        p.append(el('span', 'muted', text), range(k, 0, 200, '%', padOf(look, k)));
        pads.append(p);
      }
      row(L('Lề trong'), pads);
    }

    section(L('Bố cục'), ['layout', 'nextScale', 'margin']);
    row(L('Số dòng'), pick('layout', [['stagger', L('So le 2 dòng')], ['center2', L('Dòng hát + dòng kế')], ['three', L('3 dòng')], ['single', L('Một dòng')]]));
    row(L('Dòng phụ'), range('nextScale', 40, 100));
    row(L('Cách mép'), range('margin', 2, 40));

    // On top: 🎲 a whole new look, ↺ back to the chosen style, and save
    // what you see as your own preset straight away.
    const top = el('div', 'presets top');
    const dice = el('button', 'iconbtn');
    dice.append(ico('shuffle', 20));
    dice.setAttribute('aria-label', L('🎲 Ngẫu nhiên'));
    dice.title = L('Thử một kiểu ngẫu nhiên');
    dice.addEventListener('click', () => {
      editLook(randomLook(), true);
      buildStudio();
    });
    const presets = el('div', 'presets');
    const name = el('input');
    name.type = 'text';
    name.placeholder = L('Tên preset…');
    name.maxLength = 24;
    const save = el('button', 'primary', L('Lưu preset'));
    const reset = el('button', 'iconbtn');
    reset.append(ico('refresh', 20));
    reset.setAttribute('aria-label', L('↺ Mặc định'));
    reset.title = L('Quay về kiểu đang chọn, bỏ các chỉnh sửa');
    const del = el('button', 'danger', L('Xoá preset'));
    const style = slot().style;
    del.hidden = !style?.startsWith('u:');
    if (style?.startsWith('u:')) name.value = style.slice(2);
    save.addEventListener('click', async () => {
      const n = name.value.trim() || 'Preset ' + ((BYL.settings.value.overlayPresets || []).length + 1);
      const list = (BYL.settings.value.overlayPresets || []).filter((p) => p.name !== n);
      list.push({ name: n, look: currentLook() });
      const ok = (await BYL.settings.set({ overlayPresets: list })) && (await setSlot({ style: 'u:' + n, look: null }));
      refreshLook();
      buildStudio();
      say(
        ok
          ? L('💾 Đã lưu preset "{0}". Chọn lại trong "Kiểu chữ" bất cứ lúc nào.', n)
          : L('⚠ Không lưu được preset "{0}" vào trình duyệt. Preset vẫn dùng được đến khi tải lại trang.', n)
      );
    });
    reset.addEventListener('click', () => {
      setSlot({ look: null });
      refreshLook();
      buildStudio();
    });
    del.addEventListener('click', () => {
      const list = (BYL.settings.value.overlayPresets || []).filter((p) => 'u:' + p.name !== style);
      BYL.settings.set({ overlayPresets: list });
      setSlot({ style: 'classic', look: null });
      refreshLook();
      buildStudio();
    });
    top.append(dice, reset);
    presets.append(name, save, del);
    // Two columns: the groups down the left, the chosen group's settings on
    // the right (a row of tabs over them when the popover is narrow).
    const nav = el('div', 'snav');
    nav.setAttribute('role', 'tablist');
    const pane = el('div', 'spane');
    const show = (i) => {
      state.studioGroup = i;
      sections.forEach((sec, k) => (sec.hidden = k !== i));
      [...nav.querySelectorAll('.sg')].forEach((b, k) => {
        b.classList.toggle('on', k === i);
        b.setAttribute('aria-selected', String(k === i));
      });
    };
    sections.forEach((sec, i) => {
      const b = el('button', 'sg', sec.dataset.t);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => show(i));
      nav.append(b);
    });
    const tabs = el('div', 'stabs');
    tabs.append(...nav.childNodes);
    nav.append(tabs, top);
    // Saving the look as your own preset, in its own box.
    const presetBox = el('div', 'presetbox');
    presetBox.append(presets);
    pane.append(...sections, presetBox);
    box.append(nav, pane);
    show(Math.min(state.studioGroup || 0, sections.length - 1));
  }

  // ---------- state changes ----------

  // Messages and warnings above the lyrics go away on their own after 10s.
  const MSG_MS = 10000;
  const flash = (box, t) => {
    box.textContent = t;
    clearTimeout(box._hide);
    if (t && t.trim()) box._hide = setTimeout(() => box.textContent === t && (box.textContent = ''), MSG_MS);
  };
  const say = (t) => flash(P.note, t);

  function reset({ videoId, saved }) {
    // Caption helpers belong to the previous video until main.js sets new ones.
    api.hasCaptions = null;
    api.captionWordsFor = null;
    Object.assign(state, {
      videoId,
      song: null,
      channel: '',
      duration: 0,
      candidates: [],
      current: null,
      manual: false,
      offset: saved?.offset || 0,
      anchor: null,
      warps: saved?.warps || {},
      trans: null,
      transMap: null,
      sourceStatus: {},
      sourceCount: {},
      karaokeLoadedFor: null,
      lastActive: -2,
      starId: saved?.star?.id || null,
      waitingFor: null, // source the user clicked to load
    });
    applyTheme();
    renderLookSelect();
    P.wrap.classList.toggle('collapsed', !!BYL.settings.value.panelCollapsed);
    paintFav(false);
    P.songTitle.textContent = 'Better Karaoke';
    P.songArtist.textContent = L('Đang tìm lời bài hát…');
    P.status.replaceChildren();
    P.select.replaceChildren();
    P.warn.textContent = '';
    P.note.textContent = '';
    P.klist.replaceChildren();
    P.kchips.replaceChildren();
    P.offLabel.textContent = fmtOffset(state.offset);
    closeEditor();
    endTap();
    parts.compare?.closeCompare();
    renderLines();
    // The user's own lyrics come back first, then whatever they last picked.
    const mine = CUSTOM_SLOTS.filter((id) => saved?.[id]?.text).map((id) => Object.assign(customCandidate(saved[id].text, saved[id].label, id), saved[id].lang ? { tlang: saved[id].lang } : {}));
    // ★ The version the user marked plays first; their own edit, if that's it, as last saved.
    let star = saved?.star ? mine.find((m) => m.id === saved.star.id) || saved.star : null;
    if (star && !mine.includes(star)) {
      star.lines = star.lines.map((l) => (l.text?.includes('>>') ? { ...l, text: BYL.makeLine(l.text).text } : l));
    }
    for (const m of mine) if (baseId(saved.pick) !== m.id) state.candidates.push(m);
    if (star && !state.candidates.includes(star) && star.id !== saved?.pick?.id) state.candidates.push(star);
    if (saved?.trans) {
      state.trans = mine.find((m) => m.id === saved.trans.id) || saved.trans;
      if (!state.candidates.some((x) => x.id === state.trans.id)) state.candidates.push(state.trans);
    }
    if (saved?.pick) {
      // Picks saved before ">>" (caption speaker marks) were cleaned out.
      saved.pick.lines = saved.pick.lines.map((l) => (l.text?.includes('>>') ? { ...l, text: BYL.makeLine(l.text).text } : l));
      state.candidates.push(saved.pick);
      if (star?.id === saved.pick.id) star = saved.pick;
    }
    // (A translation is never picked by itself: it shows under the lyrics.)
    const first = star || saved?.pick || mine.find((m) => !m.tlang);
    renderSelect();
    if (first) {
      choose(first, false);
      state.manual = true;
    }
    if (mine.length) setSourceStatus('custom', 'ok', mine.length);
    setOverlay(!!BYL.settings.value.karaokeAuto, false);
    pipTitle();
    // 🎤 Lọc giọng is only ever on because the user just turned it on: a new
    // video (or the next one playing by itself) starts with the singer back.
    setVocal(0);
    setKey(saved?.semis || 0, false);
  }

  function setSong(song, duration, channel) {
    state.song = song;
    state.channel = channel || '';
    refreshLook();
    state.duration = duration || 0;
    P.songTitle.textContent = song.title || L('Không rõ tên bài');
    P.songArtist.textContent = (song.manual ? '✎ ' : '') + (song.artist || '');
    P.songArtist.title = song.manual ? L('Tên bạn đã sửa bằng 🔍 Tìm theo tên') : '';
    pipTitle();
    remember(song);
  }

  function setSourceStatus(key, status, count = 0) {
    state.sourceStatus[key] = status;
    state.sourceCount[key] = count;
    let chip = P.status.querySelector(`[data-k="${key}"]`);
    if (!chip) {
      chip = el('button', 'chip');
      chip.dataset.k = key;
      chip.addEventListener('click', (e) => (e.stopPropagation(), onChip(key)));
      chip.setAttribute('aria-haspopup', 'dialog');
      let hover;
      chip.addEventListener('mouseenter', () => {
        clearTimeout(hover);
        hover = setTimeout(() => {
          const list = state.candidates.filter((c) => c.source === key);
          if (P.wrap.classList.contains('wide') && state.sourceStatus[key] === 'ok' && list.length > 1 && (P.picks.hidden || P.picks.dataset.k !== key)) {
            P.picks.hidden = true;
            openPicks(key, list, chip);
          }
        }, 450);
      });
      chip.addEventListener('mouseleave', () => clearTimeout(hover));
      P.status.append(chip);
    }
    const s = S[key];
    chip.className = 'chip ' + status + (state.current?.source === key ? ' cur' : '') + (bestTimed()?.source === key ? ' best' : '');
    const tail = { ok: ` ${count}`, none: ' –', error: ' ⚠', idle: ' ▸' }[status] || '';
    chip.textContent = `${s.icon} ${s.name}${tail}`;
    const tick = ico('check', 18);
    tick.classList.add('tick');
    chip.append(tick);
    // The user asked for this source (onChip): tell them how it went.
    if (state.waitingFor === key && status !== 'loading') {
      state.waitingFor = null;
      const found = state.candidates.find((c) => c.source === key);
      if (status === 'ok' && found) {
        choose(found, true);
        say(L('{0} {1}: đã tải xong.', s.icon, s.name));
      } else if (status === 'error') say(L('{0} {1}: lỗi khi tải. Bấm chip để thử lại.', s.icon, s.name));
      else say(key === 'transcript' ? L('Video này không có phụ đề, hoặc YouTube không cho tải phụ đề lúc này.') : L('{0} không có lời cho bài này.', s.name));
    }
    orderChips();
    chip.title =
      {
        loading: L('Đang tìm…'),
        ok: count > 1 ? L('Có {0} bản. Bấm để chọn một bản', count) : L('Bấm để xem lời từ nguồn này'),
        none: L('Nguồn này không có lời cho bài này'),
        error: L('Lỗi khi tìm. Bấm để thử lại'),
        idle: L('Bấm để tải (dùng khi các nguồn khác không đúng)'),
      }[status];
    maybeAutoPick();
  }

  // Sources with lyrics first, the empty ones last.
  function orderChips() {
    // Not by which one is in use: a chip that jumps to the front when clicked
    // leaves the user looking for the others.
    const rank = (c) => ({ ok: 1, loading: 2, idle: 3, error: 3, none: 4 })[[...c.classList].find((x) => ['ok', 'loading', 'idle', 'error', 'none'].includes(x))] ?? 3;
    for (const c of P.status.querySelectorAll('[data-k]')) c.style.order = rank(c);
    fitChips();
  }

  // Two lines of chips at most: the last ones (the empty sources, by the
  // order above) give way to a +N chip that shows them all, and ▴ folds
  // them back.
  function fitChips() {
    const box = P.status;
    const more = P.chipMore;
    const chips = [...box.querySelectorAll('[data-k]')].sort((a, b) => a.style.order - b.style.order);
    for (const c of chips) c.hidden = false;
    more.style.order = 99;
    more.hidden = true;
    if (more.parentElement !== box) box.append(more);
    if (P.wrap.classList.contains('wide')) return;
    const lines = () => new Set([...box.children].filter((c) => !c.hidden).map((c) => c.offsetTop)).size;
    if (!box.clientWidth || lines() <= 2) return;
    more.hidden = false;
    if (state.chipsOpen) {
      more.replaceChildren(ico('up', 16));
      more.title = '';
      return;
    }
    let hid = 0;
    for (let i = chips.length - 1; i > 0 && lines() > 2; i--) {
      if (chips[i].classList.contains('cur')) continue; // the one in use stays in sight
      chips[i].hidden = true;
      more.textContent = '+' + ++hid;
    }
    more.title = chips.filter((c) => c.hidden).map((c) => c.textContent).join(' · ');
  }

  // Source chips: show that source's lyrics; with several results (two or
  // three comments with lyrics…) a list to pick from; idle/failed sources
  // load (again).
  function onChip(key) {
    const st = state.sourceStatus[key];
    const name = S[key].name;
    if (st === 'idle' || st === 'error') {
      say(L('Đang tìm lời từ {0}…', name));
      state.waitingFor = key;
      return api.onLoadSource?.(key);
    }
    if (st === 'loading') return say(L('Đang tìm lời từ {0}, chờ chút…', name));
    const list = state.candidates.filter((c) => c.source === key);
    if (!list.length) return say(L('{0} không có lời cho bài này.', name));
    if (list.length === 1) return choose(list[0], true);
    openPicks(key, list);
  }

  // A source's versions, over the panel next to its chip: pick one to play,
  // ☆ marks the one that opens with this video next time.
  function openPicks(key, list, anchor) {
    const box = P.picks;
    if (!box.hidden && box.dataset.k === key) return (box.hidden = true);
    P.closePop();
    box.dataset.k = key;
    box.replaceChildren(el('div', 'phead', `${S[key].icon} ${S[key].name}`));
    for (const c of list) {
      const on = c === state.current;
      const b = el('div', 'ver' + (on ? ' on' : ''));
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      const info = [c.synced ? L('⏱ có thời gian') : '', c.detail, L('{0} dòng', c.lines.filter((l) => !l.section).length)].filter(Boolean).join(' · ');
      const txt = el('div', 'vt');
      txt.append(el('b', '', c.label), el('span', 'muted', info));
      const fav = state.starId === c.id;
      const star = el('button', 'iconbtn star' + (fav ? ' on' : ''));
      star.append(ico(fav ? 'star' : 'starB', 20));
      star.title = fav ? L('★ Bản tiêu biểu') : L('☆ Chọn làm tiêu biểu');
      star.setAttribute('aria-pressed', String(fav));
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStar(c);
        box.hidden = true;
        openPicks(key, list, anchor);
      });
      b.append(el('span', 'rad'), txt, star);
      const pick = () => {
        box.hidden = true;
        choose(c, true);
      };
      b.addEventListener('click', pick);
      b.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick()));
      box.append(b);
    }
    box.hidden = false;
    const chip = anchor || P.status.querySelector(`[data-k="${key}"]`);
    if (chip) P.placePop(box, chip, P.wrap.classList.contains('wide') ? 'left' : 'below');
  }

  // ★: the version the user marked, or else the one timed to the singing that ranks first.
  const bestTimed = () => (state.starId && state.candidates.find((c) => c.id === state.starId)) || state.candidates.find((c) => c.synced && !c.tlang);

  function toggleStar(which) {
    const c = which || state.current;
    if (!c || c.preview) return;
    if (state.starId === c.id) {
      state.starId = null;
      BYL.videoStore.patch(state.videoId, { star: null });
      say(L('Đã bỏ đánh dấu ★. Lần sau mở video sẽ tự chọn bản phù hợp nhất.'));
    } else {
      state.starId = c.id;
      BYL.videoStore.patch(state.videoId, { star: c, pick: c });
      say(L('★ Đã đánh dấu bản này là bản tiêu biểu: lần sau mở video này sẽ phát bản này.'));
    }
    renderSelect();
    markChips();
  }

  function paintStar() {
    const b = P.starBtn;
    const c = state.current;
    b.hidden = !c;
    if (!c) return;
    const on = state.starId === c.id;
    b.classList.toggle('on', on);
    b.textContent = on ? L('★ Bản tiêu biểu') : L('☆ Chọn làm tiêu biểu');
    b.title = on ? L('Bản này mở cùng video lần sau. Bấm để bỏ đánh dấu.') : L('Đánh dấu bản đang phát là bản đúng nhất: lần sau mở video này sẽ phát bản này');
  }

  function markChips() {
    paintStar();
    const best = bestTimed();
    for (const chip of P.status.querySelectorAll('[data-k]')) {
      chip.classList.toggle('cur', state.current?.source === chip.dataset.k);
      chip.classList.toggle('best', best?.source === chip.dataset.k);
    }
    orderChips();
  }

  const rank = (c) => [
    c.tlang ? 1 : 0, // a translation the user made goes under the lyrics, not in their place
    BYL.settings.value.preferSynced && !c.synced ? 1 : 0,
    S[c.source]?.priority ?? 9,
    -(c.score || 0),
  ];
  const cmp = (a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  };

  function addCandidates(list) {
    for (const c of list) if (!state.candidates.some((x) => x.id === c.id)) state.candidates.push(c);
    state.candidates.sort(cmp);
    renderSelect();
    maybeAutoPick();
  }

  function maybeAutoPick() {
    // (Translations the user made are never picked by themselves.)
    const best = state.candidates.find((c) => !c.tlang);
    if (state.manual || !best) {
      if (!best && Object.values(state.sourceStatus).every((s) => s !== 'loading')) renderLines();
      return;
    }
    if (best !== state.current) choose(best, false);
  }

  function choose(c, byUser) {
    if (tapping()) stopTap(false);
    const prev = state.current;
    // Picking the translation as the main lyrics swaps the two.
    if (state.trans && baseId(state.trans) === baseId(c)) state.trans = prev && prev !== c ? prev : null;
    state.current = c;
    state.anchor = null;
    state.transMap = null;
    state.lastActive = -2;
    if (byUser) {
      state.manual = true;
      BYL.videoStore.patch(state.videoId, { pick: c, trans: state.trans });
    }
    P.select.value = c.id;
    // A Latin spelling follows the lyrics it was made from.
    if (state.trans?.romanOf && state.trans.romanOf !== c.id) romanTrans(c, false);
    renderTransSelect();
    flash(P.warn, warnOf(c));
    P.note.textContent = '';
    P.open.hidden = !c.url;
    P.resetBtn.hidden = c.source !== 'custom';
    if (c.url) P.open.href = c.url;
    paintSync();
    markChips();
    renderLines();
    // Lyrics without timing, or timed lyrics that may not match this video's
    // length: try lining them up with the captions straight away.
    // Timed lyrics from elsewhere (LRCLIB is timed to the audio release) get
    // checked against this video's captions once, unless already synced.
    showPins();
    const timedElsewhere = c.synced && c.source !== 'custom' && !state.offset && !state.warps[c.id]?.length && !c.autoTried;
    if (!P.syncBtn.hidden && !c.aligned && (!c.synced || timedElsewhere)) {
      c.autoTried = true;
      autoSync(c, true);
    }
  }

  // LRCLIB timed to a release of another length. (Results saved before
  // 0.28 carry the old sentence: its two times are reused.)
  function warnOf(c) {
    let len = c.lenDiff;
    if (!len && c.warn) {
      const m = c.warn.match(/\d+:\d\d/g);
      if (m?.length === 2) len = m;
    }
    if (!len) return c.warn || '';
    const t = (x) => (typeof x === 'number' ? BYL.fmtTime(x) : x);
    return L('📍 Bản này dài {0}, video dài {1}. Nếu lời chạy lệch: rê chuột lên dòng đang hát, bấm 📍 để ghim lời vào đúng lúc đó. Đoạn sau còn lệch thì ghim thêm một dòng ở đoạn đó.', t(len[0]), t(len[1]));
  }

  // 🎯 shows once the video's captions are known (they often come after the lyrics).
  function paintSync() {
    const c = state.current;
    // (Off unless turned on in the settings: most users time the lyrics part by part.)
    P.syncBtn.hidden = !BYL.settings.value.captionSync || !c || c.source === 'transcript' || !api.hasCaptions?.();
    P.row2.hidden = !BYL.settings.value.captionSync;
  }

  // 🎯 pressed: while timed lyrics play, line up the part being sung (it can
  // drift later in a song while the start was right), so each press fixes
  // the spot the user is at; otherwise the whole song.
  async function syncNow(c) {
    const v = video();
    if (c.synced && v && !v.paused && v.currentTime > 8 && api.captionWordsFor && api.hasCaptions?.()) {
      P.syncBtn.disabled = true;
      let done = null;
      try {
        done = await syncHere(c, v.currentTime);
      } catch (err) {
        console.debug('[Better Karaoke] sync here', err);
      }
      P.syncBtn.disabled = false;
      if (done) return;
    }
    return autoSync(c, false);
  }

  async function syncHere(c, now) {
    const words = (await api.captionWordsFor(c.lines)) || [];
    const heard = words.filter((w) => w.t >= now - 15 && w.t <= now + 3);
    const near = singable(c.lines).filter((i) => Math.abs(effT(c.lines[i].t) - now) <= 20);
    if (heard.length < 6 || near.length < 2 || state.current !== c) return null;
    const r = BYL.alignLyrics(near.map((i) => c.lines[i]), heard);
    if (!r?.anchors?.length) return null;
    // The matched line closest to now, pinned where the captions have it.
    const a = r.anchors.reduce((x, y) => (y.t > x.t ? y : x));
    const li = near[a.li];
    const t = c.lines[li].t;
    const d = Math.round((a.t - state.offset - t) * 100) / 100;
    const pts = (state.warps[c.id] || []).filter((p) => Math.abs(p.t - t) > 0.3);
    pts.push({ t, d });
    pts.sort((x, y) => x.t - y.t);
    state.warps[c.id] = pts;
    saveWarps();
    state.lastActive = -2;
    state.userScrollUntil = 0;
    say(L('🎯 Đã canh lại đoạn đang hát: "{0}" theo phụ đề lúc {1}. Đoạn khác lệch thì bấm lại khi đang hát đoạn đó.', c.lines[li].text, BYL.fmtTime(a.t)));
    return true;
  }

  // Line the current lyrics up with the video's captions. Plain lyrics get a
  // time on every line; timed lyrics get the offset worked out for them.
  async function autoSync(c, auto) {
    const tell = (t) => state.current === c && say(t);
    if (!api.captionWordsFor || !api.hasCaptions?.()) return tell(L('Video này không có phụ đề để canh theo.'));
    if (c.syncing) return;
    c.syncing = true;
    P.syncBtn.disabled = true;
    tell(L('🎯 Đang canh lời theo phụ đề YouTube…'));
    let r = null;
    let words = null;
    try {
      words = await api.captionWordsFor(c.lines);
      r = words?.length ? BYL.alignLyrics(c.lines, words) : null;
    } catch (err) {
      console.debug('[Better Karaoke] align', err);
    }
    c.syncing = false;
    P.syncBtn.disabled = false;
    if (state.current !== c) return;
    if (!words?.length) {
      return tell(L('Chưa lấy được phụ đề của video. Thử bấm "🎯 Tự canh theo phụ đề" lại sau khi video đã phát.'));
    }
    if (!r) {
      return tell(
        c.synced
          ? L('Phụ đề của video không khớp với lời này. Chỉnh "Lệch" bằng tay, hoặc bấm 📍 ở dòng đang hát.')
          : L('Phụ đề không khớp với lời này. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.')
      );
    }
    const matched = L('khớp {0}/{1} dòng', r.matchedLines, r.totalLines) + (r.wordLines ? L(', {0} dòng tô theo từng chữ', r.wordLines) : '');
    if (c.synced) {
      // Word timing from the captions, unless the lyrics brought their own.
      if (r.wordLines && !c.lines.some((l) => l.wd)) c.lines = c.lines.map((l, i) => (r.lines[i].wd ? { ...l, wd: r.lines[i].wd } : l));
      // One shift for the whole song when the captions agree on it; sync
      // points along the song when the gap changes (intro, interlude, tempo).
      const pts = warpFromAnchors(c.lines, r.anchors || []);
      const ds = pts.map((p) => p.d);
      const spread = ds.length ? Math.max(...ds) - Math.min(...ds) : 0;
      if (pts.length >= 5 && spread > 0.6) {
        state.warps[c.id] = pts;
        saveWarps();
        setOffset(0);
        tell(L('🎯 Đã canh theo phụ đề YouTube tại {0} điểm trong bài ({1}); lệch từ {2} đến {3}.', pts.length, matched, fmtOffset(Math.min(...ds)), fmtOffset(Math.max(...ds))));
      } else {
        delete state.warps[c.id];
        saveWarps();
        setOffset(r.offset);
        tell(L('🎯 Đã tự chỉnh lệch {0} theo phụ đề YouTube ({1}).', fmtOffset(r.offset), matched));
      }
      return;
    }
    const synced = { ...c, id: c.id + '#sync', synced: true, aligned: true, lines: r.lines, syncing: false };
    const at = state.candidates.indexOf(c);
    if (at >= 0) state.candidates[at] = synced;
    else state.candidates.unshift(synced);
    renderSelect();
    setOffset(0);
    choose(synced, state.manual);
    say(L('🎯 Đã canh lời theo phụ đề YouTube ({0}). Còn lệch thì bấm 📍 cạnh dòng đang hát, hoặc chỉnh "Lệch".', matched));
  }

  // Two slots for the user's own lyrics, so a translation and a re-timed
  // original can both be kept for one video.
  const CUSTOM_SLOTS = ['custom', 'custom2'];
  const baseId = (c) => String(c?.id || '').replace(/#sync$/, '');
  // Where an edit of c is saved: its own slot if it is one, otherwise the
  // slot not holding the translation shown under it.
  const slotFor = (c) => (c?.source === 'custom' && CUSTOM_SLOTS.includes(baseId(c)) ? baseId(c) : baseId(state.trans) === 'custom' ? 'custom2' : 'custom');

  // ---------- timing corrections ----------

  // d at lyric time t, interpolated between the current lyrics' sync points.
  function warpAt(t) {
    const pts = state.current && state.warps[state.current.id];
    if (!pts?.length) return 0;
    if (t <= pts[0].t) return pts[0].d;
    const last = pts[pts.length - 1];
    if (t >= last.t) return last.d;
    let k = 1;
    while (pts[k].t < t) k++;
    const a = pts[k - 1];
    const b = pts[k];
    return a.d + ((b.d - a.d) * (t - a.t)) / (b.t - a.t || 1);
  }
  // Video time at which a lyric time plays.
  // (Lyrics being previewed from the editor already have the offset folded in.)
  const effT = (t) => (state.current?.preview ? t : t + state.offset + warpAt(t));

  // Caption anchors -> sync points, smoothed (median of 5) so one badly timed
  // caption line can't yank its neighbours.
  function warpFromAnchors(lines, anchors) {
    const raw = anchors
      .filter((a) => typeof lines[a.li]?.t === 'number')
      .map((a) => ({ t: lines[a.li].t, d: a.t - lines[a.li].t }));
    return raw.map((p, i) => {
      const win = raw.slice(Math.max(0, i - 2), i + 3).map((x) => x.d).sort((x, y) => x - y);
      return { t: p.t, d: Math.round(win[Math.floor(win.length / 2)] * 100) / 100, auto: true };
    });
  }

  function saveWarps() {
    state.transMap = null;
    for (const k of Object.keys(state.warps)) if (!state.warps[k]?.length) delete state.warps[k];
    BYL.videoStore.patch(state.videoId, { warps: state.warps });
    state.lastActive = -2;
    showPins();
    refreshTitles();
  }

  function showPins() {
    const pts = state.current && state.warps[state.current.id];
    const mine = pts ? pts.filter((p) => !p.auto).length : 0;
    // Lines pinned by the user keep their 📍 in view (click it to unpin).
    const c = state.current;
    for (const n of P.lines.querySelectorAll('.ln[data-i]')) {
      const l = c?.lines[n.dataset.i];
      const p = l && pts?.find((q) => !q.auto && Math.abs(q.t - l.t) < 0.01);
      n.classList.toggle('pinned', !!p);
      const pin = n.querySelector('.pin');
      if (pin) pin.title = p ? L('📍 Đã ghim dòng này vào {0}. Bấm để bỏ ghim.', BYL.fmtTime(l.t + p.d + state.offset)) : L('Đang hát dòng này: canh lời ngay theo dòng này');
    }
    P.pinCount.textContent = !pts?.length ? '' : mine ? L('📍{0} mốc', mine) : L('🎯 theo phụ đề');
    P.pinCount.title = pts?.length ? L('{0} điểm canh trong bài. Bấm số lệch để bỏ hết.', pts.length) : '';
    paintSyncIcon();
    // The pins, each with a way to take it off.
    if (!P.pinList) return;
    P.pinList.replaceChildren();
    for (const p of pts || []) {
      if (p.auto) continue;
      const i = c.lines.findIndex((l) => Math.abs(l.t - p.t) < 0.01);
      if (i < 0) continue;
      const row = el('div', 'pinrow');
      const x = el('button', 'iconbtn');
      x.append(ico('close', 18));
      x.title = L('Bỏ ghim');
      x.addEventListener('click', () => pinLine(i));
      row.append(el('span', 'pt', BYL.fmtTime(c.lines[i].t + p.d + state.offset) + ' · ' + c.lines[i].text), x);
      P.pinList.append(row);
    }
    if (!P.pinList.childElementCount) P.pinList.append(el('div', 'muted', L('Chưa có mốc. Rê chuột lên dòng đang hát rồi bấm 📍 (Alt K).')));
    P.repop?.();
  }

  // ⟳ in the sources column: lit (with a dot) once the timing was changed.
  function paintSyncIcon() {
    if (!P.syncIcon) return;
    const pts = state.current && state.warps[state.current.id];
    const changed = !!state.offset || !!pts?.some((p) => !p.auto);
    P.syncIcon.classList.toggle('adj', changed);
    const tip = L('Lệch') + ' ' + fmtOffset(state.offset) + (P.pinCount.textContent ? ' · ' + P.pinCount.textContent : '');
    P.syncIcon.title = tip;
    P.syncIcon.setAttribute('aria-label', tip);
    P.syncIcon.hidden = !state.current?.synced && !state.anchor;
  }

  function refreshTitles() {
    if (!state.current?.synced) return;
    for (const n of P.lines.querySelectorAll('.ln[data-i]')) {
      n.title = BYL.fmtTime(effT(state.current.lines[n.dataset.i].t));
    }
  }

  function clearSync() {
    const c = state.current;
    if (c) delete state.warps[c.id];
    saveWarps();
    setOffset(0);
    say(L('Đã bỏ chỉnh lệch và các mốc 📍 của lời này.'));
  }

  function setOffset(v) {
    state.offset = Math.round(v * 10) / 10;
    state.transMap = null;
    P.offLabel.textContent = fmtOffset(state.offset);
    P.offLabel.classList.remove('flash');
    void P.offLabel.offsetWidth; // restart the flash animation
    P.offLabel.classList.add('flash');
    state.lastActive = -2;
    refreshTitles();
    paintSyncIcon();
    BYL.videoStore.patch(state.videoId, { offset: state.offset });
  }
  const fmtOffset = (v) => (v > 0 ? '+' : '') + v.toFixed(1) + 's';

  function nudge(d) {
    setOffset(state.offset + d);
    if (!state.current) return;
    if (!state.current.synced && !state.anchor) {
      say(L('Lời này chưa có thời gian nên chưa có gì để chỉnh lệch. Bấm vào dòng đang hát trước đã.'));
      return;
    }
    const dir = d < 0 ? L('sớm hơn {0}s', Math.abs(d)) : L('muộn hơn {0}s', d);
    say(L('Cả bài hiện {0} (tổng lệch {1}). Nếu chỉ một đoạn lệch, bấm 📍 ở dòng đang hát trong đoạn đó thay vì chỉnh cả bài.', dir, fmtOffset(state.offset)));
  }

  // 📍 on a line: "this line is being sung right now". It becomes a sync
  // point: lines around it follow, lines between two points stretch to fit,
  // and parts of the song pinned elsewhere stay as they are.
  function pinLine(i) {
    const c = state.current;
    const v = video();
    if (!c || !v) return;
    if (!c.synced) return onLineClick(i);
    const t = c.lines[i].t;
    // Pinned already: 📍 takes the pin off.
    const had = (state.warps[c.id] || []).find((p) => !p.auto && Math.abs(p.t - t) < 0.01);
    if (had) {
      state.warps[c.id] = state.warps[c.id].filter((p) => p !== had);
      if (!state.warps[c.id].length) delete state.warps[c.id];
      saveWarps();
      state.lastActive = -2;
      showPins();
      return say(L('Đã bỏ ghim dòng "{0}".', c.lines[i].text.slice(0, 40)));
    }
    const d = Math.round((v.currentTime - state.offset - t) * 100) / 100;
    // A hand-placed point overrides caption guesses near it.
    const pts = (state.warps[c.id] || []).filter((p) => Math.abs(p.t - t) > (p.auto ? 12 : 0.3));
    pts.push({ t, d });
    pts.sort((a, b) => a.t - b.t);
    state.warps[c.id] = pts;
    saveWarps();
    showPins();
    state.userScrollUntil = 0;
    const n = pts.filter((p) => !p.auto).length;
    say(
      L('📍 Đã ghim dòng này vào {0} (mốc {1}). ', BYL.fmtTime(v.currentTime), n) +
        (n === 1 ? L('Cả bài dời theo. Nếu đoạn sau vẫn lệch, ghim thêm một dòng ở đoạn đó: chỉ phần giữa hai mốc co giãn, phần đã đúng giữ nguyên.') : L('Các dòng giữa các mốc tự co giãn theo.')) +
        ' ' + L('Dòng đã ghim luôn hiện 📍; bấm vào đó để bỏ ghim.')
    );
  }

  function setFont(delta) {
    const fs = Math.max(18, Math.min(72, BYL.settings.value.overlayFontSize + delta));
    BYL.settings.set({ overlayFontSize: fs });
    sizeAll();
  }

  // ---------- 🎚 key, 🎤 vocal cut ----------

  const fmtKey = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
  // YouTube carries the last speed over to the next video; each song starts
  // at 1× instead. For a moment after a new video (not an ad) starts, any
  // other speed is put back to 1×; the user's own choice after that stays.
  let speedSrc = '';
  let speedUntil = 0;
  function normalSpeed(v) {
    const src = v.currentSrc;
    if (src && src !== speedSrc && !document.querySelector('#movie_player.ad-showing')) {
      speedSrc = src;
      speedUntil = performance.now() + 2500;
    }
    if (performance.now() < speedUntil && v.playbackRate !== 1 && !BYL.ocr?.busy()) {
      v.playbackRate = 1;
      paintSpeed();
    }
  }
  function paintSpeed() {
    const r = video()?.playbackRate || 1;
    for (const b of P.speedBtns) b.classList.toggle('on', Math.abs(Number(b.dataset.rate) - r) < 0.01);
    if (!P.speedRange.matches(':active')) P.speedRange.value = r;
    P.speedRange.style.setProperty('--fill', ((Math.min(3, Math.max(0.25, r)) - 0.25) / 2.75) * 100 + '%');
    P.speedLabel.textContent = (Math.round(r * 100) / 100).toFixed(2).replace('.', BYL.lang === 'vi' ? ',' : '.') + '×';
    P.speedLabel.classList.toggle('on', Math.abs(r - 1) > 0.001);
    if (P.speedChip) {
      const txt = (Math.round(r * 100) / 100).toString().replace('.', BYL.lang === 'vi' ? ',' : '.') + '×';
      if (P.speedChip.dataset.v !== txt) {
        P.speedChip.dataset.v = txt;
        P.speedChip.replaceChildren(ico('speed', 18), el('span', '', txt));
      }
      P.speedChip.classList.toggle('on', Math.abs(r - 1) > 0.001);
    }
  }

  function paintFx() {
    P.keyLabel.textContent = fmtKey(BYL.fx.semis);
    P.keyLabel.classList.toggle('on', !!BYL.fx.semis);
    P.vocalBtn.classList.toggle('on', BYL.fx.vocal > 0);
    P.vocalBtn.textContent = BYL.fx.vocal > 0 ? L('✓ Đang lọc giọng') : L('Bật lọc giọng');
    P.vocalAmt.hidden = !(BYL.fx.vocal > 0);
    P.vocalAmt.style.setProperty('--fill', ((P.vocalAmt.value - P.vocalAmt.min) / (P.vocalAmt.max - P.vocalAmt.min)) * 100 + '%');
    if (P.vocalChip) {
      const on = BYL.fx.vocal > 0;
      P.vocalChip.replaceChildren(ico(on ? 'check' : 'eq', 18), el('span', '', on ? L('🎤 Lọc giọng').replace(/^🎤\s*/, '') + ' ' + Math.round(BYL.fx.vocal * 100) + '%' : L('🎤 Lọc giọng').replace(/^🎤\s*/, '')));
      P.vocalChip.classList.toggle('on', on);
      P.keyStep.classList.toggle('on', !!BYL.fx.semis);
      P.keyStep.replaceChildren(ico('tune', 18), el('span', '', L('🎚 Tông').replace(/^🎚\s*/, '') + ' ' + fmtKey(BYL.fx.semis)));
      P.repop?.();
    }
  }
  // The key is kept per video; byUser: from a button or shortcut (a click,
  // so the sound can start), otherwise the saved key on opening a video.
  async function setKey(n, byUser) {
    const done = await BYL.fx.setSemis(n);
    paintFx();
    if (!byUser) return;
    if (state.videoId) BYL.videoStore.patch(state.videoId, { semis: BYL.fx.semis });
    if (!done) say(L('Không đổi được âm thanh của video này.'));
  }
  async function setVocal(k) {
    const done = await BYL.fx.setVocal(k);
    paintFx();
    if (!done) say(L('Không đổi được âm thanh của video này.'));
  }

  // ---------- export ----------

  // The current lyrics in video time, with the offset and 📍 points applied,
  // so the file plays in step with the video. Null for lyrics without timing.
  function timedLines() {
    const c = state.current;
    if (!c?.synced) return null;
    return c.lines.map((l) => ({ ...l, t: typeof l.t === 'number' ? Math.round(effT(l.t) * 100) / 100 : undefined }));
  }
  const noTiming = () =>
    BYL.settings.value.captionSync
      ? L('Lời này chưa có thời gian từng dòng. Bấm "🎯 Tự canh theo phụ đề" hoặc "⏱ Gõ nhịp" trước rồi xuất.')
      : L('Lời này chưa có thời gian từng dòng. Dùng "⏱ Gõ nhịp" hoặc ✏️ Sửa lời để đặt giờ, rồi xuất.');

  function exportFile(kind) {
    const lines = timedLines();
    if (!lines) return say(noTiming());
    const meta = { title: state.song?.title, artist: state.song?.artist, duration: state.duration, videoId: state.videoId };
    const text =
      kind === 'srt' ? BYL.exporter.toSrt(lines, state.duration) : kind === 'ass' ? assFile(lines, meta) : BYL.exporter.toLrc(lines, meta);
    BYL.exporter.download(text, BYL.exporter.fileName(meta, kind), kind !== 'lrc');
    if (kind === 'ass') return say(L('⬇ Đã lưu file .ass với kiểu chữ đang dùng. Ghép cứng vào video của bạn: ffmpeg -i video.mp4 -vf ass="{0}" video-co-loi.mp4', BYL.exporter.fileName(meta, 'ass')));
    const fixed = state.offset || state.warps[state.current.id]?.length;
    say(L('⬇ Đã lưu file .{0}', kind) + (fixed ? L(', đã tính cả độ lệch và các mốc 📍.') : '.'));
  }

  // 📥 A shared file becomes the user's own lyrics for this video (the
  // ✏️ slot), with its timing; a look in it is added to the presets.
  async function importFile(file) {
    if (!file || !state.videoId) return;
    if (file.size > 2e6) return say(L('File quá lớn.'));
    let got = null;
    try {
      got = BYL.exporter.fromFile(await file.text());
    } catch {}
    const n = got ? BYL.parseLrc(got.lrc).length : 0;
    if (!n) return say(L('Không đọc được lời có thời gian trong file {0}.', file.name));
    if (state.candidates.some((c) => baseId(c) === 'custom') && !confirm(L('Lời bạn đã sửa cho video này sẽ được thay bằng lời trong file. Tiếp tục?'))) return;
    const name = file.name.replace(/\.[^.]+$/, '');
    P.note.textContent = ' ';
    saveCustom(got.lrc, '📥 ' + name.slice(0, 40).trim());
    const notes = [L('📥 Đã nạp {0} dòng lời từ {1}.', n, file.name)];
    if (got.videoId && got.videoId !== state.videoId) notes.push(L('File này làm cho một video khác: nếu lời lệch, chỉnh "Lệch" trong ✏️ Chỉnh lời.'));
    const look = BYL.look.cleanLook(got.look);
    if (look) {
      const preset = (got.title || name).trim().slice(0, 24).trim() || 'Preset';
      const list = (BYL.settings.value.overlayPresets || []).filter((p) => p.name !== preset);
      list.push({ name: preset, look });
      await BYL.settings.set({ overlayPresets: list });
      refreshLook();
      notes.push(L('Kiểu chữ trong file đã thêm vào "Kiểu chữ": ★ {0}.', preset));
    }
    say(notes.join(' '));
  }

  // The look, size, position and translation the overlay shows right now.
  function assFile(lines, meta) {
    const v = video();
    return BYL.exporter.toAss(lines, {
      ...meta,
      look: currentLook(),
      width: v?.videoWidth,
      height: v?.videoHeight,
      fontSize: BYL.settings.value.overlayFontSize,
      shorts: BYL.isShorts(),
      top: BYL.settings.value.overlayPosition === 'top',
      // timedLines() keeps the panel's line order, so the indexes match.
      trans: lines.map((l, i) => transFor(i)),
    });
  }

  async function publishLrclib() {
    const lines = timedLines();
    if (!lines) return say(noTiming());
    const body = lines.filter((l) => typeof l.t === 'number' && !l.section);
    try {
      await BYL.exporter.openPublish({
        videoId: state.videoId,
        trackName: state.song?.title || '',
        artistName: state.song?.artist || '',
        albumName: state.song?.album || '',
        duration: Math.round(state.duration || video()?.duration || 0),
        plainLyrics: body.map((l) => l.text).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        syncedLyrics: BYL.toLrc(body),
      });
      say(L('☁ Đã mở trang gửi lên LRCLIB trong tab mới. Kiểm tra lại tên bài, ca sĩ rồi mới bấm gửi.'));
    } catch (err) {
      say(L('Không mở được trang gửi: ') + (err?.message || err));
    }
  }

  // ---------- rendering ----------

  function renderSelect() {
    const sel = P.select;
    sel.replaceChildren();
    for (const c of state.candidates) {
      const s = S[c.source];
      const o = el('option', '', `${c === bestTimed() ? '★ ' : ''}${s.icon} ${s.name}${c.aligned ? ' 🎯' : c.synced ? ' ⏱' : ''} · ${c.label}${c.detail ? ' · ' + c.detail : ''}`);
      o.value = c.id;
      if (c.aligned || c.synced) o.dataset.timed = c.aligned ? 'aligned' : 'synced';
      sel.append(o);
    }
    if (state.current) sel.value = state.current.id;
    renderTransSelect();
  }

  function renderLines() {
    if (tapping()) return renderTapLines();
    const box = P.lines;
    const keep = box.scrollTop;
    box.replaceChildren();
    const c = state.current;
    box.classList.toggle('synced', !!c?.synced || !!state.anchor);
    P.row2.style.display = P.row3.style.display = P.row4.style.display = c ? '' : 'none';
    renderTransSelect();
    if (!c) {
      const searching = Object.values(state.sourceStatus).some((s) => s === 'loading') || !Object.keys(state.sourceStatus).length;
      box.append(
        el(
          'div',
          'empty',
          searching
            ? L('Đang tìm lời trong comment, các bản đăng khác và các trang lời bài hát…')
            : L('Chưa tìm thấy lời cho video này. Bạn có thể tự nhập (hoặc dịch) lời, extension sẽ nhớ cho video này. Hoặc mở tab "Tìm bản Karaoke".')
        )
      );
      if (!searching) {
        const b = el('button', '', L('✍ Tự nhập lời'));
        b.addEventListener('click', () => openEditor());
        const o = el('button', '', L('🔠 Đọc chữ trên video'));
        o.title = L('Video có chữ lời bài hát trên hình? Tua nhanh video (tắt tiếng) và đọc chữ trên từng khung hình, kèm thời gian. Mất khoảng nửa thời lượng bài.');
        o.addEventListener('click', () => openEditor({ ocr: true }));
        box.lastChild.append(el('br'), b, ' ', o);
      }
      return;
    }
    if (!c.synced) {
      box.append(
        el('div', 'empty', !BYL.settings.value.captionSync
            ? L('Lời này chưa có thời gian. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng; hoặc dùng "⏱ Gõ nhịp".')
            : api.hasCaptions?.()
            ? L('Lời này chưa có thời gian. Bấm "🎯 Tự canh theo phụ đề", hoặc bấm vào dòng đang hát để lời tự cuộn.')
            : L('Lời này chưa có thời gian và video không có phụ đề. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.'))
      );
    }
    c.lines.forEach((l, i) => {
      if (!l.text) {
        box.append(el('div', 'ln blank'));
        return;
      }
      const d = el('div', 'ln' + (l.section ? ' section' : ''), l.text);
      d.dataset.i = i;
      if (c.synced) {
        d.title = BYL.fmtTime(effT(l.t));
        if (!l.section) {
          const pin = el('span', 'pin');
          pin.append(ico('pin', 16));
          pin.title = L('Đang hát dòng này: canh lời ngay theo dòng này');
          d.append(pin);
        }
      }
      const tr = transFor(i);
      if (tr) d.append(el('div', 'tr', tr));
      box.append(d);
    });
    if (box === P.lines) showPins();
    // Another version opens at the line being sung, or where the reader was,
    // never back at the top.
    const v = video();
    const at = c.synced && v ? position(v.currentTime).i : -1;
    const node = at >= 0 ? box.querySelector(`.ln[data-i="${at}"]`) : null;
    box.scrollTop = node ? lineTop(box, node) : keep;
  }

  // ---------- timing ----------

  const video = () => BYL.playerEl()?.querySelector('video') || document.querySelector('video');

  const singable = (lines) => lines.map((l, i) => (l.text && !l.section ? i : -1)).filter((i) => i >= 0);

  // Index of the line being sung at video time `now`, and how far through it (0..1).
  function position(now) {
    const c = state.current;
    if (!c) return { i: -1, p: 0 };
    if (c.synced) {
      const lines = c.lines;
      let i = -1;
      for (let k = 0; k < lines.length; k++) {
        if (effT(lines[k].t) <= now) i = k;
        else break;
      }
      if (i < 0) return { i: -1, p: 0, nextAt: lines[0] ? effT(lines[0].t) : 0 };
      const start = effT(lines[i].t);
      const end = lines[i + 1] ? effT(lines[i + 1].t) : start + 5;
      // A timed end (the singer stops, or holds the last note) wins over the
      // next line's start.
      const dur = lines[i].e > lines[i].t ? Math.max(effT(lines[i].e) - start, 0.3) : Math.min(Math.max(end - start, 0.5), 7);
      return { i, p: Math.min(1, (now - start) / dur), dt: now - start, dur };
    }
    if (!state.anchor) return { i: -1, p: 0 };
    // Plain lyrics: spread the remaining lines evenly over the rest of the song.
    now -= state.offset;
    const idx = singable(c.lines);
    const startPos = idx.indexOf(state.anchor.i);
    const remaining = idx.length - startPos;
    const songEnd = (state.duration || video()?.duration || 0) * 0.95;
    // A Short is a slice of the song, so its length says nothing about pace.
    const per = BYL.isShorts() ? 3.5 : Math.max(1.5, (songEnd - state.anchor.time) / Math.max(1, remaining));
    const step = Math.floor((now - state.anchor.time) / per);
    const pos = Math.max(0, Math.min(idx.length - 1, startPos + step));
    return { i: idx[pos], p: Math.max(0, Math.min(1, ((now - state.anchor.time) % per) / per)) };
  }

  function onLineClick(i) {
    const c = state.current;
    const v = video();
    if (!c || !v) return;
    if (c.synced) {
      v.currentTime = Math.max(0, effT(c.lines[i].t));
    } else {
      state.anchor = { i, time: v.currentTime - state.offset };
      P.lines.classList.add('synced');
    }
    state.userScrollUntil = 0;
    state.lastActive = -2;
  }

  let looping = false;
  let ticks = 0;
  let lastFrame = 0;
  // The line being sung sits a third of the way down the list, not in its
  // middle: the list often runs past the bottom of the window.
  function lineTop(box, node) {
    const seen = Math.min(box.clientHeight, window.innerHeight - Math.max(0, box.getBoundingClientRect().top));
    return node.offsetTop - Math.max(60, seen * 0.3);
  }
  let loopGen = 0;
  function startLoop(restart) {
    if (looping && !restart) return;
    looping = true;
    const gen = ++loopGen;
    const tick = () => {
      if (gen !== loopGen) return;
      if (!panelHost?.isConnected || panelHost.hidden) {
        looping = false;
        O?.host.remove();
        playerBtn?.remove();
        return;
      }
      try {
        // Paused: the lyrics only move on a seek or an edit, so a few
        // frames a second are plenty and spare the battery.
        const v = video();
        const t = performance.now();
        if (!v || !v.paused || t - lastFrame > 200) {
          lastFrame = t;
          frame();
        }
        if (v) normalSpeed(v);
        if (++ticks % 30 === 0) {
          placeFloat(); // Shorts: follow the video if the layout shifts
          shortsLift();
          ensurePlayerBtn();
          keepOnTop();
          paintSpeed(); // YouTube's own speed menu changes it too
        }
      } catch {}
      // A background tab gets no animation frames; the floating window does,
      // so let it drive the loop while it's open.
      (pipWin && !pipWin.closed ? pipWin : window).requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const renderers = () => [state.overlayOn ? O : null, F].filter(Boolean);

  function frame() {
    // An ad: hide the lyrics on the video and leave the panel where the song
    // stopped; everything picks up again when the video comes back.
    if (BYL.adShowing()) {
      if (state.lastActive !== -3) {
        state.lastActive = -3;
        for (const R of renderers()) drawLines(R, null);
      }
      return;
    }
    const v = video();
    if (v) editorTick(v.currentTime);
    if (F_TICK) F_TICK();
    if (!v || !state.current) {
      for (const R of renderers()) drawLines(R, null);
      return;
    }
    const pos = position(v.currentTime);
    if (pos.i !== state.lastActive) {
      state.lastActive = pos.i;
      P.lines.querySelectorAll('.ln.active').forEach((n) => n.classList.remove('active'));
      const li = state.current.lines[pos.i]?.src ?? pos.i; // while tapping: index in the full list
      const node = pos.i >= 0 ? P.lines.querySelector(`.ln[data-i="${li}"]`) : null;
      if (node) {
        node.classList.add('active');
        if (Date.now() > state.userScrollUntil) {
          const box = P.lines;
          box.scrollTo({ top: lineTop(box, node), behavior: 'smooth' });
        }
      }
      for (const R of renderers()) buildLines(R, pos);
    }
    for (const R of renderers()) drawLines(R, pos);
  }

  // ---------- second language ----------

  // Another candidate (usually a translation) shown under each line. Timed
  // against timed lyrics it is matched by time, otherwise line by line.
  function setTrans(c, persist) {
    state.trans = c && c !== state.current ? c : null;
    state.transMap = null;
    if (persist) BYL.videoStore.patch(state.videoId, { trans: state.trans });
    renderLines();
    state.lastActive = -2;
  }

  function renderTransSelect() {
    const sel = P.transSel;
    sel.replaceChildren();
    const add = (c) => {
      const o = el('option', '', c ? `${S[c.source].icon} ${c.label}${c.detail ? ' · ' + c.detail : ''}` : L('Không'));
      o.value = c ? c.id : '';
      sel.append(o);
    };
    add(null);
    // Korean / Japanese / Chinese lyrics can show their Latin spelling.
    const cur = state.current;
    const script = cur && cur.source !== 'roman' ? BYL.romanize.scriptOf(cur.lines.map((l) => l.text).join('\n')) : null;
    if (script) {
      const o = el('option', '', L('🔤 Phiên âm Latin') + ` (${{ ko: 'Hangul', ja: 'Kana', zh: 'Pinyin' }[script]})`);
      o.value = 'roman';
      sel.append(o);
    }
    const list = state.candidates.filter((c) => c !== state.current && c.id !== 'tap');
    if (state.trans && state.trans.source !== 'roman' && !list.includes(state.trans)) list.unshift(state.trans);
    list.forEach(add);
    sel.value = state.trans?.source === 'roman' ? 'roman' : state.trans?.id || '';
    P.rowT.style.display = state.current ? '' : 'none';
    if (P.transChip) {
      const tr = state.trans;
      P.transChip.textContent = !tr ? L('Không') : tr.tlang ? tr.tlang.split('-')[0].toUpperCase() : tr.source === 'roman' ? 'Aa' : '✓';
      P.transChip.classList.toggle('on', !!tr);
      P.transChip.parentElement.hidden = !state.current;
    }
    P.swapBtn.hidden = P.trSwap.hidden = !state.trans;
    markOriginal();
    P.rowTr.hidden = !(cur && singable(cur.lines).length);
    // The language list shows what is on: "Không" with no translation, else its language.
    if (!state.trans) P.trLang.value = '';
    else if (state.trans.tlang) P.trLang.value = state.trans.tlang;
    else if (!P.trLang.value) P.trLang.value = BYL.translate.defaultLang(BYL.settings.value.transLang);
    P.trBtn.disabled = !P.trLang.value;
  }

  // 🌐 The lyrics playing, translated line for line (times kept), saved as the
  // user's second version and shown under each line. The slot: the one not
  // holding the user's own lyrics (a translation made before is replaced).
  // "(Gốc)" after the language the lyrics are in: of the two shown, the one
  // that is not a translation.
  function markOriginal() {
    const orig = [state.current, state.trans].find((c) => c && !c.tlang && c.source !== 'roman');
    if (orig && !orig._lang) orig._lang = BYL.translate.langOf(orig.lines.map((l) => l.text).join('\n')) || '-';
    const code = orig?._lang;
    for (const o of P.trLang.options) {
      if (!o.value) continue;
      const name = BYL.translate.nameOf(o.value);
      o.textContent = o.value === code ? `${name} ${L('(Gốc)')}` : name;
    }
  }

  async function translateTo(tl) {
    const c = state.current;
    if (!c) return;
    const name = BYL.translate.nameOf(tl);
    const idx = singable(c.lines);
    const mainSlot = c.source === 'custom' ? baseId(c) : null;
    const used = (s) => state.candidates.find((x) => baseId(x) === s && !x.tlang);
    const slot = mainSlot ? CUSTOM_SLOTS.find((s) => s !== mainSlot) : used('custom') ? 'custom2' : 'custom';
    if (slot !== mainSlot && used(slot) && !confirm(L('Bản dịch sẽ thay chỗ "{0}" bạn đã lưu cho video này. Tiếp tục?', used(slot).label))) return renderTransSelect();
    say(L('文A Đang dịch lời sang {0}…', name));
    P.transSel.disabled = P.trBtn.disabled = P.trLang.disabled = true;
    let r = null;
    try {
      r = await BYL.translate.lines(idx.map((i) => c.lines[i].text), tl);
    } catch (err) {
      say(L('Không dịch được lời: {0}', err?.message || err));
    }
    P.transSel.disabled = P.trLang.disabled = false;
    P.trBtn.disabled = !P.trLang.value;
    if (!r || state.current !== c) return renderTransSelect();
    // Times on the video's clock (offset folded in), like any lyrics the user saves.
    const at = new Map(idx.map((i, k) => [i, r.lines[k]]));
    const lines = c.lines.map((l, i) => {
      const text = at.has(i) ? at.get(i) || l.text : l.text;
      if (typeof l.t !== 'number') return { text, section: l.section };
      return { text, t: effT(l.t), ...(l.e > l.t ? { e: effT(l.e) } : {}) };
    });
    const text = c.synced ? BYL.toLrc(lines) : lines.map((l) => l.text).join('\n');
    const label = L('Bản dịch {0}', name);
    BYL.videoStore.patch(state.videoId, { [slot]: { text, label, lang: tl } });
    const t = Object.assign(customCandidate(text, label, slot), { tlang: tl });
    state.candidates = state.candidates.filter((x) => baseId(x) !== slot);
    state.candidates.push(t);
    setSourceStatus('custom', 'ok', state.candidates.filter((x) => x.source === 'custom').length);
    renderSelect();
    setTrans(t, true);
    renderTransSelect();
    say(
      (r.from && r.from === tl.split('-')[0] ? L('Lời này có vẻ đã là {0}. ', name) : '') +
        L('文A Đã dịch sang {0} và lưu thành bản lời thứ 2 của bạn ("{1}"), hiện dưới từng dòng. Bấm ⇅ để đổi chỗ, hoặc chọn bản này rồi ✏️ Sửa lời để chỉnh câu chữ.', name, label)
    );
  }

  // The current lyrics spelt in Latin letters, as a second-language candidate.
  async function romanTrans(c, persist) {
    const r = await BYL.romanize.lines(c.lines);
    if (state.current !== c) return;
    if (!r) return setTrans(null, persist);
    setTrans({ id: 'roman', source: 'roman', label: L('Phiên âm Latin'), synced: c.synced, lines: r.lines, romanOf: c.id }, persist);
    renderTransSelect();
  }

  function transFor(i) {
    const c = state.current;
    const tr = state.trans;
    if (!c || !tr || tr === c || i < 0) return '';
    if (state.transMap?.c !== c) state.transMap = { c, m: matchTrans(c, tr) };
    return state.transMap.m[i] || '';
  }

  function matchTrans(c, tr) {
    // A Latin spelling has the very same lines.
    if (tr.romanOf) return tr.romanOf === c.id ? Object.fromEntries(c.lines.map((l, i) => [i, tr.lines[i]?.text])) : {};
    const a = singable(c.lines);
    const b = singable(tr.lines);
    const m = {};
    if (c.synced && tr.synced) {
      let hit = 0;
      for (const i of a) {
        const t = effT(c.lines[i].t);
        let best = -1;
        let gap = 2.5;
        for (const j of b) {
          const d = Math.abs(tr.lines[j].t - t);
          if (d < gap) {
            gap = d;
            best = j;
          }
        }
        if (best >= 0) {
          m[i] = tr.lines[best].text;
          hit++;
        }
      }
      if (hit >= a.length * 0.5) return m;
    }
    a.forEach((i, k) => {
      if (b[k] !== undefined) m[i] = tr.lines[b[k]].text;
    });
    return m;
  }

  // ---------- lyric renderers (on the video / floating window) ----------

  function makeRenderer(doc, pip) {
    const host = doc.createElement('div');
    host.id = pip ? 'byl-pip-host' : 'byl-overlay-host';
    if (pip) host.toggleAttribute('data-pip', true);
    const root = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = OVERLAY_CSS;
    const ov = doc.createElement('div');
    ov.className = 'ov';
    root.append(style, ov);
    const R = { host, ov, words: [], total: 0, pip };
    loadFont(doc.defaultView);
    paintLook(host, currentLook());
    return R;
  }

  const resizeWatch = new ResizeObserver(() => sizeAll());
  function ensureOverlay() {
    const player = BYL.playerEl();
    if (!player) return false;
    if (!O) O = makeRenderer(document, false);
    if (O.host.parentElement !== player) {
      player.append(O.host);
      resizeWatch.observe(player);
      paintLook(O.host, currentLook());
    }
    sizeAll();
    return true;
  }

  function sizeAll() {
    const base = BYL.settings.value.overlayFontSize * (currentLook().scale / 100);
    const player = BYL.playerEl();
    // Font scales with the player so fullscreen gets big text automatically;
    // the narrow, upright Shorts player gets its own scale.
    const ref = BYL.isShorts() ? 560 : 1280;
    if (O && player) O.host.style.fontSize = base * Math.max(0.5, player.clientWidth / ref) + 'px';
    shortsLift();
    if (F && pipWin) F.host.style.fontSize = base * Math.max(0.45, pipWin.innerWidth / 600) + 'px';
  }

  // Shorts lay the title, channel and song over the bottom of the video: keep
  // the lyrics just above that block, however tall it is for this Short.
  function shortsLift() {
    if (!O) return;
    const player = BYL.playerEl();
    if (!player || !BYL.isShorts() || BYL.settings.value.overlayPosition === 'top') {
      O.host.style.removeProperty('--lift');
      return;
    }
    const p = player.getBoundingClientRect();
    let lift = p.height * 0.15; // fallback if YouTube renames the panel
    for (const m of document.querySelectorAll('yt-reel-metapanel-view-model, ytd-reel-player-overlay-renderer #metapanel')) {
      const r = m.getBoundingClientRect();
      if (r.height && r.left < p.right && r.right > p.left && r.top > p.top + p.height / 2 && r.top < p.bottom) {
        lift = p.bottom - r.top + 8;
        break;
      }
    }
    O.host.style.setProperty('--lift', Math.round(lift) + 'px');
  }

  function setMode(mode, byUser) {
    if (!['sing', 'edit', 'karaoke'].includes(mode)) mode = 'sing'; // 👀 Xem lời is gone
    P.wrap.dataset.mode = mode;
    for (const b of P.modeBtns) b.classList.toggle('on', b.dataset.mode === mode);
    P.closePop?.();
    P.picks.hidden = true;
    showPage(null);
    if (byUser) BYL.settings.set({ panelMode: mode });
  }

  // 🕘 Đã xem takes the place of the lyrics until ← Quay lại.
  function showPage(page) {
    const karaoke = !page && P.wrap.dataset.mode === 'karaoke';
    P.nav.hidden = !!page;
    P.lyricTab.hidden = !!page || karaoke;
    P.karaokeTab.hidden = !karaoke;
    P.historyTab.hidden = page !== 'history';
    P.wrap.classList.toggle('sub', !!page || P.wrap.dataset.mode !== 'sing');
    P.wrap.dataset.page = page || '';
    if (page === 'history') renderHistory();
    if (karaoke) loadKaraoke();
  }

  // Hát cùng: the singing tools in the dock (speed, vocal cut, key, mic).
  const singOn = () => BYL.settings.value.singTools !== false;
  function paintDock() {
    if (!P.dock) return;
    const on = singOn();
    P.wrap.classList.toggle('notools', !on);
    P.saBtn.classList.toggle('on', on);
    P.saBtn.setAttribute('aria-checked', String(on));
    if (!on) P.closePop();
    paintSpeed();
    paintFx();
  }

  function paintAuto() {
    if (!P) return;
    const on = !!BYL.settings.value.karaokeAuto;
    P.autoBtn.replaceChildren(ico(on ? 'boxOn' : 'boxOff', 20), el('span', 'mt', L('Tự bật Karaoke khi mở video')));
    P.autoBtn.classList.toggle('on', on);
  }

  function setOverlay(on, byUser) {
    state.overlayOn = on;
    for (const b of [P.overlayBtn, P.overlayBtnH]) {
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
    paintPlayerBtn();
    if (byUser && on && !P.khint.hidden) {
      P.khint.hidden = true;
      BYL.settings.set({ karaokeHintDone: true });
    }
    if (on && ensureOverlay()) {
      state.lastActive = -2; // force rebuild
    } else if (O) {
      O.host.remove();
    }
  }

  // 🎤 in YouTube's own control bar, next to ⚙ and CC: turns the lyrics on
  // the video on and off without opening the panel, also in fullscreen.
  // YouTube rebuilds the bar now and then, so the loop puts it back.
  let playerBtn = null;
  function ensurePlayerBtn() {
    const bar = !BYL.isShorts() && document.querySelector('#movie_player .ytp-right-controls');
    if (!bar) return playerBtn?.remove();
    if (!playerBtn) {
      if (!document.getElementById('byl-ytp-style')) {
        const css = el('style');
        css.id = 'byl-ytp-style';
        css.textContent =
          '.byl-ytp-btn{position:relative;display:inline-flex!important;align-items:center;justify-content:center}' +
          '.byl-ytp-btn svg{width:60%;height:60%;max-width:28px;max-height:28px;fill:#fff;opacity:.9}' +
          '.byl-ytp-btn::after{content:"";display:block!important;position:absolute;left:28%;right:28%;bottom:18%;height:3px;border-radius:2px;background:#f00;transform:scaleX(0);transition:transform .15s}' +
          '.byl-ytp-btn[aria-pressed=true]::after{transform:scaleX(1)}' +
          '.byl-ytp-btn[aria-pressed=true] svg{opacity:1}';
        document.head.append(css);
      }
      playerBtn = el('button', 'ytp-button byl-ytp-btn');
      playerBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
      playerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOverlay(!state.overlayOn, true);
      });
    }
    if (playerBtn.parentElement !== bar) bar.prepend(playerBtn);
    paintPlayerBtn();
  }
  function paintPlayerBtn() {
    if (!playerBtn) return;
    const tip = 'Karaoke (Alt L)';
    playerBtn.setAttribute('aria-pressed', String(!!state.overlayOn));
    playerBtn.setAttribute('aria-label', tip);
    playerBtn.title = tip;
  }

  // Floating window: Document Picture-in-Picture keeps a small always-on-top
  // window with the lyrics, even when the user switches tabs or apps.
  async function togglePip() {
    if (pipWin && !pipWin.closed) {
      pipWin.close();
      return;
    }
    const dpip = window.documentPictureInPicture;
    if (!dpip) {
      say(L('Trình duyệt này chưa hỗ trợ cửa sổ nổi (cần Chrome 116 trở lên).'));
      return;
    }
    try {
      pipWin = await dpip.requestWindow({ width: 640, height: 260 });
    } catch (err) {
      say(L('Không mở được cửa sổ nổi: ') + (err?.message || err));
      return;
    }
    const d = pipWin.document;
    const css = d.createElement('style');
    css.textContent = `
      html, body { margin: 0; height: 100%; overflow: hidden; background: #0d0d12; color: #fff;
        font-family: Roboto, Arial, sans-serif; }
      body { background: radial-gradient(ellipse at top, #24203a, #0d0d12 70%); }
      .bar { position: absolute; top: 0; left: 0; right: 0; padding: 6px 10px; font-size: 12px; color: rgba(255,255,255,.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; }
      .stage { position: absolute; inset: 22px 0 0; }
      /* Player controls: shown while the mouse is over the window, like
         YouTube's own mini player. */
      .ctl { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 18px 12px 8px;
        background: linear-gradient(transparent, rgba(0,0,0,.75)); opacity: 0; transition: opacity .2s; }
      body.show .ctl, .ctl:focus-within { opacity: 1; }
      .seek { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,.75);
        font-variant-numeric: tabular-nums; }
      .seek input { flex: 1; accent-color: #ff2e63; margin: 0; height: 14px; cursor: pointer; }
      .btns { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 4px; }
      .btns button { font: inherit; color: #fff; background: none; border: 0; border-radius: 999px; cursor: pointer;
        width: 36px; height: 36px; font-size: 16px; display: grid; place-items: center; }
      .btns button:hover { background: rgba(255,255,255,.15); }
      .btns button.big { width: 46px; height: 46px; font-size: 22px; background: rgba(255,255,255,.12); }
      .btns svg { width: 1em; height: 1em; fill: currentColor; }`;
    const bar = d.createElement('div');
    bar.className = 'bar';
    const stage = d.createElement('div');
    stage.className = 'stage';
    d.head.append(css);
    d.body.append(bar, stage, buildPipControls(d));
    F = makeRenderer(d, true);
    F.bar = bar;
    stage.append(F.host);
    let hideTimer;
    const wake = () => {
      d.body.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => d.body.classList.remove('show'), 2500);
    };
    d.addEventListener('mousemove', wake);
    d.addEventListener('mouseleave', () => d.body.classList.remove('show'));
    // Space / arrows work in the window too.
    d.addEventListener('keydown', (e) => {
      const v = video();
      if (!v) return;
      if (tapping() && (e.key === ' ' || e.key === 'Backspace')) {
        e.preventDefault();
        return e.key === ' ' ? tap() : tapUndo();
      }
      if (e.key === ' ' || e.key === 'k') v.paused ? v.play() : v.pause();
      else if (e.key === 'ArrowLeft') v.currentTime -= 5;
      else if (e.key === 'ArrowRight') v.currentTime += 5;
      else return;
      e.preventDefault();
      wake();
    });
    pipTitle();
    sizeAll();
    pipWin.addEventListener('resize', sizeAll);
    pipWin.addEventListener('pagehide', () => {
      F = null;
      F_TICK = null;
      pipWin = null;
      P.pipBtn.classList.remove('on');
      startLoop(true); // the loop was riding on the closed window's frames
    });
    P.pipBtn.classList.add('on');
    state.lastActive = -2;
  }

  const ICON = {
    play: 'M8 5v14l11-7z',
    scan: 'M7 3H4v3H2V1h5v2zm15 3V1h-5v2h3v3h2zM7 21H4v-3H2v5h5v-2zm13-3v3h-3v2h5v-5h-2zM19 18c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v12zM15 8H9v2h6V8zm0 3H9v2h6v-2zm0 3H9v2h6v-2z',
    pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
    prevSong: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
    nextSong: 'M16 6h2v12h-2zM6 18l8.5-6L6 6z',
    prevLine: 'M11 18V6l-8.5 6zm.5-6 8.5 6V6z',
    nextLine: 'M4 18l8.5-6L4 6zm9-12v12l8.5-6z',
  };
  const svgIcon = (doc, name) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = doc.createElementNS(ns, 'path');
    path.setAttribute('d', ICON[name]);
    svg.append(path);
    return svg;
  };

  // Previous / next video: playlist buttons on watch pages, swipe on Shorts.
  function skipVideo(dir) {
    const v = video();
    if (BYL.isShorts()) {
      document.querySelector(`#navigation-button-${dir > 0 ? 'down' : 'up'} button`)?.click();
      return;
    }
    const btn = BYL.playerEl()?.querySelector(dir > 0 ? '.ytp-next-button' : '.ytp-prev-button');
    if (btn && getComputedStyle(btn).display !== 'none' && (dir > 0 || v?.currentTime < 3)) btn.click();
    else if (dir < 0 && v) v.currentTime = 0; // like a music player: back to the start first
    else btn?.click();
  }

  // Previous / next lyric line (timed lyrics), otherwise ±5 s.
  function skipLine(dir) {
    const v = video();
    const c = state.current;
    if (!v) return;
    if (!c?.synced) {
      v.currentTime = Math.max(0, v.currentTime + dir * 5);
      return;
    }
    const idx = singable(c.lines);
    const now = position(v.currentTime).i;
    let k = idx.indexOf(now);
    // "Previous" restarts the current line if we're well into it.
    if (dir < 0 && k >= 0 && v.currentTime - effT(c.lines[idx[k]].t) > 1.5) k += 1;
    const target = idx[Math.max(0, Math.min(idx.length - 1, (k < 0 ? (dir > 0 ? -1 : 0) : k) + dir))];
    if (target !== undefined) v.currentTime = Math.max(0, effT(c.lines[target].t) - 0.05);
  }

  function buildPipControls(d) {
    const box = d.createElement('div');
    box.className = 'ctl';
    const seek = d.createElement('div');
    seek.className = 'seek';
    const cur = d.createElement('span');
    const range = d.createElement('input');
    range.type = 'range';
    range.min = 0;
    range.max = 1000;
    range.value = 0;
    const total = d.createElement('span');
    seek.append(cur, range, total);
    const btns = d.createElement('div');
    btns.className = 'btns';
    const mk = (icon, title, fn, cls) => {
      const b = d.createElement('button');
      b.title = title;
      if (cls) b.className = cls;
      b.append(svgIcon(d, icon));
      b.addEventListener('click', fn);
      btns.append(b);
      return b;
    };
    mk('prevSong', L('Bài trước'), () => skipVideo(-1));
    mk('prevLine', L('Câu trước'), () => skipLine(-1));
    const play = mk('play', L('Phát / dừng (Space)'), () => {
      const v = video();
      if (v) v.paused ? v.play() : v.pause();
    }, 'big');
    mk('nextLine', L('Câu sau'), () => skipLine(1));
    mk('nextSong', L('Bài sau'), () => skipVideo(1));
    box.append(seek, btns);

    let dragging = false;
    range.addEventListener('input', () => {
      dragging = true;
      const v = video();
      if (v?.duration) cur.textContent = BYL.fmtTime((range.value / 1000) * v.duration);
    });
    range.addEventListener('change', () => {
      const v = video();
      if (v?.duration) v.currentTime = (range.value / 1000) * v.duration;
      dragging = false;
    });
    let wasPaused = null;
    F_TICK = () => {
      const v = video();
      if (!v) return;
      if (v.paused !== wasPaused) {
        wasPaused = v.paused;
        play.replaceChildren(svgIcon(d, v.paused ? 'play' : 'pause'));
        // Paused: keep the controls up so it's obvious how to resume.
        d.body.classList.toggle('show', v.paused || d.body.classList.contains('show'));
      }
      if (!dragging && v.duration) {
        range.value = Math.round((v.currentTime / v.duration) * 1000);
        cur.textContent = BYL.fmtTime(v.currentTime);
        total.textContent = BYL.fmtTime(v.duration);
      }
    };
    return box;
  }
  let F_TICK = null;

  function pipTitle() {
    if (!F?.bar) return;
    const s = state.song;
    F.bar.textContent = s ? `🎤 ${s.title || ''}${s.artist ? ' — ' + s.artist : ''}` : '🎤 Better Karaoke';
    if (pipWin) pipWin.document.title = s?.title || 'Better Karaoke';
  }

  // Break a long line in two near the middle so it doesn't run edge to edge.
  const splitAt = (words) => {
    const len = words.join('').length;
    if (len < 44) return -1;
    let best = -1;
    let acc = 0;
    words.forEach((w, i) => {
      acc += w.length;
      if (/^\s+$/.test(w) && (best < 0 || Math.abs(acc - len / 2) < Math.abs(best.acc - len / 2))) best = { i, acc };
    });
    return best < 0 ? -1 : best.i;
  };

  function wordLine(R, text, cls, track) {
    // Caption speaker marks (">>") never belong on screen, whatever the source.
    text = String(text).replace(/(^|\s)(>>+|&gt;&gt;|»)(?=\s|$)/g, ' ').trim() || '♪';
    const line = el('div', 'l ' + cls);
    const words = text.split(/(\s+)/).filter(Boolean);
    const br = R.host.dataset.layout === 'single' && !R.pip ? -1 : splitAt(words);
    const len = words.join('').length;
    // Very long lines (captions, comment paste-ups) shrink a little.
    if (len > 60) line.style.fontSize = Math.max(0.7, 60 / len) + 'em';
    let total = 0;
    words.forEach((w, i) => {
      if (i === br) {
        line.append(el('br'));
        return;
      }
      if (/^\s+$/.test(w)) {
        line.append(document.createTextNode(' '));
        return;
      }
      const span = el('span', 'w');
      span.dataset.t = w;
      span.append(el('span', 'b', w));
      if (track) {
        const f = el('span', 'f', w);
        f.dataset.t = w;
        f.setAttribute('aria-hidden', 'true');
        span.append(f);
        R.words.push({ span, start: total, end: total + w.length, p: -1 });
      }
      total += w.length;
      line.append(span);
    });
    if (track) R.total = total;
    return line;
  }

  function buildLines(R, pos) {
    if (R === O && !ensureOverlay()) return;
    const c = state.current;
    const ov = R.ov;
    ov.replaceChildren();
    R.words = [];
    R.total = 0;
    if (!c) return;
    const idx = singable(c.lines);
    if (pos.i < 0) {
      const hint = c.synced ? '♪' : L('Bấm vào dòng đang hát trong panel bên phải để bắt đầu');
      ov.append(el('div', 'l hint', hint));
      const first = c.lines[idx[0]];
      if (first && c.synced) ov.append(wordLine(R, first.text, 'next', false));
      return;
    }
    const k = idx.indexOf(pos.i);
    const prev = k > 0 ? c.lines[idx[k - 1]] : null;
    const next = k >= 0 && k < idx.length - 1 ? c.lines[idx[k + 1]] : null;
    const curLine = c.lines[pos.i];
    // Staggered karaoke alternates which side the sung line sits on.
    ov.classList.toggle('flip', k % 2 === 1);
    if (prev) ov.append(wordLine(R, prev.text, 'prev', false));
    ov.append(wordLine(R, curLine.section || !curLine.text ? '♪' : curLine.text, 'cur', true));
    const tr = transFor(pos.i);
    if (tr) {
      const line = wordLine(R, tr, 'tr', false);
      // Long lines come back with their own shrink factor: keep it relative.
      line.style.fontSize = `calc(var(--trs, .7em) * ${parseFloat(line.style.fontSize) || 1})`;
      ov.append(line);
    }
    if (next) ov.append(wordLine(R, next.text, 'next', false));
  }

  // With per-word times (enhanced LRC, auto captions) each word lights up
  // when it is sung instead of the wipe running evenly over the line.
  function wordLit(R, pos) {
    const wd = state.current?.lines[pos.i]?.wd;
    if (!wd || pos.dt === undefined || wd.length !== R.words.length) return null;
    let k = -1;
    while (k + 1 < wd.length && wd[k + 1] <= pos.dt) k++;
    if (k < 0) return 0;
    const w = R.words[k];
    // The last word of a line with a timed end lasts until that end.
    const held = wd[k + 1] === undefined && state.current.lines[pos.i].e;
    const len = Math.min(Math.max((wd[k + 1] ?? pos.dur) - wd[k], 0.15), held ? Infinity : 1.5);
    return w.start + Math.min(1, (pos.dt - wd[k]) / len) * (w.end - w.start);
  }

  function drawLines(R, pos) {
    if (!pos) {
      R.ov.replaceChildren();
      return;
    }
    // Wipe through the words in proportion to how far through the line we
    // are, or light the whole line at once.
    const whole = currentLook().wipe === 'line';
    const lit = pos.i < 0 ? 0 : whole ? Infinity : wordLit(R, pos) ?? pos.p * (R.total || 1);
    for (const w of R.words) {
      const p = Math.round(Math.max(0, Math.min(1, (lit - w.start) / (w.end - w.start))) * 50) * 2;
      if (p !== w.p) {
        w.p = p;
        // Fully sung: open the clip past the right edge so the outline isn't cut.
        w.span.style.setProperty('--p', p === 100 ? '130%' : p + '%');
        w.span.classList.toggle('s', p > 0);
      }
    }
  }

  // ---------- parts in their own files ----------

  // ui-editor.js, ui-tap.js, ui-tabs.js get the state and helpers they use
  // from here. These stand-ins are hoisted, so the parts can call each other
  // and the code above can call them before they're set up.
  const parts = {};
  function customCandidate(...a) {
    return parts.editor.customCandidate(...a);
  }
  function closeEditor(...a) {
    return parts.editor.closeEditor(...a);
  }
  function editorTick(...a) {
    return parts.editor.editorTick(...a);
  }
  function openEditor(...a) {
    return parts.editor.openEditor(...a);
  }
  function saveCustom(...a) {
    return parts.editor.saveCustom(...a);
  }
  function tap(...a) {
    return parts.tap.tap(...a);
  }
  function tapJump(...a) {
    return parts.tap.tapJump(...a);
  }
  function endTap(...a) {
    return parts.tap.endTap(...a);
  }
  function tapUndo(...a) {
    return parts.tap.tapUndo(...a);
  }
  function stopTap(...a) {
    return parts.tap.stopTap(...a);
  }
  function renderTapLines(...a) {
    return parts.tap.renderTapLines(...a);
  }
  function startTap(...a) {
    return parts.tap.startTap(...a);
  }
  function tapping(...a) {
    return parts.tap.tapping(...a);
  }
  function openCompare(...a) {
    return parts.compare.openCompare(...a);
  }
  function resetCustom(...a) {
    return parts.compare.resetCustom(...a);
  }
  function paintFav(...a) {
    return parts.tabs.paintFav(...a);
  }
  function renderHistory(...a) {
    return parts.tabs.renderHistory(...a);
  }
  function loadKaraoke(...a) {
    return parts.tabs.loadKaraoke(...a);
  }
  function remember(...a) {
    return parts.tabs.remember(...a);
  }

  // main.js fills in onLoadSource, hasCaptions and captionWordsFor per video.
  // Keyboard shortcuts (keys.js). Each returns a short note for the toast.
  const actions = {
    overlay: () => (setOverlay(!state.overlayOn, true), state.overlayOn ? L('Lời trên video: bật') : L('Lời trên video: tắt')),
    pip: () => (togglePip(), L('Cửa sổ lời nổi')),
    nudge: (d) => (nudge(d), L('Lệch ') + fmtOffset(state.offset)),
    pin: () => {
      const v = video();
      const i = state.current && v ? position(v.currentTime).i : -1;
      if (i < 0) return L('Chưa có dòng nào đang hát');
      pinLine(i);
      return L('📍 Đã ghim dòng đang hát');
    },
    font: (d) => (setFont(d), L('Cỡ chữ ') + BYL.settings.value.overlayFontSize),
    key: (d) => (setKey(BYL.fx.semis + d, true), L('🎚 Tông {0}', fmtKey(Math.max(-6, Math.min(6, BYL.fx.semis + d))))),
    vocal: () => {
      const on = !(BYL.fx.vocal > 0);
      setVocal(on ? Number(P.vocalAmt.value) / 100 : 0);
      return on ? L('🎤 Lọc giọng: bật') : L('🎤 Lọc giọng: tắt');
    },
  };
  // Line being sung right now (score.js), -1 before the first one.
  const lineNow = () => {
    const v = video();
    return state.current && v ? position(v.currentTime).i : -1;
  };
  const api = { paintAuto, captionsReady: () => paintSync(), lineNow, mount, remount, relang, stale, hide, setOverlay, reset, setSong, setSourceStatus, addCandidates, state, actions, onLoadSource: null };
  const ctx = { P, S, ico, addCandidates, api, baseId, choose, closeEditor, effT, el, frame, maybeAutoPick, renderLines, renderSelect, saveCustom, saveWarps, say, setOffset, setSourceStatus, singable, slot, slotFor, state, stopTap, tap, tapping, video };
  for (const k of ['editor', 'tap', 'tabs', 'compare']) parts[k] = BYL.uiParts[k](ctx);
  return api;
})();
