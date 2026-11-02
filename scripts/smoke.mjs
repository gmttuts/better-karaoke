// Smoke test: loads dist/better-youtube-lyric in headless Chrome (muted),
// opens a music video and checks the panel, the 🎨 studio and the overlay.
//   npm test                     (builds first)
//   VIDEO=<id> CHROME=<path> npm test
import { spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXT = join(root, 'dist', 'better-youtube-lyric');
const VIDEO = process.env.VIDEO || '6HQWus2DOsI';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'byl-smoke-'));

const chrome = spawn(CHROME, ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  '--no-first-run', '--mute-audio', '--window-size=1400,1000', '--lang=vi', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
const [out, inp] = [chrome.stdio[3], chrome.stdio[4]];
let id = 0;
let buf = '';
const pending = new Map();
const errors = [];
inp.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    out.write(JSON.stringify({ id: n, method, params, sessionId }) + '\0');
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

try {
  const ext = await send('Extensions.loadUnpacked', { path: EXT });
  check('Chrome nạp được extension', !!ext.result?.id, ext.error?.message || ext.result?.id);
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  const ev = async (expr) =>
    (await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }, sessionId)).result?.result?.value;

  await send('Page.navigate', { url: 'https://www.youtube.com/watch?v=' + VIDEO }, sessionId);
  let panel = false;
  for (let t = 0; t < 30 && !panel; t++) {
    await sleep(1000);
    panel = await ev(`return !!document.getElementById('byl-panel-host')?.shadowRoot?.querySelector('.byl')`);
  }
  check('Panel hiện cạnh video', panel);
  await sleep(4000);
  const r = await ev(`
    const sr = document.getElementById('byl-panel-host').shadowRoot;
    const btn = (t) => [...sr.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
    btn('🎨').click();
    await new Promise((r) => setTimeout(r, 400));
    const studio = [...sr.querySelectorAll('.studio section')].map((s) => s.querySelector('h4').textContent);
    const overlay = !!document.getElementById('byl-overlay-host')?.isConnected;
    const before = btn('🎤 Karaoke').classList.contains('on');
    btn('🎤 Karaoke').click();
    const toggled = btn('🎤 Karaoke').classList.contains('on') !== before && !!document.getElementById('byl-overlay-host')?.isConnected === !before;
    btn('🎤 Karaoke').click();
    return { studio, overlay, toggled, title: sr.querySelector('.song b').textContent };`);
  check('Bảng 🎨 có đủ 4 nhóm', r?.studio?.join() === 'Chữ,Màu,Nền,Bố cục', r?.studio?.join());
  check('Mở 🎨 hiện lời trên video', r?.overlay);
  check('Nút 🎤 Karaoke bật/tắt được', r?.toggled);
  check('Đọc được tên bài', !!r?.title && r.title !== 'Better Lyric', r?.title);
  check('Không có lỗi JavaScript', !errors.some((e) => /BYL|byl|content\//.test(e)), errors.filter((e) => /BYL|byl|content\//.test(e))[0] || '');
} catch (err) {
  check('Chạy test', false, String(err));
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} mục lỗi` : '\nTất cả đều ổn');
process.exit(failed ? 1 : 0);
