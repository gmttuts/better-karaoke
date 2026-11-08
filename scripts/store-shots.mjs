// Takes the real screenshots in store/shots/ that the Store images are built
// from (scripts/store-assets.mjs), on youtube.com with the unpacked extension,
// at 2× for sharp text:
//   style-<key>.png      each subtitle style, theater mode, dark (1280 wide)
//   panel-<lang>.png     👀 Xem lời, lyrics on the video and 🎤 on the player
//   sing-<lang>.png      🎤 Hát with the key up 2 and the vocal cut on
//   studio-<lang>.png    🎨 open with a look of one's own   (1440 wide)
//   node scripts/store-shots.mjs [styles] [panels]     (both by default)
// Needs the network; skips the ads. Muted, headless, profiles thrown away.
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const want = process.argv.slice(2);
const doStyles = !want.length || want.includes('styles');
const doPanels = !want.length || want.includes('panels');

// One headless Chrome with the extension, its own throwaway profile.
async function browser(width, height) {
  const profile = mkdtempSync(join(tmpdir(), 'byl-shots-'));
  const chrome = spawn(
    CHROME,
    ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging', '--no-first-run',
      `--window-size=${width},${height}`, '--lang=vi', '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] }
  );
  const [out, inp] = [chrome.stdio[3], chrome.stdio[4]];
  let id = 0;
  let buf = '';
  let cs = null; // the content script's world
  const pending = new Map();
  inp.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const m = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (m.id && pending.has(m.id)) pending.get(m.id)(m), pending.delete(m.id);
      else if (m.method === 'Runtime.executionContextCreated' && m.params.context.auxData?.type === 'isolated' && /Better/.test(m.params.context.name)) cs = m.params.context.id;
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res) => {
      const n = ++id;
      pending.set(n, res);
      out.write(JSON.stringify({ id: n, method, params, sessionId }) + '\0');
    });
  const ext = (await send('Extensions.loadUnpacked', { path: root })).result.id;
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false }, sessionId);
  const evaluate = async (expr, world) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true, ...(world ? { contextId: world } : {}) }, sessionId);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  // Settings go in through the extension's own options page.
  const setStorage = async (sync, local = {}) => {
    const t = await send('Target.createTarget', { url: `chrome-extension://${ext}/src/options/options.html` });
    const s = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
    await sleep(1200);
    await send('Runtime.evaluate', { expression: `Promise.all([chrome.storage.sync.set(${JSON.stringify(sync)}), chrome.storage.local.set(${JSON.stringify(local)})])`, awaitPromise: true }, s);
    await send('Target.closeTarget', { targetId: t.result.targetId });
  };
  const cookies = async (list) => {
    for (const [name, value] of list) await send('Network.setCookie', { name, value, domain: '.youtube.com', path: '/', secure: true }, sessionId);
  };
  const go = async (url) => {
    await send('Page.navigate', { url }, sessionId);
    await sleep(14000);
  };
  const click = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }, sessionId);
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(root, 'store', 'shots', name + '.png'), Buffer.from(r.result.data, 'base64'));
    console.log('✓ store/shots/' + name + '.png');
  };
  const close = async () => {
    chrome.kill();
    await sleep(400);
    rmSync(profile, { recursive: true, force: true });
  };
  return { evaluate, setStorage, cookies, go, click, shot, close, cs: () => cs };
}

const R = `document.getElementById('byl-panel-host').shadowRoot`;
// Ads skipped, YouTube's popups hidden, the timed LRCLIB lyrics picked.
const PREP = `(async () => {
  const st = document.createElement('style');
  st.textContent = 'ytd-popup-container,tp-yt-iron-overlay-backdrop,ytd-mealbar-promo-renderer,#masthead-ad,ytd-banner-promo-renderer,.ytp-paid-content-overlay,.ytp-ce-element,.ytp-pause-overlay,.ytp-spinner,.ytp-bezel,.ytp-tooltip{display:none!important}' + (HIDE_CONTROLS ? '.ytp-chrome-bottom,.ytp-gradient-bottom,.ytp-chrome-top,.ytp-gradient-top{display:none!important}' : '');
  document.head.append(st);
  for (let i = 0; i < 40 && document.querySelector('.ad-showing'); i++) {
    const v = document.querySelector('video');
    if (isFinite(v.duration)) v.currentTime = v.duration;
    await new Promise((r) => setTimeout(r, 1000));
  }
  await new Promise((r) => setTimeout(r, 1500));
  const r = ${R};
  r.querySelector('.chip[data-k=lrclib]')?.click();
  await new Promise((x) => setTimeout(x, 800));
  const ns = document.createElement('style');
  ns.textContent = '.note{display:none!important}';
  r.append(ns);
  window.scrollTo(0, 0);
  return r.querySelector('.chip.cur')?.textContent;
})()`;
// Paused at t, the player's controls showing (or not).
const at = (t) => `(async () => {
  const v = document.querySelector('#movie_player video');
  v.pause();
  v.currentTime = ${t};
  await new Promise((r) => setTimeout(r, 1500));
  const p = document.querySelector('#movie_player');
  p.classList.remove('ytp-autohide');
  p.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 300 }));
  await new Promise((r) => setTimeout(r, 300));
  return true;
})()`;
const look = (k) => `(() => { const s = ${R}.querySelector('select.look'); s.value = '${k}'; s.dispatchEvent(new Event('change')); return s.value; })()`;
const mode = (m) => `(${R}.querySelector('nav button[data-mode=${m}]').click(), true)`;
const studioBtn = `[...${R}.querySelectorAll('.row button')].find((b) => b.textContent === '🎨')`;
const CUSTOM = { font: '"BYL Condensed", "Arial Narrow"', weight: 900, text: '#ffffff', textGrad: false, dim: 100, upper: true, tracking: 2, sung: '#00e5ff', sung2: '#c77dff', mark: '',
  glow: true, stroke: '#101010', sstroke: '#101010', strokeW: 12, shadow: true, shape: 'none', bg: '#000000', bgAlpha: 60, layout: 'center2', nextScale: 70, scale: 135, margin: 12, wipe: 'word' };
const BASE = { panelMode: 'view', karaokeAuto: true, overlayPosition: 'bottom', overlayStyle: 'red', panelCollapsed: false };
const LINE = 58.6; // "Never gonna tell a lie and hurt you", half sung
const SHORT = 43.9; // "Never gonna give you up": "Chữ lớn" fits

if (doStyles) {
  const b = await browser(1280, 800);
  try {
    await b.setStorage({ ...BASE, uiLang: 'vi' }, { overlayLook: null, channelStyles: {} });
    await b.cookies([['PREF', 'f6=400&hl=en'], ['wide', '1']]);
    await b.go(VIDEO);
    console.log('  lyrics:', await b.evaluate(PREP.replace('HIDE_CONTROLS', 'true')));
    for (const k of ['red', 'classic', 'focus', 'box', 'captions', 'cinema', 'fade', 'mini', 'big']) {
      await b.evaluate(look(k));
      await b.evaluate(at(k === 'big' ? SHORT : LINE));
      await b.shot('style-' + k);
    }
  } finally {
    await b.close();
  }
}

if (doPanels)
  for (const lang of ['vi', 'en']) {
    // 👀 Xem lời, then 🎤 Hát with the key and the vocal cut.
    let b = await browser(1440, 1500);
    try {
      await b.setStorage({ ...BASE, uiLang: lang, overlayStyle: 'focus' }, { overlayLook: null, channelStyles: {} });
      await b.cookies([['PREF', 'hl=en'], ['wide', '0']]);
      await b.go(VIDEO);
      console.log(`  ${lang} lyrics:`, await b.evaluate(PREP.replace('HIDE_CONTROLS', 'false')));
      await b.evaluate(at(LINE));
      await b.shot('panel-' + lang);
      await b.evaluate(mode('sing'));
      await b.click(400, 300); // a click lets the page start its sound
      await sleep(600);
      await b.evaluate(`(async () => {
        const r = ${R};
        const btn = (t) => [...r.querySelectorAll('.row.fx button')].find((x) => x.textContent.includes(t));
        btn('♯').click();
        await new Promise((x) => setTimeout(x, 300));
        btn('♯').click();
        await new Promise((x) => setTimeout(x, 500));
        btn('🎤').click();
        await new Promise((x) => setTimeout(x, 800));
        return true;
      })()`);
      await b.evaluate(at(LINE));
      await b.shot('sing-' + lang);
    } finally {
      await b.close();
    }
    // 🎨 open, with a look of one's own already saved.
    b = await browser(1440, 1500);
    try {
      await b.setStorage({ ...BASE, uiLang: lang, panelMode: 'sing', overlayStyle: 'focus' }, { overlayLook: CUSTOM, channelStyles: {} });
      await b.cookies([['PREF', 'hl=en'], ['wide', '0']]);
      await b.go(VIDEO);
      await b.evaluate(PREP.replace('HIDE_CONTROLS', 'false'));
      await b.evaluate(`(${studioBtn}.click(), true)`);
      await sleep(300);
      await b.evaluate(at(SHORT));
      await b.shot('studio-' + lang);
    } finally {
      await b.close();
    }
  }
