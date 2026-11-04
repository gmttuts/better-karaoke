// The 🎚 pitch shifter moves a tone by the right number of semitones, keeps
// its loudness and its length.   node tests/pitch.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';
const ctx = { module: { exports: {} }, Math, Float64Array, Uint32Array };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../src/audio/pitch-worklet.js', import.meta.url), 'utf8'), ctx);
const { channel, shift, LATENCY } = ctx.module.exports;

let fail = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) fail++;
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

const RATE = 48000;
// Frequency by counting rising zero crossings over the steady middle part.
const freqOf = (y) => {
  const a = Math.floor(y.length * 0.3);
  const b = Math.floor(y.length * 0.9);
  let n = 0;
  let first = -1;
  let last = -1;
  for (let i = a + 1; i < b; i++) {
    if (y[i - 1] < 0 && y[i] >= 0) {
      if (first < 0) first = i;
      last = i;
      n++;
    }
  }
  return ((n - 1) * RATE) / (last - first);
};
const rms = (y) => {
  const a = Math.floor(y.length * 0.3);
  let s = 0;
  for (let i = a; i < y.length; i++) s += y[i] * y[i];
  return Math.sqrt(s / (y.length - a));
};

function run(f, semis) {
  const len = RATE * 2;
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * f * i) / RATE);
  const y = new Float32Array(len);
  const s = channel();
  // In 128-sample render quanta, like an AudioWorklet.
  for (let i = 0; i < len; i += 128) shift(s, x.subarray(i, i + 128), y.subarray(i, i + 128), Math.pow(2, semis / 12));
  return { x, y };
}

for (const [f, semis] of [
  [440, 0],
  [440, 2],
  [440, -3],
  [220, 5],
  [660, -6],
]) {
  const { x, y } = run(f, semis);
  const want = f * Math.pow(2, semis / 12);
  const got = freqOf(y);
  const cents = 1200 * Math.log2(got / want);
  ok(`${f} Hz ${semis >= 0 ? '+' : ''}${semis}: ${got.toFixed(1)} Hz (want ${want.toFixed(1)})`, Math.abs(cents) < 15, `${cents.toFixed(1)} cents`);
  const gain = rms(y) / rms(x);
  ok(`  loudness kept`, gain > 0.7 && gain < 1.4, gain.toFixed(2));
}
// Music: a 30-note chord keeps its loudness within 1.5 dB.
{
  const len = RATE * 3;
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const parts = Array.from({ length: 30 }, () => [80 * Math.pow(2, rnd() * 6), rnd() * 6.28, 0.05 + 0.1 * rnd()]);
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) for (const [f, p, a] of parts) x[i] += a * Math.sin((2 * Math.PI * f * i) / RATE + p) * (1 + 0.5 * Math.sin(i / 7000 + p));
  for (const semis of [-4, -2, 1, 2, 4, 6]) {
    const y = new Float32Array(len);
    const s = channel();
    for (let i = 0; i < len; i += 128) shift(s, x.subarray(i, i + 128), y.subarray(i, i + 128), Math.pow(2, semis / 12));
    const db = 20 * Math.log10(rms(y) / rms(x));
    ok(`chord ${semis > 0 ? '+' : ''}${semis}: loudness`, Math.abs(db) < 1.5, db.toFixed(1) + ' dB');
  }
}
ok('delay under 100 ms', (LATENCY / RATE) * 1000 < 100, ((LATENCY / RATE) * 1000).toFixed(0) + ' ms');

if (fail) process.exit(1);
console.log('pitch: ok');
