'use strict';

// Line up lyrics with YouTube captions. Captions carry timing but are often
// rough (auto-generated, merged lines); lyrics carry the right words but no
// timing. Matching their words in order (longest common subsequence) gives
// each lyric line the time its words were spoken in the captions.

// Caption file -> [{ tok, t }] one entry per word, in seconds.
BYL.captionWords = (text) => {
  text = String(text || '').trim();
  const out = [];
  // exact: the captions timed this word itself (auto captions), rather than
  // the line it sits in; only those are good enough to light single words.
  const spread = (str, start, dur, exact = false) => {
    // Drop "[âm nhạc]", "[Music]", ">>" and the like.
    const toks = BYL.tokens(String(str).replace(/\[[^\]]*\]|>>/g, ' '));
    toks.forEach((tok, i) => out.push({ tok, t: start + (dur * i) / Math.max(1, toks.length), exact: exact && i === 0 }));
  };
  if (text.startsWith('{')) {
    for (const e of JSON.parse(text).events || []) {
      if (!e.segs) continue;
      const start = (e.tStartMs || 0) / 1000;
      const dur = (e.dDurationMs || 2000) / 1000;
      // Auto captions time every word (tOffsetMs); uploaded ones only the line.
      const timed = e.segs.length > 1 && e.segs.some((s) => s.tOffsetMs);
      if (timed) for (const s of e.segs) spread(s.utf8, start + (s.tOffsetMs || 0) / 1000, 0.3, true);
      else spread(e.segs.map((s) => s.utf8).join(''), start, dur * 0.8);
    }
  } else if (text.startsWith('<')) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    for (const p of doc.querySelectorAll('p')) {
      const start = Number(p.getAttribute('t')) / 1000;
      const ss = [...p.querySelectorAll('s')];
      if (ss.length > 1) for (const s of ss) spread(s.textContent, start + Number(s.getAttribute('t') || 0) / 1000, 0.3, true);
      else spread(p.textContent, start, (Number(p.getAttribute('d')) || 2000) / 1000 * 0.8);
    }
    for (const n of doc.querySelectorAll('text')) {
      spread(n.textContent, Number(n.getAttribute('start')), Number(n.getAttribute('dur') || 2) * 0.8);
    }
  }
  return out.filter((w) => w.tok.length > 0);
};

const sameWord = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a)));

// Longest common subsequence of two token lists -> matched index pairs.
function lcsPairs(A, B) {
  const n = A.length;
  const m = B.length;
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = sameWord(A[i], B[j])
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (sameWord(A[i], B[j]) && dp[i * w + j] === dp[(i + 1) * w + j + 1] + 1) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
    else j++;
  }
  return pairs;
}

const WORD_SEC = 0.28; // rough time per sung word, to step back to a line's start

// Returns { lines, matchedLines, coverage, offset, anchors: [{ li, t }], wordLines } or null when the captions
// don't resemble the lyrics. `lines` gets a time on every line; `offset` is the
// median shift between the lyrics' own times and the captions (synced input).
BYL.alignLyrics = (lines, words) => {
  const L = [];
  lines.forEach((l, li) => {
    if (!l.text || l.section) return;
    let wi = 0;
    // dw: the word as split on screen (ui.js wordLine), for per-word timing.
    l.text.split(/\s+/).filter(Boolean).forEach((word, dw) => BYL.tokens(word).forEach((tok) => L.push({ tok, li, wi: wi++, dw })));
  });
  if (L.length < 8 || words.length < 8) return null;
  // Keep the table a sane size on very long captions (live sets, medleys).
  if (L.length * words.length > 4e6) return null;

  const pairs = lcsPairs(
    L.map((x) => x.tok),
    words.map((x) => x.tok)
  );
  const coverage = pairs.length / L.length;
  if (coverage < 0.3) return null;

  // Time of a line = time of its first well-anchored word, stepped back to the
  // line start. A line needs at least 2 matched words (or all of a short line)
  // so a stray common word ("anh", "em", "the") can't drag it around.
  const hits = new Map();
  for (const [i, j] of pairs) {
    const { li, wi } = L[i];
    const h = hits.get(li) || { n: 0, t: null };
    h.n++;
    if (h.t === null) h.t = Math.max(0, words[j].t - wi * WORD_SEC);
    hits.set(li, h);
  }
  const singable = lines.map((l, i) => (l.text && !l.section ? i : -1)).filter((i) => i >= 0);
  let anchors = singable
    .filter((li) => {
      const h = hits.get(li);
      if (!h) return false;
      const size = BYL.tokens(lines[li].text).length;
      return h.n >= Math.min(2, size);
    })
    .map((li) => ({ li, t: hits.get(li).t }));

  // Times must go forward: keep the longest run of anchors whose times
  // increase, so one stray match can't knock out the good ones around it.
  {
    const n = anchors.length;
    const len = new Array(n).fill(1);
    const prev = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (anchors[j].t < anchors[i].t && len[j] + 1 > len[i]) {
          len[i] = len[j] + 1;
          prev[i] = j;
        }
      }
    }
    let end = 0;
    for (let i = 1; i < n; i++) if (len[i] > len[end]) end = i;
    const keep = [];
    for (let i = n ? end : -1; i >= 0; i = prev[i]) keep.push(anchors[i]);
    anchors = keep.reverse();
  }
  if (anchors.length < Math.max(3, singable.length * 0.25)) return null;

  // Fill in every singable line: between anchors spread evenly, outside them
  // step a few seconds per line.
  const timeOf = new Map(anchors.map((a) => [a.li, a.t]));
  const pos = singable.map((li) => li);
  const known = pos.map((li, k) => (timeOf.has(li) ? k : -1)).filter((k) => k >= 0);
  const times = new Array(pos.length);
  for (const k of known) times[k] = timeOf.get(pos[k]);
  for (let a = 0; a < known.length - 1; a++) {
    const k0 = known[a];
    const k1 = known[a + 1];
    for (let k = k0 + 1; k < k1; k++) times[k] = times[k0] + ((times[k1] - times[k0]) * (k - k0)) / (k1 - k0);
  }
  const first = known[0];
  const last = known[known.length - 1];
  for (let k = first - 1; k >= 0; k--) times[k] = Math.max(0, times[k + 1] - 3);
  for (let k = last + 1; k < pos.length; k++) times[k] = times[k - 1] + 3;

  const out = lines.map((l) => ({ ...l }));
  pos.forEach((li, k) => (out[li].t = times[k]));
  // Blank and section lines take the time of the next sung line.
  let nextT = times[times.length - 1] + 3;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].t === undefined || !out[i].text || out[i].section) out[i].t = nextT;
    else nextT = out[i].t;
  }

  let offset = 0;
  const diffs = anchors.filter((a) => typeof lines[a.li].t === 'number').map((a) => a.t - lines[a.li].t);
  if (diffs.length >= 5) {
    diffs.sort((x, y) => x - y);
    offset = Math.round(diffs[Math.floor(diffs.length / 2)] * 10) / 10;
  }
  const wordLines = wordTimes(L, pairs, words, out);
  return { lines: out, matchedLines: anchors.length, totalLines: singable.length, coverage, offset, anchors, wordLines };
};

// Per-word timing for karaoke wipes, from captions that time each word (auto
// captions). Sets line.wd = seconds after line.t at which each on-screen word
// starts, on lines where most words matched an exactly timed caption word.
// Returns how many lines got one.
function wordTimes(L, pairs, words, out) {
  const at = new Map(); // li -> Map(dw -> t)
  for (const [i, j] of pairs) {
    if (!words[j].exact) continue;
    const { li, dw } = L[i];
    const m = at.get(li) || new Map();
    if (!m.has(dw)) m.set(dw, words[j].t);
    at.set(li, m);
  }
  let n = 0;
  for (const [li, m] of at) {
    const count = out[li].text.split(/\s+/).filter(Boolean).length;
    if (count < 2 || m.size < Math.max(2, count * 0.6)) continue;
    const abs = new Array(count).fill(null);
    for (const [dw, t] of m) abs[dw] = t;
    // Matches out of order (a repeated word picked up too early) break the wipe.
    let last = -Infinity;
    for (let k = 0; k < count; k++) {
      if (abs[k] === null) continue;
      if (abs[k] < last) abs[k] = null;
      else last = abs[k];
    }
    const known = abs.map((t, k) => (t === null ? -1 : k)).filter((k) => k >= 0);
    if (known.length < Math.max(2, count * 0.6)) continue;
    for (let a = 0; a < known.length - 1; a++) {
      const [k0, k1] = [known[a], known[a + 1]];
      for (let k = k0 + 1; k < k1; k++) abs[k] = abs[k0] + ((abs[k1] - abs[k0]) * (k - k0)) / (k1 - k0);
    }
    for (let k = known[0] - 1; k >= 0; k--) abs[k] = abs[k + 1] - WORD_SEC;
    for (let k = known[known.length - 1] + 1; k < count; k++) abs[k] = abs[k - 1] + WORD_SEC;
    out[li].wd = abs.map((t) => Math.max(0, Math.round((t - out[li].t) * 100) / 100));
    n++;
  }
  return n;
}
