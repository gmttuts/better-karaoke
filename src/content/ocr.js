'use strict';

// 🔠 Đọc chữ trên video: lyric and karaoke videos often show the words on
// screen. Play the video fast and muted, read the frames whose picture
// changed (Tesseract, through the service worker), and turn the lines that
// appear into timed lyrics: a line's time is when it first shows up.
BYL.ocr = (() => {
  // Faster than 2× and YouTube can't load the video quick enough: it stalls
  // and the player restarts.
  const SPEED = 2; // playback rate while scanning
  const EVERY = 500; // ms between samples: one per second of video
  const SAME = 4; // mean grey-level change (0..255) below which a frame is "the same"

  // ---------- pure parts (tests/ocr.test.mjs) ----------

  // A word, rather than a stray mark the OCR made of a logo or a picture edge.
  // One-letter words exist in Vietnamese (ở, à, ơ…) and English (I, a), not Ö or Ñ.
  const wordish = (w) =>
    /^[("'“]?[\p{L}\d][\p{L}\d'’-]*[)"'”.,!?…:;]*$/u.test(w) &&
    ((w.match(/\p{L}/gu) || []).length >= 2 || /^[aàáạoôơởeêyiuùưừI][.,!?]?$/iu.test(w));

  // Which Tesseract model reads a video, from its title: Japanese, Korean,
  // Chinese and Thai need their own; Vietnamese reads Latin text (English…).
  function langOf(text) {
    text = String(text || '');
    if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return 'jpn';
    if (/\p{Script=Hangul}/u.test(text)) return 'kor';
    if (/\p{Script=Thai}/u.test(text)) return 'tha';
    if (/\p{Script=Han}/u.test(text)) return /[們這個為來說時國愛裡沒會讓經過還對開關風雲倫聽見夢戀淚遠結與從後無記憶歲願邊燈]/u.test(text) ? 'chi_tra' : 'chi_sim';
    return 'vie';
  }
  const LANGS = { jpn: '日本語', kor: '한국어', chi_sim: '中文', chi_tra: '中文', tha: 'ไทย' };
  const wide = (lang) => ['jpn', 'kor', 'chi_sim', 'chi_tra', 'tha'].includes(lang);

  // A line in Japanese, Chinese or Korean: Tesseract puts spaces between the
  // characters; there are no "words" to judge, only letters against junk.
  function keepWide(line) {
    let text = String(line.text || '')
      .replace(/[|_~^`"“”«»<>{}[\]\\©®™•●▶►♪♫¬]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Dashes standing alone: the bars of a karaoke guide melody, read as ー.
      // (Two or more anywhere; one only at the ends: ー and 一 are letters too.)
      .split(' ')
      .filter((w, i, all) => !/^[ー一ｰ\-_.・]{2,}$/u.test(w) && !((i === 0 || i === all.length - 1) && /^[ー一ｰ\-_.・]$/u.test(w)))
      .join(' ');
    // No spaces between two CJK characters (or a CJK one and its punctuation).
    text = text.replace(/(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]) (?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef])/gu, '');
    // Stray marks at the ends.
    text = text.replace(/^[^\p{L}\d(（「『]+|[^\p{L}\d)）」』、。！？!?…]+$/gu, '');
    const letters = (text.match(/[\p{L}\p{M}]/gu) || []).length;
    // Letters of the song's own script (not Latin noise like "wa aa").
    const own = (text.match(/(?![\p{Script=Latin}])\p{L}/gu) || []).length;
    // (Tesseract is less sure of itself on these scripts: a lower bar.)
    if (line.conf < 25 || letters < 2 || own < 2 || letters / text.replace(/\s/g, '').length < 0.6) return null;
    if (/^(www\.|https?:)|\.(com|jp|kr|cn|net)\b|subscribe|karaoke|official|カラオケ|チャンネル登録/i.test(text)) return null;
    return text;
  }

  // One OCR line -> cleaned text, or null for noise, logos, timestamps…
  function keep(line, lang) {
    if (wide(lang)) return keepWide(line);
    const words = String(line.text || '')
      .replace(/[|_~^`"“”«»<>{}[\]\\©®™•●▶►♪♫¬]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    // Junk sticks to the ends of a line (picture edges, the album cover next to it).
    while (words.length && !wordish(words[0])) words.shift();
    while (words.length && !wordish(words[words.length - 1])) words.pop();
    const text = words.join(' ');
    const letters = (text.match(/\p{L}/gu) || []).length;
    if (line.conf < 55 || letters < 4 || letters / text.length < 0.6) return null;
    if (/^(www\.|https?:)|\.(com|vn|net)\b|subscribe|đăng ký|lyrics? video|karaoke|official/i.test(text)) return null;
    return text;
  }

  // How alike two readings are, 0..1 (OCR jitters a letter or two between
  // frames): 1 - edit distance / length, on the text without accents.
  function alike(a, b) {
    a = BYL.fold(a).replace(/\s+/g, ' ');
    b = BYL.fold(b).replace(/\s+/g, ' ');
    if (a === b) return 1;
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let diag = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const keep = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = keep;
      }
    }
    return 1 - row[b.length] / Math.max(a.length, b.length, 1);
  }
  const SAME_LINE = 0.8;

  // Tesseract joins text sitting side by side on the same row (the song
  // title on the cover art next to a lyric line). Split a line where the gap
  // between two words is wider than the text is tall.
  function pieces(line) {
    const ws = line.words?.filter((w) => w.box && w.text.trim());
    if (!ws?.length) return [line];
    const hs = ws.map((w) => w.box[3] - w.box[1]).sort((a, b) => a - b);
    const h = hs[Math.floor(hs.length / 2)];
    const out = [];
    let cur = [ws[0]];
    for (let i = 1; i < ws.length; i++) {
      if (ws[i].box[0] - ws[i - 1].box[2] > h * 1.2) out.push(cur), (cur = []);
      cur.push(ws[i]);
    }
    out.push(cur);
    return out.map((g) => ({
      text: g.map((w) => w.text).join(' '),
      conf: Math.round(g.reduce((s, w) => s + w.conf, 0) / g.length),
      box: [Math.min(...g.map((w) => w.box[0])), Math.min(...g.map((w) => w.box[1])), Math.max(...g.map((w) => w.box[2])), Math.max(...g.map((w) => w.box[3]))],
    }));
  }

  // frames: [{ t, lines: [{ text, conf, box?, words? }] }] in time order -> [{ t, text }].
  // A line's time is when it first shows up, except in videos where the
  // lyrics scroll up as a list with the line being sung in the middle: there
  // it's when the line reaches the middle of the block of text.
  // skip: texts known not to be lyrics (the song title, the artist).
  function assemble(frames, skip = [], lang = 'vie') {
    const done = [];
    let open = [];
    // Readable pieces of text in each frame.
    const seenIn = frames.map((f) => {
      let kept = f.lines.flatMap(pieces).map((raw) => ({ raw, text: keep(raw, lang) })).filter((x) => x.text);
      // Furigana: the small reading over the words, half their height or less.
      if (wide(lang)) {
        const tall = Math.max(0, ...kept.filter((x) => x.raw.box).map((x) => x.raw.box[3] - x.raw.box[1]));
        kept = kept.filter((x) => !x.raw.box || x.raw.box[3] - x.raw.box[1] > tall * 0.55);
      }
      return kept;
    });
    // Text on screen in most of the frames is the title, the
    // artist or a watermark, even when it blinks in and out.
    const groups = [];
    seenIn.forEach((kept, fi) => {
      for (const k of kept) {
        let g = groups.find((x) => alike(x.text, k.text) >= SAME_LINE);
        if (!g) groups.push((g = { text: k.text, frames: new Set() }));
        g.frames.add(fi);
        k.g = g;
      }
    });
    // (Only on a long enough scan: a short clip may show all its lines throughout.)
    const often = (g) => frames.length >= 40 && g.frames.size > frames.length * 0.5;
    const named = (text) => skip.some((s) => s && alike(s, text) >= 0.7);
    const keptOf = (f) => seenIn[frames.indexOf(f)].filter((k) => !often(k.g) && !named(k.text));
    const yOf = (raw) => (raw.box[1] + raw.box[3]) / 2;
    // The middle row: the middle of the block of text on screens showing a
    // full list (3 lines or more), the same all through the video.
    let mid = null;
    {
      const blocks = frames.map((f) => keptOf(f).filter((x) => x.raw.box).map((x) => yOf(x.raw)));
      const most = Math.max(0, ...blocks.map((b) => b.length));
      if (most >= 3) {
        const mids = blocks.filter((b) => b.length === most).map((b) => (Math.min(...b) + Math.max(...b)) / 2).sort((a, b) => a - b);
        mid = mids[Math.floor(mids.length / 2)];
      }
    }
    for (const f of frames) {
      const seen = new Set();
      const kept = keptOf(f);
      // Match the lines on screen to the lines already open, closest pairs first.
      const pairs = [];
      kept.forEach((k, i) => open.forEach((o) => pairs.push([alike(o.text, k.text), i, o])));
      pairs.sort((a, b) => b[0] - a[0]);
      const match = new Map();
      for (const [score, i, o] of pairs) {
        if (score < SAME_LINE) break;
        if (match.has(i) || seen.has(o)) continue;
        match.set(i, o);
        seen.add(o);
      }
      kept.forEach(({ raw, text }, i) => {
        let o = match.get(i);
        if (!o) open.push((o = { first: f.t, last: f.t, reads: [], ys: [], y0: raw.box ? yOf(raw) : 0 }));
        o.last = f.t;
        if (raw.box) {
          const y = yOf(raw);
          const h = raw.box[3] - raw.box[1];
          o.ys.push(y);
          o.h = Math.max(o.h || 0, h);
          if (mid !== null && o.mid === undefined && Math.abs(y - mid) < h * 0.6) o.mid = f.t;
        }
        o.reads.push({ text, conf: raw.conf });
        // The best reading so far stands for the line.
        o.text = o.reads.reduce((a, b) => (b.conf > a.conf || (b.conf === a.conf && b.text.length > a.text.length) ? b : a)).text;
        seen.add(o);
      });
      // A line gone for more than a sample or so has ended.
      open = open.filter((o) => {
        // (A line can drop out of a frame or two: a spinner over it, a misread.)
        if (seen.has(o) || f.t - o.last <= 3.5) return true;
        done.push(o);
        return false;
      });
    }
    done.push(...open);
    const span = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
    const moved = (o) => o.ys.length > 1 && Math.max(...o.ys) - Math.min(...o.ys) > o.h;
    let lines = done
      // Channel names, song titles and watermarks stay up far longer than a lyric line.
      .filter((o) => o.last - o.first < Math.max(25, span * 0.3))
      // A single blurry read is more likely noise than a line.
      .filter((o) => o.reads.length > 1 || o.reads[0].conf >= 75)
      // Reading order: as the lines come on screen, top to bottom.
      .sort((a, b) => a.first - b.first || a.y0 - b.y0);
    const scrolling = lines.filter(moved).length > lines.length / 2;
    // A line read again a few seconds after it was lost (covered by the
    // player's spinner, misread) is the same line, not the song repeating it:
    // a brief re-read, or, in a scrolling list where new lines come in at the
    // bottom, one first seen above the middle row.
    const again = (o, i, all) =>
      all.slice(0, i).some((p) => o.first > p.last && o.first - p.last < 15 && alike(p.text, o.text) >= SAME_LINE) &&
      (o.reads.length <= 2 || (scrolling && mid !== null && o.y0 < mid - o.h * 0.5));
    lines = lines.filter((o, i, all) => !again(o, i, all));
    // A scrolling list: a line is sung when it reaches the middle row. Lines
    // that never got there (the end of the song) follow on at the usual pace.
    const steps = [];
    lines.forEach((o, i) => i && o.mid !== undefined && lines[i - 1].mid !== undefined && steps.push(o.mid - lines[i - 1].mid));
    steps.sort((a, b) => a - b);
    const step = steps.length ? Math.max(1, steps[Math.floor(steps.length / 2)]) : 3;
    let prev = -Infinity;
    return lines.map((o) => {
      let t = o.first;
      if (scrolling) t = o.mid !== undefined ? o.mid : Math.max(o.first, prev + step);
      t = Math.max(t, prev);
      prev = t;
      return { t: Math.round(t * 100) / 100, text: o.text };
    });
  }

  // Lines -> LRC, with a blank line where the screen stays empty a while.
  function toLrc(lines) {
    const out = [];
    lines.forEach((l, i) => {
      if (i && l.t - lines[i - 1].t > 12) out.push('');
      out.push(`${BYL.lrcStamp(l.t)} ${l.text}`);
    });
    return out.join('\n');
  }

  // ---------- scanning ----------

  let job = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Tiny greyscale copy of the frame, to tell whether anything changed.
  function signature(video, cv) {
    cv.width = 64;
    cv.height = 36;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, 0, 0, 64, 36);
    const d = g.getImageData(0, 0, 64, 36).data;
    const out = new Uint8Array(64 * 36);
    for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10;
    return out;
  }
  const change = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s / a.length;
  };

  function snapshot(video, cv) {
    // Lyrics are big text: 960 px wide reads them as well as full size, faster.
    const w = Math.min(960, video.videoWidth || 960);
    cv.width = w;
    cv.height = Math.round((w * (video.videoHeight || 720)) / (video.videoWidth || 1280));
    cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.85);
  }

  // Karaoke videos: coloured letters with thick outlines (and in Japanese,
  // Chinese, Korean, Thai small furigana over them). Tesseract reads them far better
  // large (1920 px) and in black and white: what is bright (any colour) is
  // ink, the dark sky behind is paper; on a light picture, the other way round.
  function inked(video, cv) {
    const w = 1920;
    cv.width = w;
    cv.height = Math.round((w * (video.videoHeight || 720)) / (video.videoWidth || 1280));
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, 0, 0, cv.width, cv.height);
    const img = g.getImageData(0, 0, cv.width, cv.height);
    const p = img.data;
    let sum = 0;
    for (let i = 0; i < p.length; i += 64) sum += (p[i] * 3 + p[i + 1] * 6 + p[i + 2]) / 10;
    const light = sum / (p.length / 64) > 140;
    for (let i = 0; i < p.length; i += 4) {
      const ink = light ? Math.min(p[i], p[i + 1], p[i + 2]) < 70 : Math.max(p[i], p[i + 1], p[i + 2]) > 200;
      p[i] = p[i + 1] = p[i + 2] = ink ? 0 : 255;
    }
    g.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  async function read(image, lang) {
    const res = await chrome.runtime.sendMessage({ type: 'ocr', image, lang });
    if (res?.error) throw new Error(res.error);
    return res?.lines || [];
  }

  // Scans the video playing on the page. onProgress(share 0..1, linesSoFar).
  // Resolves with [{ t, text }]; stop() ends it early with what was read.
  // skip: the song title / artist, which lyric videos show beside the words.
  async function scan(video, onProgress, skip = [], lang = 'vie') {
    if (job) throw new Error('busy');
    const me = (job = { stop: false });
    const ad = BYL.adShowing;
    // Wait out ads and the video still loading (its length unknown).
    for (let i = 0; i < 240 && !me.stop && (ad() || !(video.duration > 0) || video.readyState < 1); i++) await sleep(500);
    if (!(video.duration > 0)) {
      job = null;
      throw new Error(L('video chưa tải xong, thử lại sau ít giây'));
    }
    // play() is cut short when YouTube swaps the source; try a few times.
    // (play() can also never settle while the player has no source: give up
    // on it after a few seconds, or ⏹ would wait forever.)
    const play = async () => {
      for (let i = 0; i < 5 && !me.stop; i++) {
        try {
          return await Promise.race([video.play(), sleep(3000).then(() => Promise.reject(new Error('play timeout')))]);
        } catch {
          await sleep(400);
        }
      }
    };
    const before = { src: video.currentSrc, t: video.currentTime, rate: video.playbackRate, muted: video.muted, paused: video.paused };
    const small = document.createElement('canvas');
    const big = document.createElement('canvas');
    const samples = []; // { t, p: Promise<lines> }
    const inflight = new Set();
    let prev = null;
    let last = null;
    try {
      video.muted = true;
      video.currentTime = 0;
      video.playbackRate = SPEED;
      await play();
      // Stop a little before the very end: at 2× a sample is a second of
      // video, and once it ends YouTube moves on to the next one by itself.
      const end = (video.duration || 0) - 1.5;
      const page = () => new URLSearchParams(location.search).get('v') || location.pathname;
      // Two ways to read a frame: as it is, or enlarged in black and white
      // (karaoke lettering with outlines, which the first often can't read).
      // Japanese & co. always use the second; otherwise both are tried on the
      // first frames with text, and the one reading more goes on alone.
      let mode = wide(lang) ? 'ink' : null;
      const tally = { plain: 0, ink: 0 };
      let tried = 0;
      const letters = (lines) => lines.flatMap(pieces).map((x) => keep(x, lang) || '').join('').length;
      const readFrame = () => {
        if (mode) return read(mode === 'ink' ? inked(video, big) : snapshot(video, big), lang).catch(() => []);
        const a = snapshot(video, big);
        const b = inked(video, big);
        return Promise.all([read(a, lang).catch(() => []), read(b, lang).catch(() => [])]).then(([x, y]) => {
          const sx = letters(x);
          const sy = letters(y);
          tally.plain += sx;
          tally.ink += sy;
          if ((sx || sy) && ++tried >= 5) mode = tally.ink > tally.plain ? 'ink' : 'plain';
          return sy > sx ? y : x;
        });
      };
      const here = page();
      let reached = 0; // furthest point read
      while (!me.stop && !video.ended && video.currentTime < end) {
        await sleep(EVERY);
        // Another video (YouTube's autoplay, or the user): done with this one.
        if (page() !== here) break;
        // YouTube puts its own speed back now and then.
        if (video.playbackRate !== SPEED) video.playbackRate = SPEED;
        video.muted = true;
        // The player restarted (it does after a long stall): back to where we were.
        const lastT = samples.length ? samples[samples.length - 1].t : 0;
        reached = Math.max(reached, lastT, video.currentTime);
        // Back near the start after reaching the end: the song is over.
        if (reached >= end - 2 || video.ended) break;
        if (video.currentTime + 5 < lastT) {
          video.currentTime = lastT;
          await play();
          continue;
        }
        if (video.readyState < 3) continue; // still loading
        if (ad() || video.paused) {
          if (video.paused && !ad()) await play();
          continue;
        }
        const t = video.currentTime;
        const sig = signature(video, small);
        if (prev && last && change(sig, prev) < SAME) {
          samples.push({ t, p: last });
        } else {
          prev = sig;
          const p = (last = readFrame());
          samples.push({ t, p });
          inflight.add(p);
          p.finally(() => inflight.delete(p));
          // Reading slower than playing: hold the video until it catches up.
          if (inflight.size >= 3) {
            video.pause();
            while (inflight.size >= 2 && !me.stop) await Promise.race(inflight);
            if (!me.stop) await play();
          }
        }
        onProgress?.(Math.min(1, t / (video.duration || 1)), samples.length);
      }
      const frames = [];
      for (const s of samples) frames.push({ t: s.t, lines: await s.p });
      return assemble(frames, skip, lang);
    } finally {
      video.playbackRate = before.rate;
      video.muted = before.muted;
      // Put the video back as it was, unless the user moved on to another one.
      if (video.currentSrc === before.src) {
        video.currentTime = before.t;
        if (before.paused) video.pause();
      }
      job = null;
    }
  }

  const stop = () => job && (job.stop = true);
  const busy = () => !!job;

  return { keep, assemble, toLrc, scan, stop, busy, langOf, LANGS };
})();
