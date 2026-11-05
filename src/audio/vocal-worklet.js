'use strict';

// 🎤 Lọc giọng: turns the singer down and keeps the band.
//
// Taking out everything in the middle of the stereo picture (L−R) also takes
// the snare, the piano, the bass guitar… that are mixed there too, and most
// songs then sound nearly empty. Here the sound is cut into 2048-sample
// blocks of frequencies, and a frequency is only turned down when it is
//   - in the middle: what both speakers share, measured over the last few
//     frames (about 30 ms) so the singer's reverb doesn't hide it,
//   - in the range of a voice (about 150 Hz – 8 kHz),
//   - held like a sung note rather than struck like a drum: its level over
//     the last frames (allowing for vibrato, one bin either way) is steadier
//     than across its neighbouring frequencies (harmonic / percussive split,
//     after D. FitzGerald, 2010).
// Sound only on one side, the drums, the bass and the cymbals stay. Adds
// about 43 ms of delay (one block).
const N = 2048;
const OSAMP = 4;
const HOP = N / OSAMP;
const LATENCY = N - HOP;
const HALF = N / 2;
const TIME_MED = 9; // past frames for "held" (causal: no extra delay)
const FREQ_MED = 17; // neighbouring bins for "struck"
const AVG = 0.7; // smoothing of the stereo measures, per frame (~30 ms)

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

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function median(buf, n) {
  // Small n: insertion sort on a copy.
  for (let i = 1; i < n; i++) {
    const v = buf[i];
    let j = i - 1;
    while (j >= 0 && buf[j] > v) buf[j + 1] = buf[j--];
    buf[j + 1] = v;
  }
  return buf[n >> 1];
}

function state(rate) {
  const band = new Float64Array(HALF + 1);
  for (let k = 0; k <= HALF; k++) {
    const f = (k * rate) / N;
    band[k] = smooth(110, 200, f) * (1 - smooth(6000, 9000, f));
  }
  return {
    inL: new Float64Array(N),
    inR: new Float64Array(N),
    outL: new Float64Array(HOP),
    outR: new Float64Array(HOP),
    accL: new Float64Array(2 * N),
    accR: new Float64Array(2 * N),
    re: new Float64Array(N),
    im: new Float64Array(N),
    mag: new Float64Array(HALF + 1),
    Lr: new Float64Array(HALF + 1),
    Li: new Float64Array(HALF + 1),
    Rr: new Float64Array(HALF + 1),
    Ri: new Float64Array(HALF + 1),
    hist: Array.from({ length: TIME_MED }, () => new Float64Array(HALF + 1)),
    at: 0,
    tmp: new Float64Array(Math.max(TIME_MED, FREQ_MED)),
    band,
    rover: LATENCY,
    // Smoothed powers of left, right and their cross product, per bin.
    pLL: new Float64Array(HALF + 1),
    pRR: new Float64Array(HALF + 1),
    pLR: new Float64Array(HALF + 1),
  };
}

function frame(s, amount) {
  const { re, im, mag } = s;
  // Both channels in one transform: left as the real part, right as the imaginary.
  for (let k = 0; k < N; k++) {
    re[k] = s.inL[k] * WINDOW[k];
    im[k] = s.inR[k] * WINDOW[k];
  }
  fft(re, im, -1);
  const { Lr, Li, Rr, Ri } = s;
  for (let k = 0; k <= HALF; k++) {
    const j = (N - k) % N;
    Lr[k] = (re[k] + re[j]) / 2;
    Li[k] = (im[k] - im[j]) / 2;
    Rr[k] = (im[k] + im[j]) / 2;
    Ri[k] = (re[j] - re[k]) / 2;
    mag[k] = Math.hypot(Lr[k] + Rr[k], Li[k] + Ri[k]) / 2;
  }
  const now = s.hist[s.at];
  for (let k = 0; k <= HALF; k++) now[k] = Math.max(mag[Math.max(0, k - 1)], mag[k], mag[Math.min(HALF, k + 1)]);
  s.at = (s.at + 1) % TIME_MED;

  for (let k = 0; k <= HALF; k++) {
    const mr = (Lr[k] + Rr[k]) / 2;
    const mi = (Li[k] + Ri[k]) / 2;
    const sr = (Lr[k] - Rr[k]) / 2;
    const si = (Li[k] - Ri[k]) / 2;
    let g = 1;
    if (s.band[k] > 0) {
      // In the middle: the share of this frequency's middle that both
      // speakers carry alike. A guitar mixed 70 / 30 to one side is shared
      // too, so the levels of the two sides have to be close as well.
      const l2 = Lr[k] * Lr[k] + Li[k] * Li[k];
      const r2 = Rr[k] * Rr[k] + Ri[k] * Ri[k];
      s.pLL[k] = AVG * s.pLL[k] + (1 - AVG) * l2;
      s.pRR[k] = AVG * s.pRR[k] + (1 - AVG) * r2;
      s.pLR[k] = AVG * s.pLR[k] + (1 - AVG) * (Lr[k] * Rr[k] + Li[k] * Ri[k]);
      const pMM = (s.pLL[k] + s.pRR[k] + 2 * s.pLR[k]) / 4;
      const shared = Math.min(1, Math.max(0, s.pLR[k] / (pMM + 1e-20)));
      const level = Math.sqrt(Math.min(s.pLL[k], s.pRR[k]) / (Math.max(s.pLL[k], s.pRR[k]) + 1e-20));
      const centre = shared * smooth(0.5, 0.85, level);
      if (centre > 0) {
        for (let t = 0; t < TIME_MED; t++) s.tmp[t] = s.hist[t][k];
        const held = median(s.tmp, TIME_MED);
        let n = 0;
        for (let b = k - (FREQ_MED >> 1); b <= k + (FREQ_MED >> 1); b++) s.tmp[n++] = mag[Math.min(HALF, Math.max(0, b))];
        const struck = median(s.tmp, FREQ_MED);
        const sung = (held * held) / (held * held + struck * struck + 1e-12);
        g = 1 - amount * centre * s.band[k] * sung;
        g *= g; // deeper where it is sure, gentle where it is not
      }
    }
    // Middle turned down, sides as they were: L = M + S, R = M − S.
    const Lor = mr * g + sr;
    const Loi = mi * g + si;
    const Ror = mr * g - sr;
    const Roi = mi * g - si;
    // Back into one spectrum, left real and right imaginary.
    re[k] = Lor - Roi;
    im[k] = Loi + Ror;
    if (k > 0 && k < HALF) {
      re[N - k] = Lor + Roi;
      im[N - k] = Ror - Loi;
    }
  }
  fft(re, im, 1);
  // Hann in and out, 4 times overlapped: the windows sum to 1.5.
  // Taking the singer out leaves the song quieter: up to +1.5 dB back.
  const g = Math.pow(10, (1.5 * amount) / 20) / (N * 1.5);
  for (let k = 0; k < N; k++) {
    s.accL[k] += WINDOW[k] * re[k] * g;
    s.accR[k] += WINDOW[k] * im[k] * g;
  }
  s.outL.set(s.accL.subarray(0, HOP));
  s.outR.set(s.accR.subarray(0, HOP));
  s.accL.copyWithin(0, HOP);
  s.accR.copyWithin(0, HOP);
  s.accL.fill(0, N);
  s.accR.fill(0, N);
  s.inL.copyWithin(0, HOP);
  s.inR.copyWithin(0, HOP);
}

function cut(s, inL, inR, outL, outR, amount) {
  for (let i = 0; i < inL.length; i++) {
    s.inL[s.rover] = inL[i];
    s.inR[s.rover] = inR[i];
    outL[i] = s.outL[s.rover - LATENCY];
    outR[i] = s.outR[s.rover - LATENCY];
    if (++s.rover >= N) {
      s.rover = LATENCY;
      frame(s, amount);
    }
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor(
    'byl-vocal',
    class extends AudioWorkletProcessor {
      constructor() {
        super();
        this.amount = 0;
        this.s = state(sampleRate);
        this.port.onmessage = (e) => (this.amount = e.data.amount);
      }
      process(inputs, outputs) {
        const input = inputs[0];
        const out = outputs[0];
        if (!input.length) return true;
        const l = input[0];
        const r = input[1] || input[0];
        cut(this.s, l, r, out[0], out[1] || out[0], this.amount);
        return true;
      }
    }
  );
} else if (typeof module === 'object') {
  module.exports = { state, cut, N, DELAY: N };
}
