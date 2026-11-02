// Unit tests for the Latin spelling shown under Korean / Japanese / Chinese
// lyrics.   node tests/romanize.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { globalThis: {}, console };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext('var BYL = (globalThis.BYL = {});' + readFileSync(new URL('../src/content/romanize.js', import.meta.url), 'utf8'), ctx);
const R = ctx.BYL.romanize;
const P = JSON.parse(readFileSync(new URL('../data/pinyin.json', import.meta.url), 'utf8'));

const cases = [
  ['ko', '사랑해', 'saranghae'],
  ['ko', '한국어', 'hangugeo'],
  ['ko', '빨리 와', 'ppalli wa'],
  ['ko', '감사합니다', 'gamsahamnida'],
  ['ko', '너를 좋아해', 'neoreul joahae'],
  ['ja', 'ありがとう', 'arigatou'],
  ['ja', 'きょうは', 'kyouha'],
  ['ja', 'ちょっと', 'chotto'],
  ['ja', 'がっこう', 'gakkou'],
  ['ja', 'コーヒー', 'koohii'],
  ['ja', 'しゃしん', 'shashin'],
  ['ja', 'きみの名前', 'kimino 名前'],
  ['zh', '我爱你', 'wǒ ài nǐ'],
  ['zh', '月亮代表我的心', 'yuè liàng dài biǎo wǒ de xīn'],
];
let fail = 0;
for (const [k, src, want] of cases) {
  const got = k === 'ko' ? R.korean(src) : k === 'ja' ? R.japanese(src) : R.chinese(src, P);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${src} → ${got}${ok ? '' : `  (cần: ${want})`}`);
}
for (const [t, want] of [['안녕', 'ko'], ['こんにちは', 'ja'], ['你好', 'zh'], ['Em ơi', null]]) {
  if (R.scriptOf(t) !== want) (fail++, console.log('✗ scriptOf', t));
}
if (fail) process.exit(1);
console.log('romanize: ok');
