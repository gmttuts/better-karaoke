'use strict';

// 🎙 Chấm điểm: scores the user's singing against the song, line by line.
// The microphone lives in the extension's own window (src/score/), so the
// permission goes to the extension rather than to youtube.com; it streams
// { f0, rms } here through a port. Here the music of the video is analysed
// into a chroma (how strong each of the 12 notes is right now): a sung note
// matching a strong note of the music, in any octave, counts as in tune.
BYL.score = (() => {
  // ---------- pure parts (tests/score.test.mjs) ----------

  // FFT magnitudes (dB from AnalyserNode) -> 12 chroma bins, 0..1.
  function chroma(db, rate, fftSize, lo = 110, hi = 1760) {
    const c = new Float32Array(12);
    const binHz = rate / fftSize;
    for (let k = Math.ceil(lo / binHz); k <= Math.min(db.length - 1, Math.floor(hi / binHz)); k++) {
      const mag = Math.pow(10, db[k] / 20);
      const pc = ((Math.round(69 + 12 * Math.log2((k * binHz) / 440)) % 12) + 12) % 12;
      c[pc] += mag * mag;
    }
    let max = 0;
    for (const v of c) max = Math.max(max, v);
    if (max > 0) for (let i = 0; i < 12; i++) c[i] /= max;
    return c;
  }

  // How well a sung frequency fits the music right now (0..1): the chroma at
  // its pitch class, softened by its neighbours when slightly off.
  function match(f0, c) {
    if (!f0 || !c) return 0;
    const m = 69 + 12 * Math.log2(f0 / 440);
    const pc = ((Math.round(m) % 12) + 12) % 12;
    const off = Math.abs(m - Math.round(m)); // 0 .. 0.5 semitone
    return c[pc] * (1 - off);
  }

  // One line's frames [{ voiced, fit }] -> 0..100. Singing through the line
  // counts for 40%, singing in tune for 60%. fit is null when the music
  // couldn't be heard (no captureStream): then only singing along counts.
  function lineScore(frames) {
    if (!frames.length) return null;
    const voiced = frames.filter((f) => f.voiced);
    // Nobody sings every frame of a line: 60% of it is a full mark.
    const presence = Math.min(1, voiced.length / frames.length / 0.6);
    const fits = voiced.filter((f) => f.fit !== null);
    if (voiced.length && !fits.length) return Math.round(100 * presence);
    const tune = fits.length ? fits.reduce((s, f) => s + f.fit, 0) / fits.length : 0;
    return Math.round(100 * (0.4 * presence + 0.6 * Math.min(1, tune / 0.75)));
  }

  const verdict = (s) =>
    s >= 90 ? L('Tuyệt vời!') : s >= 75 ? L('Hay lắm!') : s >= 55 ? L('Khá tốt') : s >= 30 ? L('Cố lên!') : L('Hát to lên nào');

  // ---------- live ----------

  let port = null;
  let audio = null; // { ctx, an, buf }
  let session = null; // { lines: { i: frames[] }, scores: { i: score }, cur }
  let lastChroma = null;

  function musicChroma() {
    const v = BYL.playerEl()?.querySelector('video');
    if (!v) return null;
    if (!audio || audio.video !== v) {
      try {
        // captureStream copies the sound without taking it from the speakers.
        const stream = v.captureStream ? v.captureStream() : v.mozCaptureStream?.();
        if (!stream?.getAudioTracks().length) return null;
        const ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 8192;
        an.smoothingTimeConstant = 0.6;
        ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(an);
        ctx.resume();
        audio = { video: v, ctx, an, buf: new Float32Array(an.frequencyBinCount) };
      } catch (err) {
        console.debug('[Better Lyric] score audio', err);
        return null;
      }
    }
    audio.an.getFloatFrequencyData(audio.buf);
    return chroma(audio.buf, audio.ctx.sampleRate, audio.an.fftSize);
  }

  function onFrame({ f0, rms }) {
    const ui = BYL.ui;
    const i = ui.lineNow?.();
    const v = BYL.playerEl()?.querySelector('video');
    if (!session || !v || v.paused) return;
    // A line just ended: score it and tell the user.
    if (session.cur !== null && session.cur !== i) finishLine(session.cur);
    session.cur = i ?? null;
    if (i === null || i === undefined || i < 0) return;
    lastChroma = musicChroma() || lastChroma;
    const voiced = f0 > 0 && rms > 0.02;
    (session.lines[i] ||= []).push({ voiced, fit: !voiced ? 0 : lastChroma ? match(f0, lastChroma) : null });
  }

  function finishLine(i) {
    const s = lineScore(session.lines[i] || []);
    if (s === null) return;
    session.scores[i] = s;
    const all = Object.values(session.scores);
    const total = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    port?.postMessage({ type: 'line', score: s, total, lines: all.length, verdict: verdict(s) });
    BYL.toast?.(`🎙 ${s} · ${verdict(s)}  —  ${L('Tổng')} ${total}`, 2500);
  }

  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== 'byl-score') return;
    port?.disconnect();
    port = p;
    session = { lines: {}, scores: {}, cur: null };
    p.onMessage.addListener((m) => {
      if (m.type === 'frame') onFrame(m);
      else if (m.type === 'reset') session = { lines: {}, scores: {}, cur: null };
    });
    p.onDisconnect.addListener(() => {
      if (port !== p) return;
      port = null;
      session = null;
      audio?.ctx.close();
      audio = null;
    });
    p.postMessage({ type: 'hello', song: BYL.ui.state.song, timed: !!BYL.ui.state.current?.synced });
  });

  const open = () => chrome.runtime.sendMessage({ type: 'openScore' });

  return { chroma, match, lineScore, verdict, open, active: () => !!port };
})();
