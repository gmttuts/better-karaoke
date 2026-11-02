'use strict';

// The 🎙 window: listens to the microphone, finds the pitch sung ~20 times a
// second and streams it to the YouTube tab (content/score.js), which scores
// it against the lyrics and the music and sends the results back here.
const $ = (id) => document.getElementById(id);
const tabId = Number(new URLSearchParams(location.search).get('tab'));

(async () => {
  BYL.setLang((await chrome.storage.sync.get({ uiLang: 'auto' })).uiLang);
  BYL.localizePage();

  let port;
  try {
    port = chrome.tabs.connect(tabId, { name: 'byl-score' });
  } catch {
    port = null;
  }
  if (!port) return fail(L('Không kết nối được với tab YouTube. Mở lại từ nút 🎙 trong panel.'));
  port.onDisconnect.addListener(() => fail(L('Tab YouTube đã đóng hoặc tải lại. Mở lại từ nút 🎙 trong panel.')));
  port.onMessage.addListener((m) => {
    if (m.type === 'hello') {
      if (m.song?.title) $('song').textContent = '🎙 ' + [m.song.title, m.song.artist].filter(Boolean).join(' – ');
      if (!m.timed) $('line').textContent = L('Lời này chưa có thời gian: bấm 🎯 hoặc ⏱ trong panel để chấm được theo từng dòng.');
    } else if (m.type === 'line') {
      $('total').textContent = m.total;
      $('count').textContent = L('điểm · {0} dòng', m.lines);
      $('line').textContent = L('Dòng vừa rồi: {0} · {1}', m.score, m.verdict);
    }
  });
  $('reset').addEventListener('click', () => {
    port.postMessage({ type: 'reset' });
    $('total').textContent = '–';
    $('count').textContent = L('Hát theo lời đang chạy trên video');
    $('line').textContent = '';
  });

  let stream;
  try {
    // No echo cancelling / noise suppression: they flatten a sung voice.
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (err) {
    return fail(L('Không dùng được micro: {0}. Cho phép micro cho extension rồi mở lại.', err?.message || err));
  }
  const ctx = new AudioContext();
  // Without a click in this window Chrome may keep the audio paused.
  if (ctx.state !== 'running') {
    await ctx.resume().catch(() => {});
    if (ctx.state !== 'running') {
      const go = document.createElement('button');
      go.textContent = L('▶ Bắt đầu nghe');
      document.body.insertBefore(go, $('reset'));
      await new Promise((r) => go.addEventListener('click', r, { once: true }));
      await ctx.resume();
      go.remove();
    }
  }
  const an = ctx.createAnalyser();
  an.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  setInterval(() => {
    an.getFloatTimeDomainData(buf);
    const { f0, rms } = BYL.pitch.detect(buf, ctx.sampleRate);
    $('level').style.width = Math.min(100, rms * 400) + '%';
    $('note').textContent = BYL.pitch.noteName(f0);
    try {
      port.postMessage({ type: 'frame', f0, rms });
    } catch {}
  }, 50);
})();

function fail(text) {
  const p = $('hint');
  p.textContent = text;
  p.className = 'hint err';
}
