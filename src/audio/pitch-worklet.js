'use strict';

// 🎚 Đổi tông: moves the music up or down by semitones without changing its
// speed. A phase vocoder (after S. M. Bernsee): each block of 4096 samples is
// windowed and turned into frequencies, every partial is moved by the ratio
// with its phase kept running, and the blocks are put back together 4 times
// overlapped. Adds about 70 ms of delay, too little to notice on the lyrics.
const N = 4096;
const OSAMP = 8; // 8 times overlapped: smoother than 4, less "phasey" on held notes and drums
const HOP = N / OSAMP;
const LATENCY = N - HOP;
const HALF = N / 2;
const EXPECT = (2 * Math.PI * HOP) / N;

const WINDOW = new Float64Array(N);
for (let k = 0; k < N; k++) WINDOW[k] = 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / N);

// In-place radix-2 FFT; sign -1 forward, +1 inverse (unscaled).
const BITS = Math.log2(N);
const REV = new Uint32Array(N);
for (let i = 0; i < N; i++) {
  let r = 0;
  for (let b = 0; b < BITS; b++) r |= ((i >> b) & 1) << (BITS - 1 - b);
  REV[i] = r;
}
const COS = new Float64Array(HALF);
const SIN = new Float64Array(HALF);
for (let i = 0; i < HALF; i++) {
  COS[i] = Math.cos((2 * Math.PI * i) / N);
  SIN[i] = Math.sin((2 * Math.PI * i) / N);
}
function fft(re, im, sign) {
  for (let i = 0; i < N; i++) {
    const j = REV[i];
    if (j > i) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const step = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = COS[k * step];
        const wi = sign * SIN[k * step];
        const a = start + k;
        const b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

function channel() {
  return {
    inFifo: new Float64Array(N),
    outFifo: new Float64Array(N),
    accum: new Float64Array(2 * N),
    lastPhase: new Float64Array(HALF + 1),
    sumPhase: new Float64Array(HALF + 1),
    anaMagn: new Float64Array(HALF + 1),
    anaFreq: new Float64Array(HALF + 1),
    synMagn: new Float64Array(HALF + 1),
    synFreq: new Float64Array(HALF + 1),
    re: new Float64Array(N),
    im: new Float64Array(N),
    rover: LATENCY,
  };
}

function frame(s, ratio) {
  const { re, im } = s;
  for (let k = 0; k < N; k++) {
    re[k] = s.inFifo[k] * WINDOW[k];
    im[k] = 0;
  }
  fft(re, im, -1);
  // Analysis: each bin's true frequency from how far its phase moved.
  for (let k = 0; k <= HALF; k++) {
    const magn = 2 * Math.hypot(re[k], im[k]);
    const phase = Math.atan2(im[k], re[k]);
    let d = phase - s.lastPhase[k] - k * EXPECT;
    s.lastPhase[k] = phase;
    d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    s.anaMagn[k] = magn;
    s.anaFreq[k] = k + (OSAMP * d) / (2 * Math.PI); // in bins
  }
  // Move every partial.
  s.synMagn.fill(0);
  s.synFreq.fill(0);
  for (let k = 0; k <= HALF; k++) {
    const j = Math.round(k * ratio);
    if (j > HALF) break;
    s.synMagn[j] += s.anaMagn[k];
    s.synFreq[j] = s.anaFreq[k] * ratio;
  }
  // Synthesis: keep each bin's phase running at its new frequency.
  for (let k = 0; k <= HALF; k++) {
    s.sumPhase[k] += ((s.synFreq[k] - k) * 2 * Math.PI) / OSAMP + k * EXPECT;
    s.sumPhase[k] %= 2 * Math.PI;
    re[k] = s.synMagn[k] * Math.cos(s.sumPhase[k]);
    im[k] = s.synMagn[k] * Math.sin(s.sumPhase[k]);
  }
  for (let k = HALF + 1; k < N; k++) re[k] = im[k] = 0;
  fft(re, im, 1);
  // Windowed overlap-add; 2/(HALF·OSAMP·1.5) undoes the transform, the
  // one-sided spectrum and the summed Hann² overlaps.
  // Moving partials leaves some bins empty and loses 1.5–4 dB (more going
  // up): made up here, measured on a 30-note chord (tests/pitch.test.mjs).
  const semis = 12 * Math.log2(ratio);
  const makeup = Math.pow(10, (semis > 0 ? 1.2 + 0.45 * semis : semis < 0 ? 1.2 : 0) / 20);
  const g = (2 / (HALF * OSAMP * 0.375 * 4)) * makeup;
  for (let k = 0; k < N; k++) s.accum[k] += WINDOW[k] * re[k] * g;
  s.outFifo.set(s.accum.subarray(0, HOP));
  s.accum.copyWithin(0, HOP);
  s.accum.fill(0, N);
  s.inFifo.copyWithin(0, HOP);
}

function shift(s, input, output, ratio) {
  for (let i = 0; i < input.length; i++) {
    s.inFifo[s.rover] = input[i];
    output[i] = s.outFifo[s.rover - LATENCY];
    if (++s.rover >= N) {
      s.rover = LATENCY;
      frame(s, ratio);
    }
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor(
    'byl-pitch',
    class extends AudioWorkletProcessor {
      constructor() {
        super();
        this.ratio = 1;
        this.ch = [];
        this.port.onmessage = (e) => (this.ratio = e.data.ratio);
      }
      process(inputs, outputs) {
        const input = inputs[0];
        const out = outputs[0];
        for (let c = 0; c < out.length; c++) {
          const x = input[c] || input[0];
          if (!x) {
            out[c].fill(0);
            continue;
          }
          shift((this.ch[c] ||= channel()), x, out[c], this.ratio);
        }
        return true;
      }
    }
  );
} else if (typeof module === 'object') module.exports = { channel, shift, N, LATENCY };
