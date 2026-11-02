'use strict';

// Watches YouTube's in-page navigation and runs every lyric source for each
// video. Sources run in parallel; the panel shows results as they arrive and
// picks the best one by source priority.
(() => {
  let run = 0;

  // again: true re-runs the search for the video already shown (↻ Tìm lại).
  async function onPage(again) {
    const url = new URL(location.href);
    const videoId = BYL.isShorts() ? url.pathname.split('/')[2] : url.pathname === '/watch' ? url.searchParams.get('v') : null;
    if (!videoId) {
      BYL.ui.hide();
      return;
    }
    const host = document.getElementById('byl-panel-host');
    if (again !== true && BYL.ui.state.videoId === videoId && host?.isConnected && !host.hidden) return;
    const my = ++run;
    const alive = () => my === run;

    const settings = await BYL.settings.load();
    if (!settings.enabled) {
      BYL.ui.hide();
      return;
    }
    if (!(await BYL.ui.mount()) || !alive()) return;
    BYL.ui.reset({ videoId, saved: await BYL.videoStore.get(videoId) });

    // Results from an earlier visit show up at once, before YouTube answers.
    const enabled = (key) => settings[BYL.SOURCES[key].setting];
    const cache = again === true ? (await BYL.searchCache.drop(videoId), { at: {}, list: {} }) : await BYL.searchCache.get(videoId);
    if (!alive()) return;
    const cached = new Set();
    for (const key of Object.keys(BYL.SOURCES)) {
      const hit = BYL.sources[key] && enabled(key) && BYL.searchCache.hit(cache, key);
      if (!hit) continue;
      cached.add(key);
      BYL.ui.addCandidates(hit);
      BYL.ui.setSourceStatus(key, hit.length ? 'ok' : 'none', hit.length);
    }

    let next;
    try {
      next = await BYL.yt.api('next', { videoId });
    } catch {
      next = {};
    }
    const player = await BYL.yt.player(videoId);
    if (!alive()) return;

    const info = BYL.yt.basicInfo(next);
    const song = BYL.parseSong({
      title: player?.title || info.title || document.title.replace(/ - YouTube$/, ''),
      author: player?.author || info.author,
      attrs: BYL.yt.musicAttrs(next),
    });
    const duration = player?.lengthSeconds || BYL.playerEl()?.querySelector('video')?.duration || 0;
    BYL.ui.setSong(song, duration, player?.author || info.author);

    const ctx = { videoId, song, duration, next, player, settings };
    const runSource = (key, fresh) => {
      if (!fresh && cached.has(key)) return Promise.resolve();
      BYL.ui.setSourceStatus(key, 'loading');
      return BYL.sources[key](ctx)
        .then((list) => {
          if (!alive()) return;
          BYL.searchCache.put(videoId, key, list);
          BYL.ui.addCandidates(list);
          BYL.ui.setSourceStatus(key, list.length ? 'ok' : 'none', list.length);
        })
        .catch((err) => {
          if (!alive()) return;
          console.debug('[Better Lyric]', key, err);
          BYL.ui.setSourceStatus(key, 'error');
        });
    };
    BYL.ui.onLoadSource = (key) => alive() && runSource(key, true);
    BYL.ui.onSearchAgain = () => onPage(true);

    // Captions as word timings, for lining up lyrics (see align.js). Picks the
    // track in the lyrics' language, uploaded before auto-generated.
    const tracks = player?.captionTracks || [];
    const captionCache = new Map();
    BYL.ui.hasCaptions = () => tracks.length > 0;
    BYL.ui.captionWordsFor = (lines) => {
      const lang = BYL.guessLang(lines.map((l) => l.text).join(' '));
      const rank = (t) => (t.languageCode.split('-')[0] === lang ? 0 : 2) + (t.kind === 'asr' ? 1 : 0);
      const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
      if (!track) return Promise.resolve(null);
      const key = track.languageCode + '|' + track.kind;
      if (!captionCache.has(key)) {
        captionCache.set(
          key,
          (async () => {
            let text = await BYL.yt.captionText(track).catch(() => '');
            if (!text.trim()) text = (await BYL.yt.playerCaptions(videoId, track))?.text || '';
            return BYL.captionWords(text);
          })()
        );
      }
      return captionCache.get(key);
    };

    const main = Object.keys(BYL.SOURCES).filter((k) => k !== 'transcript' && enabled(k));
    await Promise.all(main.map(runSource));
    if (!alive() || !enabled('transcript')) return;
    // Captions are the last resort: load them by themselves only when nothing
    // else turned up, otherwise leave a chip to load them on demand.
    if (cached.has('transcript')) return;
    if (BYL.ui.state.candidates.length) BYL.ui.setSourceStatus('transcript', 'idle');
    else runSource('transcript');
  }

  document.addEventListener('yt-navigate-finish', onPage);
  // Swiping between Shorts doesn't always fire a navigation event.
  let lastHref = location.href;
  const timer = setInterval(() => {
    if (!chrome.runtime?.id) {
      clearInterval(timer);
      BYL.ui.stale();
      return;
    }
    if (location.href === lastHref) return BYL.ui.remount();
    lastHref = location.href;
    onPage();
  }, 700);

  // The popup's master switch and "Tự bật lời trên video" apply at once.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabled) {
      BYL.settings.value.enabled = changes.enabled.newValue !== false;
      if (BYL.settings.value.enabled) onPage();
      else {
        run++;
        BYL.ui.hide();
      }
    }
    if (changes.overlayOnByDefault) {
      const on = !!changes.overlayOnByDefault.newValue;
      BYL.settings.value.overlayOnByDefault = on;
      const host = document.getElementById('byl-panel-host');
      if (BYL.ui.state.videoId && host && !host.hidden) BYL.ui.setOverlay(on, false);
    }
  });
  window.addEventListener('popstate', () => setTimeout(onPage, 300));
  onPage();
})();
