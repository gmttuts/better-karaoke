'use strict';

// Sound of the YouTube video for karaoke: 🎚 Đổi tông (key up / down without
// changing speed, src/audio/pitch-worklet.js) and 🎤 Lọc giọng (vocal cut).
//
// The video's sound is taken into a Web Audio graph once, the first time one
// of them is turned on (it needs a click: a browser only starts audio after
// one), and stays there; with both off it goes straight to the speakers.
//
// Lọc giọng (src/audio/vocal-worklet.js) turns down only what is in the
// middle of the stereo picture, in the range of a voice and held like a sung
// note, so the drums, the bass and the instruments on the sides stay.
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
    const add = (f) => ctx.audioWorklet.addModule(chrome.runtime.getURL('src/audio/' + f));
    ready ||= Promise.all([add('pitch-worklet.js'), add('vocal-worklet.js')]).then(() => ctx);
    // resume() never settles when the browser won't start sound yet.
    await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1500))]);
    return ready;
  }

  function build(v) {
    const src = ctx.createMediaElementSource(v);
    const stereo = { outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' };
    const vocal = new AudioWorkletNode(ctx, 'byl-vocal', stereo);
    const pitch = new AudioWorkletNode(ctx, 'byl-pitch', { outputChannelCount: [2] });
    return { src, vocal, pitch };
  }

  function route(n) {
    for (const node of [n.src, n.vocal, n.pitch]) node.disconnect();
    let at = n.src;
    if (want.vocal > 0) {
      n.vocal.port.postMessage({ amount: want.vocal });
      at = at.connect(n.vocal);
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
      console.warn('[Better Karaoke] audio', err);
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
