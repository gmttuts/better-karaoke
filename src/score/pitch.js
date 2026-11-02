'use strict';

// Pitch of a singing voice from a block of microphone samples (YIN, de
// Cheveigné & Kawahara 2002, without the parabolic refinement). Shared by the
// score window and the tests.
var BYL = (globalThis.BYL = globalThis.BYL || {});
BYL.pitch = (() => {
  // samples: Float32Array, rate: Hz. Returns { f0 (Hz, 0 = unvoiced), rms }.
  function detect(samples, rate, minHz = 70, maxHz = 1100) {
    const n = samples.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / n);
    if (rms < 0.01) return { f0: 0, rms };
    const maxLag = Math.min(Math.floor(rate / minHz), Math.floor(n / 2));
    const minLag = Math.max(2, Math.floor(rate / maxHz));
    const w = n - maxLag;
    const d = new Float32Array(maxLag + 1);
    for (let lag = 1; lag <= maxLag; lag++) {
      let s = 0;
      for (let i = 0; i < w; i++) {
        const x = samples[i] - samples[i + lag];
        s += x * x;
      }
      d[lag] = s;
    }
    // Cumulative mean normalised difference; first dip under the threshold.
    let run = 0;
    let best = -1;
    let bestVal = 1;
    for (let lag = 1; lag <= maxLag; lag++) {
      run += d[lag];
      const v = run ? (d[lag] * lag) / run : 1;
      if (lag < minLag) continue;
      if (v < 0.15) {
        // walk to the bottom of this dip
        let l = lag;
        let lv = v;
        while (l + 1 <= maxLag) {
          run += d[l + 1];
          const nv = run ? (d[l + 1] * (l + 1)) / run : 1;
          if (nv >= lv) break;
          l++;
          lv = nv;
        }
        best = l;
        bestVal = lv;
        break;
      }
      if (v < bestVal) {
        bestVal = v;
        best = lag;
      }
    }
    if (best < 0 || bestVal > 0.35) return { f0: 0, rms };
    return { f0: rate / best, rms };
  }

  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // MIDI note number (A4 = 69) and its name, for showing the note sung.
  const midi = (f) => 69 + 12 * Math.log2(f / 440);
  const noteName = (f) => {
    if (!f) return '';
    const m = Math.round(midi(f));
    return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  };

  return { detect, midi, noteName, NAMES };
})();
