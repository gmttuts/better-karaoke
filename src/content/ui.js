'use strict';

// Side panel (next to the video), karaoke overlay (on the video) and the
// floating lyric window (Document Picture-in-Picture). All of them live in
// shadow roots so YouTube's CSS can't reach in, and every piece of text from
// comments or websites goes in through textContent.
BYL.ui = (() => {
  const S = BYL.SOURCES;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const state = {
    videoId: null,
    song: null,
    channel: '', // channel name, for styles pinned to a channel (📌)
    duration: 0,
    candidates: [],
    current: null,
    manual: false,
    offset: 0,
    anchor: null, // plain lyrics: { i, time } the user tapped
    // Timed lyrics: per-candidate sync points [{ t, d, auto? }]. A line at
    // lyric time t plays at t + offset + d, with d interpolated between points,
    // so one part of the song can be fixed without throwing off the rest.
    warps: {},
    trans: null, // candidate shown as a second language under each line
    transMap: null, // cache: { c, m: { lineIndex: text } }
    sourceStatus: {},
    overlayOn: false,
    karaokeLoadedFor: null,
    lastActive: -2,
    userScrollUntil: 0,
  };

  let panelHost;
  const P = {}; // panel element refs, filled in by buildPanel
  let O = null; // renderer on the video
  let F = null; // renderer in the floating window
  let pipWin = null;

  const PANEL_CSS = BYL.PANEL_CSS;
  const { BASE_LOOK, PAD_KEYS, padOf, FONTS, loadFont, compose, OVERLAY_CSS, paintLook } = BYL.look;

  // The look in use comes from a slot: the channel's own one when the user
  // pinned a style to this channel (📌), else the global one.
  // slot = { style, look } where look holds the 🎨 edits (or null).
  const chanSlot = () => (state.channel && BYL.settings.value.channelStyles?.[state.channel]) || null;
  const slot = () => chanSlot() || { style: BYL.settings.value.overlayStyle, look: BYL.settings.value.overlayLook };
  const currentLook = () => compose(slot().style, slot().look);
  // Change the slot in use. persist: false only updates memory (sliders).
  function setSlot(patch, persist = true) {
    const ch = chanSlot();
    if (ch) {
      const all = { ...BYL.settings.value.channelStyles, [state.channel]: { ...ch, ...patch } };
      if (!persist) return void (BYL.settings.value.channelStyles = all);
      return BYL.settings.set({ channelStyles: all });
    }
    const g = {};
    if ('style' in patch) g.overlayStyle = patch.style;
    if ('look' in patch) g.overlayLook = patch.look;
    if (!persist) return void Object.assign(BYL.settings.value, g);
    return BYL.settings.set(g);
  }

  // ---------- mounting ----------

  const waitFor = (sel, timeout = 15000) =>
    new Promise((resolve) => {
      const found = document.querySelector(sel);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const n = document.querySelector(sel);
        if (n) {
          obs.disconnect();
          resolve(n);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(sel));
      }, timeout);
    });

  async function mount() {
    const shorts = BYL.isShorts();
    const parent = shorts
      ? (await waitFor('#shorts-player')) && document.body
      : (await waitFor('#secondary')) && (document.querySelector('#secondary-inner') || document.querySelector('#secondary'));
    if (!parent) return false;
    if (!panelHost) buildPanel();
    panelHost.toggleAttribute('data-float', shorts);
    if (shorts) {
      if (panelHost.parentElement !== parent) parent.append(panelHost);
      placeFloat();
    } else {
      panelHost.style.left = panelHost.style.right = panelHost.style.width = '';
      if (panelHost.parentElement !== parent) parent.prepend(panelHost);
    }
    panelHost.hidden = false;
    startLoop();
    return true;
  }

  // Shorts: sit right of the video's action buttons when there's room,
  // otherwise in the top-right corner.
  function placeFloat() {
    if (!panelHost?.hasAttribute('data-float')) return;
    const r = BYL.playerEl()?.getBoundingClientRect();
    const left = r && r.width ? r.right + 88 : 0;
    const room = window.innerWidth - left - 16;
    const s = panelHost.style;
    if (left && room >= 300) {
      s.left = left + 'px';
      s.right = 'auto';
      s.width = Math.min(400, room) + 'px';
    } else {
      s.left = 'auto';
      s.right = '16px';
      s.width = '320px';
    }
  }
  window.addEventListener('resize', placeFloat);

  // YouTube sometimes rebuilds the side column and drops the panel with it,
  // which left the lyrics frozen on the video with no button to turn them off.
  async function remount() {
    if (!panelHost || panelHost.hidden || panelHost.isConnected || remounting) return;
    remounting = true;
    try {
      if (await mount()) setOverlay(state.overlayOn, false);
    } finally {
      remounting = false;
    }
  }
  let remounting = false;

  // After the extension is updated or reloaded, the copy already running in
  // an open tab can't reach chrome.* any more and keeps the old look. Say so
  // instead of letting it look like the update didn't work.
  function stale() {
    if (!P || P.wrap.querySelector('.stale')) return;
    const bar = el('div', 'stale');
    const go = el('button', 'primary', L('Tải lại trang'));
    go.addEventListener('click', () => location.reload());
    bar.append(el('span', '', L('🔄 Better Lyric vừa được cập nhật. Tải lại trang để dùng bản mới.')), go);
    P.wrap.querySelector('.body').prepend(bar);
    P.wrap.classList.remove('collapsed');
  }

  function hide() {
    if (panelHost) panelHost.hidden = true;
    if (O) O.host.remove();
    if (pipWin) pipWin.close();
  }

  // ---------- panel ----------

  function buildPanel() {
    panelHost = el('div');
    panelHost.id = 'byl-panel-host';
    const root = panelHost.attachShadow({ mode: 'open' });
    // Typing in our inputs must not reach YouTube's hotkeys (t = theatre,
    // k = pause, m = mute…): from outside the shadow root the key looks like
    // it was pressed on a plain div, so YouTube treats it as a shortcut.
    for (const type of ['keydown', 'keypress', 'keyup']) {
      root.addEventListener(type, (e) => {
        const t = e.composedPath()[0];
        if (t?.matches?.('input[type=text], textarea, [contenteditable]')) e.stopPropagation();
      });
    }
    const style = el('style');
    style.textContent = PANEL_CSS;
    root.append(style);

    const wrap = el('div', 'byl');
    const header = el('header');
    const song = el('div', 'song');
    const songTitle = el('b', '', 'Better Lyric');
    const songArtist = el('span', '', L('Đang tìm lời bài hát…'));
    song.append(songTitle, songArtist);
    const favBtn = el('button', 'fav', '☆');
    favBtn.title = L('Thêm vào bài yêu thích (xem ở tab "Đã xem")');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.videoId) return;
      const on = !favBtn.classList.contains('on');
      paintFav(on);
      BYL.history.setFav(state.videoId, on);
    });
    header.append(el('span', 'logo', '🎤'), song, favBtn, el('span', 'chev', '▾'));
    header.title = 'Better YouTube Lyric v' + chrome.runtime.getManifest().version;

    const body = el('div', 'body');
    const nav = el('nav');
    const tabLyric = el('button', 'on', L('Lời bài hát'));
    const tabKaraoke = el('button', '', L('Bản Karaoke'));
    const tabHistory = el('button', '', L('Đã xem'));
    nav.append(tabLyric, tabKaraoke, tabHistory);

    // Lyric tab
    const lyricTab = el('div');
    const status = el('div', 'status');
    const row1 = el('div', 'row');
    const select = el('select');
    const overlayBtn = el('button', '', '🎤 Karaoke');
    overlayBtn.title = L('Hiện lời chữ to trên video (dùng được cả khi toàn màn hình)');
    const pipBtn = el('button', '', L('⧉ Cửa sổ nổi'));
    pipBtn.title = L('Mở lời trong một cửa sổ nhỏ luôn nằm trên cùng, kéo đi đâu cũng được (kể cả khi chuyển tab)');
    const scoreBtn = el('button', '', '🎙');
    scoreBtn.title = L('Chấm điểm khi hát (cần micro, nên đeo tai nghe)');
    scoreBtn.addEventListener('click', () => BYL.score.open());
    row1.append(select, overlayBtn, pipBtn, scoreBtn);

    const rowT = el('div', 'row');
    const transSel = el('select');
    transSel.title = L('Hiện thêm một bản lời khác (thường là lời dịch) dưới mỗi dòng');
    const swapBtn = el('button', '', '⇅');
    swapBtn.title = L('Đổi chỗ lời chính và lời dịch');
    rowT.append(el('span', 'muted', L('🌐 Song ngữ')), transSel, swapBtn);

    const row2 = el('div', 'row');
    const syncBtn = el('button', 'sync', L('🎯 Tự canh theo phụ đề'));
    syncBtn.title = L('Khớp lời với phụ đề YouTube của video để lời tự chạy đúng nhịp');
    const minus = el('button', '', '−0.5s');
    const offLabel = el('span', 'off', '0.0s');
    const plus = el('button', '', '+0.5s');
    minus.title = L('Lời hiện sớm hơn (giữ Shift: 0.1s)');
    plus.title = L('Lời hiện muộn hơn (giữ Shift: 0.1s)');
    offLabel.title = L('Bấm để đưa về 0 và bỏ các mốc 📍');
    const offWrap = el('span', 'offwrap');
    const pinCount = el('span', 'muted', '');
    offWrap.append(pinCount, el('span', 'muted', L('Lệch')), minus, offLabel, plus);
    row2.append(syncBtn, offWrap);

    const row3 = el('div', 'row');
    const lookSel = el('select', 'look');
    lookSel.title = L('Kiểu chữ trên video và cửa sổ nổi');
    const fontDown = el('button', '', 'A−');
    const fontUp = el('button', '', 'A+');
    fontDown.title = fontUp.title = L('Cỡ chữ');
    const posBtn = el('button', '', '');
    posBtn.title = L('Đặt lời ở trên hoặc dưới video (tránh che chữ có sẵn trong video)');
    const studioBtn = el('button', '', '🎨');
    studioBtn.title = L('Tuỳ chỉnh màu, phông, viền, nền… và lưu thành preset');
    const chanBtn = el('button', 'chan', '📌');
    row3.append(el('span', 'muted', L('Kiểu chữ')), lookSel, fontDown, fontUp, posBtn, studioBtn, chanBtn);

    const studio = el('div', 'studio');
    studio.hidden = true;

    const row4 = el('div', 'row links');
    const copy = el('button', '', L('Sao chép'));
    const open = el('a', 'muted', L('Mở nguồn ↗'));
    open.target = '_blank';
    open.rel = 'noopener';
    const editBtn = el('button', '', L('✏️ Sửa lời'));
    editBtn.title = L('Sửa lời đang hiện, hoặc tự nhập / dịch lời. Bản sửa được nhớ cho video này.');
    const tapBtn = el('button', '', L('⏱ Gõ nhịp'));
    tapBtn.title = L('Phát bài và bấm Space mỗi khi bắt đầu hát một dòng: ghi thời gian chính xác cho từng dòng');
    const againBtn = el('button', '', L('↻ Tìm lại'));
    againBtn.title = L('Kết quả tìm được lưu lại để mở video nhanh hơn. Bấm để tìm lại từ đầu ở mọi nguồn.');
    againBtn.addEventListener('click', () => api.onSearchAgain?.());
    const findBtn = el('button', '', L('🔍 Tìm theo tên'));
    findBtn.title = L('Tên bài hoặc ca sĩ bị đoán sai? Tự gõ lại rồi tìm');
    const exportBtn = el('button', '', L('⬇ Xuất'));
    exportBtn.title = L('Lưu lời ra file .lrc / .srt (giữ thời gian bạn đã canh), hoặc gửi lên LRCLIB');
    row4.append(editBtn, tapBtn, findBtn, copy, exportBtn, againBtn, open);

    // Manual search: the title/artist typed here replace the guess from the
    // video title, are remembered for this video, and every source runs again.
    const findRow = el('form', 'row findrow');
    findRow.hidden = true;
    const fTitle = el('input');
    const fArtist = el('input');
    fTitle.type = fArtist.type = 'text';
    fTitle.placeholder = L('Tên bài');
    fArtist.placeholder = L('Ca sĩ');
    fTitle.maxLength = fArtist.maxLength = 120;
    const fGo = el('button', 'primary', L('Tìm'));
    fGo.type = 'submit';
    const fUndo = el('button', '', L('Dùng tên tự đoán'));
    fUndo.type = 'button';
    findRow.append(fTitle, fArtist, fGo, fUndo);
    const openFind = () => {
      findRow.hidden = !findRow.hidden;
      findBtn.classList.toggle('on', !findRow.hidden);
      if (findRow.hidden) return;
      fTitle.value = state.song?.title || '';
      fArtist.value = state.song?.artist || '';
      fUndo.hidden = !state.song?.manual;
      fTitle.focus();
    };
    findBtn.addEventListener('click', openFind);
    findRow.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = fTitle.value.trim();
      if (!title) return fTitle.focus();
      findRow.hidden = true;
      findBtn.classList.remove('on');
      api.onSearchSong?.({ title, artist: fArtist.value.trim() });
    });
    fUndo.addEventListener('click', () => {
      findRow.hidden = true;
      findBtn.classList.remove('on');
      api.onSearchSong?.(null);
    });

    const exportRow = el('div', 'row exports');
    exportRow.hidden = true;
    const lrcBtn = el('button', '', '⬇ File LRC');
    lrcBtn.title = L('Lời có thời gian cho trình phát nhạc (foobar, VLC, Poweramp…)');
    const srtBtn = el('button', '', '⬇ File SRT');
    srtBtn.title = L('Phụ đề cho video (VLC, CapCut, Premiere, tải lên YouTube Studio…)');
    const assBtn = el('button', '', '⬇ File ASS');
    assBtn.title = L('Phụ đề karaoke giữ đúng kiểu chữ 🎨 (màu, viền, khung, chữ chạy). Dùng với VLC, CapCut, Aegisub hoặc ffmpeg để ghép cứng vào video của bạn.');
    const pubBtn = el('button', '', L('☁ Gửi lên LRCLIB'));
    pubBtn.title = L('Chia sẻ lời có thời gian lên thư viện mở LRCLIB để người khác dùng. Sẽ hỏi lại trước khi gửi.');
    exportRow.append(el('span', 'muted', L('Xuất lời')), lrcBtn, srtBtn, assBtn, pubBtn);
    exportBtn.addEventListener('click', () => {
      exportRow.hidden = !exportRow.hidden;
      exportBtn.classList.toggle('on', !exportRow.hidden);
    });
    lrcBtn.addEventListener('click', () => exportFile('lrc'));
    srtBtn.addEventListener('click', () => exportFile('srt'));
    assBtn.addEventListener('click', () => exportFile('ass'));
    pubBtn.addEventListener('click', publishLrclib);

    const tapbar = el('div', 'tapbar');
    tapbar.hidden = true;

    const editor = el('div', 'editor');
    editor.hidden = true;

    const warn = el('div', 'warn');
    const note = el('div', 'note');
    const lines = el('div', 'lines');
    const grip = el('div', 'grip');
    grip.title = L('Kéo để thu gọn / mở rộng khung lời (nháy đúp để về mặc định)');
    lyricTab.append(findRow, status, row1, rowT, row2, row3, studio, warn, note, editor, tapbar, lines, grip, row4, exportRow);
    makeResizable(lines, grip);

    // Karaoke tab
    const karaokeTab = el('div');
    karaokeTab.hidden = true;
    const kchips = el('div', 'row');
    const klist = el('div', 'klist');
    karaokeTab.append(kchips, klist);

    // History tab
    const historyTab = el('div');
    historyTab.hidden = true;
    const hFilter = el('div', 'row');
    const hAll = el('button', 'on', L('Tất cả'));
    const hFav = el('button', '', L('★ Yêu thích'));
    const hClear = el('button', 'danger', L('Xoá lịch sử'));
    hClear.title = L('Xoá các bài đã xem, giữ lại bài yêu thích');
    hFilter.append(hAll, hFav, hClear);
    const hlist = el('div', 'klist');
    historyTab.append(hFilter, hlist);
    hAll.addEventListener('click', () => ((state.favOnly = false), renderHistory()));
    hFav.addEventListener('click', () => ((state.favOnly = true), renderHistory()));
    hClear.addEventListener('click', async () => {
      await BYL.history.clear();
      renderHistory();
    });

    body.append(nav, lyricTab, karaokeTab, historyTab);
    wrap.append(header, body);
    root.append(wrap);

    Object.assign(P, { wrap, songTitle, songArtist, status, select, overlayBtn, pipBtn, offLabel, warn, lines, open, kchips, klist,
      row2, row3, row4, favBtn, hlist, hAll, hFav, tabHistory, historyTab, lookSel, posBtn, studioBtn, chanBtn, studio, note, syncBtn, editor, grip, pinCount, rowT, transSel, swapBtn,
      tapBtn, tapbar });
    editBtn.addEventListener('click', () => openEditor());
    tapBtn.addEventListener('click', () => (tapping() ? stopTap(false) : startTap()));
    transSel.addEventListener('change', () => {
      const id = transSel.value;
      if (id === 'roman') return state.current && romanTrans(state.current, true);
      setTrans(state.candidates.find((x) => x.id === id) || (state.trans?.id === id ? state.trans : null), true);
    });
    swapBtn.addEventListener('click', () => state.trans && choose(state.trans, true));

    syncBtn.addEventListener('click', () => state.current && autoSync(state.current, false));
    header.addEventListener('click', () => {
      wrap.classList.toggle('collapsed');
      BYL.settings.set({ panelCollapsed: wrap.classList.contains('collapsed') });
    });
    const tabs = [
      [tabLyric, lyricTab],
      [tabKaraoke, karaokeTab, loadKaraoke],
      [tabHistory, historyTab, renderHistory],
    ];
    for (const [btn, pane, onShow] of tabs) {
      btn.addEventListener('click', () => {
        for (const [b, p] of tabs) {
          b.classList.toggle('on', b === btn);
          p.hidden = p !== pane;
        }
        onShow?.();
      });
    }
    select.addEventListener('change', () => {
      const c = state.candidates.find((x) => x.id === select.value);
      if (c) choose(c, true);
    });
    overlayBtn.addEventListener('click', () => setOverlay(!state.overlayOn, true));
    pipBtn.addEventListener('click', togglePip);
    minus.addEventListener('click', (e) => nudge(e.shiftKey ? -0.1 : -0.5));
    plus.addEventListener('click', (e) => nudge(e.shiftKey ? 0.1 : 0.5));
    offLabel.addEventListener('click', clearSync);
    fontDown.addEventListener('click', () => setFont(-4));
    fontUp.addEventListener('click', () => setFont(4));
    lookSel.addEventListener('change', () => {
      if (!lookSel.value) return;
      setSlot({ style: lookSel.value, look: null });
      refreshLook();
      if (!studio.hidden) buildStudio();
      // Show the change on this video; "Tự bật lời trên video" stays as set.
      if (!state.overlayOn && !F) setOverlay(true, false);
    });
    chanBtn.addEventListener('click', () => {
      const ch = state.channel;
      if (!ch) return;
      const all = { ...BYL.settings.value.channelStyles };
      if (all[ch]) delete all[ch];
      else all[ch] = { ...slot() };
      BYL.settings.set({ channelStyles: all });
      refreshLook();
      if (!studio.hidden) buildStudio();
      say(all[ch] ? L('📌 Kênh "{0}" giờ có kiểu chữ riêng. Đổi kiểu hay chỉnh 🎨 lúc này chỉ áp dụng cho kênh này.', ch) : L('Kênh "{0}" dùng lại kiểu chữ chung.', ch));
    });
    posBtn.addEventListener('click', () => {
      BYL.settings.set({ overlayPosition: BYL.settings.value.overlayPosition === 'top' ? 'bottom' : 'top' });
      refreshLook();
    });
    studioBtn.addEventListener('click', () => {
      studio.hidden = !studio.hidden;
      studioBtn.classList.toggle('on', !studio.hidden);
      if (!studio.hidden) {
        buildStudio();
        if (!state.overlayOn && !F) setOverlay(true, false);
      }
    });
    copy.addEventListener('click', async () => {
      if (!state.current) return;
      try {
        await navigator.clipboard.writeText(BYL.lyricsText(state.current.lines));
        copy.textContent = L('Đã chép ✓');
      } catch {
        copy.textContent = L('Không chép được');
      }
      setTimeout(() => (copy.textContent = L('Sao chép')), 1500);
    });
    lines.addEventListener('wheel', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    lines.addEventListener('touchmove', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    lines.addEventListener('click', (e) => {
      const ln = e.target.closest('.ln');
      if (!ln || !ln.dataset.i) return;
      if (tapping()) tapJump(Number(ln.dataset.i));
      else if (e.target.closest('.pin')) pinLine(Number(ln.dataset.i));
      else onLineClick(Number(ln.dataset.i));
    });
    renderLookSelect();
  }

  // Drag the grip under the lyric list to make it taller or shorter.
  function makeResizable(box, grip) {
    const apply = (h) => {
      box.style.height = h ? h + 'px' : '';
      box.style.maxHeight = h ? 'none' : '';
    };
    apply(BYL.settings.value.linesHeight);
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      const y0 = e.clientY;
      const h0 = box.getBoundingClientRect().height;
      const move = (ev) => apply(Math.round(Math.max(80, Math.min(window.innerHeight * 0.9, h0 + ev.clientY - y0))));
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        BYL.settings.set({ linesHeight: Math.round(box.getBoundingClientRect().height) });
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    });
    grip.addEventListener('dblclick', () => {
      apply(0);
      BYL.settings.set({ linesHeight: 0 });
    });
  }

  const applyTheme = () => {
    // YouTube marks dark mode with <html dark>; its CSS variables already
    // follow it, this only nudges contrast for the list background.
    P.wrap.style.setProperty('--bg', document.documentElement.hasAttribute('dark') ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)');
  };

  // ---------- style picker + 🎨 editor ----------

  function renderLookSelect() {
    const sel = P.lookSel;
    const v = BYL.settings.value;
    sel.replaceChildren();
    const add = (parent, value, text) => {
      const o = el('option', '', text);
      o.value = value;
      parent.append(o);
    };
    if (slot().look) add(sel, '', L('✎ Đang tuỳ chỉnh'));
    const builtIn = el('optgroup');
    builtIn.label = L('Có sẵn');
    for (const [k, p] of Object.entries(BYL.LOOKS)) add(builtIn, k, p.name);
    sel.append(builtIn);
    const mine = v.overlayPresets || [];
    if (mine.length) {
      const g = el('optgroup');
      g.label = L('Preset của bạn');
      for (const p of mine) add(g, 'u:' + p.name, '★ ' + p.name);
      sel.append(g);
    }
    sel.value = slot().look ? '' : slot().style;
    if (sel.selectedIndex < 0) sel.value = 'red';
    P.posBtn.textContent = v.overlayPosition === 'top' ? L('⬆ Trên') : L('⬇ Dưới');
    const pinned = !!chanSlot();
    P.chanBtn.hidden = !state.channel;
    P.chanBtn.classList.toggle('on', pinned);
    P.chanBtn.title = pinned
      ? L('Kênh "{0}" đang dùng kiểu chữ riêng. Bấm để dùng lại kiểu chung.', state.channel)
      : L('Ghi nhớ kiểu chữ này riêng cho kênh "{0}"', state.channel);
  }

  // Re-apply the look everywhere after a settings change.
  function refreshLook() {
    renderLookSelect();
    for (const R of [O, F]) if (R) paintLook(R.host, currentLook());
    sizeAll();
    state.lastActive = -2; // rebuild lines (layout may have changed)
  }

  let saveTimer;
  function editLook(patch, persist) {
    const look = { ...currentLook(), ...patch };
    setSlot({ look }, false);
    if (persist) {
      // chrome.storage.sync has a write quota; sliders only save on release.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => setSlot({ look: slot().look }), 300);
    }
    refreshLook();
  }

  function buildStudio() {
    const box = P.studio;
    box.replaceChildren();
    const look = currentLook();
    const sections = [];
    let grid;
    const section = (title) => {
      const s = el('section');
      s.append(el('h4', '', title));
      grid = el('div', 'grid');
      s.append(grid);
      sections.push(s);
    };
    const row = (label, ...ctl) => {
      const c = el('div', 'ctl');
      c.append(...ctl.flat());
      grid.append(el('span', 'lbl', label), c);
      return c;
    };
    const pick = (key, options) => {
      const s = el('select');
      for (const [v, t] of options) {
        const o = el('option', '', L(t));
        o.value = v;
        s.append(o);
      }
      s.value = String(look[key]);
      s.addEventListener('change', () => editLook({ [key]: typeof BASE_LOOK[key] === 'number' ? Number(s.value) : s.value }, true));
      return s;
    };
    // Segmented buttons for short option lists.
    const seg = (key, options, after) => {
      const g = el('div', 'seg');
      for (const [v, t] of options) {
        const b = el('button', String(look[key]) === v ? 'on' : '', t);
        b.addEventListener('click', () => {
          if (String(look[key]) === v) return;
          editLook({ [key]: v }, true);
          after ? after() : buildStudio();
        });
        g.append(b);
      }
      return g;
    };
    const color = (key, title) => {
      const c = el('input', 'swatch');
      c.type = 'color';
      c.value = look[key] || look.sung;
      c.title = title;
      c.addEventListener('input', () => editLook({ [key]: c.value }, false));
      c.addEventListener('change', () => editLook({ [key]: c.value }, true));
      return c;
    };
    const range = (key, min, max, unit = '%', value = look[key]) => {
      const w = el('div', 'range');
      const r = el('input');
      r.type = 'range';
      r.min = min;
      r.max = max;
      r.value = value;
      const val = el('span', 'val');
      const show = () => {
        val.textContent = r.value + unit;
        r.style.setProperty('--fill', ((r.value - min) / (max - min)) * 100 + '%');
      };
      show();
      r.addEventListener('input', () => {
        show();
        editLook({ [key]: Number(r.value) }, false);
      });
      r.addEventListener('change', () => editLook({ [key]: Number(r.value) }, true));
      // Double-click: back to the chosen style's value (padding: the shape's).
      r.title = L('Nháy đúp để về mặc định');
      r.addEventListener('dblclick', () => {
        const def = compose(slot().style)[key];
        editLook({ [key]: def }, true);
        r.value = PAD_KEYS.includes(key) ? padOf(currentLook(), key) : def;
        show();
      });
      w.append(r, val);
      return w;
    };
    const toggle = (checked, text, onChange) => {
      const l = el('label', 'tg');
      const c = el('input');
      c.type = 'checkbox';
      c.checked = checked;
      c.addEventListener('change', () => onChange(c.checked));
      l.append(c, el('span', '', text));
      return l;
    };
    const flag = (key, text) => toggle(!!look[key], text, (on) => editLook({ [key]: on }, true));

    section(L('Chữ'));
    row(L('Phông'), pick('font', FONTS));
    row(L('Độ đậm'), pick('weight', [['400', L('Thường')], ['600', L('Vừa')], ['700', L('Đậm')], ['800', L('Rất đậm')], ['900', L('Đen')]]));
    row(L('Cỡ chữ'), range('scale', 50, 160));
    row(L('Hiệu ứng'), seg('wipe', [['word', L('Chạy từng chữ')], ['line', L('Sáng cả dòng')]]));

    section(L('Màu'));
    row(L('Chưa hát'), color('text', L('Màu chữ chưa hát')), flag('textGrad', L('Ánh bạc')));
    // Gradient: switch on to fade the sung colour into a second one.
    const sung2 = color('sung2', L('Màu thứ hai của dải chuyển màu'));
    sung2.hidden = !look.sung2;
    row(
      L('Đã hát'),
      color('sung', L('Màu chữ đã hát')),
      toggle(!!look.sung2, L('Chuyển màu'), (on) => {
        sung2.hidden = !on;
        editLook({ sung2: on ? sung2.value : '' }, true);
      }),
      sung2
    );
    row(L('Viền'), color('stroke', L('Màu viền')), color('sstroke', L('Màu viền khi đã hát')), range('strokeW', 0, 30, ''));
    row(L('Bóng'), flag('shadow', L('Đổ bóng')));

    section(L('Nền'));
    // A new shape starts from its own padding.
    const reshape = () => {
      editLook(Object.fromEntries(PAD_KEYS.map((k) => [k, undefined])), true);
      buildStudio();
    };
    row(L('Kiểu'), seg('shape', [['none', L('Không')], ['box', L('Khung')], ['pill', L('Viên')], ['band', L('Dải ngang')], ['lines', L('Từng dòng')]], reshape));
    if (look.shape !== 'none') {
      row(L('Màu nền'), color('bg', L('Màu nền')), range('bgAlpha', 0, 100));
      // Padding sliders follow the shape's default until the user moves them.
      const pads = el('div', 'pads');
      for (const [k, text] of [['padT', L('Trên')], ['padB', L('Dưới')], ['padL', L('Trái')], ['padR', L('Phải')]]) {
        const p = el('div', 'pad');
        p.title = L('Lề {0} trong khung, tính theo cỡ chữ', text.toLowerCase());
        p.append(el('span', 'muted', text), range(k, 0, 200, '%', padOf(look, k)));
        pads.append(p);
      }
      row(L('Lề trong'), pads);
    }

    section(L('Bố cục'));
    row(L('Số dòng'), pick('layout', [['stagger', L('So le 2 dòng')], ['center2', L('Dòng hát + dòng kế')], ['three', L('3 dòng')], ['single', L('Một dòng')]]));
    row(L('Dòng phụ'), range('nextScale', 40, 100));
    row(L('Cách mép'), range('margin', 2, 40));

    const presets = el('div', 'presets');
    const name = el('input');
    name.type = 'text';
    name.placeholder = L('Tên preset…');
    name.maxLength = 24;
    const save = el('button', 'primary', L('Lưu preset'));
    const reset = el('button', '', L('Bỏ chỉnh'));
    reset.title = L('Quay về kiểu đang chọn, bỏ các chỉnh sửa');
    const del = el('button', 'danger', L('Xoá preset'));
    const style = slot().style;
    del.hidden = !style?.startsWith('u:');
    if (style?.startsWith('u:')) name.value = style.slice(2);
    save.addEventListener('click', async () => {
      const n = name.value.trim() || 'Preset ' + ((BYL.settings.value.overlayPresets || []).length + 1);
      const list = (BYL.settings.value.overlayPresets || []).filter((p) => p.name !== n);
      list.push({ name: n, look: currentLook() });
      const ok = (await BYL.settings.set({ overlayPresets: list })) && (await setSlot({ style: 'u:' + n, look: null }));
      refreshLook();
      buildStudio();
      say(
        ok
          ? L('💾 Đã lưu preset "{0}". Chọn lại trong "Kiểu chữ" bất cứ lúc nào.', n)
          : L('⚠ Không lưu được preset "{0}" vào trình duyệt. Preset vẫn dùng được đến khi tải lại trang.', n)
      );
    });
    reset.addEventListener('click', () => {
      setSlot({ look: null });
      refreshLook();
      buildStudio();
    });
    del.addEventListener('click', () => {
      const list = (BYL.settings.value.overlayPresets || []).filter((p) => 'u:' + p.name !== style);
      BYL.settings.set({ overlayPresets: list });
      setSlot({ style: 'classic', look: null });
      refreshLook();
      buildStudio();
    });
    presets.append(name, save, reset, del);
    box.append(...sections, presets);
  }

  // ---------- state changes ----------

  const say = (t) => (P.note.textContent = t);

  function reset({ videoId, saved }) {
    // Caption helpers belong to the previous video until main.js sets new ones.
    api.hasCaptions = null;
    api.captionWordsFor = null;
    Object.assign(state, {
      videoId,
      song: null,
      channel: '',
      duration: 0,
      candidates: [],
      current: null,
      manual: false,
      offset: saved?.offset || 0,
      anchor: null,
      warps: saved?.warps || {},
      trans: null,
      transMap: null,
      sourceStatus: {},
      karaokeLoadedFor: null,
      lastActive: -2,
      waitingFor: null, // source the user clicked to load
    });
    applyTheme();
    renderLookSelect();
    P.wrap.classList.toggle('collapsed', !!BYL.settings.value.panelCollapsed);
    paintFav(false);
    P.songTitle.textContent = 'Better Lyric';
    P.songArtist.textContent = L('Đang tìm lời bài hát…');
    P.status.replaceChildren();
    P.select.replaceChildren();
    P.warn.textContent = '';
    P.note.textContent = '';
    P.klist.replaceChildren();
    P.kchips.replaceChildren();
    P.offLabel.textContent = fmtOffset(state.offset);
    closeEditor();
    endTap();
    renderLines();
    // The user's own lyrics come back first, then whatever they last picked.
    const mine = CUSTOM_SLOTS.filter((id) => saved?.[id]?.text).map((id) => customCandidate(saved[id].text, saved[id].label, id));
    for (const m of mine) if (baseId(saved.pick) !== m.id) state.candidates.push(m);
    if (saved?.trans) {
      state.trans = mine.find((m) => m.id === saved.trans.id) || saved.trans;
      if (!state.candidates.some((x) => x.id === state.trans.id)) state.candidates.push(state.trans);
    }
    if (saved?.pick) {
      // Picks saved before ">>" (caption speaker marks) were cleaned out.
      saved.pick.lines = saved.pick.lines.map((l) => (l.text?.includes('>>') ? { ...l, text: BYL.makeLine(l.text).text } : l));
      state.candidates.push(saved.pick);
    }
    const first = saved?.pick || mine[0];
    renderSelect();
    if (first) {
      choose(first, false);
      state.manual = true;
    }
    if (mine.length) setSourceStatus('custom', 'ok', mine.length);
    setOverlay(!!BYL.settings.value.overlayOnByDefault, false);
    pipTitle();
  }

  function setSong(song, duration, channel) {
    state.song = song;
    state.channel = channel || '';
    refreshLook();
    state.duration = duration || 0;
    P.songTitle.textContent = song.title || L('Không rõ tên bài');
    P.songArtist.textContent = (song.manual ? '✎ ' : '') + (song.artist || '');
    P.songArtist.title = song.manual ? L('Tên bạn đã sửa bằng 🔍 Tìm theo tên') : '';
    pipTitle();
    remember(song);
  }

  function setSourceStatus(key, status, count = 0) {
    state.sourceStatus[key] = status;
    let chip = P.status.querySelector(`[data-k="${key}"]`);
    if (!chip) {
      chip = el('button', 'chip');
      chip.dataset.k = key;
      chip.addEventListener('click', () => onChip(key));
      P.status.append(chip);
    }
    const s = S[key];
    chip.className = 'chip ' + status + (state.current?.source === key ? ' cur' : '');
    const tail = { ok: ` ${count}`, none: ' –', error: ' ⚠', idle: ' ▸' }[status] || '';
    chip.textContent = `${s.icon} ${s.name}${tail}`;
    // The user asked for this source (onChip): tell them how it went.
    if (state.waitingFor === key && status !== 'loading') {
      state.waitingFor = null;
      const found = state.candidates.find((c) => c.source === key);
      if (status === 'ok' && found) {
        choose(found, true);
        say(L('{0} {1}: đã tải xong.', s.icon, s.name));
      } else if (status === 'error') say(L('{0} {1}: lỗi khi tải. Bấm chip để thử lại.', s.icon, s.name));
      else say(key === 'transcript' ? L('Video này không có phụ đề, hoặc YouTube không cho tải phụ đề lúc này.') : L('{0} không có lời cho bài này.', s.name));
    }
    chip.title =
      {
        loading: L('Đang tìm…'),
        ok: count > 1 ? L('Có {0} kết quả. Bấm để xem, bấm tiếp để đổi kết quả khác', count) : L('Bấm để xem lời từ nguồn này'),
        none: L('Nguồn này không có lời cho bài này'),
        error: L('Lỗi khi tìm. Bấm để thử lại'),
        idle: L('Bấm để tải (dùng khi các nguồn khác không đúng)'),
      }[status];
    maybeAutoPick();
  }

  // Source chips: show that source's lyrics; clicking again cycles through
  // its results; idle/failed sources load (again).
  function onChip(key) {
    const st = state.sourceStatus[key];
    const name = S[key].name;
    if (st === 'idle' || st === 'error') {
      say(L('Đang tìm lời từ {0}…', name));
      state.waitingFor = key;
      return api.onLoadSource?.(key);
    }
    if (st === 'loading') return say(L('Đang tìm lời từ {0}, chờ chút…', name));
    const list = state.candidates.filter((c) => c.source === key);
    if (!list.length) return say(L('{0} không có lời cho bài này.', name));
    const at = list.indexOf(state.current);
    choose(list[(at + 1) % list.length], true);
    if (list.length > 1) say(L('{0} {1}: kết quả {2}/{3}. Bấm chip lần nữa để xem kết quả khác.', S[key].icon, name, list.indexOf(state.current) + 1, list.length));
  }

  function markChips() {
    for (const chip of P.status.children) chip.classList.toggle('cur', state.current?.source === chip.dataset.k);
  }

  const rank = (c) => [
    BYL.settings.value.preferSynced && !c.synced ? 1 : 0,
    S[c.source]?.priority ?? 9,
    -(c.score || 0),
  ];
  const cmp = (a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  };

  function addCandidates(list) {
    for (const c of list) if (!state.candidates.some((x) => x.id === c.id)) state.candidates.push(c);
    state.candidates.sort(cmp);
    renderSelect();
    maybeAutoPick();
  }

  function maybeAutoPick() {
    if (state.manual || !state.candidates.length) {
      if (!state.candidates.length && Object.values(state.sourceStatus).every((s) => s !== 'loading')) renderLines();
      return;
    }
    const best = state.candidates[0];
    if (best !== state.current) choose(best, false);
  }

  function choose(c, byUser) {
    if (tapping()) stopTap(false);
    const prev = state.current;
    // Picking the translation as the main lyrics swaps the two.
    if (state.trans && baseId(state.trans) === baseId(c)) state.trans = prev && prev !== c ? prev : null;
    state.current = c;
    state.anchor = null;
    state.transMap = null;
    state.lastActive = -2;
    if (byUser) {
      state.manual = true;
      BYL.videoStore.patch(state.videoId, { pick: c, trans: state.trans });
    }
    P.select.value = c.id;
    // A Latin spelling follows the lyrics it was made from.
    if (state.trans?.romanOf && state.trans.romanOf !== c.id) romanTrans(c, false);
    renderTransSelect();
    P.warn.textContent = c.warn || '';
    P.note.textContent = '';
    P.open.hidden = !c.url;
    if (c.url) P.open.href = c.url;
    P.syncBtn.hidden = c.source === 'transcript' || !api.hasCaptions?.();
    markChips();
    renderLines();
    // Lyrics without timing, or timed lyrics that may not match this video's
    // length: try lining them up with the captions straight away.
    // Timed lyrics from elsewhere (LRCLIB is timed to the audio release) get
    // checked against this video's captions once, unless already synced.
    showPins();
    const timedElsewhere = c.synced && c.source !== 'custom' && !state.offset && !state.warps[c.id]?.length && !c.autoTried;
    if (!P.syncBtn.hidden && !c.aligned && (!c.synced || timedElsewhere)) {
      c.autoTried = true;
      autoSync(c, true);
    }
  }

  // Line the current lyrics up with the video's captions. Plain lyrics get a
  // time on every line; timed lyrics get the offset worked out for them.
  async function autoSync(c, auto) {
    const tell = (t) => state.current === c && say(t);
    if (!api.captionWordsFor || !api.hasCaptions?.()) return tell(L('Video này không có phụ đề để canh theo.'));
    if (c.syncing) return;
    c.syncing = true;
    P.syncBtn.disabled = true;
    tell(L('🎯 Đang canh lời theo phụ đề YouTube…'));
    let r = null;
    let words = null;
    try {
      words = await api.captionWordsFor(c.lines);
      r = words?.length ? BYL.alignLyrics(c.lines, words) : null;
    } catch (err) {
      console.debug('[Better Lyric] align', err);
    }
    c.syncing = false;
    P.syncBtn.disabled = false;
    if (state.current !== c) return;
    if (!words?.length) {
      return tell(L('Chưa lấy được phụ đề của video. Thử bấm "🎯 Tự canh theo phụ đề" lại sau khi video đã phát.'));
    }
    if (!r) {
      return tell(
        c.synced
          ? L('Phụ đề của video không khớp với lời này. Chỉnh "Lệch" bằng tay, hoặc bấm 📍 ở dòng đang hát.')
          : L('Phụ đề không khớp với lời này. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.')
      );
    }
    const matched = L('khớp {0}/{1} dòng', r.matchedLines, r.totalLines) + (r.wordLines ? L(', {0} dòng tô theo từng chữ', r.wordLines) : '');
    if (c.synced) {
      // Word timing from the captions, unless the lyrics brought their own.
      if (r.wordLines && !c.lines.some((l) => l.wd)) c.lines = c.lines.map((l, i) => (r.lines[i].wd ? { ...l, wd: r.lines[i].wd } : l));
      // One shift for the whole song when the captions agree on it; sync
      // points along the song when the gap changes (intro, interlude, tempo).
      const pts = warpFromAnchors(c.lines, r.anchors || []);
      const ds = pts.map((p) => p.d);
      const spread = ds.length ? Math.max(...ds) - Math.min(...ds) : 0;
      if (pts.length >= 5 && spread > 0.6) {
        state.warps[c.id] = pts;
        saveWarps();
        setOffset(0);
        tell(L('🎯 Đã canh theo phụ đề YouTube tại {0} điểm trong bài ({1}); lệch từ {2} đến {3}.', pts.length, matched, fmtOffset(Math.min(...ds)), fmtOffset(Math.max(...ds))));
      } else {
        delete state.warps[c.id];
        saveWarps();
        setOffset(r.offset);
        tell(L('🎯 Đã tự chỉnh lệch {0} theo phụ đề YouTube ({1}).', fmtOffset(r.offset), matched));
      }
      return;
    }
    const synced = { ...c, id: c.id + '#sync', synced: true, aligned: true, lines: r.lines, syncing: false };
    const at = state.candidates.indexOf(c);
    if (at >= 0) state.candidates[at] = synced;
    else state.candidates.unshift(synced);
    renderSelect();
    setOffset(0);
    choose(synced, state.manual);
    say(L('🎯 Đã canh lời theo phụ đề YouTube ({0}). Còn lệch thì bấm 📍 cạnh dòng đang hát, hoặc chỉnh "Lệch".', matched));
  }

  // Two slots for the user's own lyrics, so a translation and a re-timed
  // original can both be kept for one video.
  const CUSTOM_SLOTS = ['custom', 'custom2'];
  const baseId = (c) => String(c?.id || '').replace(/#sync$/, '');
  // Where an edit of c is saved: its own slot if it is one, otherwise the
  // slot not holding the translation shown under it.
  const slotFor = (c) => (c?.source === 'custom' && CUSTOM_SLOTS.includes(baseId(c)) ? baseId(c) : baseId(state.trans) === 'custom' ? 'custom2' : 'custom');

  // ---------- timing corrections ----------

  // d at lyric time t, interpolated between the current lyrics' sync points.
  function warpAt(t) {
    const pts = state.current && state.warps[state.current.id];
    if (!pts?.length) return 0;
    if (t <= pts[0].t) return pts[0].d;
    const last = pts[pts.length - 1];
    if (t >= last.t) return last.d;
    let k = 1;
    while (pts[k].t < t) k++;
    const a = pts[k - 1];
    const b = pts[k];
    return a.d + ((b.d - a.d) * (t - a.t)) / (b.t - a.t || 1);
  }
  // Video time at which a lyric time plays.
  const effT = (t) => t + state.offset + warpAt(t);

  // Caption anchors -> sync points, smoothed (median of 5) so one badly timed
  // caption line can't yank its neighbours.
  function warpFromAnchors(lines, anchors) {
    const raw = anchors
      .filter((a) => typeof lines[a.li]?.t === 'number')
      .map((a) => ({ t: lines[a.li].t, d: a.t - lines[a.li].t }));
    return raw.map((p, i) => {
      const win = raw.slice(Math.max(0, i - 2), i + 3).map((x) => x.d).sort((x, y) => x - y);
      return { t: p.t, d: Math.round(win[Math.floor(win.length / 2)] * 100) / 100, auto: true };
    });
  }

  function saveWarps() {
    state.transMap = null;
    for (const k of Object.keys(state.warps)) if (!state.warps[k]?.length) delete state.warps[k];
    BYL.videoStore.patch(state.videoId, { warps: state.warps });
    state.lastActive = -2;
    showPins();
    refreshTitles();
  }

  function showPins() {
    const pts = state.current && state.warps[state.current.id];
    const mine = pts ? pts.filter((p) => !p.auto).length : 0;
    P.pinCount.textContent = !pts?.length ? '' : mine ? L('📍{0} mốc', mine) : L('🎯 theo phụ đề');
    P.pinCount.title = pts?.length ? L('{0} điểm canh trong bài. Bấm số lệch để bỏ hết.', pts.length) : '';
  }

  function refreshTitles() {
    if (!state.current?.synced) return;
    for (const n of P.lines.querySelectorAll('.ln[data-i]')) {
      n.title = BYL.fmtTime(effT(state.current.lines[n.dataset.i].t));
    }
  }

  function clearSync() {
    const c = state.current;
    if (c) delete state.warps[c.id];
    saveWarps();
    setOffset(0);
    say(L('Đã bỏ chỉnh lệch và các mốc 📍 của lời này.'));
  }

  function setOffset(v) {
    state.offset = Math.round(v * 10) / 10;
    state.transMap = null;
    P.offLabel.textContent = fmtOffset(state.offset);
    P.offLabel.classList.remove('flash');
    void P.offLabel.offsetWidth; // restart the flash animation
    P.offLabel.classList.add('flash');
    state.lastActive = -2;
    refreshTitles();
    BYL.videoStore.patch(state.videoId, { offset: state.offset });
  }
  const fmtOffset = (v) => (v > 0 ? '+' : '') + v.toFixed(1) + 's';

  function nudge(d) {
    setOffset(state.offset + d);
    if (!state.current) return;
    if (!state.current.synced && !state.anchor) {
      say(L('Lời này chưa có thời gian nên chưa có gì để chỉnh lệch. Bấm vào dòng đang hát trước đã.'));
      return;
    }
    const dir = d < 0 ? L('sớm hơn {0}s', Math.abs(d)) : L('muộn hơn {0}s', d);
    say(L('Cả bài hiện {0} (tổng lệch {1}). Nếu chỉ một đoạn lệch, bấm 📍 ở dòng đang hát trong đoạn đó thay vì chỉnh cả bài.', dir, fmtOffset(state.offset)));
  }

  // 📍 on a line: "this line is being sung right now". It becomes a sync
  // point: lines around it follow, lines between two points stretch to fit,
  // and parts of the song pinned elsewhere stay as they are.
  function pinLine(i) {
    const c = state.current;
    const v = video();
    if (!c || !v) return;
    if (!c.synced) return onLineClick(i);
    const t = c.lines[i].t;
    const d = Math.round((v.currentTime - state.offset - t) * 100) / 100;
    // A hand-placed point overrides caption guesses near it.
    const pts = (state.warps[c.id] || []).filter((p) => Math.abs(p.t - t) > (p.auto ? 12 : 0.3));
    pts.push({ t, d });
    pts.sort((a, b) => a.t - b.t);
    state.warps[c.id] = pts;
    saveWarps();
    state.userScrollUntil = 0;
    const n = pts.filter((p) => !p.auto).length;
    say(
      L('📍 Đã ghim dòng này vào {0} (mốc {1}). ', BYL.fmtTime(v.currentTime), n) +
        (n === 1 ? L('Cả bài dời theo. Nếu đoạn sau vẫn lệch, ghim thêm một dòng ở đoạn đó: chỉ phần giữa hai mốc co giãn, phần đã đúng giữ nguyên.') : L('Các dòng giữa các mốc tự co giãn theo.'))
    );
  }

  function setFont(delta) {
    const fs = Math.max(18, Math.min(72, BYL.settings.value.overlayFontSize + delta));
    BYL.settings.set({ overlayFontSize: fs });
    sizeAll();
  }

  // ---------- export ----------

  // The current lyrics in video time, with the offset and 📍 points applied,
  // so the file plays in step with the video. Null for lyrics without timing.
  function timedLines() {
    const c = state.current;
    if (!c?.synced) return null;
    return c.lines.map((l) => ({ ...l, t: typeof l.t === 'number' ? Math.round(effT(l.t) * 100) / 100 : undefined }));
  }
  const noTiming = () => L('Lời này chưa có thời gian từng dòng. Bấm "🎯 Tự canh theo phụ đề" hoặc "⏱ Gõ nhịp" trước rồi xuất.');

  function exportFile(kind) {
    const lines = timedLines();
    if (!lines) return say(noTiming());
    const meta = { title: state.song?.title, artist: state.song?.artist, duration: state.duration };
    const text =
      kind === 'srt' ? BYL.exporter.toSrt(lines, state.duration) : kind === 'ass' ? assFile(lines, meta) : BYL.exporter.toLrc(lines, meta);
    BYL.exporter.download(text, BYL.exporter.fileName(meta, kind), kind !== 'lrc');
    if (kind === 'ass') return say(L('⬇ Đã lưu file .ass với kiểu chữ đang dùng. Ghép cứng vào video của bạn: ffmpeg -i video.mp4 -vf ass="{0}" video-co-loi.mp4', BYL.exporter.fileName(meta, 'ass')));
    const fixed = state.offset || state.warps[state.current.id]?.length;
    say(L('⬇ Đã lưu file .{0}', kind) + (fixed ? L(', đã tính cả độ lệch và các mốc 📍.') : '.'));
  }

  // The look, size, position and translation the overlay shows right now.
  function assFile(lines, meta) {
    const v = video();
    return BYL.exporter.toAss(lines, {
      ...meta,
      look: currentLook(),
      width: v?.videoWidth,
      height: v?.videoHeight,
      fontSize: BYL.settings.value.overlayFontSize,
      shorts: BYL.isShorts(),
      top: BYL.settings.value.overlayPosition === 'top',
      // timedLines() keeps the panel's line order, so the indexes match.
      trans: lines.map((l, i) => transFor(i)),
    });
  }

  async function publishLrclib() {
    const lines = timedLines();
    if (!lines) return say(noTiming());
    const body = lines.filter((l) => typeof l.t === 'number' && !l.section);
    try {
      await BYL.exporter.openPublish({
        videoId: state.videoId,
        trackName: state.song?.title || '',
        artistName: state.song?.artist || '',
        albumName: state.song?.album || '',
        duration: Math.round(state.duration || video()?.duration || 0),
        plainLyrics: body.map((l) => l.text).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
        syncedLyrics: BYL.toLrc(body),
      });
      say(L('☁ Đã mở trang gửi lên LRCLIB trong tab mới. Kiểm tra lại tên bài, ca sĩ rồi mới bấm gửi.'));
    } catch (err) {
      say(L('Không mở được trang gửi: ') + (err?.message || err));
    }
  }

  // ---------- rendering ----------

  function renderSelect() {
    const sel = P.select;
    sel.replaceChildren();
    for (const c of state.candidates) {
      const s = S[c.source];
      const o = el('option', '', `${s.icon} ${s.name}${c.aligned ? ' 🎯' : c.synced ? ' ⏱' : ''} · ${c.label}${c.detail ? ' · ' + c.detail : ''}`);
      o.value = c.id;
      sel.append(o);
    }
    if (state.current) sel.value = state.current.id;
    renderTransSelect();
  }

  function renderLines() {
    if (tapping()) return renderTapLines();
    const box = P.lines;
    box.replaceChildren();
    box.scrollTop = 0;
    const c = state.current;
    box.classList.toggle('synced', !!c?.synced || !!state.anchor);
    P.row2.style.display = P.row3.style.display = P.row4.style.display = c ? '' : 'none';
    renderTransSelect();
    if (!c) {
      const searching = Object.values(state.sourceStatus).some((s) => s === 'loading') || !Object.keys(state.sourceStatus).length;
      box.append(
        el(
          'div',
          'empty',
          searching
            ? L('Đang tìm lời trong comment, các bản đăng khác và các trang lời bài hát…')
            : L('Chưa tìm thấy lời cho video này. Bạn có thể tự nhập (hoặc dịch) lời, extension sẽ nhớ cho video này. Hoặc mở tab "Tìm bản Karaoke".')
        )
      );
      if (!searching) {
        const b = el('button', '', L('✍ Tự nhập lời'));
        b.addEventListener('click', () => openEditor());
        const o = el('button', '', L('🔠 Đọc chữ trên video'));
        o.title = L('Video có chữ lời bài hát trên hình? Tua nhanh video (tắt tiếng) và đọc chữ trên từng khung hình, kèm thời gian. Mất khoảng nửa thời lượng bài.');
        o.addEventListener('click', () => openEditor({ ocr: true }));
        box.lastChild.append(el('br'), b, ' ', o);
      }
      return;
    }
    if (!c.synced) {
      box.append(
        el('div', 'empty', api.hasCaptions?.()
            ? L('Lời này chưa có thời gian. Bấm "🎯 Tự canh theo phụ đề", hoặc bấm vào dòng đang hát để lời tự cuộn.')
            : L('Lời này chưa có thời gian và video không có phụ đề. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.'))
      );
    }
    c.lines.forEach((l, i) => {
      if (!l.text) {
        box.append(el('div', 'ln blank'));
        return;
      }
      const d = el('div', 'ln' + (l.section ? ' section' : ''), l.text);
      d.dataset.i = i;
      if (c.synced) {
        d.title = BYL.fmtTime(effT(l.t));
        if (!l.section) {
          const pin = el('span', 'pin', '📍');
          pin.title = L('Đang hát dòng này: canh lời ngay theo dòng này');
          d.append(pin);
        }
      }
      const tr = transFor(i);
      if (tr) d.append(el('div', 'tr', tr));
      box.append(d);
    });
  }

  // ---------- timing ----------

  const video = () => BYL.playerEl()?.querySelector('video') || document.querySelector('video');

  const singable = (lines) => lines.map((l, i) => (l.text && !l.section ? i : -1)).filter((i) => i >= 0);

  // Index of the line being sung at video time `now`, and how far through it (0..1).
  function position(now) {
    const c = state.current;
    if (!c) return { i: -1, p: 0 };
    if (c.synced) {
      const lines = c.lines;
      let i = -1;
      for (let k = 0; k < lines.length; k++) {
        if (effT(lines[k].t) <= now) i = k;
        else break;
      }
      if (i < 0) return { i: -1, p: 0, nextAt: lines[0] ? effT(lines[0].t) : 0 };
      const start = effT(lines[i].t);
      const end = lines[i + 1] ? effT(lines[i + 1].t) : start + 5;
      const dur = Math.min(Math.max(end - start, 0.5), 7);
      return { i, p: Math.min(1, (now - start) / dur), dt: now - start, dur };
    }
    if (!state.anchor) return { i: -1, p: 0 };
    // Plain lyrics: spread the remaining lines evenly over the rest of the song.
    now -= state.offset;
    const idx = singable(c.lines);
    const startPos = idx.indexOf(state.anchor.i);
    const remaining = idx.length - startPos;
    const songEnd = (state.duration || video()?.duration || 0) * 0.95;
    // A Short is a slice of the song, so its length says nothing about pace.
    const per = BYL.isShorts() ? 3.5 : Math.max(1.5, (songEnd - state.anchor.time) / Math.max(1, remaining));
    const step = Math.floor((now - state.anchor.time) / per);
    const pos = Math.max(0, Math.min(idx.length - 1, startPos + step));
    return { i: idx[pos], p: Math.max(0, Math.min(1, ((now - state.anchor.time) % per) / per)) };
  }

  function onLineClick(i) {
    const c = state.current;
    const v = video();
    if (!c || !v) return;
    if (c.synced) {
      v.currentTime = Math.max(0, effT(c.lines[i].t));
    } else {
      state.anchor = { i, time: v.currentTime - state.offset };
      P.lines.classList.add('synced');
    }
    state.userScrollUntil = 0;
    state.lastActive = -2;
  }

  let looping = false;
  let ticks = 0;
  let lastFrame = 0;
  let loopGen = 0;
  function startLoop(restart) {
    if (looping && !restart) return;
    looping = true;
    const gen = ++loopGen;
    const tick = () => {
      if (gen !== loopGen) return;
      if (!panelHost?.isConnected || panelHost.hidden) {
        looping = false;
        O?.host.remove();
        return;
      }
      try {
        // Paused: the lyrics only move on a seek or an edit, so a few
        // frames a second are plenty and spare the battery.
        const v = video();
        const t = performance.now();
        if (!v || !v.paused || t - lastFrame > 200) {
          lastFrame = t;
          frame();
        }
        if (++ticks % 30 === 0) {
          placeFloat(); // Shorts: follow the video if the layout shifts
          shortsLift();
        }
      } catch {}
      // A background tab gets no animation frames; the floating window does,
      // so let it drive the loop while it's open.
      (pipWin && !pipWin.closed ? pipWin : window).requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const renderers = () => [state.overlayOn ? O : null, F].filter(Boolean);

  function frame() {
    const v = video();
    if (v) editorTick(v.currentTime);
    if (F_TICK) F_TICK();
    if (!v || !state.current) {
      for (const R of renderers()) drawLines(R, null);
      return;
    }
    const pos = position(v.currentTime);
    if (pos.i !== state.lastActive) {
      state.lastActive = pos.i;
      P.lines.querySelectorAll('.ln.active').forEach((n) => n.classList.remove('active'));
      const li = state.current.lines[pos.i]?.src ?? pos.i; // while tapping: index in the full list
      const node = pos.i >= 0 ? P.lines.querySelector(`.ln[data-i="${li}"]`) : null;
      if (node) {
        node.classList.add('active');
        if (Date.now() > state.userScrollUntil) {
          const box = P.lines;
          box.scrollTo({ top: node.offsetTop - box.clientHeight / 2 + node.clientHeight / 2, behavior: 'smooth' });
        }
      }
      for (const R of renderers()) buildLines(R, pos);
    }
    for (const R of renderers()) drawLines(R, pos);
  }

  // ---------- second language ----------

  // Another candidate (usually a translation) shown under each line. Timed
  // against timed lyrics it is matched by time, otherwise line by line.
  function setTrans(c, persist) {
    state.trans = c && c !== state.current ? c : null;
    state.transMap = null;
    if (persist) BYL.videoStore.patch(state.videoId, { trans: state.trans });
    renderLines();
    state.lastActive = -2;
  }

  function renderTransSelect() {
    const sel = P.transSel;
    sel.replaceChildren();
    const add = (c) => {
      const o = el('option', '', c ? `${S[c.source].icon} ${c.label}${c.detail ? ' · ' + c.detail : ''}` : L('Không'));
      o.value = c ? c.id : '';
      sel.append(o);
    };
    add(null);
    // Korean / Japanese / Chinese lyrics can show their Latin spelling.
    const cur = state.current;
    const script = cur && cur.source !== 'roman' ? BYL.romanize.scriptOf(cur.lines.map((l) => l.text).join('\n')) : null;
    if (script) {
      const o = el('option', '', L('🔤 Phiên âm Latin') + ` (${{ ko: 'Hangul', ja: 'Kana', zh: 'Pinyin' }[script]})`);
      o.value = 'roman';
      sel.append(o);
    }
    const list = state.candidates.filter((c) => c !== state.current && c.id !== 'tap');
    if (state.trans && state.trans.source !== 'roman' && !list.includes(state.trans)) list.unshift(state.trans);
    list.forEach(add);
    sel.value = state.trans?.source === 'roman' ? 'roman' : state.trans?.id || '';
    P.rowT.style.display = state.current && (list.length || script) ? '' : 'none';
    P.swapBtn.hidden = !state.trans;
  }

  // The current lyrics spelt in Latin letters, as a second-language candidate.
  async function romanTrans(c, persist) {
    const r = await BYL.romanize.lines(c.lines);
    if (state.current !== c) return;
    if (!r) return setTrans(null, persist);
    setTrans({ id: 'roman', source: 'roman', label: L('Phiên âm Latin'), synced: c.synced, lines: r.lines, romanOf: c.id }, persist);
    renderTransSelect();
  }

  function transFor(i) {
    const c = state.current;
    const tr = state.trans;
    if (!c || !tr || tr === c || i < 0) return '';
    if (state.transMap?.c !== c) state.transMap = { c, m: matchTrans(c, tr) };
    return state.transMap.m[i] || '';
  }

  function matchTrans(c, tr) {
    // A Latin spelling has the very same lines.
    if (tr.romanOf) return tr.romanOf === c.id ? Object.fromEntries(c.lines.map((l, i) => [i, tr.lines[i]?.text])) : {};
    const a = singable(c.lines);
    const b = singable(tr.lines);
    const m = {};
    if (c.synced && tr.synced) {
      let hit = 0;
      for (const i of a) {
        const t = effT(c.lines[i].t);
        let best = -1;
        let gap = 2.5;
        for (const j of b) {
          const d = Math.abs(tr.lines[j].t - t);
          if (d < gap) {
            gap = d;
            best = j;
          }
        }
        if (best >= 0) {
          m[i] = tr.lines[best].text;
          hit++;
        }
      }
      if (hit >= a.length * 0.5) return m;
    }
    a.forEach((i, k) => {
      if (b[k] !== undefined) m[i] = tr.lines[b[k]].text;
    });
    return m;
  }

  // ---------- lyric renderers (on the video / floating window) ----------

  function makeRenderer(doc, pip) {
    const host = doc.createElement('div');
    host.id = pip ? 'byl-pip-host' : 'byl-overlay-host';
    if (pip) host.toggleAttribute('data-pip', true);
    const root = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = OVERLAY_CSS;
    const ov = doc.createElement('div');
    ov.className = 'ov';
    root.append(style, ov);
    const R = { host, ov, words: [], total: 0, pip };
    loadFont(doc.defaultView);
    paintLook(host, currentLook());
    return R;
  }

  const resizeWatch = new ResizeObserver(() => sizeAll());
  function ensureOverlay() {
    const player = BYL.playerEl();
    if (!player) return false;
    if (!O) O = makeRenderer(document, false);
    if (O.host.parentElement !== player) {
      player.append(O.host);
      resizeWatch.observe(player);
      paintLook(O.host, currentLook());
    }
    sizeAll();
    return true;
  }

  function sizeAll() {
    const base = BYL.settings.value.overlayFontSize * (currentLook().scale / 100);
    const player = BYL.playerEl();
    // Font scales with the player so fullscreen gets big text automatically;
    // the narrow, upright Shorts player gets its own scale.
    const ref = BYL.isShorts() ? 560 : 1280;
    if (O && player) O.host.style.fontSize = base * Math.max(0.5, player.clientWidth / ref) + 'px';
    shortsLift();
    if (F && pipWin) F.host.style.fontSize = base * Math.max(0.45, pipWin.innerWidth / 600) + 'px';
  }

  // Shorts lay the title, channel and song over the bottom of the video: keep
  // the lyrics just above that block, however tall it is for this Short.
  function shortsLift() {
    if (!O) return;
    const player = BYL.playerEl();
    if (!player || !BYL.isShorts() || BYL.settings.value.overlayPosition === 'top') {
      O.host.style.removeProperty('--lift');
      return;
    }
    const p = player.getBoundingClientRect();
    let lift = p.height * 0.15; // fallback if YouTube renames the panel
    for (const m of document.querySelectorAll('yt-reel-metapanel-view-model, ytd-reel-player-overlay-renderer #metapanel')) {
      const r = m.getBoundingClientRect();
      if (r.height && r.left < p.right && r.right > p.left && r.top > p.top + p.height / 2 && r.top < p.bottom) {
        lift = p.bottom - r.top + 8;
        break;
      }
    }
    O.host.style.setProperty('--lift', Math.round(lift) + 'px');
  }

  function setOverlay(on, byUser) {
    state.overlayOn = on;
    P.overlayBtn.classList.toggle('on', on);
    if (byUser) BYL.settings.set({ overlayOnByDefault: on });
    if (on && ensureOverlay()) {
      state.lastActive = -2; // force rebuild
    } else if (O) {
      O.host.remove();
    }
  }

  // Floating window: Document Picture-in-Picture keeps a small always-on-top
  // window with the lyrics, even when the user switches tabs or apps.
  async function togglePip() {
    if (pipWin && !pipWin.closed) {
      pipWin.close();
      return;
    }
    const dpip = window.documentPictureInPicture;
    if (!dpip) {
      say(L('Trình duyệt này chưa hỗ trợ cửa sổ nổi (cần Chrome 116 trở lên).'));
      return;
    }
    try {
      pipWin = await dpip.requestWindow({ width: 640, height: 260 });
    } catch (err) {
      say(L('Không mở được cửa sổ nổi: ') + (err?.message || err));
      return;
    }
    const d = pipWin.document;
    const css = d.createElement('style');
    css.textContent = `
      html, body { margin: 0; height: 100%; overflow: hidden; background: #0d0d12; color: #fff;
        font-family: Roboto, Arial, sans-serif; }
      body { background: radial-gradient(ellipse at top, #24203a, #0d0d12 70%); }
      .bar { position: absolute; top: 0; left: 0; right: 0; padding: 6px 10px; font-size: 12px; color: rgba(255,255,255,.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; }
      .stage { position: absolute; inset: 22px 0 0; }
      /* Player controls: shown while the mouse is over the window, like
         YouTube's own mini player. */
      .ctl { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: 18px 12px 8px;
        background: linear-gradient(transparent, rgba(0,0,0,.75)); opacity: 0; transition: opacity .2s; }
      body.show .ctl, .ctl:focus-within { opacity: 1; }
      .seek { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255,255,255,.75);
        font-variant-numeric: tabular-nums; }
      .seek input { flex: 1; accent-color: #ff2e63; margin: 0; height: 14px; cursor: pointer; }
      .btns { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 4px; }
      .btns button { font: inherit; color: #fff; background: none; border: 0; border-radius: 999px; cursor: pointer;
        width: 36px; height: 36px; font-size: 16px; display: grid; place-items: center; }
      .btns button:hover { background: rgba(255,255,255,.15); }
      .btns button.big { width: 46px; height: 46px; font-size: 22px; background: rgba(255,255,255,.12); }
      .btns svg { width: 1em; height: 1em; fill: currentColor; }`;
    const bar = d.createElement('div');
    bar.className = 'bar';
    const stage = d.createElement('div');
    stage.className = 'stage';
    d.head.append(css);
    d.body.append(bar, stage, buildPipControls(d));
    F = makeRenderer(d, true);
    F.bar = bar;
    stage.append(F.host);
    let hideTimer;
    const wake = () => {
      d.body.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => d.body.classList.remove('show'), 2500);
    };
    d.addEventListener('mousemove', wake);
    d.addEventListener('mouseleave', () => d.body.classList.remove('show'));
    // Space / arrows work in the window too.
    d.addEventListener('keydown', (e) => {
      const v = video();
      if (!v) return;
      if (tapping() && (e.key === ' ' || e.key === 'Backspace')) {
        e.preventDefault();
        return e.key === ' ' ? tap() : tapUndo();
      }
      if (e.key === ' ' || e.key === 'k') v.paused ? v.play() : v.pause();
      else if (e.key === 'ArrowLeft') v.currentTime -= 5;
      else if (e.key === 'ArrowRight') v.currentTime += 5;
      else return;
      e.preventDefault();
      wake();
    });
    pipTitle();
    sizeAll();
    pipWin.addEventListener('resize', sizeAll);
    pipWin.addEventListener('pagehide', () => {
      F = null;
      F_TICK = null;
      pipWin = null;
      P.pipBtn.classList.remove('on');
      startLoop(true); // the loop was riding on the closed window's frames
    });
    P.pipBtn.classList.add('on');
    state.lastActive = -2;
  }

  const ICON = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
    prevSong: 'M6 6h2v12H6zm3.5 6 8.5 6V6z',
    nextSong: 'M16 6h2v12h-2zM6 18l8.5-6L6 6z',
    prevLine: 'M11 18V6l-8.5 6zm.5-6 8.5 6V6z',
    nextLine: 'M4 18l8.5-6L4 6zm9-12v12l8.5-6z',
  };
  const svgIcon = (doc, name) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = doc.createElementNS(ns, 'path');
    path.setAttribute('d', ICON[name]);
    svg.append(path);
    return svg;
  };

  // Previous / next video: playlist buttons on watch pages, swipe on Shorts.
  function skipVideo(dir) {
    const v = video();
    if (BYL.isShorts()) {
      document.querySelector(`#navigation-button-${dir > 0 ? 'down' : 'up'} button`)?.click();
      return;
    }
    const btn = BYL.playerEl()?.querySelector(dir > 0 ? '.ytp-next-button' : '.ytp-prev-button');
    if (btn && getComputedStyle(btn).display !== 'none' && (dir > 0 || v?.currentTime < 3)) btn.click();
    else if (dir < 0 && v) v.currentTime = 0; // like a music player: back to the start first
    else btn?.click();
  }

  // Previous / next lyric line (timed lyrics), otherwise ±5 s.
  function skipLine(dir) {
    const v = video();
    const c = state.current;
    if (!v) return;
    if (!c?.synced) {
      v.currentTime = Math.max(0, v.currentTime + dir * 5);
      return;
    }
    const idx = singable(c.lines);
    const now = position(v.currentTime).i;
    let k = idx.indexOf(now);
    // "Previous" restarts the current line if we're well into it.
    if (dir < 0 && k >= 0 && v.currentTime - effT(c.lines[idx[k]].t) > 1.5) k += 1;
    const target = idx[Math.max(0, Math.min(idx.length - 1, (k < 0 ? (dir > 0 ? -1 : 0) : k) + dir))];
    if (target !== undefined) v.currentTime = Math.max(0, effT(c.lines[target].t) - 0.05);
  }

  function buildPipControls(d) {
    const box = d.createElement('div');
    box.className = 'ctl';
    const seek = d.createElement('div');
    seek.className = 'seek';
    const cur = d.createElement('span');
    const range = d.createElement('input');
    range.type = 'range';
    range.min = 0;
    range.max = 1000;
    range.value = 0;
    const total = d.createElement('span');
    seek.append(cur, range, total);
    const btns = d.createElement('div');
    btns.className = 'btns';
    const mk = (icon, title, fn, cls) => {
      const b = d.createElement('button');
      b.title = title;
      if (cls) b.className = cls;
      b.append(svgIcon(d, icon));
      b.addEventListener('click', fn);
      btns.append(b);
      return b;
    };
    mk('prevSong', L('Bài trước'), () => skipVideo(-1));
    mk('prevLine', L('Câu trước'), () => skipLine(-1));
    const play = mk('play', L('Phát / dừng (Space)'), () => {
      const v = video();
      if (v) v.paused ? v.play() : v.pause();
    }, 'big');
    mk('nextLine', L('Câu sau'), () => skipLine(1));
    mk('nextSong', L('Bài sau'), () => skipVideo(1));
    box.append(seek, btns);

    let dragging = false;
    range.addEventListener('input', () => {
      dragging = true;
      const v = video();
      if (v?.duration) cur.textContent = BYL.fmtTime((range.value / 1000) * v.duration);
    });
    range.addEventListener('change', () => {
      const v = video();
      if (v?.duration) v.currentTime = (range.value / 1000) * v.duration;
      dragging = false;
    });
    let wasPaused = null;
    F_TICK = () => {
      const v = video();
      if (!v) return;
      if (v.paused !== wasPaused) {
        wasPaused = v.paused;
        play.replaceChildren(svgIcon(d, v.paused ? 'play' : 'pause'));
        // Paused: keep the controls up so it's obvious how to resume.
        d.body.classList.toggle('show', v.paused || d.body.classList.contains('show'));
      }
      if (!dragging && v.duration) {
        range.value = Math.round((v.currentTime / v.duration) * 1000);
        cur.textContent = BYL.fmtTime(v.currentTime);
        total.textContent = BYL.fmtTime(v.duration);
      }
    };
    return box;
  }
  let F_TICK = null;

  function pipTitle() {
    if (!F?.bar) return;
    const s = state.song;
    F.bar.textContent = s ? `🎤 ${s.title || ''}${s.artist ? ' — ' + s.artist : ''}` : '🎤 Better Lyric';
    if (pipWin) pipWin.document.title = s?.title || 'Better Lyric';
  }

  // Break a long line in two near the middle so it doesn't run edge to edge.
  const splitAt = (words) => {
    const len = words.join('').length;
    if (len < 44) return -1;
    let best = -1;
    let acc = 0;
    words.forEach((w, i) => {
      acc += w.length;
      if (/^\s+$/.test(w) && (best < 0 || Math.abs(acc - len / 2) < Math.abs(best.acc - len / 2))) best = { i, acc };
    });
    return best < 0 ? -1 : best.i;
  };

  function wordLine(R, text, cls, track) {
    // Caption speaker marks (">>") never belong on screen, whatever the source.
    text = String(text).replace(/(^|\s)(>>+|&gt;&gt;|»)(?=\s|$)/g, ' ').trim() || '♪';
    const line = el('div', 'l ' + cls);
    const words = text.split(/(\s+)/).filter(Boolean);
    const br = R.host.dataset.layout === 'single' && !R.pip ? -1 : splitAt(words);
    const len = words.join('').length;
    // Very long lines (captions, comment paste-ups) shrink a little.
    if (len > 60) line.style.fontSize = Math.max(0.7, 60 / len) + 'em';
    let total = 0;
    words.forEach((w, i) => {
      if (i === br) {
        line.append(el('br'));
        return;
      }
      if (/^\s+$/.test(w)) {
        line.append(document.createTextNode(' '));
        return;
      }
      const span = el('span', 'w');
      span.dataset.t = w;
      span.append(el('span', 'b', w));
      if (track) {
        const f = el('span', 'f', w);
        f.setAttribute('aria-hidden', 'true');
        span.append(f);
        R.words.push({ span, start: total, end: total + w.length, p: -1 });
      }
      total += w.length;
      line.append(span);
    });
    if (track) R.total = total;
    return line;
  }

  function buildLines(R, pos) {
    if (R === O && !ensureOverlay()) return;
    const c = state.current;
    const ov = R.ov;
    ov.replaceChildren();
    R.words = [];
    R.total = 0;
    if (!c) return;
    const idx = singable(c.lines);
    if (pos.i < 0) {
      const hint = c.synced ? '♪' : L('Bấm vào dòng đang hát trong panel bên phải để bắt đầu');
      ov.append(el('div', 'l hint', hint));
      const first = c.lines[idx[0]];
      if (first && c.synced) ov.append(wordLine(R, first.text, 'next', false));
      return;
    }
    const k = idx.indexOf(pos.i);
    const prev = k > 0 ? c.lines[idx[k - 1]] : null;
    const next = k >= 0 && k < idx.length - 1 ? c.lines[idx[k + 1]] : null;
    const curLine = c.lines[pos.i];
    // Staggered karaoke alternates which side the sung line sits on.
    ov.classList.toggle('flip', k % 2 === 1);
    if (prev) ov.append(wordLine(R, prev.text, 'prev', false));
    ov.append(wordLine(R, curLine.section || !curLine.text ? '♪' : curLine.text, 'cur', true));
    const tr = transFor(pos.i);
    if (tr) {
      const line = wordLine(R, tr, 'tr', false);
      // Long lines come back with their own shrink factor: keep it relative.
      line.style.fontSize = `calc(var(--trs, .7em) * ${parseFloat(line.style.fontSize) || 1})`;
      ov.append(line);
    }
    if (next) ov.append(wordLine(R, next.text, 'next', false));
  }

  // With per-word times (enhanced LRC, auto captions) each word lights up
  // when it is sung instead of the wipe running evenly over the line.
  function wordLit(R, pos) {
    const wd = state.current?.lines[pos.i]?.wd;
    if (!wd || pos.dt === undefined || wd.length !== R.words.length) return null;
    let k = -1;
    while (k + 1 < wd.length && wd[k + 1] <= pos.dt) k++;
    if (k < 0) return 0;
    const w = R.words[k];
    const len = Math.min(Math.max((wd[k + 1] ?? pos.dur) - wd[k], 0.15), 1.5);
    return w.start + Math.min(1, (pos.dt - wd[k]) / len) * (w.end - w.start);
  }

  function drawLines(R, pos) {
    if (!pos) {
      R.ov.replaceChildren();
      return;
    }
    // Wipe through the words in proportion to how far through the line we
    // are, or light the whole line at once.
    const whole = currentLook().wipe === 'line';
    const lit = pos.i < 0 ? 0 : whole ? Infinity : wordLit(R, pos) ?? pos.p * (R.total || 1);
    for (const w of R.words) {
      const p = Math.round(Math.max(0, Math.min(1, (lit - w.start) / (w.end - w.start))) * 50) * 2;
      if (p !== w.p) {
        w.p = p;
        // Fully sung: open the clip past the right edge so the outline isn't cut.
        w.span.style.setProperty('--p', p === 100 ? '130%' : p + '%');
        w.span.classList.toggle('s', p > 0);
      }
    }
  }

  // ---------- parts in their own files ----------

  // ui-editor.js, ui-tap.js, ui-tabs.js get the state and helpers they use
  // from here. These stand-ins are hoisted, so the parts can call each other
  // and the code above can call them before they're set up.
  const parts = {};
  function customCandidate(...a) {
    return parts.editor.customCandidate(...a);
  }
  function closeEditor(...a) {
    return parts.editor.closeEditor(...a);
  }
  function editorTick(...a) {
    return parts.editor.editorTick(...a);
  }
  function openEditor(...a) {
    return parts.editor.openEditor(...a);
  }
  function saveCustom(...a) {
    return parts.editor.saveCustom(...a);
  }
  function tap(...a) {
    return parts.tap.tap(...a);
  }
  function tapJump(...a) {
    return parts.tap.tapJump(...a);
  }
  function endTap(...a) {
    return parts.tap.endTap(...a);
  }
  function tapUndo(...a) {
    return parts.tap.tapUndo(...a);
  }
  function stopTap(...a) {
    return parts.tap.stopTap(...a);
  }
  function renderTapLines(...a) {
    return parts.tap.renderTapLines(...a);
  }
  function startTap(...a) {
    return parts.tap.startTap(...a);
  }
  function tapping(...a) {
    return parts.tap.tapping(...a);
  }
  function paintFav(...a) {
    return parts.tabs.paintFav(...a);
  }
  function renderHistory(...a) {
    return parts.tabs.renderHistory(...a);
  }
  function loadKaraoke(...a) {
    return parts.tabs.loadKaraoke(...a);
  }
  function remember(...a) {
    return parts.tabs.remember(...a);
  }

  // main.js fills in onLoadSource, hasCaptions and captionWordsFor per video.
  // Keyboard shortcuts (keys.js). Each returns a short note for the toast.
  const actions = {
    overlay: () => (setOverlay(!state.overlayOn, true), state.overlayOn ? L('Lời trên video: bật') : L('Lời trên video: tắt')),
    pip: () => (togglePip(), L('Cửa sổ lời nổi')),
    nudge: (d) => (nudge(d), L('Lệch ') + fmtOffset(state.offset)),
    pin: () => {
      const v = video();
      const i = state.current && v ? position(v.currentTime).i : -1;
      if (i < 0) return L('Chưa có dòng nào đang hát');
      pinLine(i);
      return L('📍 Đã ghim dòng đang hát');
    },
    font: (d) => (setFont(d), L('Cỡ chữ ') + BYL.settings.value.overlayFontSize),
  };
  // Line being sung right now (score.js), -1 before the first one.
  const lineNow = () => {
    const v = video();
    return state.current && v ? position(v.currentTime).i : -1;
  };
  const api = { lineNow, mount, remount, stale, hide, setOverlay, reset, setSong, setSourceStatus, addCandidates, state, actions, onLoadSource: null };
  const ctx = { P, S, addCandidates, api, baseId, choose, closeEditor, effT, el, frame, maybeAutoPick, renderLines, renderSelect, saveCustom, saveWarps, say, setOffset, setSourceStatus, singable, slot, slotFor, state, stopTap, tap, tapping, video };
  for (const k of ['editor', 'tap', 'tabs']) parts[k] = BYL.uiParts[k](ctx);
  return api;
})();
