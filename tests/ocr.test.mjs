// Unit tests for 🔠 reading lyrics off video frames: cleaning OCR lines and
// turning frames into timed lines.   node tests/ocr.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console, navigator: { languages: ['vi'] } };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['i18n.js', 'content/util.js', 'content/ocr.js']) vm.runInContext(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'), ctx);
const { BYL } = ctx;
let fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) fail++;
  console.log(`${g === w ? '✓' : '✗'} ${name}${g === w ? '' : `\n   got  ${g}\n   want ${w}`}`);
};

eq('keeps a lyric line', BYL.ocr.keep({ text: 'Em ơi Hà Nội phố |', conf: 88 }), 'Em ơi Hà Nội phố');
eq('drops low confidence', BYL.ocr.keep({ text: 'Em ơi Hà Nội phố', conf: 40 }), null);
eq('drops a URL / channel tag', BYL.ocr.keep({ text: 'www.nhachay.vn', conf: 90 }), null);
eq('drops symbol noise', BYL.ocr.keep({ text: '~ ° ° .. ,, 1 2', conf: 80 }), null);

// A karaoke-style video: two lines on screen, the top one swapped as the
// song goes on; a watermark the whole time; OCR misreads a letter once.
const W = { text: 'Nhạc Hay Channel', conf: 90 };
const frames = [];
const show = (t, ...lines) => frames.push({ t, lines: [W, ...lines.map((text) => ({ text, conf: 85 }))] });
for (let t = 0; t < 8; t++) show(t); // intro, watermark only
for (let t = 8; t < 12; t++) show(t, 'Mùa thu cho em về', 'Lá vàng rơi bên thềm');
show(12, 'Mùa thu cho em vể', 'Lá vàng rơi bên thềm'); // misread
for (let t = 13; t < 16; t++) show(t, 'Gió nhẹ lay hàng cây', 'Lá vàng rơi bên thềm');
for (let t = 16; t < 20; t++) show(t, 'Gió nhẹ lay hàng cây', 'Nắng chiều phai trên tay');
for (let t = 20; t < 60; t++) show(t); // outro
const out = BYL.ocr.assemble(frames);
eq('lines with first-seen times', out, [
  { t: 8, text: 'Mùa thu cho em về' },
  { t: 8, text: 'Lá vàng rơi bên thềm' },
  { t: 13, text: 'Gió nhẹ lay hàng cây' },
  { t: 16, text: 'Nắng chiều phai trên tay' },
]);
eq('lrc', BYL.ocr.toLrc(out).split('\n')[2], '[00:13.00] Gió nhẹ lay hàng cây');

// A chorus line coming back later is a new line.
const f2 = [];
for (let t = 0; t < 4; t++) f2.push({ t, lines: [{ text: 'Yêu em dài lâu', conf: 90 }] });
for (let t = 4; t < 10; t++) f2.push({ t, lines: [] });
for (let t = 10; t < 13; t++) f2.push({ t, lines: [{ text: 'Yêu em dài lâu', conf: 90 }] });
eq('repeated line twice', BYL.ocr.assemble(f2).map((l) => l.t), [0, 10]);

eq('strips junk at the ends', BYL.ocr.keep({ text: '\\ Ö\\ ` Ñ Anh nhớ từng phút yên bình tay nắm tay <', conf: 87 }), 'Anh nhớ từng phút yên bình tay nắm tay');
eq('keeps a question', BYL.ocr.keep({ text: 'Người xót anh không vậy?', conf: 90 }), 'Người xót anh không vậy?');

// Lyrics scrolling up as a list of 5, the sung line in the middle row.
const rows = [100, 200, 300, 400, 500];
const lyric = ['Dòng một là đây', 'Dòng hai là đây', 'Dòng ba là đây', 'Dòng bốn là đây', 'Dòng năm là đây', 'Dòng sáu là đây', 'Dòng bảy là đây'];
const f3 = [];
for (let step = 0; step < 5; step++) {
  // list starts with lines 0..4 visible, line 0 at the middle row after scrolling 2 rows up (padded with blanks)
  for (let k = 0; k < 4; k++) {
    const t = step * 4 + k;
    const lines = [];
    rows.forEach((y, r) => {
      const li = step + r - 2;
      if (li >= 0 && li < lyric.length) lines.push({ text: lyric[li], conf: 90, box: [300, y - 20, 800, y + 20] });
    });
    f3.push({ t, lines });
  }
}
eq('scrolling list: time when the line reaches the middle', BYL.ocr.assemble(f3).map((l) => l.t).slice(0, 4), [0, 4, 8, 12]);

// The cover art's title sits on the same row as a lyric line, and blinks.
{
  const fs = [];
  const word = (text, x) => ({ text, conf: 90, box: [x, 100, x + text.length * 20, 140] });
  const lyricAt = (t) => ['Em đi về đâu', 'Mưa rơi trên phố', 'Gió lạnh mùa đông'][Math.floor(t / 20)];
  for (let t = 0; t < 60; t++) {
    let x = 600;
    const lyric = lyricAt(t).split(' ').map((w) => {
      const o = word(w, x);
      x = o.box[2] + 12;
      return o;
    });
    const title = t % 5 === 4 ? [] : ['KHÔNG', 'BUÔNG'].map((w, i) => word(w, 40 + i * 130));
    const words = [...title, ...lyric];
    fs.push({ t, lines: [{ text: words.map((w) => w.text).join(' '), conf: 90, box: [40, 100, 900, 140], words }] });
  }
  eq('side-by-side text split, blinking title dropped', BYL.ocr.assemble(fs).map((l) => l.t + ' ' + l.text), ['0 Em đi về đâu', '20 Mưa rơi trên phố', '40 Gió lạnh mùa đông']);
}

// Read again briefly just after it scrolled away: not a new line.
{
  const fs = [];
  for (let t = 0; t < 6; t++) fs.push({ t, lines: [{ text: 'Chỉ vừa như mới hôm nào', conf: 90 }] });
  for (let t = 6; t < 11; t++) fs.push({ t, lines: [{ text: 'Giờ thì không còn nữa', conf: 90 }] });
  fs.push({ t: 11, lines: [{ text: 'Giờ thì không còn nữa', conf: 90 }, { text: 'Chỉ vừa như mới hôm nào', conf: 80 }] });
  fs.push({ t: 12, lines: [{ text: 'Giờ thì không còn nữa', conf: 90 }] });
  eq('stray re-read dropped', BYL.ocr.assemble(fs).map((l) => l.text), ['Chỉ vừa như mới hôm nào', 'Giờ thì không còn nữa']);
}

// Japanese, Korean, Chinese, Thai: the model follows the video's title.
eq('langOf: Japanese title', BYL.ocr.langOf('練習用カラオケ♬ 雲を抜け風下へ私だけ - ヨルシカ'), 'jpn');
eq('langOf: Korean title', BYL.ocr.langOf('아이유 - 밤편지 노래방'), 'kor');
eq('langOf: Chinese title', BYL.ocr.langOf('周杰倫 晴天 卡拉OK'), 'chi_tra');
eq('langOf: Vietnamese title', BYL.ocr.langOf('Như Trong Phim - Emily'), 'vie');
// Tesseract's Japanese has spaces between the characters.
eq('keeps a Japanese line, spaces gone', BYL.ocr.keep({ text: '突 風 一 吹 き 、 晴 れ', conf: 70 }, 'jpn'), '突風一吹き、晴れ');
eq('drops the guide melody\'s dashes', BYL.ocr.keep({ text: 'ーー そ の 風 下 、 お 前 だ け', conf: 70 }, 'jpn'), 'その風下、お前だけ');
eq('drops Japanese noise', BYL.ocr.keep({ text: '■ ー ・', conf: 70 }, 'jpn'), null);
// Furigana over the words: small lines, dropped.
{
  const big = (text, y) => ({ text, conf: 80, box: [100, y, 600, y + 80] });
  const small = (text, y) => ({ text, conf: 80, box: [100, y, 400, y + 25] });
  const fr = [];
  for (let t = 0; t < 4; t++) fr.push({ t, lines: [small('とっ ぷう ひと ふ', 100), big('突風一吹き、晴れ', 130), small('わたし みち うえ', 250), big('私は道の上', 280)] });
  for (let t = 4; t < 8; t++) fr.push({ t, lines: [big('雲を抜け風下へ', 130)] });
  eq('Japanese karaoke: furigana dropped', BYL.ocr.assemble(fr, [], 'jpn').map((l) => l.text), ['突風一吹き、晴れ', '私は道の上', '雲を抜け風下へ']);
}

if (fail) process.exit(1);
console.log('ocr: ok');
