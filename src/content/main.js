'use strict';

// Watches YouTube's in-page navigation and runs every lyric source for each
// video. Sources run in parallel; the panel shows results as they arrive and
// picks the best one by source priority.
(() => {
  let run = 0;

  async function onPage() {
    const url = new URL(location.href);
    const videoId = BYL.isShorts() ? url.pathname.split('/')[2] : url.pathname === '/watch' ? url.searchParams.get('v') : null;
    if (!videoId) {
      BYL.ui.hide();
      return;
    }
    if (BYL.ui.state.videoId === videoId && document.getElementById('byl-panel-host')?.isConnected) return;
    const my = ++run;
    const alive = () => my === run;

    const settings = await BYL.settings.load();
    if (!(await BYL.ui.mount()) || !alive()) return;
    BYL.ui.reset({ videoId, saved: await BYL.videoStore.get(videoId) });

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
    BYL.ui.setSong(song, duration);

    const ctx = { videoId, song, duration, next, player, settings };
    const runSource = (key) => {
      BYL.ui.setSourceStatus(key, 'loading');
      return BYL.sources[key](ctx)
        .then((list) => {
          if (!alive()) return;
          BYL.ui.addCandidates(list);
          BYL.ui.setSourceStatus(key, list.length ? 'ok' : 'none', list.length);
        })
        .catch((err) => {
          if (!alive()) return;
          console.debug('[Better Lyric]', key, err);
          BYL.ui.setSourceStatus(key, 'error');
        });
    };
    BYL.ui.onLoadSource = (key) => alive() && runSource(key);

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

    const enabled = (key) => settings[BYL.SOURCES[key].setting];
    const main = Object.keys(BYL.SOURCES).filter((k) => k !== 'transcript' && enabled(k));
    await Promise.all(main.map(runSource));
    if (!alive() || !enabled('transcript')) return;
    // Captions are the last resort: load them by themselves only when nothing
    // else turned up, otherwise leave a chip to load them on demand.
    if (BYL.ui.state.candidates.length) BYL.ui.setSourceStatus('transcript', 'idle');
    else runSource('transcript');
  }

  document.addEventListener('yt-navigate-finish', onPage);
  // Swiping between Shorts doesn't always fire a navigation event.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    onPage();
  }, 700);
  window.addEventListener('popstate', () => setTimeout(onPage, 300));
  onPage();
})();
