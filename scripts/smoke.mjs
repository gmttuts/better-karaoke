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
const EN = process.env.UI_LANG === 'en';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'byl-smoke-'));

const chrome = spawn(CHROME, ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  '--no-first-run', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--window-size=1400,1000', '--lang=vi', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
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
  // Interface language: Vietnamese, as the checks below look for its labels;
  // an English pass only checks that the panel switches over.
  {
    const { result: o } = await send('Target.createTarget', { url: `chrome-extension://${ext.result.id}/src/options/options.html` });
    const { result: { sessionId: os } } = await send('Target.attachToTarget', { targetId: o.targetId, flatten: true });
    await sleep(800);
    await send('Runtime.evaluate', { expression: `chrome.storage.sync.set({ uiLang: '${EN ? 'en' : 'vi'}' })`, awaitPromise: true }, os);
    await send('Target.closeTarget', { targetId: o.targetId });
  }
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
  if (EN) {
    const tabs = await ev(`return [...document.getElementById('byl-panel-host').shadowRoot.querySelectorAll('nav button')].map((b) => b.textContent).join()`);
    check('Panel in English', tabs === '👀 Lyrics,🎤 Sing,✏️ Edit', tabs);
    // 🌐 on the panel switches the language on the spot, keeping the song.
    const pick = (code) => ev(`
      const sr = document.getElementById('byl-panel-host').shadowRoot;
      const before = sr.querySelector('.song b').textContent;
      const sel = sr.querySelector('.lang select');
      sel.value = '${code}';
      sel.dispatchEvent(new Event('change'));
      await new Promise((r) => setTimeout(r, 1500));
      const nr = document.getElementById('byl-panel-host').shadowRoot;
      return { tabs: [...nr.querySelectorAll('nav button')].map((b) => b.textContent).join(), lang: nr.querySelector('.lang').textContent,
        song: nr.querySelector('.song b').textContent, before, hosts: document.querySelectorAll('#byl-panel-host').length };`);
    for (let t = 0; t < 15; t++) {
      if ((await ev(`return document.getElementById('byl-panel-host').shadowRoot.querySelector('.song b').textContent`)) !== 'Better Karaoke') break;
      await sleep(1000);
    }
    const ja = await pick('ja');
    check('🌐 đổi sang 日本語 ngay', /JA/.test(ja?.lang) && !/Lyrics|Lời/.test(ja?.tabs) && ja.song === ja.before && ja.hosts === 1, JSON.stringify(ja));
    const back = await pick('en');
    check('🌐 đổi lại English', back?.tabs === '👀 Lyrics,🎤 Sing,✏️ Edit' && back.hosts === 1, JSON.stringify(back));
    throw 'done';
  }
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
  check('Đọc được tên bài', !!r?.title && r.title !== 'Better Karaoke', r?.title);

  // Loading a source by its chip ends with a message, not "Đang tìm…" for ever.
  const chipEnd = await ev(`
    const sr = document.getElementById('byl-panel-host').shadowRoot;
    const chip = sr.querySelector('.status .chip[data-k=transcript]');
    if (!chip || !/idle|error/.test(chip.className)) return { skipped: chip?.className || 'none' };
    chip.click();
    for (let i = 0; i < 50 && /loading/.test(chip.className); i++) await new Promise((r) => setTimeout(r, 1000));
    await new Promise((r) => setTimeout(r, 300));
    return { chip: chip.className, note: sr.querySelector('.note').textContent };`);
  check('Bấm chip 📝 Phụ đề: tải xong có báo kết quả', chipEnd?.skipped !== undefined || (!/loading/.test(chipEnd?.chip) && !/^Đang tìm/.test(chipEnd?.note)), JSON.stringify(chipEnd));

  // Alt+L (shortcut) toggles the lyrics on the video.
  const ovOn = () => ev(`return !!document.getElementById('byl-overlay-host')?.isConnected`);
  const before = await ovOn();
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, modifiers: 1, code: 'KeyL', key: 'l', windowsVirtualKeyCode: 76 }, sessionId);
  await sleep(300);
  check('Phím tắt Alt L bật/tắt lời trên video', (await ovOn()) !== before);

  // 📌 pins the style to the channel and back.
  const pin = await ev(`
    const sr = document.getElementById('byl-panel-host').shadowRoot;
    const b = sr.querySelector('button.chan');
    if (!b || b.hidden) return { shown: false };
    b.click();
    await new Promise((r) => setTimeout(r, 300));
    const on = b.classList.contains('on');
    const saved = Object.keys((await chrome.storage?.local?.get?.('channelStyles'))?.channelStyles || {}).length;
    b.click();
    await new Promise((r) => setTimeout(r, 300));
    return { shown: true, on, off: !b.classList.contains('on') };`);
  check('Nút 📌 kiểu chữ theo kênh', pin?.shown && pin.on && pin.off, JSON.stringify(pin));

  // Pick timed lyrics when the video has some (⏱ / 🎯 in the list).
  for (let t = 0; t < 15; t++) {
    const picked = await ev(`
      const sel = document.getElementById('byl-panel-host').shadowRoot.querySelector('select.src');
      const o = [...sel.options].find((o) => /⏱|🎯/.test(o.textContent));
      if (!o) return false;
      if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event('change')); }
      return true;`);
    if (picked) break;
    await sleep(1000);
  }

  // 🎚 ♯ raises the key (the video's sound goes through the pitch worklet), the label resets it.
  const key = await ev(`
    const sr = document.getElementById('byl-panel-host').shadowRoot;
    const [down, up] = sr.querySelectorAll('.fx button');
    up.click();
    await new Promise((r) => setTimeout(r, 1500));
    const raised = sr.querySelector('.fx .off').textContent;
    sr.querySelector('.fx .off').click();
    await new Promise((r) => setTimeout(r, 500));
    return { raised, back: sr.querySelector('.fx .off').textContent, playing: !document.querySelector('video').paused };`);
  check('🎚 Đổi tông và về tông gốc', key?.raised === '+1' && key.back === '0', JSON.stringify(key));

  // ⬇ Xuất → SRT downloads a file (or explains that the lyrics have no timing).
  const dl = mkdtempSync(join(tmpdir(), 'byl-dl-'));
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  const ex = await ev(`
    const sr = document.getElementById('byl-panel-host').shadowRoot;
    const btn = (t) => [...sr.querySelectorAll('button')].find((b) => b.textContent.trim() === t);
    btn('⬇ Xuất').click();
    const shown = !sr.querySelector('.exports').hidden;
    btn('⬇ File SRT').click();
    await new Promise((r) => setTimeout(r, 1500));
    return { shown, note: sr.querySelector('.note').textContent };`);
  const files = (await import('fs')).readdirSync(dl);
  const srt = files.find((f) => f.endsWith('.srt'));
  const srtText = srt ? (await import('fs')).readFileSync(join(dl, srt), 'utf8') : '';
  check('Xuất SRT', ex?.shown && (srt ? /^\ufeff1\n\d\d:\d\d:\d\d,\d{3} --> /.test(srtText) : /chưa có thời gian/.test(ex?.note)), srt || ex?.note);
  if (srt) {
    // .ass with the overlay's look and karaoke sweep.
    await ev(`
      const sr = document.getElementById('byl-panel-host').shadowRoot;
      [...sr.querySelectorAll('button')].find((b) => b.textContent.trim() === '⬇ File ASS').click();
      await new Promise((r) => setTimeout(r, 1500));`);
    const ass = (await import('fs')).readdirSync(dl).find((f) => f.endsWith('.ass'));
    const assText = ass ? (await import('fs')).readFileSync(join(dl, ass), 'utf8') : '';
    check('Xuất ASS', /^\ufeff\[Script Info\][\s\S]*Style: Lyric,[\s\S]*Dialogue: 1,\d:\d\d:\d\d\.\d\d,/.test(assText) && /\\k/.test(assText), ass || 'no file');
  }
  rmSync(dl, { recursive: true, force: true });

  // ☁ opens the publish page with the lyrics filled in (nothing is sent).
  if (srt) {
    await ev(`[...document.getElementById('byl-panel-host').shadowRoot.querySelectorAll('button')].find((b) => b.textContent.trim() === '☁ Gửi lên LRCLIB').click()`);
    await sleep(2000);
    const { result: { targetInfos } } = await send('Target.getTargets');
    const pub = targetInfos.find((t) => t.url.includes('/src/publish/publish.html'));
    let filled = null;
    if (pub) {
      const { result: { sessionId: ps } } = await send('Target.attachToTarget', { targetId: pub.targetId, flatten: true });
      filled = (await send('Runtime.evaluate', { expression: `({ track: document.getElementById('track').value, lines: document.getElementById('synced').value.split('\\n').length, send: document.getElementById('send').disabled })`, returnByValue: true }, ps)).result?.result?.value;
    }
    const note = await ev(`return document.getElementById('byl-panel-host').shadowRoot.querySelector('.note').textContent`);
    check('Trang gửi LRCLIB mở và điền sẵn lời', !!filled?.track && filled.lines > 3 && filled.send === true, JSON.stringify(filled) + ' ' + (filled ? '' : note + ' ' + targetInfos.map((t) => t.url).join(' ')));
  }
  // 🎙 opens the score window, which connects to this tab.
  await ev(`[...document.getElementById('byl-panel-host').shadowRoot.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('🎙')).click()`);
  await sleep(3000);
  {
    const { result: { targetInfos } } = await send('Target.getTargets');
    const win = targetInfos.find((t) => t.url.includes('/src/score/score.html'));
    let song = null;
    if (win) {
      const { result: { sessionId: ws } } = await send('Target.attachToTarget', { targetId: win.targetId, flatten: true });
      song = (await send('Runtime.evaluate', { expression: `[document.getElementById('song').textContent, document.getElementById('hint').className]`, returnByValue: true }, ws)).result?.result?.value;
    }
    check('Cửa sổ 🎙 chấm điểm mở và nối với tab', !!song && song[0].length > 3 && song[0] !== '🎙 Chấm điểm' && song[1] === 'hint', JSON.stringify(song));
  }
  check('Không có lỗi JavaScript', !errors.some((e) => /BYL|byl|content\//.test(e)), errors.filter((e) => /BYL|byl|content\//.test(e))[0] || '');
} catch (err) {
  if (err !== 'done') check('Chạy test', false, String(err));
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} mục lỗi` : '\nTất cả đều ổn');
process.exit(failed ? 1 : 0);
