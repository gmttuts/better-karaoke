'use strict';

// Runs in the page's own JS world. The isolated content script can't see
// ytcfg or the player object, so it asks for them over window.postMessage.
(() => {
  // ---------- caption capture ----------
  // YouTube only serves caption files to its own player (the URL carries a
  // proof-of-origin token), so keep a copy of what the player downloads.
  const captions = new Map(); // "videoId|lang|kind" -> { text, lang, kind }

  const isCaption = (url) => typeof url === 'string' && url.includes('/api/timedtext');
  const noteCaption = (url, text) => {
    try {
      if (!text) return;
      const u = new URL(url, location.origin);
      const v = u.searchParams.get('v');
      if (!v || u.searchParams.get('tlang')) return; // skip machine translations
      const lang = u.searchParams.get('lang') || '';
      const kind = u.searchParams.get('kind') || '';
      captions.set(`${v}|${lang}|${kind}`, { text, lang, kind });
    } catch {}
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : input?.url;
    if (isCaption(url)) {
      p.then((r) => r.clone().text())
        .then((t) => noteCaption(url, t))
        .catch(() => {});
    }
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bylUrl = String(url);
    return origOpen.apply(this, arguments);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (isCaption(this.__bylUrl)) {
      this.addEventListener('load', () => {
        try {
          const r = this.response;
          const text =
            this.responseType === '' || this.responseType === 'text'
              ? this.responseText
              : this.responseType === 'json'
                ? JSON.stringify(r)
                : r instanceof ArrayBuffer
                  ? new TextDecoder().decode(r)
                  : '';
          noteCaption(this.__bylUrl, text);
        } catch {}
      });
    }
    return origSend.apply(this, arguments);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- requests from the content script ----------

  const pick = (pr) => {
    if (!pr) return null;
    const vd = pr.videoDetails || {};
    const tracks = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    return {
      videoId: vd.videoId,
      title: vd.title,
      author: vd.author,
      lengthSeconds: Number(vd.lengthSeconds) || 0,
      captionTracks: tracks.map((t) => ({
        baseUrl: t.baseUrl,
        languageCode: t.languageCode,
        kind: t.kind || '',
        name: t.name?.simpleText || t.name?.runs?.map((r) => r.text).join('') || t.languageCode,
      })),
    };
  };

  // Watch pages play in #movie_player, Shorts in #shorts-player (the other
  // one may linger, hidden, with an old video).
  const playerFor = (videoId) => {
    const all = [document.getElementById('shorts-player'), document.getElementById('movie_player')].filter(Boolean);
    if (!videoId) return location.pathname.startsWith('/shorts/') ? all[0] : document.getElementById('movie_player');
    return all.find((p) => p.getPlayerResponse?.()?.videoDetails?.videoId === videoId) || null;
  };

  const handlers = {
    cfg() {
      const get = (k) => window.ytcfg?.get?.(k);
      return { apiKey: get('INNERTUBE_API_KEY'), context: get('INNERTUBE_CONTEXT') };
    },
    player({ videoId }) {
      return pick(playerFor(videoId)?.getPlayerResponse?.());
    },
    // Captions for the current video, optionally a specific track. If the
    // player hasn't fetched it yet, switch CC on (and to that track) just long
    // enough for it to do so, then put everything back.
    async captions({ videoId, languageCode, kind = '' }) {
      const find = () => {
        if (languageCode) return captions.get(`${videoId}|${languageCode}|${kind}`);
        for (const [k, v] of captions) if (k.startsWith(videoId + '|')) return v;
        return null;
      };
      if (find()) return find();
      const p = playerFor(videoId);
      if (!p?.toggleSubtitles) return null;
      // toggleSubtitlesOn() only switches on; toggleSubtitles() flips.
      const wasOn = !!p.isSubtitlesOn?.();
      const prevTrack = wasOn ? p.getOption?.('captions', 'track') : null;
      try {
        if (wasOn && !languageCode) {
          p.toggleSubtitles(); // off, then on again to force a fetch
          await sleep(150);
        }
        if (p.toggleSubtitlesOn) p.toggleSubtitlesOn();
        else if (!p.isSubtitlesOn?.()) p.toggleSubtitles();
        if (languageCode) {
          for (let i = 0; i < 10; i++) {
            const list = p.getOption?.('captions', 'tracklist') || [];
            const track = list.find((t) => t.languageCode === languageCode && (t.kind || '') === kind);
            if (track) {
              p.setOption('captions', 'track', track);
              break;
            }
            await sleep(200);
          }
        }
        for (let i = 0; i < 30 && !find(); i++) await sleep(200);
      } finally {
        if (prevTrack && languageCode) p.setOption('captions', 'track', prevTrack);
        if (!wasOn && p.isSubtitlesOn?.()) p.toggleSubtitles();
      }
      return find() || null;
    },
  };

  window.addEventListener('message', async (e) => {
    if (e.source !== window || e.data?.__byl !== 'req') return;
    const { id, type, payload } = e.data;
    let result = null;
    try {
      result = (await handlers[type]?.(payload || {})) ?? null;
    } catch {
      result = null;
    }
    window.postMessage({ __byl: 'res', id, result }, '*');
  });
})();
