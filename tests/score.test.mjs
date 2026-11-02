// Unit tests for 🎙 scoring: pitch detection (YIN), chroma of the music and
// line marks.   node tests/score.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console, navigator: { languages: ['vi'] }, chrome: { runtime: { onConnect: { addListener() {} } } } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'score/pitch.js', 'content/score.js']) vm.runInContext(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'), ctx);
const { BYL } = ctx;
let fail = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) fail++;
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

// A sung-like tone: fundamental + two harmonics.
const tone = (f, rate = 48000, n = 2048, amp = 0.3) =>
  Float32Array.from({ length: n }, (_, i) => amp * (Math.sin((2 * Math.PI * f * i) / rate) + 0.5 * Math.sin((4 * Math.PI * f * i) / rate) + 0.25 * Math.sin((6 * Math.PI * f * i) / rate)));
for (const f of [98, 196, 261.63, 440, 659.25, 880]) {
  const got = BYL.pitch.detect(tone(f), 48000).f0;
  ok(`YIN ${f} Hz`, Math.abs(got - f) / f < 0.02, got.toFixed(1) + ' Hz ' + BYL.pitch.noteName(got));
}
ok('silence is unvoiced', BYL.pitch.detect(new Float32Array(2048), 48000).f0 === 0);
let seed = 1;
const noise = Float32Array.from({ length: 2048 }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.6);
ok('noise is unvoiced', BYL.pitch.detect(noise, 48000).f0 === 0);
ok('note names', BYL.pitch.noteName(440) === 'A4' && BYL.pitch.noteName(261.63) === 'C4');

// Chroma from a fake spectrum with energy at A (440, 880) and E (659).
const rate = 48000;
const size = 8192;
const db = new Float32Array(size / 2).fill(-120);
for (const f of [440, 880, 659.25]) db[Math.round(f / (rate / size))] = -10;
const c = BYL.score.chroma(db, rate, size);
ok('chroma peak on A', c[9] === 1, [...c].map((x) => x.toFixed(2)).join(' '));
ok('sung A3 fits music in A', BYL.score.match(220, c) > 0.9);
ok('sung E5 fits too (other octave)', BYL.score.match(659.25, c) > 0.4);
ok('sung C4 does not fit', BYL.score.match(261.63, c) < 0.05);

const frames = (n, voiced, fit) => Array.from({ length: n }, (_, i) => ({ voiced: i < voiced, fit: i < voiced ? fit : 0 }));
ok('in tune through the line → 100', BYL.score.lineScore(frames(20, 14, 0.9)) === 100);
ok('silent → 0', BYL.score.lineScore(frames(20, 0, 0)) === 0);
ok('half sung, half in tune → middle', (s => s > 30 && s < 70)(BYL.score.lineScore(frames(20, 8, 0.4))), String(BYL.score.lineScore(frames(20, 8, 0.4))));

ok('music not heard → singing along counts alone', BYL.score.lineScore(Array.from({ length: 10 }, () => ({ voiced: true, fit: null }))) === 100);

if (fail) process.exit(1);
console.log('score: ok');
