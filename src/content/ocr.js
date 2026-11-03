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

  // One OCR line -> cleaned text, or null for noise, logos, timestamps…
  function keep(line) {
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
  function assemble(frames, skip = []) {
    const done = [];
    let open = [];
    // Readable pieces of text in each frame.
    const seenIn = frames.map((f) => f.lines.flatMap(pieces).map((raw) => ({ raw, text: keep(raw) })).filter((x) => x.text));
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

  async function read(image) {
    const res = await chrome.runtime.sendMessage({ type: 'ocr', image });
    if (res?.error) throw new Error(res.error);
    return res?.lines || [];
  }

  // Scans the video playing on the page. onProgress(share 0..1, linesSoFar).
  // Resolves with [{ t, text }]; stop() ends it early with what was read.
  // skip: the song title / artist, which lyric videos show beside the words.
  async function scan(video, onProgress, skip = []) {
    if (job) throw new Error('busy');
    const me = (job = { stop: false });
    const ad = () => !!BYL.playerEl()?.classList.contains('ad-showing');
    // Wait out ads and the video still loading (its length unknown).
    for (let i = 0; i < 240 && !me.stop && (ad() || !(video.duration > 0) || video.readyState < 1); i++) await sleep(500);
    if (!(video.duration > 0)) {
      job = null;
      throw new Error(L('video chưa tải xong, thử lại sau ít giây'));
    }
    // play() is cut short when YouTube swaps the source; try a few times.
    const play = async () => {
      for (let i = 0; i < 5; i++) {
        try {
          return await video.play();
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
      const end = (video.duration || 0) - 0.3;
      while (!me.stop && !video.ended && video.currentTime < end) {
        await sleep(EVERY);
        // YouTube puts its own speed back now and then.
        if (video.playbackRate !== SPEED) video.playbackRate = SPEED;
        video.muted = true;
        // The player restarted (it does after a long stall): back to where we were.
        const lastT = samples.length ? samples[samples.length - 1].t : 0;
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
          const p = (last = read(snapshot(video, big)).catch(() => []));
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
      return assemble(frames, skip);
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

  return { keep, assemble, toLrc, scan, stop, busy };
})();
