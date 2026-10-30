'use strict';

// Content scripts on youtube.com can't read cross-origin pages, so the
// service worker fetches the external lyric sites for them. Only the hosts
// listed in host_permissions are allowed through.
const ALLOWED_HOSTS = new Set(['lrclib.net', 'hopamchuan.com']);
const LRCLIB_CLIENT = 'BetterYouTubeLyric/0.7.1 (https://github.com/gmttuts/better-youtube-lyric)';

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
