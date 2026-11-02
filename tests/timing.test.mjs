// Unit tests for word timing (enhanced LRC, caption alignment) and the
// .lrc / .srt export.   node tests/timing.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console, DOMParser: class {}, URL, Blob: class {}, document: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['util.js', 'align.js', 'export.js']) vm.runInContext(readFileSync(new URL('../src/content/' + f, import.meta.url), 'utf8'), ctx);
const { BYL } = ctx;

let fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    fail++;
    console.log(`✗ ${name}\n   got  ${g}\n   want ${w}`);
  } else console.log(`✓ ${name}`);
};

// Enhanced LRC
{
  const lines = BYL.parseLrc('[00:10.00] <00:10.00> Em <00:10.50> ơi <00:11.20> Hà Nội phố\n[00:14.00] plain line');
  eq('enhanced LRC text', lines.map((l) => l.text), ['Em ơi Hà Nội phố', 'plain line']);
  eq('enhanced LRC word offsets', lines[0].wd, [0, 0.5, 1.2, 1.2, 1.2]);
  eq('plain LRC has no word offsets', lines[1].wd, undefined);
}

// Caption alignment with word-timed (auto) captions
{
  const lyric = ['mùa thu cho em về', 'lá vàng rơi bên thềm', 'gió nhẹ lay hàng cây', 'nắng chiều phai trên tay'];
  const json = {
    events: lyric.map((l, i) => ({
      tStartMs: 10000 + i * 4000,
      dDurationMs: 3500,
      segs: l.split(' ').map((w, k) => ({ utf8: (k ? ' ' : '') + w, tOffsetMs: k * 600 })),
    })),
  };
  const words = BYL.captionWords(JSON.stringify(json));
  eq('auto caption words are exact', words.filter((w) => w.exact).length, 20);
  const r = BYL.alignLyrics(BYL.plainLines(lyric.join('\n')), words);
  eq('aligned line times', r.lines.map((l) => l.t), [10, 14, 18, 22]);
  eq('word lines', r.wordLines, 4);
  eq('word offsets', r.lines[1].wd, [0, 0.6, 1.2, 1.8, 2.4]);
}

// Uploaded captions (line timing only) give no word timing
{
  const lyric = ['mùa thu cho em về', 'lá vàng rơi bên thềm', 'gió nhẹ lay hàng cây', 'nắng chiều phai trên tay'];
  const json = { events: lyric.map((l, i) => ({ tStartMs: 10000 + i * 4000, dDurationMs: 3500, segs: [{ utf8: l }] })) };
  const r = BYL.alignLyrics(BYL.plainLines(lyric.join('\n')), BYL.captionWords(JSON.stringify(json)));
  eq('no word timing from line captions', r.wordLines, 0);
}

// Export
{
  const lines = [
    { t: 1.5, text: 'Dòng một' },
    { t: 4, text: '' },
    { t: 5.25, text: 'Dòng hai' },
    { t: 30, text: 'Cuối' },
  ];
  eq(
    'srt',
    BYL.exporter.toSrt(lines, 33),
    '1\n00:00:01,500 --> 00:00:03,950\nDòng một\n\n2\n00:00:05,250 --> 00:00:12,200\nDòng hai\n\n3\n00:00:30,000 --> 00:00:32,950\nCuối\n'
  );
  eq('lrc', BYL.exporter.toLrc(lines, { title: 'Bài', artist: 'Ca sĩ', duration: 33 }), '[ti:Bài]\n[ar:Ca sĩ]\n[length:0:33]\n[re:Better YouTube Lyric]\n\n[00:01.50] Dòng một\n[00:04.00]\n[00:05.25] Dòng hai\n[00:30.00] Cuối\n');
  eq('file name', BYL.exporter.fileName({ title: 'A/B: "C"', artist: 'D' }, 'srt'), 'D - A B C.srt');
  eq('srt stamp hours', BYL.exporter.srtStamp(3725.4), '01:02:05,400');
}

if (fail) process.exit(1);
console.log('timing: ok');
