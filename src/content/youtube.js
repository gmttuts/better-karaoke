'use strict';

// Thin client for YouTube's own web API (InnerTube), called from the page's
// origin so no extra permissions are needed.
BYL.yt = (() => {
  let seq = 0;
  let cfg = null;

  const bridge = (type, payload, timeout = 2000) =>
    new Promise((resolve) => {
      const id = 'byl' + ++seq;
      const done = (result) => {
        window.removeEventListener('message', onMsg);
        clearTimeout(timer);
        resolve(result);
      };
      const onMsg = (e) => {
        if (e.source === window && e.data?.__byl === 'res' && e.data.id === id) done(e.data.result);
      };
      const timer = setTimeout(() => done(null), timeout);
      window.addEventListener('message', onMsg);
      window.postMessage({ __byl: 'req', id, type, payload }, '*');
    });

  const fallbackContext = () => ({
    client: {
      clientName: 'WEB',
      clientVersion: '2.20251028.01.00',
      hl: document.documentElement.lang || 'vi',
    },
  });

  async function config() {
    if (cfg) return cfg;
    const got = await bridge('cfg');
    const base = got?.context?.client ? got.context : fallbackContext();
    // Keep only the client block (language, visitorData...). We call
    // anonymously, so anything tied to the signed-in user is dropped.
    cfg = { apiKey: got?.apiKey || '', context: { client: base.client } };
    return cfg;
  }

  async function api(endpoint, body) {
    const c = await config();
    const url = `/youtubei/v1/${endpoint}?prettyPrint=false${c.apiKey ? '&key=' + c.apiKey : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context: c.context, ...body }),
    });
    if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
    return res.json();
  }

  // Player data for the current video. Right after an in-page navigation the
  // player can still hold the previous video, so wait for the id to match.
  async function player(videoId) {
    for (let i = 0; i < 20; i++) {
      const p = await bridge('player', { videoId });
      if (p?.videoId === videoId) return p;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  const descriptionOf = (next) => {
    const texts = [
      ...BYL.findAll(next, 'attributedDescription'),
      ...BYL.findAll(next, 'attributedDescriptionBodyText'),
      ...BYL.findAll(next, 'description'),
    ]
      .map(BYL.runsText)
      .filter((t) => typeof t === 'string');
    return texts.sort((a, b) => b.length - a.length)[0] || '';
  };

  // YouTube's "Music" card under the description: song title + artist.
  const musicAttrs = (next) =>
    BYL.findAll(next, 'videoAttributeViewModel').map((a) => ({
      title: BYL.runsText(a.title),
      subtitle: BYL.runsText(a.subtitle),
    }));

  const basicInfo = (next) => {
    const primary = BYL.findFirst(next, 'videoPrimaryInfoRenderer');
    const owner = BYL.findFirst(next, 'videoOwnerRenderer');
    return { title: BYL.runsText(primary?.title), author: BYL.runsText(owner?.title) };
  };

  // ---------- comments ----------

  const commentsToken = (next) => {
    const sec = BYL.findAll(next, 'itemSectionRenderer').find((s) => s.sectionIdentifier === 'comment-item-section');
    return BYL.findFirst(sec, 'continuationCommand')?.token || null;
  };

  const parseComments = (data) => {
    const out = [];
    // Current format: comment bodies live in entity payloads.
    for (const e of BYL.findAll(data, 'commentEntityPayload')) {
      out.push({
        id: e.properties?.commentId,
        text: e.properties?.content?.content || '',
        author: e.author?.displayName || '',
        likes: e.toolbar?.likeCountNotliked || '',
      });
    }
    // Older format.
    if (!out.length) {
      for (const c of BYL.findAll(data, 'commentRenderer')) {
        out.push({
          id: c.commentId,
          text: BYL.runsText(c.contentText),
          author: BYL.runsText(c.authorText),
          likes: BYL.runsText(c.voteCount),
        });
      }
    }
    return out;
  };

  const nextPageToken = (data) => {
    let token = null;
    for (const ep of data.onResponseReceivedEndpoints || []) {
      const items =
        ep.reloadContinuationItemsCommand?.continuationItems || ep.appendContinuationItemsAction?.continuationItems || [];
      const last = items[items.length - 1]?.continuationItemRenderer;
      if (last) token = BYL.findFirst(last, 'continuationCommand')?.token || token;
    }
    return token;
  };

  async function comments(next, pages = 3) {
    let token = commentsToken(next);
    const all = [];
    for (let i = 0; i < pages && token; i++) {
      const data = await api('next', { continuation: token });
      all.push(...parseComments(data));
      token = nextPageToken(data);
    }
    return all;
  }

  // ---------- search ----------

  async function search(query, limit = 10) {
    const data = await api('search', { query });
    return BYL.findAll(data, 'videoRenderer')
      .filter((v) => v.videoId)
      .slice(0, limit)
      .map((v) => ({
        videoId: v.videoId,
        title: BYL.runsText(v.title),
        channel: BYL.runsText(v.ownerText),
        length: BYL.runsText(v.lengthText),
        views: BYL.runsText(v.shortViewCountText),
        thumb: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      }));
  }

  // ---------- captions ----------

  // Caption files come as json3 or as XML (srv3 / legacy), depending on who asked.
  const parseTimedText = (text) => {
    text = String(text || '').trim();
    if (text.startsWith('{')) {
      return (JSON.parse(text).events || [])
        .filter((e) => e.segs)
        .map((e) => ({ t: e.tStartMs / 1000, text: e.segs.map((s) => s.utf8).join('') }));
    }
    if (text.startsWith('<')) {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const ps = [...doc.querySelectorAll('p')];
      if (ps.length) return ps.map((p) => ({ t: Number(p.getAttribute('t')) / 1000, text: p.textContent }));
      return [...doc.querySelectorAll('text')].map((n) => ({ t: Number(n.getAttribute('start')), text: n.textContent }));
    }
    return [];
  };

  // Direct download. Often comes back empty now that YouTube wants a
  // player-issued token; then fall back to playerCaptions().
  async function captionLines(track) {
    const url = new URL(track.baseUrl, location.origin);
    url.searchParams.set('fmt', 'json3');
    const res = await fetch(url, { credentials: 'include' });
    return parseTimedText(await res.text());
  }

  // Raw caption file, direct download (may be empty, see captionLines).
  async function captionText(track) {
    const url = new URL(track.baseUrl, location.origin);
    url.searchParams.set('fmt', 'json3');
    return (await fetch(url, { credentials: 'include' })).text();
  }

  // Whatever the player itself downloaded (see bridge.js).
  async function playerCaptions(videoId, track) {
    const want = track ? { languageCode: track.languageCode, kind: track.kind || '' } : {};
    const got = await bridge('captions', { videoId, ...want }, 9000);
    return got ? { ...got, lines: parseTimedText(got.text) } : null;
  }

  // Fallback when the caption file is empty: the "Show transcript" panel.
  async function transcriptPanel(next) {
    const params = BYL.findFirst(next, 'getTranscriptEndpoint')?.params;
    if (!params) return [];
    const data = await api('get_transcript', { params });
    return BYL.findAll(data, 'transcriptSegmentRenderer').map((s) => ({
      t: Number(s.startMs) / 1000,
      text: BYL.runsText(s.snippet),
    }));
  }

  return { api, config, player, descriptionOf, musicAttrs, basicInfo, comments, search, captionLines, captionText, playerCaptions, transcriptPanel };
})();
