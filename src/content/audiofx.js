'use strict';

// Sound of the YouTube video for karaoke: 🎚 Đổi tông (key up / down without
// changing speed, src/audio/pitch-worklet.js) and 🎤 Lọc giọng (vocal cut).
//
// The video's sound is taken into a Web Audio graph once, the first time one
// of them is turned on (it needs a click: a browser only starts audio after
// one), and stays there; with both off it goes straight to the speakers.
//
// Lọc giọng works like the "vocal cut" of karaoke machines: the singer is
// mixed in the middle (same in both speakers), the band spread to the sides.
// Splitting the sound into middle (L+R) and sides (L−R) and keeping only the
// lows and highs of the middle drops most of the voice and keeps the bass,
// the kick and the cymbals:
//   L' = side + (1−k)·mid + k·(low(mid) + high(mid)),  R' = −side + the same.
BYL.fx = (() => {
  const want = { semis: 0, vocal: 0 }; // vocal: 0..1
  let ctx = null;
  let ready = null; // Promise of the AudioContext with the worklet loaded
  const graphs = new WeakMap(); // <video> -> nodes
  let waiting = false;

  const video = () => BYL.playerEl()?.querySelector('video');
  const active = () => !!want.semis || want.vocal > 0;

  async function context() {
    ctx ||= new AudioContext({ latencyHint: 'playback' });
    ready ||= ctx.audioWorklet.addModule(chrome.runtime.getURL('src/audio/pitch-worklet.js')).then(() => ctx);
    // resume() never settles when the browser won't start sound yet.
    await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1500))]);
    return ready;
  }

  function build(v) {
    const g = (n = 1) => {
      const node = ctx.createGain();
      node.gain.value = n;
      return node;
    };
    const filter = (type, f) => new BiquadFilterNode(ctx, { type, frequency: f, Q: 0.707 });
    const src = ctx.createMediaElementSource(v);
    const vin = g();
    vin.channelCount = 2;
    vin.channelCountMode = 'explicit';
    vin.channelInterpretation = 'speakers';
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const mid = g(0.5);
    const sideL = g(0.5);
    const sideR = g(-0.5);
    const side = g();
    const invert = g(-1);
    const keep = g(1); // (1−k)·mid
    const ends = g(0); // k·(low + high)
    const midOut = g();
    vin.connect(split);
    split.connect(mid, 0);
    split.connect(mid, 1);
    split.connect(sideL, 0);
    split.connect(sideR, 1);
    sideL.connect(side);
    sideR.connect(side);
    mid.connect(keep).connect(midOut);
    mid.connect(filter('lowpass', 140)).connect(ends);
    mid.connect(filter('highpass', 7500)).connect(ends);
    ends.connect(midOut);
    midOut.connect(merge, 0, 0);
    midOut.connect(merge, 0, 1);
    side.connect(merge, 0, 0);
    side.connect(invert).connect(merge, 0, 1);
    const pitch = new AudioWorkletNode(ctx, 'byl-pitch', { outputChannelCount: [2] });
    return { src, vin, out: merge, keep, ends, pitch };
  }

  function route(n) {
    for (const node of [n.src, n.out, n.pitch]) node.disconnect();
    let at = n.src;
    if (want.vocal > 0) {
      n.keep.gain.value = 1 - want.vocal;
      n.ends.gain.value = want.vocal;
      at.connect(n.vin);
      at = n.out;
    }
    if (want.semis) {
      n.pitch.port.postMessage({ ratio: Math.pow(2, want.semis / 12) });
      at = at.connect(n.pitch);
    }
    at.connect(ctx.destination);
    n.last = at;
  }

  // Puts `want` into effect on the current video. Without a click on the
  // page yet, waits for the first one (a saved key for this video).
  async function apply() {
    const v = video();
    if (!v) return false;
    if (!graphs.has(v) && !active()) return true;
    if (!graphs.has(v) && !navigator.userActivation?.hasBeenActive && !ctx) {
      if (!waiting) {
        waiting = true;
        document.addEventListener('pointerdown', () => ((waiting = false), apply()), { once: true, capture: true });
      }
      return false;
    }
    try {
      await context();
      // Only take the sound once it can play: a stopped context would mute it.
      if (ctx.state !== 'running') return false;
      if (!graphs.has(v)) graphs.set(v, build(v));
      route(graphs.get(v));
      return true;
    } catch (err) {
      console.warn('[Better Lyric] audio', err);
      return false;
    }
  }

  const setSemis = (n) => {
    want.semis = Math.max(-6, Math.min(6, Math.round(n) || 0));
    return apply();
  };
  const setVocal = (k) => {
    want.vocal = Math.max(0, Math.min(1, k));
    return apply();
  };

  // What comes out right now, as dB per frequency bin (tests, diagnostics).
  async function probe() {
    const n = graphs.get(video());
    if (!n?.last) return null;
    // The left speaker alone: a mono mix would cancel what is only on one side.
    const split = ctx.createChannelSplitter(2);
    const an = ctx.createAnalyser();
    an.fftSize = 8192;
    n.last.connect(split);
    split.connect(an, 0);
    await new Promise((r) => setTimeout(r, 700));
    const db = new Float32Array(an.frequencyBinCount);
    an.getFloatFrequencyData(db);
    n.last.disconnect(split);
    return { rate: ctx.sampleRate, size: an.fftSize, state: ctx.state, db: [...db] };
  }

  return { setSemis, setVocal, apply, probe, get semis() { return want.semis; }, get vocal() { return want.vocal; } };
})();
