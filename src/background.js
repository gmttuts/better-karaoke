'use strict';

// Content scripts on youtube.com can't read cross-origin pages, so the
// service worker fetches the external lyric sites for them. Only the hosts
// listed in host_permissions are allowed through.
const ALLOWED_HOSTS = new Set(['lrclib.net', 'hopamchuan.com']);
const LRCLIB_CLIENT = 'BetterYouTubeLyric/0.9.1 (https://github.com/gmttuts/better-youtube-lyric)';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
