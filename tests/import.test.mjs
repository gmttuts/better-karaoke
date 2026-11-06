// 📥 Nhập file: what Better Karaoke exports comes back as it was, and .srt /
// .vtt / .ass from other tools are read too.   node tests/import.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console, DOMParser: class {}, URL, Blob: class {}, document: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['../i18n.js', 'util.js', 'looks.js', 'export.js']) vm.runInContext(readFileSync(new URL('../src/content/' + f, import.meta.url), 'utf8'), ctx);
const { BYL } = ctx;
const X = BYL.exporter;

let fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    fail++;
    console.log(`✗ ${name}\n   got  ${g}\n   want ${w}`);
  } else console.log(`✓ ${name}`);
};
const back = (file) => BYL.parseLrc(X.fromFile(file).lrc).map((l) => ({ t: l.t, text: l.text, ...(l.wd ? { wd: l.wd } : {}) }));

const lines = [
  { t: 10, text: 'Em ơi Hà Nội phố', wd: [0, 0.5, 1.2, 1.6, 2] },
  { t: 14.5, text: 'Ta còn em mùi hoàng lan' },
  { t: 20.25, text: 'Ta còn em mùi hoa sữa', wd: [0, 0.4, 0.8, 1.3, 1.7, 2.1] },
];
const meta = { title: 'Em ơi Hà Nội phố', artist: 'Hà Anh Tuấn', duration: 60, videoId: 'abcDEF12345' };

// .ass of ours: lyrics with word timing, the video and the look, whatever the layout.
for (const layout of ['stagger', 'center2', 'single', 'three']) {
  const look = { ...BYL.look.compose('red'), layout, sung: '#00e5ff', sung2: '#c77dff' };
  const file = X.toAss(lines, { ...meta, look });
  const got = X.fromFile('﻿' + file.replace(/\n/g, '\r\n'));
  eq(`ass (${layout}): lines and word times back`, back(file), lines);
  eq(`ass (${layout}): video`, got.videoId, 'abcDEF12345');
  eq(`ass (${layout}): look`, [got.look?.layout, got.look?.sung2], [layout, '#c77dff']);
}
// "In hoa" writes capitals on the video, the shared lyrics keep their case.
{
  const file = X.toAss(lines, { ...meta, look: { ...BYL.look.compose('big') } });
  eq('ass with capitals: shared lyrics keep their case', back(file).map((l) => l.text), lines.map((l) => l.text));
}
// The same file without our section (an editor dropped it): read from the karaoke tags.
{
  const file = X.toAss(lines, { ...meta, look: BYL.look.compose('red') }).split('[Better Karaoke]')[0];
  eq('ass without our section: from the \\k tags', back(file).map((l) => [l.t, l.text]), lines.map((l) => [l.t, l.text]));
  eq('ass without our section: word times', back(file)[0].wd, lines[0].wd);
}
// .lrc of ours carries the video.
{
  const got = X.fromFile(X.toLrc(lines, meta));
  eq('lrc: lines back', back(X.toLrc(lines, meta)).map((l) => [l.t, l.text]), lines.map((l) => [l.t, l.text]));
  eq('lrc: video and names', [got.videoId, got.title, got.artist], ['abcDEF12345', meta.title, meta.artist]);
}
// .srt of ours and a .vtt from elsewhere.
eq('srt: lines back', back(X.toSrt(lines, 60)).map((l) => [l.t, l.text]), lines.map((l) => [l.t, l.text]));
eq(
  'vtt with hours left out, tags and two-row cues',
  back('WEBVTT\n\n00:05.500 --> 00:08.000\n<i>Một</i> dòng\nhai hàng\n\n1\n01:02:03.040 --> 01:02:05.000\nSau'),
  [{ t: 5.5, text: 'Một dòng hai hàng' }, { t: 3723.04, text: 'Sau' }]
);
// .ass from another tool: \k syllables, a lead-in, and plain dialogue.
eq(
  'ass from elsewhere: \\k syllables',
  back('[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,karaoke,{\\k50}{\\kf30}Hel{\\kf20}lo {\\k40}world'),
  [{ t: 1.5, text: 'Hel lo world', wd: [0, 0.3, 0.5] }]
);
eq(
  'ass from elsewhere: plain dialogue, drawings left out',
  back('[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:02.00,0:00:04.00,Default,,0,0,0,,{\\i1}Xin chào,{\\i0} bạn\\Nnhé\nDialogue: 0,0:00:00.00,0:00:09.00,Default,,0,0,0,,{\\p1}m 0 0 l 10 0 10 10{\\p0}'),
  [{ t: 2, text: 'Xin chào, bạn nhé' }]
);
// A look from someone else's file keeps only what is safe to paint.
{
  const look = BYL.look.cleanLook({ font: 'x; background:url(//evil)', sung: 'red;}', text: '#ABCDEF', layout: 'single', scale: 'big', strokeW: 1e9, glow: 1, extra: 'no' });
  eq('cleanLook keeps known, safe values', [look.font, look.sung, look.text, look.layout, look.scale, look.strokeW, look.glow, 'extra' in look], ['', '#e8212b', '#ABCDEF', 'single', 115, 400, true, false]);
  eq('cleanLook: nothing usable', BYL.look.cleanLook('x'), null);
}

console.log(fail ? `import: ${fail} failed` : 'import: ok');
process.exit(fail ? 1 : 0);
