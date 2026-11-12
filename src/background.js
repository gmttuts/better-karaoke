'use strict';

// Content scripts on youtube.com can't read cross-origin pages, so the
// service worker fetches the external lyric sites for them. Only the hosts
// listed in host_permissions are allowed through.
const ALLOWED_HOSTS = new Set(['lrclib.net', 'hopamchuan.com', 'genius.com']);
const LRCLIB_CLIENT = `BetterKaraoke/${chrome.runtime.getManifest().version} (https://github.com/gmttuts/better-karaoke)`;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // "☁ Gửi lên LRCLIB": the page reads the draft the panel left in storage.
  if (msg?.type === 'openPublish') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/publish/publish.html') }).then(() => sendResponse({ ok: true }));
    return true;
  }
  // 🎙 Chấm điểm: a small window of our own holds the microphone.
  if (msg?.type === 'openScore' && sender.tab?.id) {
    chrome.windows
      .create({ url: chrome.runtime.getURL(`src/score/score.html?tab=${sender.tab.id}`), type: 'popup', width: 380, height: 330 })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: String(err?.message || err) }));
    return true;
  }
  // 🔠 Đọc chữ trên video: one frame at a time, to Tesseract.
  if (msg?.type === 'ocr') {
    ocr(msg.image, msg.lang)
      .then((lines) => sendResponse({ lines }))
      .catch((err) => sendResponse({ error: String(err?.message || err) }));
    return true;
  }
  if (msg?.type !== 'fetch') return;
  let url;
  try {
    url = new URL(msg.url);
  } catch {
    sendResponse({ error: 'bad-url' });
    return;
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    sendResponse({ error: 'blocked-host' });
    return;
  }
  const headers = url.hostname === 'lrclib.net' ? { 'Lrclib-Client': LRCLIB_CLIENT } : {};
  fetch(url, { headers })
    .then(async (res) => sendResponse({ ok: res.ok, status: res.status, body: await res.text() }))
    .catch((err) => sendResponse({ error: String(err) }));
  return true;
});

// Before 0.8 the look edits and presets were kept in storage.sync, which caps
// each item at 8 KB. Move them to storage.local, merging presets by name.
chrome.runtime.onInstalled.addListener(async () => {
  const keys = ['overlayLook', 'overlayPresets'];
  const old = await chrome.storage.sync.get(keys);
  if (!Object.keys(old).length) return;
  const cur = await chrome.storage.local.get(keys);
  const presets = [...(old.overlayPresets || []), ...(cur.overlayPresets || [])];
  await chrome.storage.local.set({
    overlayPresets: [...new Map(presets.map((p) => [p.name, p])).values()],
    overlayLook: cur.overlayLook ?? old.overlayLook ?? null,
  });
  await chrome.storage.sync.remove(keys);
});

// 0.28: "Lệch" (the offset) and the 📍 / 🎯 sync points are hidden now,
// so any left over from before would shift lyrics with no visible way to
// undo it: clear them once in every video's saved state. The lyrics picked,
// the user's own edits and ★ stay.
chrome.runtime.onInstalled.addListener(async () => {
  const FLAG = 'offsetsCleared028';
  if ((await chrome.storage.local.get(FLAG))[FLAG]) return;
  const all = await chrome.storage.local.get(null);
  const fixed = {};
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith('v:') || !v || typeof v !== 'object') continue;
    if (!v.offset && !(v.warps && Object.keys(v.warps).length)) continue;
    const { offset, warps, ...rest } = v;
    fixed[k] = rest;
  }
  await chrome.storage.local.set({ ...fixed, [FLAG]: true });
});

// Tesseract needs a page (workers, WebAssembly): an offscreen document in
// Chrome, opened the first time and kept while frames keep coming. Firefox
// has no offscreen documents but loads ocr.js into its background page.
let offscreen = null;
async function ocr(image, lang) {
  if (self.BYL_OCR) return self.BYL_OCR.recognize(image, lang);
  offscreen ||= chrome.offscreen
    .createDocument({ url: 'src/ocr/ocr.html', reasons: ['WORKERS'], justification: 'Read lyrics shown in video frames (OCR)' })
    .catch((err) => {
      // Already open (the service worker restarted while it was).
      if (!/single offscreen/i.test(String(err?.message))) {
        offscreen = null;
        throw err;
      }
    });
  await offscreen;
  const res = await chrome.runtime.sendMessage({ target: 'ocr', image, lang });
  if (res?.error) throw new Error(res.error);
  return res?.lines || [];
}
