// Every translation has every string, with the same {0} placeholders, and
// "auto" follows the time zone.   node tests/i18n.test.mjs
import { readFileSync } from 'fs';
import vm from 'vm';

const ctx = { console, Date };
ctx.globalThis = ctx;
vm.createContext(ctx);
const run = (f) => vm.runInContext(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'), ctx);
run('i18n.js');
const { BYL } = ctx;
for (const [code] of BYL.LANGS) if (code !== 'vi') run(`lang/${code}.js`);

let fail = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) fail++;
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !detail ? '' : '\n   ' + detail}`);
};
const marks = (s) => (s.match(/\{\d\}/g) || []).sort().join();

const en = BYL.DICT.en;
const keys = Object.keys(en);
for (const [code] of BYL.LANGS.filter(([c]) => c !== 'vi')) {
  const d = BYL.DICT[code] || {};
  const missing = keys.filter((k) => typeof d[k] !== 'string' || !d[k].trim());
  const extra = Object.keys(d).filter((k) => !(k in en));
  const placeholders = keys.filter((k) => k in d && marks(d[k]) !== marks(k));
  ok(`${code}: ${keys.length - missing.length}/${keys.length} strings`, !missing.length && !extra.length, [...missing, ...extra].slice(0, 5).join(' | '));
  ok(`${code}: same placeholders`, !placeholders.length, placeholders.slice(0, 5).join(' | '));
}

BYL.setLang('ja');
ok('L translates', BYL.L('Lời bài hát') === BYL.DICT.ja['Lời bài hát']);
ok('L fills placeholders', BYL.L('⬇ Đã lưu file .{0}', 'ass').includes('.ass'));
ok('L keeps unknown text', BYL.L('không có trong từ điển') === 'không có trong từ điển');
BYL.setLang('vi');
ok('vi is the source', BYL.L('Lời bài hát') === 'Lời bài hát');

const real = Date.prototype.getTimezoneOffset;
ctx.Date.prototype.getTimezoneOffset = () => -420;
ok('auto: GMT+7 is Vietnamese', BYL.setLang('auto') === 'vi');
ctx.Date.prototype.getTimezoneOffset = () => 0;
ok('auto: elsewhere English', BYL.setLang('auto') === 'en');
ok('unknown code falls back to auto', BYL.setLang('xx') === 'en');
ctx.Date.prototype.getTimezoneOffset = real;

if (fail) process.exit(1);
console.log('i18n: ok');
