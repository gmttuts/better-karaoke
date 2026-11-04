// Renders the Chrome Web Store images in headless Chrome:
//   store/{vi,en}/1-hero.png … (1280×800) from store/mockups.html, around the
//   real screenshots in store/shots/; store/vi/5-studio.png from store/assets.html;
//   store/promo-440x280.png and store/{vi,en}/marquee-1400x560.png.
//   node scripts/store-assets.mjs
import { spawn } from 'child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'byl-assets-'));
const chrome = spawn(CHROME, ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--no-first-run', '--allow-file-access-from-files', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
const [out, inp] = [chrome.stdio[3], chrome.stdio[4]];
let id = 0;
let buf = '';
const pending = new Map();
inp.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    out.write(JSON.stringify({ id: n, method, params, sessionId }) + '\0');
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const shots = [];
  for (const lang of ['vi', 'en'])
    for (const [i, scene] of ['hero', 'styles', 'karaoke', 'sound'].entries())
      shots.push(['mockups', `scene=${scene}&lang=${lang}`, 1280, 800, `${lang}/${i + 1}-${scene}`]);
  shots.push(['assets', 'scene=2', 1280, 800, 'vi/5-studio'], ['mockups', 'scene=promo', 440, 280, 'promo-440x280'], ['mockups', 'scene=marquee&lang=vi', 1400, 560, 'vi/marquee-1400x560'], ['mockups', 'scene=marquee&lang=en', 1400, 560, 'en/marquee-1400x560']);
  for (const lang of ['vi', 'en']) mkdirSync(join(root, 'store', lang), { recursive: true });
  for (const [page, query, w, hgt, name] of shots) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: hgt, deviceScaleFactor: 1, mobile: false }, sessionId);
    await send('Page.navigate', { url: pathToFileURL(join(root, 'store', page + '.html')).href + '?' + query }, sessionId);
    await sleep(1200);
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: hgt, scale: 1 } }, sessionId);
    writeFileSync(join(root, 'store', name + '.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('✓ store/' + name + '.png');
  }
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
