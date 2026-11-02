'use strict';

// Shared helpers. Every content script hangs its pieces off one global, BYL.
var BYL = (globalThis.BYL = globalThis.BYL || {});

// ---------- settings ----------

BYL.DEFAULTS = {
  enabled: true, // master switch in the toolbar popup
  uiLang: 'auto', // 'auto' | 'vi' | 'en', see i18n.js
  srcDescription: true,
  srcComments: true,
  srcDuplicates: true,
  srcLrclib: true,
  srcHopamchuan: true,
  srcTranscript: true,
  preferSynced: false,
  commentPages: 3,
  overlayFontSize: 34,
  overlayStyle: 'classic',
  overlayPosition: 'bottom',
  overlayOnByDefault: false,
  overlayLook: null, // edits on top of the chosen style (🎨 in the panel)
  overlayPresets: [], // [{ name, look }] saved by the user
  channelStyles: {}, // channel name -> { style, look } pinned with 📌
  panelCollapsed: false,
  linesHeight: 0, // lyric list height set by dragging its bottom edge (0 = auto)
};

// Shorts play in their own player and page layout.
BYL.isShorts = () => location.pathname.startsWith('/shorts/');
BYL.playerEl = () => document.getElementById(BYL.isShorts() ? 'shorts-player' : 'movie_player');

// The look edits and saved presets live in storage.local: storage.sync caps
// each item at 8 KB (about 20 presets) and limits writes per minute. The
// service worker moves them over from older versions (background.js).
BYL.LOCAL_SETTINGS = ['overlayLook', 'overlayPresets', 'channelStyles'];

BYL.settings = {
  value: { ...BYL.DEFAULTS },
  async load() {
    try {
      const local = Object.fromEntries(BYL.LOCAL_SETTINGS.map((k) => [k, BYL.DEFAULTS[k]]));
      const got = await chrome.storage.sync.get(BYL.DEFAULTS);
      Object.assign(got, await chrome.storage.local.get(local));
      this.value = { ...BYL.DEFAULTS, ...got };
      BYL.setLang(this.value.uiLang);
    } catch {
      this.value = { ...BYL.DEFAULTS };
    }
    return this.value;
  },
  // Resolves false if the save failed (the value still applies until reload).
  async set(patch) {
    Object.assign(this.value, patch);
    const local = {};
    const sync = {};
    for (const [k, v] of Object.entries(patch)) (BYL.LOCAL_SETTINGS.includes(k) ? local : sync)[k] = v;
    try {
      if (Object.keys(local).length) await chrome.storage.local.set(local);
      if (Object.keys(sync).length) await chrome.storage.sync.set(sync);
      return true;
    } catch (err) {
      console.warn('[Better Lyric] save failed', err);
      return false;
    }
  },
};

// Per-video memory: chosen lyric and sync offset.
BYL.videoStore = {
  async get(videoId) {
    try {
      const k = 'v:' + videoId;
      return (await chrome.storage.local.get(k))[k] || null;
    } catch {
      return null;
    }
  },
  // Patches run one after another: two read-modify-writes in flight at once
  // would drop one of them (e.g. saving lyrics and the offset together).
  queue: Promise.resolve(),
  patch(videoId, patch) {
    this.queue = this.queue.then(async () => {
      try {
        const k = 'v:' + videoId;
        const cur = (await chrome.storage.local.get(k))[k] || {};
        await chrome.storage.local.set({ [k]: { ...cur, ...patch, at: Date.now() } });
      } catch {}
    });
    return this.queue;
  },
};

// Search results per video ('c:<id>'), so reopening a video shows its
// lyrics at once instead of asking YouTube and the lyric sites again.
// Results go stale after a week (a day when nothing was found: comments and
// lyric sites keep growing). "↻ Tìm lại" in the panel drops them.
BYL.searchCache = {
  TTL: 7 * 864e5,
  EMPTY_TTL: 864e5,
  MAX: 300,
  async get(videoId) {
    try {
      const k = 'c:' + videoId;
      return (await chrome.storage.local.get(k))[k] || { at: {}, list: {} };
    } catch {
      return { at: {}, list: {} };
    }
  },
  // The cached list for one source, or null if missing or stale.
  hit(entry, key) {
    const list = entry.list[key];
    const age = Date.now() - (entry.at[key] || 0);
    return list && age < (list.length ? this.TTL : this.EMPTY_TTL) ? list : null;
  },
  queue: Promise.resolve(),
  put(videoId, key, list) {
    this.queue = this.queue.then(async () => {
      try {
        const k = 'c:' + videoId;
        const cur = (await chrome.storage.local.get(k))[k] || { at: {}, list: {} };
        cur.at[key] = Date.now();
        cur.list[key] = list;
        await chrome.storage.local.set({ [k]: cur });
        if (Math.random() < 0.05) await this.prune();
      } catch {}
    });
    return this.queue;
  },
  drop(videoId) {
    return chrome.storage.local.remove('c:' + videoId).catch(() => {});
  },
  // Keep the most recently used MAX videos.
  async prune() {
    const all = Object.entries(await chrome.storage.local.get(null)).filter(([k]) => k.startsWith('c:'));
    if (all.length <= this.MAX) return;
    const newest = (e) => Math.max(0, ...Object.values(e.at || {}));
    all.sort((a, b) => newest(b[1]) - newest(a[1]));
    await chrome.storage.local.remove(all.slice(this.MAX).map(([k]) => k));
  },
};

// ---------- object walking ----------

// Depth-first search for every value stored under `key` anywhere in obj.
BYL.findAll = (obj, key, limit = Infinity) => {
  const out = [];
  const stack = [obj];
  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (Object.prototype.hasOwnProperty.call(cur, key)) out.push(cur[key]);
    const vals = Array.isArray(cur) ? cur : Object.values(cur);
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i] && typeof vals[i] === 'object') stack.push(vals[i]);
    }
  }
  return out;
};
BYL.findFirst = (obj, key) => BYL.findAll(obj, key, 1)[0];

BYL.runsText = (t) => {
  if (!t) return '';
  if (typeof t === 'string') return t;
  if (t.simpleText) return t.simpleText;
  if (t.content) return t.content;
  return (t.runs || []).map((r) => r.text).join('');
};

// ---------- text helpers ----------

BYL.fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

BYL.tokens = (s) =>
  BYL.fold(s)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

// Share of `needle` tokens that also appear in `hay` (0..1).
BYL.similarity = (needle, hay) => {
  const a = [...new Set(BYL.tokens(needle))];
  if (!a.length) return 0;
  const h = BYL.fold(hay).replace(/[^a-z0-9]/g, '');
  const b = new Set(BYL.tokens(hay));
  let hit = 0;
  for (const t of a) if (b.has(t) || (t.length > 2 && h.includes(t))) hit++;
  return hit / a.length;
};

BYL.isVietnamese = (s) =>
  /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(String(s || ''));

// Rough language of a text, enough to pick a caption track.
BYL.guessLang = (s) => {
  s = String(s || '');
  if (BYL.isVietnamese(s)) return 'vi';
  if (/[\uac00-\ud7af]/.test(s)) return 'ko';
  if (/[\u3040-\u30ff]/.test(s)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(s)) return 'zh';
  if (/[\u0e00-\u0e7f]/.test(s)) return 'th';
  return 'en';
};

BYL.fmtTime = (sec) => {
  sec = Math.max(0, Math.floor(sec || 0));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
};

// ---------- song metadata ----------

const NOISE_WORDS =
  'official|music|video|mv|m\\/v|lyrics?|lyric video|audio|visuali[sz]er|hd|4k|1080p|720p|full|vietsub|engsub|' +
  'karaoke|beat|instrumental|tone nam|tone nữ|tone nu|song ca|lời bài hát|loi bai hat|có lời|co loi|' +
  'live|performance|teaser|trailer|color coded|han\\/rom\\/eng|sub|phụ đề|ost|nhạc phim|soundtrack';
const NOISE_RE = new RegExp('(' + NOISE_WORDS + ')', 'i');
// Only dropped inside brackets: (prod. by X), (Remix), (Album 22 - Track 10)…
const BRACKET_NOISE_RE = /prod\b|remix|cover|acoustic|lo-?fi|sped up|speed up|tiktok|version|\bver\b|album|track|piano|guitar|\bbeat\b|from |trích|phim/i;

BYL.cleanTitle = (title) => {
  let t = String(title || '');
  // Drop bracketed chunks that are just tags like (Official MV) or [Karaoke Tone Nam].
  t = t.replace(/[\(\[【「『][^\)\]】」』]*[\)\]】」』]/g, (m) => (NOISE_RE.test(m) || BRACKET_NOISE_RE.test(m) ? ' ' : m));
  t = t.replace(/#\S+/g, ' ');
  // "Lời bài hát: Song - Artist"
  t = t.replace(/^\s*(lời bài hát|loi bai hat|lyrics?|karaoke)\s*[:：|-]\s*/i, '');
  // "Song - Artist | Official MV" -> keep the part before | when the rest is
  // noise. When that part already reads "Song - Artist", whatever follows is
  // a show, a release date or a tag ("| KC: Mùng 1 Tết"), so drop it all.
  const bar = t.split(/\s[|｜]\s?|\s?[|｜]\s/).filter((p) => p.trim());
  if (bar.length > 1) t = /\s[-–—]\s/.test(bar[0]) ? bar[0] : bar.filter((p, i) => i === 0 || !NOISE_RE.test(p)).join(' - ');
  t = t.replace(new RegExp('\\b(' + NOISE_WORDS + ')\\b', 'gi'), ' ');
  t = t.replace(/\s*[-–—:]\s*$/g, '').replace(/^\s*[-–—:]\s*/g, '');
  return t.replace(/\s{2,}/g, ' ').trim();
};

// "BÁU VẬT TRỜI CHO" -> "Báu Vật Trời Cho". Single words (HIEUTHUHAI, APJ)
// and tokens like M-TP or 2PM are names: left alone.
const unshout = (s) => {
  const words = s.split(/\s+/);
  if (s !== s.toUpperCase() || s === s.toLowerCase() || words.filter((w) => /\p{L}{2}/u.test(w)).length < 2) return s;
  return words.map((w) => (/[-\d.]/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
};

// Common Vietnamese family names: "Bùi Công Nam", "Phan Mạnh Quỳnh"…
const SURNAME_RE = /^(nguyễn|trần|lê|phạm|hoàng|huỳnh|phan|vũ|võ|đặng|bùi|đỗ|hồ|ngô|dương|lý|đinh|trịnh|lâm|tăng|đàm|châu|quách|lương|cao|tạ|hà|triệu|văn|kiều|thái|mai|đào|chu|khắc|đức|minh|thùy|thu|bảo|tuấn|quang)\s/i;
const looksLikeName = (s) => SURNAME_RE.test(s.trim()) && s.trim().split(/\s+/).length <= 4;

const stripFeat = (s) => s.replace(/\s*[\(\[]?\s*\b(ft\.?|feat\.?|featuring)\s.*$|\s+x\s+.*$/i, '').trim();
const cleanChannel = (s) =>
  String(s || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\b(official|vevo|music|channel|entertainment|records?|tv|lyrics?|karaoke|vietsub|nhạc|hay|việt|mỗi ngày)(?=\s|$)/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

// Work out { title, artist } for the song playing in a video.
// attrs: YouTube's own "Music" card ({title, subtitle}) when the video has one.
BYL.parseSong = (args) => {
  const song = parseSong(args);
  return { ...song, title: unshout(song.title), artist: unshout(song.artist) };
};

function parseSong({ title, author, attrs }) {
  // The card sometimes names a show or a different track, so only trust it
  // when it matches the video title.
  const music = (attrs || []).find((a) => a.title && a.subtitle && BYL.similarity(a.title, title) >= 0.6);
  if (music) return { title: music.title.trim(), artist: music.subtitle.trim(), fromYouTube: true };

  if (/\s-\s*Topic$/i.test(author || '')) return { title: BYL.cleanTitle(title), artist: cleanChannel(author) };

  const cleaned = BYL.cleanTitle(title);
  const channel = cleanChannel(author);
  // ARTIST 'Song' / ARTIST “Song”: the quoted part is the song.
  const quoted = cleaned.match(/(?:^|\s)['‘“"]([^'‘’“”"]{2,80})['’”"](?=\s|$)/);
  if (quoted) {
    const rest = cleaned.replace(quoted[0], ' ').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
    return { title: stripFeat(quoted[1].trim()), artist: rest || channel };
  }
  const parts = cleaned.split(/\s+[-–—]\s+|\s+[|｜]\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [a, b] = parts;
    const simA = BYL.similarity(a, channel);
    const simB = BYL.similarity(b, channel);
    // The channel is a hint only when it really names one side.
    if (Math.max(simA, simB) >= 0.5 && simA !== simB) return simB > simA ? { title: stripFeat(a), artist: b } : { title: stripFeat(b), artist: a };
    // A side that looks like a Vietnamese person's name is the singer.
    if (looksLikeName(a) !== looksLikeName(b)) return looksLikeName(b) ? { title: stripFeat(a), artist: b } : { title: stripFeat(b), artist: a };
    // No hint: Vietnamese uploads usually go "Song - Artist", international
    // ones "Artist - Song".
    return BYL.isVietnamese(cleaned) ? { title: stripFeat(a), artist: b } : { title: stripFeat(b), artist: a };
  }
  return { title: stripFeat(cleaned), artist: channel };
}

// ---------- lyric parsing ----------

const TS_RE = /^\s*[\[(]?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?[\])]?\s*[-–:|]?\s*(.*)$/;

const toSec = (m, s, frac) => {
  const f = frac ? Number(frac) / Math.pow(10, frac.length) : 0;
  return Number(m) * 60 + Number(s) + f;
};

const SECTION_RE =
  /^(\[.*\]|\(.*\)|(verse|chorus|pre-?chorus|bridge|hook|intro|outro|rap|điệp khúc|đk|đoạn|phiên khúc)\b.{0,20}:?)$/i;

BYL.makeLine = (text, t) => {
  // ">>" is the captions' speaker-change mark, never part of a lyric.
  const line = { text: String(text).replace(/(^|\s)>>+(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim() };
  if (t !== undefined && t !== null) line.t = t;
  if (SECTION_RE.test(line.text)) line.section = true;
  return line;
};

// Standard LRC: "[01:23.45] line".
BYL.parseLrc = (lrc) => {
  const out = [];
  for (const raw of String(lrc || '').split('\n')) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const { text: rawText, tags } = wordTags(raw.replace(/\[[^\]]*\]/g, ''));
    for (const s of stamps) {
      const line = BYL.makeLine(rawText.trim(), toSec(s[1], s[2], s[3]));
      const wd = tags.length && stamps.length === 1 ? wordOffsets(rawText, tags, line.t) : undefined;
      if (wd && wd.length === line.text.split(/\s+/).filter(Boolean).length) line.wd = wd;
      out.push(line);
    }
  }
  return out.sort((a, b) => a.t - b.t);
};

// Enhanced LRC times words too: "[00:12.00] <00:12.00> Em <00:12.40> ơi".
function wordTags(str) {
  const tags = [];
  let text = '';
  let last = 0;
  for (const m of str.matchAll(/<(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?>/g)) {
    text += str.slice(last, m.index);
    tags.push({ at: text.length, t: toSec(m[1], m[2], m[3]) });
    last = m.index + m[0].length;
  }
  text += str.slice(last);
  return { text, tags };
}

// Seconds after the line start at which each space-separated word starts
// (ui.js lights words by these), or undefined when the tags don't cover it.
function wordOffsets(text, tags, lineT) {
  const wd = [];
  for (const m of text.matchAll(/\S+/g)) {
    let t = null;
    for (const g of tags) if (g.at <= m.index) t = g.t;
    wd.push(t === null ? 0 : Math.max(0, Math.round((t - lineT) * 100) / 100));
  }
  for (let k = 1; k < wd.length; k++) if (wd[k] < wd[k - 1]) return undefined;
  return wd.length > 1 && wd[wd.length - 1] > 0 ? wd : undefined;
}

BYL.plainLines = (text) => {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim());
  // Collapse runs of blank lines to one, trim blanks at the ends.
  const out = [];
  for (const l of lines) {
    if (!l && (!out.length || !out[out.length - 1].text)) continue;
    out.push(BYL.makeLine(l));
  }
  while (out.length && !out[out.length - 1].text) out.pop();
  return out;
};

// LRC with centiseconds, so editing timed lyrics keeps their timing intact.
BYL.lrcStamp = (t) => {
  t = Math.max(0, t);
  const m = String(Math.floor(t / 60)).padStart(2, '0');
  const sec = (Math.floor((t % 60) * 100) / 100).toFixed(2).padStart(5, '0');
  return `[${m}:${sec}]`;
};
BYL.toLrc = (lines, shift = 0) =>
  lines.map((l) => (l.t === undefined ? l.text : `${BYL.lrcStamp(l.t + shift)} ${l.text}`)).join('\n');

BYL.lyricsText = (lines) =>
  lines.map((l) => (l.t !== undefined ? `[${BYL.fmtTime(l.t)}] ` : '') + l.text).join('\n');

const JUNK_RE =
  /https?:\/\/|www\.|\.com\b|@\w|#\w|subscribe|đăng ký|đăng kí|follow|spotify|apple music|itunes|℗|©|copyright|stream(ing)?\b|download|booking|liên hệ|hotline|facebook|instagram|tiktok|e-?mail|➤|►|▶|👉|produced by|sản xuất|director|đạo diễn|composer|sáng tác|arranged|mix(ed)? by|master(ed)? by|\b(views?|likes?|subscribers?|lượt xem|lượt thích|triệu view|million|billion|world record|kỷ lục|(19|20)\d\d)\b/i;
// Credits ("Hòa âm (Mixing Engineer): …", "Đàn Nhị: …") look like short lines
// too; these words and the "Label: name" shape give them away.
const CREDIT_RE =
  /t[aá]c gi[aả]|h[oò][aà] [aâ]m|ph[oố]i kh[ií]|bi[eê]n so[aạ]n|ch[eế] t[aá]c|[dđ][iị]nh [aâ]m|thu [aâ]m|th[eể] hi[eệ]n|tr[iì]nh b[aà]y|t[aá]c ph[aẩ]m|tracklist|track list|theo d[oõ]i|engineer|producer|arranger|mixing|mastering|recording|studio|credits?\b|vocal(ist)?s?\s*[:：]|stylist|make ?up|quay phim|editor|[eê]-?k[ií]p/i;
const LABEL_RE = /^[^:：]{2,40}[:：]\s*\S/;
const HEADER_RE = /^(lyrics?|l[oờ]i(\s+b[aà]i\s+h[aá]t)?|ca\s+t[uừ]|loi bai hat)\s*[:：\-–]?\s*$/i;

const letterRatio = (s) => {
  const letters = (s.match(/\p{L}/gu) || []).length;
  return letters / Math.max(1, s.replace(/\s/g, '').length);
};

// Find the longest lyric-looking stretch in free text (a comment or a video
// description). Returns { lines, synced, score } or null.
BYL.extractLyricBlock = (text, song) => {
  const raw = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim());
  if (raw.length < 6) return null;

  const isLyric = (l) =>
    l.length >= 2 && l.length <= 110 && !JUNK_RE.test(l) && !CREDIT_RE.test(l) && letterRatio(l) > 0.55;

  let best = null;
  let cur = null;
  let blanks = 0;
  const close = () => {
    if (cur && (!best || cur.count > best.count)) best = cur;
    cur = null;
    blanks = 0;
  };
  for (let i = 0; i < raw.length; i++) {
    const l = raw[i];
    if (HEADER_RE.test(l)) {
      close();
      cur = { start: i + 1, end: i + 1, count: 0, header: true };
      continue;
    }
    if (!l) {
      if (cur && ++blanks > 2) close();
      continue;
    }
    if (isLyric(l) || (TS_RE.test(l) && l.length < 110)) {
      if (!cur) cur = { start: i, end: i, count: 0, header: false };
      cur.count++;
      cur.end = i + 1;
      blanks = 0;
    } else {
      close();
    }
  }
  close();
  if (!best || best.count < 8) return null;

  const body = raw.slice(best.start, best.end);
  const nonEmpty = body.filter(Boolean);
  const avgLen = nonEmpty.reduce((n, l) => n + l.length, 0) / nonEmpty.length;
  if (avgLen > 75) return null; // paragraphs, not verses
  // Lists of "Role: Name" are credits, not verses (duet tags like "Nam:" are rarer).
  if (nonEmpty.filter((l) => LABEL_RE.test(l) && !TS_RE.test(l)).length > nonEmpty.length * 0.3) return null;

  const stamped = nonEmpty.filter((l) => TS_RE.test(l));
  let lines;
  let synced = false;
  if (stamped.length >= nonEmpty.length * 0.7) {
    synced = true;
    lines = stamped
      .map((l) => {
        const m = l.match(TS_RE);
        return BYL.makeLine(m[4], toSec(m[1], m[2], m[3]));
      })
      .filter((l) => l.text)
      .sort((a, b) => a.t - b.t);
  } else {
    lines = BYL.plainLines(body.join('\n'));
  }

  const joined = body.join(' ');
  const titleHit = song?.title ? BYL.similarity(song.title, joined) : 0;
  const stanzas = body.filter((l) => !l).length;
  let score = Math.min(best.count, 60) + (best.header ? 20 : 0) + titleHit * 25 + Math.min(stanzas, 6) * 2;
  if (synced) score += 10;
  return { lines, synced, score: Math.round(score) };
};
