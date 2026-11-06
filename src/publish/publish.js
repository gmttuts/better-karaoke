'use strict';

// Sends lyrics the user timed on YouTube to LRCLIB (POST /api/publish).
// Nothing leaves the browser until the user ticks the box and presses send.
const API = 'https://lrclib.net/api';
const CLIENT = `BetterKaraoke/${chrome.runtime.getManifest().version} (https://github.com/gmttuts/better-karaoke)`;
const $ = (id) => document.getElementById(id);
const headers = { 'Lrclib-Client': CLIENT };
let draft = null;

function show(box, text, kind = '') {
  box.hidden = !text;
  box.className = 'box ' + kind;
  box.textContent = text || '';
}

// Lines that carry a [mm:ss.xx] stamp; anything else is dropped on send.
const stamped = (lrc) => lrc.split('\n').filter((l) => /^\[\d{1,2}:\d{2}([.:]\d{1,3})?\]/.test(l.trim()));
const plainOf = (lrc) =>
  lrc
    .split('\n')
    .map((l) => l.replace(/\[[^\]]*\]/g, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

async function checkExisting() {
  const q = new URLSearchParams({ track_name: $('track').value.trim(), artist_name: $('artist').value.trim() });
  if (!q.get('track_name') || !q.get('artist_name')) return show($('exists'), '');
  try {
    const res = await fetch(`${API}/search?${q}`, { headers });
    const list = res.ok ? await res.json() : [];
    const dur = Number($('duration').value) || 0;
    const near = list.filter((r) => r.syncedLyrics && (!dur || Math.abs((r.duration || 0) - dur) <= 3));
    show(
      $('exists'),
      near.length
        ? L('LRCLIB đã có {0} bản lời có thời gian cho "{1}" – {2} cùng thời lượng. ', near.length, near[0].trackName, near[0].artistName) +
            L('Chỉ nên gửi nếu bản của bạn đúng hơn.')
        : '',
      'warn'
    );
  } catch {
    show($('exists'), '');
  }
}

function solve(prefix, target) {
  return new Promise((resolve, reject) => {
    const w = new Worker('pow.js');
    w.onmessage = (e) => {
      if (e.data.nonce === undefined) return;
      w.terminate();
      resolve(e.data.nonce);
    };
    w.onerror = (e) => (w.terminate(), reject(new Error(e.message)));
    w.postMessage({ prefix, target });
  });
}

async function send(e) {
  e.preventDefault();
  const synced = stamped($('synced').value);
  if (synced.length < 3) return show($('msg'), L('Cần ít nhất 3 dòng có dấu thời gian dạng [01:23.45].'), 'err');
  const body = {
    trackName: $('track').value.trim(),
    artistName: $('artist').value.trim(),
    albumName: $('album').value.trim(),
    duration: Number($('duration').value),
    plainLyrics: plainOf(synced.join('\n')),
    syncedLyrics: synced.map((l) => l.trim()).join('\n'),
  };
  if (!body.trackName || !body.artistName || !(body.duration > 0)) return show($('msg'), L('Điền tên bài, ca sĩ và thời lượng.'), 'err');

  $('send').disabled = true;
  $('prog').hidden = false;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      // LRCLIB asks for a small proof of work instead of an account.
      show($('msg'), L('Đang xác thực với LRCLIB (mất khoảng 10–30 giây)…'));
      const ch = await fetch(`${API}/request-challenge`, { method: 'POST', headers }).then((r) => {
        if (!r.ok) throw new Error('request-challenge ' + r.status);
        return r.json();
      });
      const nonce = await solve(ch.prefix, ch.target);
      show($('msg'), L('Đang gửi…'));
      const res = await fetch(`${API}/publish`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', 'X-Publish-Token': `${ch.prefix}:${nonce}` },
        body: JSON.stringify(body),
      });
      if (res.status === 201) {
        // Let the next visit to the video look LRCLIB up again.
        const drop = ['publishDraft'];
        if (draft?.videoId) drop.push('c:' + draft.videoId);
        await chrome.storage.local.remove(drop);
        show($('msg'), L('✅ Đã gửi lên LRCLIB. Cảm ơn bạn! Lời sẽ có trong kết quả tìm kiếm sau ít phút.'), 'ok');
        $('prog').hidden = true;
        return;
      }
      const err = await res.json().catch(() => ({}));
      if (res.status === 503 || err.name === 'IncorrectPublishTokenError') {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    throw new Error(L('LRCLIB đang quá tải, thử lại sau.'));
  } catch (err) {
    show($('msg'), L('Gửi không thành công: ') + (err?.message || err), 'err');
    $('send').disabled = !$('agree').checked;
  }
  $('prog').hidden = true;
}

(async () => {
  BYL.setLang((await chrome.storage.sync.get({ uiLang: 'auto' })).uiLang);
  BYL.localizePage();
  ({ publishDraft: draft } = await chrome.storage.local.get('publishDraft'));
  if (!draft?.syncedLyrics) return ($('empty').hidden = false);
  $('form').hidden = false;
  $('track').value = draft.trackName || '';
  $('artist').value = draft.artistName || '';
  $('album').value = draft.albumName || '';
  $('duration').value = draft.duration || '';
  $('synced').value = draft.syncedLyrics;
  checkExisting();
  for (const id of ['track', 'artist', 'duration']) $(id).addEventListener('change', checkExisting);
  $('agree').addEventListener('change', () => ($('send').disabled = !$('agree').checked));
  $('form').addEventListener('submit', send);
  $('cancel').addEventListener('click', async () => {
    await chrome.storage.local.remove('publishDraft');
    window.close();
  });
})();
