'use strict';

// Each source takes the lookup context and resolves to a list of lyric
// candidates:
//   { id, source, label, detail, url?, synced, lines: [{ t?, text, section? }], score, warn? }
// `priority` sets the default order: lyrics from this video first, then other
// uploads of the song, then external sites, and YouTube captions last.

BYL.SOURCES = {
  custom: { get name() { return L('Lời của bạn'); }, icon: '✍', priority: 0 }, // typed/edited in the panel, never fetched
  description: { get name() { return L('Mô tả video'); }, icon: '📄', priority: 1, setting: 'srcDescription' },
  comments: { name: 'Comment', icon: '💬', priority: 1, setting: 'srcComments' },
  duplicates: { get name() { return L('Bản đăng khác'); }, icon: '🔁', priority: 2, setting: 'srcDuplicates' },
  lrclib: { name: 'LRCLIB', icon: '🌐', priority: 3, setting: 'srcLrclib' },
  hopamchuan: { get name() { return L('Hợp âm chuẩn'); }, icon: '🎸', priority: 3, setting: 'srcHopamchuan' },
  transcript: { get name() { return L('Phụ đề YouTube'); }, icon: '📝', priority: 4, setting: 'srcTranscript' },
};

BYL.sources = (() => {
  // Fetch through the service worker; retry twice on busy/temporary errors.
  const bg = async (url) => {
    for (let attempt = 0; ; attempt++) {
      const res = await chrome.runtime.sendMessage({ type: 'fetch', url });
      if (res?.ok) return res.body;
      const temporary = !res || res.error || res.status === 429 || res.status >= 500;
      if (!temporary || attempt >= 2) throw new Error(res?.error || 'HTTP ' + res?.status);
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  };

  // Run fn over items with at most `n` in flight (YouTube rate-limits bursts).
  const pool = async (items, n, fn) => {
    let i = 0;
    const worker = async () => {
      while (i < items.length) await fn(items[i++]);
    };
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  };

  const songQuery = (song) => [song.title, song.artist].filter(Boolean).join(' ');

  // ---------- from this video ----------

  async function description(ctx) {
    const block = BYL.extractLyricBlock(BYL.yt.descriptionOf(ctx.next), ctx.song);
    if (!block) return [];
    return [{ id: 'desc', source: 'description', label: L('Mô tả của video này'), detail: '', ...block }];
  }

  async function comments(ctx) {
    const list = await BYL.yt.comments(ctx.next, ctx.settings.commentPages);
    const out = [];
    for (const c of list) {
      const block = BYL.extractLyricBlock(c.text, ctx.song);
      if (!block) continue;
      out.push({
        id: 'c:' + c.id,
        source: 'comments',
        label: c.author || 'Comment',
        detail: c.likes ? `👍 ${c.likes}` : '',
        ...block,
      });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  // ---------- other uploads of the same song ----------

  async function duplicates(ctx) {
    const q = songQuery(ctx.song) + (BYL.isVietnamese(ctx.song.title) ? ' lời bài hát lyrics' : ' lyrics');
    const results = (await BYL.yt.search(q, 12)).filter((v) => v.videoId !== ctx.videoId);
    // Uploads that say "lyric" in the title are the likeliest to carry them.
    const lyricTitle = (t) => /lyric|lời|loi bai hat|vietsub/i.test(t);
    const ranked = results
      .map((v) => ({ v, rank: (lyricTitle(v.title) ? 1 : 0) + BYL.similarity(ctx.song.title, v.title) }))
      .filter((x) => BYL.similarity(ctx.song.title, x.v.title) >= 0.8)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 10);

    const out = [];
    let commentChecks = 0;
    await pool(
      ranked,
      3,
      async ({ v }) => {
        try {
          const next = await BYL.yt.api('next', { videoId: v.videoId });
          let block = BYL.extractLyricBlock(BYL.yt.descriptionOf(next), ctx.song);
          let where = '';
          // Lyric videos often keep the words in a pinned/top comment instead.
          if (!block && lyricTitle(v.title) && commentChecks++ < 3) {
            for (const c of await BYL.yt.comments(next, 1)) {
              const b = BYL.extractLyricBlock(c.text, ctx.song);
              if (b && (!block || b.score > block.score)) {
                block = b;
                where = ' (comment)';
              }
            }
          }
          if (block) {
            out.push({
              id: 'd:' + v.videoId,
              source: 'duplicates',
              label: v.title,
              detail: v.channel + where,
              url: '/watch?v=' + v.videoId,
              ...block,
            });
          }
        } catch {}
      }
    );
    return out.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  // ---------- LRCLIB (time-synced) ----------

  async function lrclib(ctx) {
    const { song, duration } = ctx;
    const queries = [songQuery(song)];
    if (song.artist) queries.push(song.title);
    let results = [];
    for (const q of queries) {
      results = JSON.parse(await bg('https://lrclib.net/api/search?q=' + encodeURIComponent(q)));
      if (results.length) break;
    }
    const scored = results
      .filter((r) => r.syncedLyrics || r.plainLyrics)
      .map((r) => {
        const diff = duration && r.duration ? Math.abs(r.duration - duration) : 0;
        let score =
          BYL.similarity(song.title, r.trackName) * 40 +
          BYL.similarity(song.artist, r.artistName) * 20 +
          (r.syncedLyrics ? 15 : 0);
        // MVs often run longer than the audio (intros, skits), so a length
        // gap only costs a little; the panel warns and offers the offset.
        if (diff > 3) score -= Math.min(12, diff / 5);
        return { r, score, diff };
      })
      .filter((x) => x.score > 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored.map(({ r, score, diff }) => {
      const synced = !!r.syncedLyrics;
      return {
        id: 'l:' + r.id,
        source: 'lrclib',
        label: `${r.trackName} — ${r.artistName}`,
        detail: r.duration ? BYL.fmtTime(r.duration) : '',
        url: 'https://lrclib.net/',
        synced,
        lines: synced ? BYL.parseLrc(r.syncedLyrics) : BYL.plainLines(r.plainLyrics),
        score: Math.round(score),
        warn:
          synced && diff > 3
            ? L('Bản này dài {0}, video dài {1}. Nếu lời chạy lệch, chỉnh "Lệch" bên dưới.', BYL.fmtTime(r.duration), BYL.fmtTime(duration))
            : '',
      };
    });
  }

  // ---------- Hợp âm chuẩn (Vietnamese songs, plain text) ----------

  async function hopamchuan(ctx) {
    const { song } = ctx;
    if (!BYL.isVietnamese(song.title + ' ' + song.artist)) return [];
    const html = await bg('https://hopamchuan.com/search?q=' + encodeURIComponent(song.title));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const items = [...doc.querySelectorAll('.song-item')]
      .map((el) => {
        const a = el.querySelector('a.song-title');
        return {
          href: a?.getAttribute('href') || '',
          title: a?.textContent.trim() || '',
          singers: el.querySelector('.song-singers')?.textContent.replace(/^\s*-\s*/, '').trim() || '',
        };
      })
      .filter((x) => /^https:\/\/hopamchuan\.com\/song\/\d+\//.test(x.href))
      .map((x) => ({
        ...x,
        score: BYL.similarity(song.title, x.title) * 40 - Math.abs(BYL.tokens(x.title).length - BYL.tokens(song.title).length) * 3,
      }))
      .filter((x) => x.score >= 30)
      .sort((a, b) => b.score - a.score);
    if (!items.length) return [];

    const best = items[0];
    const page = new DOMParser().parseFromString(await bg(best.href), 'text/html');
    const root = page.querySelector('#song-lyric');
    if (!root) return [];
    const lines = [];
    for (const row of root.querySelectorAll('.chord_lyric_line')) {
      if (row.closest('.song-lyric-note')) continue;
      row.querySelectorAll('.hopamchuan_chord_inline, .hopamchuan_chord').forEach((n) => n.remove());
      lines.push(row.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim());
    }
    const parsed = BYL.plainLines(lines.join('\n'));
    if (parsed.length < 4) return [];
    return [
      {
        id: 'h:' + best.href,
        source: 'hopamchuan',
        label: `${best.title}${best.singers ? ' — ' + best.singers : ''}`,
        detail: 'hopamchuan.com',
        url: best.href,
        synced: false,
        lines: parsed,
        score: Math.round(best.score),
      },
    ];
  }

  // ---------- YouTube captions ----------

  const cleanCaption = (t) =>
    t
      .replace(/\[[^\]]*\]/g, '') // [âm nhạc], [Music], [vỗ tay]…
      .replace(/>>+|&gt;&gt;/g, ' ') // speaker-change marks in auto captions
      .replace(/[♪♫]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  async function transcript(ctx) {
    const tracks = ctx.player?.captionTracks || [];
    if (!tracks.length) return [];
    // Uploaded captions beat auto-generated ones.
    const ordered = [...tracks.filter((t) => t.kind !== 'asr'), ...tracks.filter((t) => t.kind === 'asr')];
    let segs = [];
    let used = null;
    for (const t of ordered.slice(0, 2)) {
      segs = await BYL.yt.captionLines(t).catch(() => []);
      if (segs.length) {
        used = t;
        break;
      }
    }
    if (!segs.length) {
      const got = await BYL.yt.playerCaptions(ctx.videoId).catch(() => null);
      if (got?.lines.length) {
        segs = got.lines;
        used = tracks.find((t) => t.languageCode === got.lang && t.kind === got.kind) || { name: got.lang, kind: got.kind };
      }
    }
    if (!segs.length) {
      segs = await BYL.yt.transcriptPanel(ctx.next).catch(() => []);
      used = segs.length ? { get name() { return L('Bản ghi'); }, kind: '' } : null;
    }
    const lines = segs
      .map((s) => ({ t: s.t, text: cleanCaption(s.text) }))
      .filter((s) => s.text)
      .map((s) => BYL.makeLine(s.text, s.t));
    if (lines.length < 4) return [];
    return [
      {
        id: 'tr',
        source: 'transcript',
        label: used.kind === 'asr' ? L('Phụ đề tự động ({0})', used.name) : L('Phụ đề: {0}', used.name),
        detail: '',
        synced: true,
        lines,
        score: used.kind === 'asr' ? 5 : 20,
      },
    ];
  }

  return { description, comments, duplicates, lrclib, hopamchuan, transcript };
})();
