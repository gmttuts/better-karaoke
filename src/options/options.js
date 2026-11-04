'use strict';

// Only the settings shown in this popup; the overlay look is edited in the
// panel (🎨) on YouTube. Defaults must match BYL.DEFAULTS in content/util.js.
const DEFAULTS = {
  enabled: true,
  uiLang: 'auto',
  srcDescription: true,
  srcComments: true,
  srcDuplicates: true,
  srcLrclib: true,
  srcHopamchuan: true,
  srcGenius: true,
  srcTranscript: true,
  preferSynced: false,
  overlayOnByDefault: false,
  commentPages: 3,
};

document.getElementById('ver').textContent = 'v' + chrome.runtime.getManifest().version;

const LIVE = ['enabled', 'overlayOnByDefault'];
const saved = document.getElementById('saved');
let timer;

// Each language under its own name, so anyone can find theirs.
for (const [code, name] of BYL.LANGS) document.querySelector('[data-k="uiLang"]').append(new Option(name, code));

chrome.storage.sync.get(DEFAULTS).then((values) => {
  BYL.setLang(values.uiLang);
  BYL.localizePage();
  for (const input of document.querySelectorAll('[data-k]')) {
    const k = input.dataset.k;
    if (input.type === 'checkbox') input.checked = !!values[k];
    else input.value = values[k];
    if (k === 'enabled') document.body.classList.toggle('off', !input.checked);
    input.addEventListener('change', async () => {
      let v = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value);
      if (input.type === 'number') {
        v = Math.min(Number(input.max), Math.max(Number(input.min), v || DEFAULTS[k]));
        input.value = v;
      }
      await chrome.storage.sync.set({ [k]: v });
      if (k === 'enabled') document.body.classList.toggle('off', !v);
      // The page's text was swapped once on load: reload it in the new language.
      if (k === 'uiLang') return location.reload();
      // These two reach open YouTube tabs right away (main.js listens).
      saved.textContent = LIVE.includes(k) ? L('Đã lưu.') : L('Đã lưu, áp dụng từ video tiếp theo.');
      clearTimeout(timer);
      timer = setTimeout(() => (saved.textContent = ''), 2000);
    });
  }
});

// ---------- backup ----------

// Everything else the extension stores: storage.sync holds the settings,
// storage.local holds per-video data ('v:<id>') and the look presets.
const LOCAL_SETTINGS = ['overlayLook', 'overlayPresets', 'channelStyles'];
const isTab = new URLSearchParams(location.search).has('tab');
document.body.classList.toggle('tab', isTab);

document.getElementById('openBackup').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html?tab') });
  window.close();
});

const msg = document.getElementById('msg');
const say = (text, err = false) => {
  msg.textContent = text;
  msg.classList.toggle('err', err);
};

function summarize(local) {
  const videos = Object.entries(local).filter(([k]) => k.startsWith('v:'));
  const has = (f) => videos.filter(([, v]) => f(v)).length;
  return {
    videos: videos.length,
    custom: has((v) => v.custom),
    warps: has((v) => v.warps && Object.keys(v.warps).length),
    presets: (local.overlayPresets || []).length,
  };
}

async function showStats() {
  const [local, bytes] = await Promise.all([chrome.storage.local.get(null), (chrome.storage.local.getBytesInUse?.(null) ?? 0)]);
  const s = summarize(local);
  document.getElementById('stats').textContent =
    L('{0} video đã nhớ · {1} lời bạn sửa · {2} bài có điểm 📍 · {3} preset · {4} KB', s.videos, s.custom, s.warps, s.presets, (bytes / 1024).toFixed(0));
}
if (isTab) showStats();

document.getElementById('export').addEventListener('click', async () => {
  const [sync, local] = await Promise.all([chrome.storage.sync.get(null), chrome.storage.local.get(null)]);
  const data = {
    app: 'better-youtube-lyric',
    format: 1,
    version: chrome.runtime.getManifest().version,
    exportedAt: new Date().toISOString(),
    settings: sync,
    // Cached search results ('c:') are rebuilt on demand; leave them out.
    local: Object.fromEntries(Object.entries(local).filter(([k]) => !k.startsWith('c:') && k !== 'publishDraft')),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `better-youtube-lyric-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  const s = summarize(local);
  say(L('Đã xuất {0} video, {1} lời bạn sửa, {2} preset.', s.videos, s.custom, s.presets));
});

const file = document.getElementById('file');
document.getElementById('import').addEventListener('click', () => file.click());
file.addEventListener('change', async () => {
  const f = file.files[0];
  file.value = '';
  if (!f) return;
  let data;
  try {
    data = JSON.parse(await f.text());
  } catch {
    return say(L('File này không phải JSON hợp lệ.'), true);
  }
  if (data?.app !== 'better-youtube-lyric' || typeof data.local !== 'object' || typeof data.settings !== 'object') {
    return say(L('File này không phải bản sao lưu của Better Karaoke.'), true);
  }
  try {
    const counts = await importBackup(data);
    say(
      L('Đã nhập {0} video ({1} được cập nhật), {2} preset.\n', counts.videos, counts.newer, counts.presets) +
        L('Tải lại các tab YouTube đang mở để thấy thay đổi.')
    );
    showStats();
  } catch (err) {
    say(L('Nhập không thành công: ') + (err?.message || err), true);
  }
});

async function importBackup(data) {
  const cur = await chrome.storage.local.get(null);
  const out = {};
  let videos = 0;
  let newer = 0;
  for (const [k, v] of Object.entries(data.local)) {
    if (!/^v:[\w-]{6,20}$/.test(k) || !v || typeof v !== 'object') continue;
    videos++;
    const mine = cur[k];
    // Keep the fields of both copies; the one edited last wins on conflicts.
    if (!mine) out[k] = v;
    else if ((v.at || 0) > (mine.at || 0)) {
      out[k] = { ...mine, ...v };
      newer++;
    } else out[k] = { ...v, ...mine };
  }

  // Presets merge by name; the file's copy replaces one with the same name.
  // Backups from before 0.8 kept the look keys with the settings.
  const old = data.settings;
  const incoming = [old.overlayPresets, data.local.overlayPresets].flatMap((x) => (Array.isArray(x) ? x : []));
  const valid = [...new Map(incoming.filter((p) => typeof p?.name === 'string' && p.look && typeof p.look === 'object').map((p) => [p.name, p])).values()];
  const names = new Set(valid.map((p) => p.name));
  out.overlayPresets = [...(cur.overlayPresets || []).filter((p) => !names.has(p.name)), ...valid];
  const look = data.local.overlayLook || old.overlayLook;
  if (look && typeof look === 'object') out.overlayLook = look;
  // History: one entry per video, the more recent wins; ★ from either side.
  if (Array.isArray(data.local.history)) {
    const byId = new Map((cur.history || []).map((x) => [x.id, x]));
    for (const x of data.local.history) {
      if (!x || typeof x.id !== 'string') continue;
      const mine = byId.get(x.id);
      byId.set(x.id, !mine || (x.at || 0) > (mine.at || 0) ? { ...x, fav: !!(x.fav || mine?.fav) } : { ...mine, fav: !!(x.fav || mine.fav) });
    }
    out.history = [...byId.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  // Styles pinned to a channel (📌): the file's entry wins per channel.
  const chans = data.local.channelStyles;
  if (chans && typeof chans === 'object') {
    const ok = Object.entries(chans).filter(([, v]) => v && typeof v.style === 'string');
    out.channelStyles = { ...(cur.channelStyles || {}), ...Object.fromEntries(ok) };
  }
  await chrome.storage.local.set(out);

  // Settings: plain values only.
  const sync = {};
  for (const [k, v] of Object.entries(old)) {
    if (!/^[a-zA-Z]+$/.test(k) || LOCAL_SETTINGS.includes(k) || v === null || typeof v === 'object') continue;
    sync[k] = v;
  }
  await chrome.storage.sync.set(sync);
  for (const input of document.querySelectorAll('[data-k]')) {
    const v = sync[input.dataset.k];
    if (v === undefined) continue;
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = v;
  }
  return { videos, newer, presets: valid.length };
}
