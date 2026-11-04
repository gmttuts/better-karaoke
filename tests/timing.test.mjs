// Unit tests for word timing (enhanced LRC, caption alignment) and the
// .lrc / .srt / .ass export.   node tests/timing.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console, DOMParser: class {}, URL, Blob: class {}, document: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['../i18n.js', 'util.js', 'align.js', 'looks.js', 'export.js']) vm.runInContext(readFileSync(new URL('../src/content/' + f, import.meta.url), 'utf8'), ctx);
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
  eq('lrc', BYL.exporter.toLrc(lines, { title: 'Bài', artist: 'Ca sĩ', duration: 33 }), '[ti:Bài]\n[ar:Ca sĩ]\n[length:0:33]\n[re:Better Lyric for YouTube]\n\n[00:01.50] Dòng một\n[00:04.00]\n[00:05.25] Dòng hai\n[00:30.00] Cuối\n');
  eq('file name', BYL.exporter.fileName({ title: 'A/B: "C"', artist: 'D' }, 'srt'), 'D - A B C.srt');
  eq('srt stamp hours', BYL.exporter.srtStamp(3725.4), '01:02:05,400');
}

// .ass
{
  const ass = (lines, opts) => BYL.exporter.toAss(lines, { duration: 40, ...opts });
  const events = (text) => text.split('\n').filter((l) => l.startsWith('Dialogue:'));
  eq('ass stamp', BYL.exporter.assStamp(3725.456), '1:02:05.46');
  eq('ass colour', BYL.exporter.assColor('#e8212b', 60), '&H662B21E8');
  const lines = [
    { t: 1.5, text: 'Em ơi', wd: [0, 0.5] },
    { t: 4, text: '' },
    { t: 5.25, text: 'Hà Nội {phố}' },
    { t: 30, text: 'Cuối' },
  ];
  const red = ass(lines, { look: BYL.look.compose('red'), width: 1280, height: 720 });
  eq('ass play res (short side 1080)', red.match(/PlayResX: (\d+)\nPlayResY: (\d+)/).slice(1), ['1920', '1080']);
  eq('ass style from look', red.match(/Style: Left,([^,]+),(\d+),([^,]+),([^,]+),([^,]+)/).slice(1), ['Roboto', '59', '&H002B21E8', '&H00FFFFFF', '&H00101010']);
  const ev = events(red);
  eq('ass stagger: one event per sung line', ev.length, 3);
  eq('ass stagger: shows early in its row, word times', ev[0], 'Dialogue: 1,0:00:00.00,0:00:04.00,Left,,384,384,182,,{\\k150}{\\kf50}Em {\\kf150}ơi');
  eq('ass stagger: next row, even sweep, braces kept out', ev[1], 'Dialogue: 1,0:00:01.50,0:00:15.25,Right,,384,384,108,,{\\k375}{\\kf162}Hà {\\kf215}Nội {\\kf323}(phố)');
  const box = ass(lines, { look: BYL.look.compose('box'), trans: ['Hey you', '', '', ''] });
  eq('ass box: opaque box style', /Style: LyricBox,Roboto,\d+,[^,]+,[^,]+,&H610E0A0A,&H610E0A0A,-1,0,0,0,100,100,0,0,3,/.test(box), true);
  eq(
    'ass center2: translation and next line under the sung one',
    events(box)[1],
    'Dialogue: 1,0:00:01.50,0:00:04.00,Lyric,,0,0,140,,{\\kf50}Em {\\kf150}ơi\\N{\\r\\fs20\\1c&HFFFFFF&\\2c&HFFFFFF&}Hey you\\N{\\r\\fs28\\1c&HFFFFFF&\\2c&HFFFFFF&}Hà Nội (phố)'
  );
  eq(
    'ass box: one box per line on the layer below, text hidden',
    events(box)[0],
    'Dialogue: 0,0:00:01.50,0:00:04.00,LyricBox,,0,0,140,,{\\1a&HFF&}Em ơi\\N{\\r\\1a&HFF&\\fs20\\1c&HFFFFFF&\\2c&HFFFFFF&}Hey you\\N{\\r\\1a&HFF&\\fs28\\1c&HFFFFFF&\\2c&HFFFFFF&}Hà Nội (phố)'
  );
  eq('ass box: text style has no outline of its own', /Style: Lyric,Roboto,\d+,[^,]+,[^,]+,[^,]+,[^,]+,-1,0,0,0,100,100,0,0,1,0,0,/.test(box), true);
  const line = ass(lines, { look: { ...BYL.look.compose('mini'), wipe: 'line' }, top: true });
  eq('ass single + whole line, top', events(line).slice(-2), ['Dialogue: 0,0:00:30.00,0:00:40.00,LyricBox,,0,0,97,,{\\1a&HFF&}Cuối', 'Dialogue: 1,0:00:30.00,0:00:40.00,Lyric,,0,0,97,,{\\k0}Cuối']);
  eq('ass top: aligned to the top', /Style: Lyric,[^\n]*,8,40,40,0,1/.test(line), true);
  const fade = ass(lines, { look: BYL.look.compose('fade') });
  eq('ass fade: unsung words dimmed', /Style: Lyric,Roboto,\d+,&H00FFFFFF,&H8CFFFFFF,/.test(fade), true);
  eq('ass fade: no box style, a soft shade under the song', [/LyricBox/.test(fade), /Dialogue: 0,[^\n]*\\blur\d+\\1c&H000000&\\1a&H66&\\p1\}m 0 0 l 1920 0 1920 \d+ 0 \d+\{\\p0\}/.test(fade)], [false, true]);
  const big = ass(lines, { look: { ...BYL.look.compose('big'), tracking: 6 } });
  eq('ass big: capitals, condensed font, letter spacing', [/\{\\kf\d+\}HÀ /.test(big), /Style: Lyric,Roboto Condensed,(\d+),[^\n]*,100,100,([\d.]+),/.exec(big).slice(1).map(Number).every((n, i, a) => i === 0 || Math.abs(n - a[0] * 0.05) < 0.02)], [true, true]);
}

if (fail) process.exit(1);
console.log('timing: ok');
