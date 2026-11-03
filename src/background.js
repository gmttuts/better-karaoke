'use strict';

// Content scripts on youtube.com can't read cross-origin pages, so the
// service worker fetches the external lyric sites for them. Only the hosts
// listed in host_permissions are allowed through.
const ALLOWED_HOSTS = new Set(['lrclib.net', 'hopamchuan.com']);
const LRCLIB_CLIENT = `BetterYouTubeLyric/${chrome.runtime.getManifest().version} (https://github.com/gmttuts/better-youtube-lyric)`;

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
    ocr(msg.image)
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

// Tesseract needs a page (workers, WebAssembly): an offscreen document in
// Chrome, opened the first time and kept while frames keep coming. Firefox
// has no offscreen documents but loads ocr.js into its background page.
let offscreen = null;
async function ocr(image) {
  if (self.BYL_OCR) return self.BYL_OCR.recognize(image);
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
  const res = await chrome.runtime.sendMessage({ target: 'ocr', image });
  if (res?.error) throw new Error(res.error);
  return res?.lines || [];
}
