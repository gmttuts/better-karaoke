// The 🎤 vocal cut turns a sung voice in the middle down and keeps the rest
// of the song: drums and bass in the middle, a guitar on one side.
//   node tests/vocal.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';
const ctx = { module: { exports: {} }, Math, Float64Array, Uint32Array, Array };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/audio/vocal-worklet.js', import.meta.url), 'utf8'), ctx);
const { state, cut, DELAY } = ctx.module.exports;

let fail = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) fail++;
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

const RATE = 48000;
const LEN = RATE * 6;
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const stem = (fn, pan = 0.5) => {
  const L = new Float64Array(LEN);
  const R = new Float64Array(LEN);
  for (let i = 0; i < LEN; i++) {
    const v = fn(i / RATE, i);
    L[i] = v * Math.min(1, 2 * (1 - pan));
    R[i] = v * Math.min(1, 2 * pan);
  }
  return { L, R };
};
const tone = (t, f, n, decay = 1) => {
  let v = 0;
  for (let h = 1; h <= n; h++) v += Math.sin(2 * Math.PI * f * h * t) / Math.pow(h, decay);
  return v;
};

// A voice: a melody of held notes with vibrato, rich in harmonics.
const notes = [220, 247, 262, 294, 330, 294, 262, 247];
let ph = 0;
const voice = stem((t) => {
  const f = notes[Math.floor(t / 0.75) % notes.length] * (1 + 0.025 * Math.sin(2 * Math.PI * 5.5 * t));
  ph += f / RATE;
  let v = 0;
  for (let h = 1; h <= 14; h++) v += Math.sin(2 * Math.PI * ph * h) / h;
  const inNote = (t % 0.75) / 0.75;
  return 0.22 * v * Math.min(1, inNote * 12) * Math.min(1, (1 - inNote) * 12);
});
// Drums: kick and snare (noise) on the beat, hi-hat ticks.
const drums = stem((t) => {
  const beat = t % 0.5;
  const kick = Math.floor(t / 0.5) % 2 === 0 ? Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-beat * 30)) * beat) * Math.exp(-beat * 12) : 0;
  const snare = Math.floor(t / 0.5) % 2 === 1 ? rand() * Math.exp(-beat * 25) : 0;
  const hat = rand() * Math.exp(-(t % 0.125) * 80) * 0.3;
  return 0.35 * (kick + snare + hat);
});
const bass = stem((t) => 0.25 * tone(t, [55, 55, 49, 65][Math.floor(t / 1.5) % 4], 3));
// A guitar mostly on the left.
const guitar = stem((t) => 0.08 * (tone(t, 196, 8) + tone(t, 247, 8) + tone(t, 294, 8)) * (0.6 + 0.4 * Math.abs(Math.sin(2 * Math.PI * 2 * t))), 0.2);

const mix = { L: new Float64Array(LEN), R: new Float64Array(LEN) };
for (const s of [voice, drums, bass, guitar])
  for (let i = 0; i < LEN; i++) {
    mix.L[i] += s.L[i];
    mix.R[i] += s.R[i];
  }

function newCut(amount) {
  const s = state(RATE);
  const L = new Float64Array(LEN);
  const R = new Float64Array(LEN);
  for (let i = 0; i < LEN; i += 128) cut(s, mix.L.subarray(i, i + 128), mix.R.subarray(i, i + 128), L.subarray(i, i + 128), R.subarray(i, i + 128), amount);
  return { L, R, delay: DELAY };
}

// The vocal cut before 0.21: middle minus its 140 Hz – 7.5 kHz part.
function biquad(type, f0) {
  const w = (2 * Math.PI * f0) / RATE;
  const a = Math.sin(w) / (2 * 0.707);
  const c = Math.cos(w);
  const b = type === 'low' ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  const a0 = 1 + a;
  const [b0, b1, b2, a1, a2] = [b[0] / a0, b[1] / a0, b[2] / a0, (-2 * c) / a0, (1 - a) / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}
function oldCut() {
  const lo = biquad('low', 140);
  const hi = biquad('high', 7500);
  const L = new Float64Array(LEN);
  const R = new Float64Array(LEN);
  for (let i = 0; i < LEN; i++) {
    const m = (mix.L[i] + mix.R[i]) / 2;
    const s = (mix.L[i] - mix.R[i]) / 2;
    const keep = lo(m) + hi(m);
    L[i] = s + keep;
    R[i] = -s + keep;
  }
  return { L, R, delay: 0 };
}

// How much of one part is left in the output, in dB: its projection.
function kept(out, s) {
  let xy = 0;
  let xx = 0;
  for (let i = RATE; i < LEN - out.delay; i++) {
    xy += out.L[i + out.delay] * s.L[i] + out.R[i + out.delay] * s.R[i];
    xx += s.L[i] * s.L[i] + s.R[i] * s.R[i];
  }
  return 20 * Math.log10(Math.max(1e-6, xy / xx));
}
const report = (out) => Object.fromEntries(Object.entries({ voice, drums, bass, guitar }).map(([k, s]) => [k, Math.round(kept(out, s) * 10) / 10]));

const now = report(newCut(1));
const before = report(oldCut());
console.log('  kept (dB)  new', JSON.stringify(now), ' old', JSON.stringify(before));
ok('voice turned down by 8 dB or more', now.voice <= -8, now.voice + ' dB');
ok('drums in the middle kept (within 4 dB)', now.drums >= -4, now.drums + ' dB, was ' + before.drums);
ok('bass kept (within 2 dB)', now.bass >= -2, now.bass + ' dB');
ok('guitar on one side kept (within 3 dB)', now.guitar >= -3, now.guitar + ' dB');
ok('keeps more of the drums than before', now.drums > before.drums + 3);
const none = report(newCut(0));
ok('off: the song passes through unchanged', Object.values(none).every((v) => Math.abs(v) < 0.5), JSON.stringify(none));

console.log(fail ? `vocal: ${fail} failed` : 'vocal: ok');
process.exit(fail ? 1 : 0);
