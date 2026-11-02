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

  let panelHost, P; // P: panel element refs
  let O = null; // renderer on the video
  let F = null; // renderer in the floating window
  let pipWin = null;
  let ED = null; // lyric editor while open

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
    const go = el('button', 'primary', 'Tải lại trang');
    go.addEventListener('click', () => location.reload());
    bar.append(el('span', '', '🔄 Better Lyric vừa được cập nhật. Tải lại trang để dùng bản mới.'), go);
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
    const songArtist = el('span', '', 'Đang tìm lời bài hát…');
    song.append(songTitle, songArtist);
    const favBtn = el('button', 'fav', '☆');
    favBtn.title = 'Thêm vào bài yêu thích (xem ở tab "Đã xem")';
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
    const tabLyric = el('button', 'on', 'Lời bài hát');
    const tabKaraoke = el('button', '', 'Bản Karaoke');
    const tabHistory = el('button', '', 'Đã xem');
    nav.append(tabLyric, tabKaraoke, tabHistory);

    // Lyric tab
    const lyricTab = el('div');
    const status = el('div', 'status');
    const row1 = el('div', 'row');
    const select = el('select');
    const overlayBtn = el('button', '', '🎤 Karaoke');
    overlayBtn.title = 'Hiện lời chữ to trên video (dùng được cả khi toàn màn hình)';
    const pipBtn = el('button', '', '⧉ Cửa sổ nổi');
    pipBtn.title = 'Mở lời trong một cửa sổ nhỏ luôn nằm trên cùng, kéo đi đâu cũng được (kể cả khi chuyển tab)';
    row1.append(select, overlayBtn, pipBtn);

    const rowT = el('div', 'row');
    const transSel = el('select');
    transSel.title = 'Hiện thêm một bản lời khác (thường là lời dịch) dưới mỗi dòng';
    const swapBtn = el('button', '', '⇅');
    swapBtn.title = 'Đổi chỗ lời chính và lời dịch';
    rowT.append(el('span', 'muted', '🌐 Song ngữ'), transSel, swapBtn);

    const row2 = el('div', 'row');
    const syncBtn = el('button', 'sync', '🎯 Tự canh theo phụ đề');
    syncBtn.title = 'Khớp lời với phụ đề YouTube của video để lời tự chạy đúng nhịp';
    const minus = el('button', '', '−0.5s');
    const offLabel = el('span', 'off', '0.0s');
    const plus = el('button', '', '+0.5s');
    minus.title = 'Lời hiện sớm hơn (giữ Shift: 0.1s)';
    plus.title = 'Lời hiện muộn hơn (giữ Shift: 0.1s)';
    offLabel.title = 'Bấm để đưa về 0 và bỏ các mốc 📍';
    const offWrap = el('span', 'offwrap');
    const pinCount = el('span', 'muted', '');
    offWrap.append(pinCount, el('span', 'muted', 'Lệch'), minus, offLabel, plus);
    row2.append(syncBtn, offWrap);

    const row3 = el('div', 'row');
    const lookSel = el('select', 'look');
    lookSel.title = 'Kiểu chữ trên video và cửa sổ nổi';
    const fontDown = el('button', '', 'A−');
    const fontUp = el('button', '', 'A+');
    fontDown.title = fontUp.title = 'Cỡ chữ';
    const posBtn = el('button', '', '');
    posBtn.title = 'Đặt lời ở trên hoặc dưới video (tránh che chữ có sẵn trong video)';
    const studioBtn = el('button', '', '🎨');
    studioBtn.title = 'Tuỳ chỉnh màu, phông, viền, nền… và lưu thành preset';
    const chanBtn = el('button', 'chan', '📌');
    row3.append(el('span', 'muted', 'Kiểu chữ'), lookSel, fontDown, fontUp, posBtn, studioBtn, chanBtn);

    const studio = el('div', 'studio');
    studio.hidden = true;

    const row4 = el('div', 'row links');
    const copy = el('button', '', 'Sao chép');
    const open = el('a', 'muted', 'Mở nguồn ↗');
    open.target = '_blank';
    open.rel = 'noopener';
    const editBtn = el('button', '', '✏️ Sửa lời');
    editBtn.title = 'Sửa lời đang hiện, hoặc tự nhập / dịch lời. Bản sửa được nhớ cho video này.';
    const tapBtn = el('button', '', '⏱ Gõ nhịp');
    tapBtn.title = 'Phát bài và bấm Space mỗi khi bắt đầu hát một dòng: ghi thời gian chính xác cho từng dòng';
    const againBtn = el('button', '', '↻ Tìm lại');
    againBtn.title = 'Kết quả tìm được lưu lại để mở video nhanh hơn. Bấm để tìm lại từ đầu ở mọi nguồn.';
    againBtn.addEventListener('click', () => api.onSearchAgain?.());
    const findBtn = el('button', '', '🔍 Tìm theo tên');
    findBtn.title = 'Tên bài hoặc ca sĩ bị đoán sai? Tự gõ lại rồi tìm';
    const exportBtn = el('button', '', '⬇ Xuất');
    exportBtn.title = 'Lưu lời ra file .lrc / .srt (giữ thời gian bạn đã canh), hoặc gửi lên LRCLIB';
    row4.append(editBtn, tapBtn, findBtn, copy, exportBtn, againBtn, open);

    // Manual search: the title/artist typed here replace the guess from the
    // video title, are remembered for this video, and every source runs again.
    const findRow = el('form', 'row findrow');
    findRow.hidden = true;
    const fTitle = el('input');
    const fArtist = el('input');
    fTitle.type = fArtist.type = 'text';
    fTitle.placeholder = 'Tên bài';
    fArtist.placeholder = 'Ca sĩ';
    fTitle.maxLength = fArtist.maxLength = 120;
    const fGo = el('button', 'primary', 'Tìm');
    fGo.type = 'submit';
    const fUndo = el('button', '', 'Dùng tên tự đoán');
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
    lrcBtn.title = 'Lời có thời gian cho trình phát nhạc (foobar, VLC, Poweramp…)';
    const srtBtn = el('button', '', '⬇ File SRT');
    srtBtn.title = 'Phụ đề cho video (VLC, CapCut, Premiere, tải lên YouTube Studio…)';
    const pubBtn = el('button', '', '☁ Gửi lên LRCLIB');
    pubBtn.title = 'Chia sẻ lời có thời gian lên thư viện mở LRCLIB để người khác dùng. Sẽ hỏi lại trước khi gửi.';
    exportRow.append(el('span', 'muted', 'Xuất lời'), lrcBtn, srtBtn, pubBtn);
    exportBtn.addEventListener('click', () => {
      exportRow.hidden = !exportRow.hidden;
      exportBtn.classList.toggle('on', !exportRow.hidden);
    });
    lrcBtn.addEventListener('click', () => exportFile('lrc'));
    srtBtn.addEventListener('click', () => exportFile('srt'));
    pubBtn.addEventListener('click', publishLrclib);

    const tapbar = el('div', 'tapbar');
    tapbar.hidden = true;

    const editor = el('div', 'editor');
    editor.hidden = true;

    const warn = el('div', 'warn');
    const note = el('div', 'note');
    const lines = el('div', 'lines');
    const grip = el('div', 'grip');
    grip.title = 'Kéo để thu gọn / mở rộng khung lời (nháy đúp để về mặc định)';
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
    const hAll = el('button', 'on', 'Tất cả');
    const hFav = el('button', '', '★ Yêu thích');
    const hClear = el('button', 'danger', 'Xoá lịch sử');
    hClear.title = 'Xoá các bài đã xem, giữ lại bài yêu thích';
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

    P = { wrap, songTitle, songArtist, status, select, overlayBtn, pipBtn, offLabel, warn, lines, open, kchips, klist,
      row2, row3, row4, favBtn, hlist, hAll, hFav, tabHistory, historyTab, lookSel, posBtn, studioBtn, chanBtn, studio, note, syncBtn, editor, grip, pinCount, rowT, transSel, swapBtn,
      tapBtn, tapbar };
    editBtn.addEventListener('click', () => openEditor());
    tapBtn.addEventListener('click', () => (TAP ? stopTap(false) : startTap()));
    transSel.addEventListener('change', () => {
      const id = transSel.value;
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
      say(all[ch] ? `📌 Kênh "${ch}" giờ có kiểu chữ riêng. Đổi kiểu hay chỉnh 🎨 lúc này chỉ áp dụng cho kênh này.` : `Kênh "${ch}" dùng lại kiểu chữ chung.`);
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
        copy.textContent = 'Đã chép ✓';
      } catch {
        copy.textContent = 'Không chép được';
      }
      setTimeout(() => (copy.textContent = 'Sao chép'), 1500);
    });
    lines.addEventListener('wheel', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    lines.addEventListener('touchmove', () => (state.userScrollUntil = Date.now() + 4000), { passive: true });
    lines.addEventListener('click', (e) => {
      const ln = e.target.closest('.ln');
      if (!ln || !ln.dataset.i) return;
      if (TAP) tapJump(Number(ln.dataset.i));
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
    if (slot().look) add(sel, '', '✎ Đang tuỳ chỉnh');
    const builtIn = el('optgroup');
    builtIn.label = 'Có sẵn';
    for (const [k, p] of Object.entries(BYL.LOOKS)) add(builtIn, k, p.name);
    sel.append(builtIn);
    const mine = v.overlayPresets || [];
    if (mine.length) {
      const g = el('optgroup');
      g.label = 'Preset của bạn';
      for (const p of mine) add(g, 'u:' + p.name, '★ ' + p.name);
      sel.append(g);
    }
    sel.value = slot().look ? '' : slot().style;
    if (sel.selectedIndex < 0) sel.value = 'red';
    P.posBtn.textContent = v.overlayPosition === 'top' ? '⬆ Trên' : '⬇ Dưới';
    const pinned = !!chanSlot();
    P.chanBtn.hidden = !state.channel;
    P.chanBtn.classList.toggle('on', pinned);
    P.chanBtn.title = pinned
      ? `Kênh "${state.channel}" đang dùng kiểu chữ riêng. Bấm để dùng lại kiểu chung.`
      : `Ghi nhớ kiểu chữ này riêng cho kênh "${state.channel}"`;
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
        const o = el('option', '', t);
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
      r.title = 'Nháy đúp để về mặc định';
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

    section('Chữ');
    row('Phông', pick('font', FONTS));
    row('Độ đậm', pick('weight', [['400', 'Thường'], ['600', 'Vừa'], ['700', 'Đậm'], ['800', 'Rất đậm'], ['900', 'Đen']]));
    row('Cỡ chữ', range('scale', 50, 160));
    row('Hiệu ứng', seg('wipe', [['word', 'Chạy từng chữ'], ['line', 'Sáng cả dòng']]));

    section('Màu');
    row('Chưa hát', color('text', 'Màu chữ chưa hát'), flag('textGrad', 'Ánh bạc'));
    // Gradient: switch on to fade the sung colour into a second one.
    const sung2 = color('sung2', 'Màu thứ hai của dải chuyển màu');
    sung2.hidden = !look.sung2;
    row(
      'Đã hát',
      color('sung', 'Màu chữ đã hát'),
      toggle(!!look.sung2, 'Chuyển màu', (on) => {
        sung2.hidden = !on;
        editLook({ sung2: on ? sung2.value : '' }, true);
      }),
      sung2
    );
    row('Viền', color('stroke', 'Màu viền'), color('sstroke', 'Màu viền khi đã hát'), range('strokeW', 0, 30, ''));
    row('Bóng', flag('shadow', 'Đổ bóng'));

    section('Nền');
    // A new shape starts from its own padding.
    const reshape = () => {
      editLook(Object.fromEntries(PAD_KEYS.map((k) => [k, undefined])), true);
      buildStudio();
    };
    row('Kiểu', seg('shape', [['none', 'Không'], ['box', 'Khung'], ['pill', 'Viên'], ['band', 'Dải ngang'], ['lines', 'Từng dòng']], reshape));
    if (look.shape !== 'none') {
      row('Màu nền', color('bg', 'Màu nền'), range('bgAlpha', 0, 100));
      // Padding sliders follow the shape's default until the user moves them.
      const pads = el('div', 'pads');
      for (const [k, text] of [['padT', 'Trên'], ['padB', 'Dưới'], ['padL', 'Trái'], ['padR', 'Phải']]) {
        const p = el('div', 'pad');
        p.title = `Lề ${text.toLowerCase()} trong khung, tính theo cỡ chữ`;
        p.append(el('span', 'muted', text), range(k, 0, 200, '%', padOf(look, k)));
        pads.append(p);
      }
      row('Lề trong', pads);
    }

    section('Bố cục');
    row('Số dòng', pick('layout', [['stagger', 'So le 2 dòng'], ['center2', 'Dòng hát + dòng kế'], ['three', '3 dòng'], ['single', 'Một dòng']]));
    row('Dòng phụ', range('nextScale', 40, 100));
    row('Cách mép', range('margin', 2, 40));

    const presets = el('div', 'presets');
    const name = el('input');
    name.type = 'text';
    name.placeholder = 'Tên preset…';
    name.maxLength = 24;
    const save = el('button', 'primary', 'Lưu preset');
    const reset = el('button', '', 'Bỏ chỉnh');
    reset.title = 'Quay về kiểu đang chọn, bỏ các chỉnh sửa';
    const del = el('button', 'danger', 'Xoá preset');
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
          ? `💾 Đã lưu preset "${n}". Chọn lại trong "Kiểu chữ" bất cứ lúc nào.`
          : `⚠ Không lưu được preset "${n}" vào trình duyệt. Preset vẫn dùng được đến khi tải lại trang.`
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
    });
    applyTheme();
    renderLookSelect();
    P.wrap.classList.toggle('collapsed', !!BYL.settings.value.panelCollapsed);
    paintFav(false);
    P.songTitle.textContent = 'Better Lyric';
    P.songArtist.textContent = 'Đang tìm lời bài hát…';
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
    P.songTitle.textContent = song.title || 'Không rõ tên bài';
    P.songArtist.textContent = (song.manual ? '✎ ' : '') + (song.artist || '');
    P.songArtist.title = song.manual ? 'Tên bạn đã sửa bằng 🔍 Tìm theo tên' : '';
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
    chip.title =
      {
        loading: 'Đang tìm…',
        ok: count > 1 ? `Có ${count} kết quả. Bấm để xem, bấm tiếp để đổi kết quả khác` : 'Bấm để xem lời từ nguồn này',
        none: 'Nguồn này không có lời cho bài này',
        error: 'Lỗi khi tìm. Bấm để thử lại',
        idle: 'Bấm để tải (dùng khi các nguồn khác không đúng)',
      }[status];
    maybeAutoPick();
  }

  // Source chips: show that source's lyrics; clicking again cycles through
  // its results; idle/failed sources load (again).
  function onChip(key) {
    const st = state.sourceStatus[key];
    const name = S[key].name;
    if (st === 'idle' || st === 'error') {
      say(`Đang tìm lời từ ${name}…`);
      return api.onLoadSource?.(key);
    }
    if (st === 'loading') return say(`Đang tìm lời từ ${name}, chờ chút…`);
    const list = state.candidates.filter((c) => c.source === key);
    if (!list.length) return say(`${name} không có lời cho bài này.`);
    const at = list.indexOf(state.current);
    choose(list[(at + 1) % list.length], true);
    if (list.length > 1) say(`${S[key].icon} ${name}: kết quả ${list.indexOf(state.current) + 1}/${list.length}. Bấm chip lần nữa để xem kết quả khác.`);
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
    if (TAP) stopTap(false);
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
    if (!api.captionWordsFor || !api.hasCaptions?.()) return tell('Video này không có phụ đề để canh theo.');
    if (c.syncing) return;
    c.syncing = true;
    P.syncBtn.disabled = true;
    tell('🎯 Đang canh lời theo phụ đề YouTube…');
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
      return tell('Chưa lấy được phụ đề của video. Thử bấm "🎯 Tự canh theo phụ đề" lại sau khi video đã phát.');
    }
    if (!r) {
      return tell(
        c.synced
          ? 'Phụ đề của video không khớp với lời này. Chỉnh "Lệch" bằng tay, hoặc bấm 📍 ở dòng đang hát.'
          : 'Phụ đề không khớp với lời này. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.'
      );
    }
    const matched = `khớp ${r.matchedLines}/${r.totalLines} dòng` + (r.wordLines ? `, ${r.wordLines} dòng tô theo từng chữ` : '');
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
        tell(`🎯 Đã canh theo phụ đề YouTube tại ${pts.length} điểm trong bài (${matched}); lệch từ ${fmtOffset(Math.min(...ds))} đến ${fmtOffset(Math.max(...ds))}.`);
      } else {
        delete state.warps[c.id];
        saveWarps();
        setOffset(r.offset);
        tell(`🎯 Đã tự chỉnh lệch ${fmtOffset(r.offset)} theo phụ đề YouTube (${matched}).`);
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
    say(`🎯 Đã canh lời theo phụ đề YouTube (${matched}). Còn lệch thì bấm 📍 cạnh dòng đang hát, hoặc chỉnh "Lệch".`);
  }

  // ---------- editing lyrics ----------

  // Two slots for the user's own lyrics, so a translation and a re-timed
  // original can both be kept for one video.
  const CUSTOM_SLOTS = ['custom', 'custom2'];
  const baseId = (c) => String(c?.id || '').replace(/#sync$/, '');
  // Where an edit of c is saved: its own slot if it is one, otherwise the
  // slot not holding the translation shown under it.
  const slotFor = (c) => (c?.source === 'custom' && CUSTOM_SLOTS.includes(baseId(c)) ? baseId(c) : baseId(state.trans) === 'custom' ? 'custom2' : 'custom');

  // Text with [mm:ss] stamps on most lines is timed; anything else is plain.
  function customCandidate(text, label, id = 'custom') {
    const rows = text.split('\n').filter((l) => l.trim());
    const stamped = rows.filter((l) => /^\s*\[\d{1,2}:\d{2}/.test(l)).length;
    const synced = rows.length > 0 && stamped >= rows.length * 0.5;
    return {
      id,
      source: 'custom',
      label: label || 'Bản đã sửa',
      synced,
      lines: synced ? BYL.parseLrc(text) : BYL.plainLines(text),
      score: 1000,
    };
  }

  function openEditor() {
    const box = P.editor;
    if (!box.hidden) return closeEditor();
    if (TAP) stopTap(false);
    const c = state.current;
    box.replaceChildren();
    const tip = el(
      'div',
      'tip',
      'Sửa trực tiếp, mỗi câu một dòng, để trống một dòng giữa các đoạn. Giữ [phút:giây] ở đầu dòng để giữ thời gian (lời dịch vẫn chạy đúng nhịp). ' +
        'Lời không có thời gian sẽ tự canh theo phụ đề nếu khớp, không thì bấm vào dòng đang hát.'
    );
    const ta = el('textarea');
    ta.spellcheck = false;
    ta.placeholder = 'Dán hoặc gõ lời bài hát vào đây…';
    // Timed lyrics are written with the current offset folded in.
    ta.value = c ? (c.synced ? BYL.toLrc(c.lines.map((l) => (l.t === undefined ? l : { ...l, t: effT(l.t) }))) : BYL.lyricsText(c.lines)) : '';
    const mirror = el('div', 'mirror');
    const taWrap = el('div', 'tawrap');
    taWrap.append(mirror, ta);

    const search = el('div', 'row esearch');
    const q = el('input');
    q.type = 'text';
    q.placeholder = '🔎 Tìm trong lời (gõ không dấu cũng được)…';
    const count = el('span', 'muted', '');
    const up = el('button', '', '↑');
    const down = el('button', '', '↓');
    up.title = 'Kết quả trước (Shift+Enter)';
    down.title = 'Kết quả sau (Enter)';
    search.append(q, count, up, down);

    const tools = el('div', 'row');
    const stamp = el('button', '', '📍 Gắn giờ đang phát');
    stamp.title = 'Ghi thời gian video hiện tại vào đầu dòng có con trỏ rồi xuống dòng kế. Vừa nghe vừa bấm để canh lời (phím tắt: Ctrl/⌘ + Enter)';
    const followBox = el('label');
    const follow = el('input');
    follow.type = 'checkbox';
    follow.checked = true;
    followBox.append(follow, 'Cuộn theo nhạc');
    followBox.title = 'Tô và cuộn tới dòng đang phát';
    tools.append(stamp, followBox, el('span', 'muted', 'Nháy đúp một dòng có giờ để tua tới đó'));

    const row = el('div', 'row');
    const save = el('button', 'on', '💾 Lưu lời');
    const cancel = el('button', '', 'Huỷ');
    const fromCaps = el('button', '', '📝 Lấy khung từ phụ đề');
    fromCaps.title = 'Điền lời từ phụ đề YouTube kèm thời gian, bạn chỉ cần sửa chữ (hoặc thay bằng lời dịch)';
    fromCaps.hidden = !api.hasCaptions?.();
    const del = el('button', '', '🗑 Xoá bản của bạn');
    del.hidden = c?.source !== 'custom';
    row.append(save, cancel, fromCaps, del);
    box.append(tip, search, taWrap, tools, row);
    box.hidden = false;
    P.lines.hidden = true;
    P.grip.hidden = true;

    ED = { ta, mirror, q, count, follow, stamps: [], cur: -1, hits: [], hit: -1, quietUntil: 0 };
    paintEditor();
    ta.focus();

    ta.addEventListener('input', () => {
      ED.quietUntil = Date.now() + 3000;
      paintEditor();
    });
    ta.addEventListener('scroll', () => (mirror.scrollTop = ta.scrollTop));
    ta.addEventListener('wheel', () => (ED.quietUntil = Date.now() + 5000), { passive: true });
    new ResizeObserver(() => ED?.ta === ta && fitMirror()).observe(ta);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        stampLine();
      }
    });
    ta.addEventListener('dblclick', () => {
      const i = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
      const t = ED.stamps[i];
      const v = video();
      if (t != null && v) v.currentTime = t;
    });
    stamp.addEventListener('click', stampLine);
    q.addEventListener('input', () => {
      paintEditor();
      jumpHit(0);
    });
    q.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      jumpHit(ED.hit + (e.shiftKey ? -1 : 1));
    });
    up.addEventListener('click', () => jumpHit(ED.hit - 1));
    down.addEventListener('click', () => jumpHit(ED.hit + 1));

    save.addEventListener('click', () =>
      saveCustom(ta.value, c?.source === 'custom' ? c.label : c ? 'Sửa từ ' + S[c.source].name : 'Tự nhập', slotFor(c))
    );
    cancel.addEventListener('click', closeEditor);
    del.addEventListener('click', () => {
      const slot = slotFor(c);
      state.candidates = state.candidates.filter((x) => baseId(x) !== slot);
      if (baseId(state.trans) === slot) state.trans = null;
      BYL.videoStore.patch(state.videoId, { [slot]: null, pick: null, trans: state.trans });
      const left = state.candidates.filter((x) => x.source === 'custom').length;
      if (left) setSourceStatus('custom', 'ok', left);
      else {
        delete state.sourceStatus.custom;
        P.status.querySelector('[data-k="custom"]')?.remove();
      }
      state.manual = false;
      state.current = null;
      closeEditor();
      renderSelect();
      maybeAutoPick();
      if (!state.current) renderLines();
      say('Đã xoá bản lời của bạn cho video này.');
    });
    fromCaps.addEventListener('click', () => {
      const t = state.candidates.find((x) => x.source === 'transcript');
      if (t) {
        ta.value = BYL.toLrc(t.lines);
        paintEditor();
        return;
      }
      fromCaps.disabled = true;
      fromCaps.textContent = 'Đang tải phụ đề…';
      api.onLoadSource?.('transcript');
      // The transcript source reports back through addCandidates; poll briefly.
      let tries = 0;
      const wait = setInterval(() => {
        const got = state.candidates.find((x) => x.source === 'transcript');
        if (got || ++tries > 40 || state.sourceStatus.transcript === 'none' || state.sourceStatus.transcript === 'error') {
          clearInterval(wait);
          fromCaps.disabled = false;
          fromCaps.textContent = '📝 Lấy khung từ phụ đề';
          if (got && ED?.ta === ta) {
            ta.value = BYL.toLrc(got.lines);
            paintEditor();
          } else if (!got) say('Không lấy được phụ đề của video này.');
        }
      }, 250);
    });
  }

  function closeEditor() {
    ED = null;
    P.editor.hidden = true;
    P.editor.replaceChildren();
    P.lines.hidden = false;
    P.grip.hidden = false;
  }

  const STAMP_RE = /^\s*\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*/;

  // Text folded for search (no accents, lower case) with a map back to the
  // original positions, so hits can be painted on the original text.
  const foldMap = (str) => {
    let f = '';
    const at = [];
    for (let i = 0; i < str.length; i++) {
      for (const ch of BYL.fold(str[i])) {
        f += ch;
        at.push(i);
      }
    }
    return { f, at };
  };

  // Lay the text out again behind the textarea with highlights.
  function paintEditor() {
    const { ta, mirror, q, count } = ED;
    const rows = ta.value.split('\n');
    const needle = BYL.fold(q.value.trim());
    ED.stamps = rows.map((l) => {
      const m = l.match(STAMP_RE);
      return m ? Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number('0.' + m[3]) : 0) : null;
    });
    ED.hits = [];
    const frag = document.createDocumentFragment();
    rows.forEach((line, i) => {
      const d = el('div');
      if (i === ED.cur) d.className = 'now';
      let from = 0;
      if (needle) {
        const { f, at } = foldMap(line);
        for (let k = f.indexOf(needle); k >= 0; k = f.indexOf(needle, k + needle.length)) {
          const s = at[k];
          const e = at[k + needle.length - 1] + 1;
          if (s < from) continue;
          d.append(line.slice(from, s));
          const m = el('mark', '', line.slice(s, e));
          d.append(m);
          ED.hits.push({ row: i, mark: m });
          from = e;
        }
      }
      d.append(line.slice(from) || (from ? '' : ' '));
      frag.append(d);
    });
    mirror.replaceChildren(frag);
    ED.hit = Math.min(ED.hit, ED.hits.length - 1);
    count.textContent = needle ? (ED.hits.length ? `${Math.max(1, ED.hit + 1)}/${ED.hits.length}` : '0 kết quả') : '';
    fitMirror();
  }

  // The textarea's scrollbar narrows its text box; the mirror must match.
  function fitMirror() {
    const { ta, mirror } = ED;
    mirror.style.paddingRight = 8 + Math.max(0, ta.offsetWidth - ta.clientWidth - 2) + 'px';
    mirror.scrollTop = ta.scrollTop;
  }

  function scrollEditorTo(row) {
    const d = ED.mirror.children[row];
    if (!d) return;
    ED.ta.scrollTop = Math.max(0, d.offsetTop - ED.ta.clientHeight / 3);
    ED.mirror.scrollTop = ED.ta.scrollTop;
  }

  function jumpHit(k) {
    if (!ED.hits.length) return;
    ED.hit = (k + ED.hits.length) % ED.hits.length;
    ED.hits.forEach((h, i) => h.mark.classList.toggle('cur', i === ED.hit));
    ED.count.textContent = `${ED.hit + 1}/${ED.hits.length}`;
    ED.quietUntil = Date.now() + 8000; // don't let "follow the music" scroll away
    scrollEditorTo(ED.hits[ED.hit].row);
  }

  // 📍 Put the current video time at the start of the caret's line, then move
  // to the next line: listen and tap along to time a translation.
  function stampLine() {
    const ta = ED.ta;
    const v = video();
    if (!v) return;
    const text = ta.value;
    const start = text.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let end = text.indexOf('\n', start);
    if (end < 0) end = text.length;
    const line = BYL.lrcStamp(v.currentTime) + ' ' + text.slice(start, end).replace(STAMP_RE, '');
    ta.setRangeText(line, start, end, 'end');
    const next = Math.min(ta.value.length, start + line.length + 1);
    ta.focus();
    ta.setSelectionRange(next, next);
    ED.quietUntil = 0;
    paintEditor();
  }

  // Called every frame while the editor is open: mark the line playing now.
  function editorTick(now) {
    let best = -1;
    ED.stamps.forEach((t, i) => {
      if (t != null && t <= now + 0.05 && (best < 0 || t >= ED.stamps[best])) best = i;
    });
    if (best === ED.cur) return;
    ED.mirror.children[ED.cur]?.classList.remove('now');
    ED.cur = best;
    if (best < 0) return;
    ED.mirror.children[best]?.classList.add('now');
    if (ED.follow.checked && Date.now() > ED.quietUntil) scrollEditorTo(best);
  }

  function saveCustom(text, label, slot = 'custom') {
    text = String(text || '').replace(/\r/g, '').trim();
    if (!text) return say('Chưa có lời để lưu.');
    const c = customCandidate(text, label, slot);
    state.candidates = state.candidates.filter((x) => baseId(x) !== slot);
    state.candidates.unshift(c);
    BYL.videoStore.patch(state.videoId, { [slot]: { text, label } });
    closeEditor();
    // Timed text already has the offset and sync points folded in.
    delete state.warps[slot];
    delete state.warps[slot + '#sync'];
    saveWarps();
    setOffset(0);
    choose(c, true);
    renderSelect();
    setSourceStatus('custom', 'ok', state.candidates.filter((x) => x.source === 'custom').length);
    if (!P.note.textContent) say('💾 Đã lưu lời của bạn. Lần sau mở video này sẽ hiện bản này trước.');
  }

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
    P.pinCount.textContent = !pts?.length ? '' : mine ? `📍${mine} mốc` : '🎯 theo phụ đề';
    P.pinCount.title = pts?.length ? `${pts.length} điểm canh trong bài. Bấm số lệch để bỏ hết.` : '';
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
    say('Đã bỏ chỉnh lệch và các mốc 📍 của lời này.');
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
      say('Lời này chưa có thời gian nên chưa có gì để chỉnh lệch. Bấm vào dòng đang hát trước đã.');
      return;
    }
    const dir = d < 0 ? `sớm hơn ${Math.abs(d)}s` : `muộn hơn ${d}s`;
    say(`Cả bài hiện ${dir} (tổng lệch ${fmtOffset(state.offset)}). Nếu chỉ một đoạn lệch, bấm 📍 ở dòng đang hát trong đoạn đó thay vì chỉnh cả bài.`);
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
      `📍 Đã ghim dòng này vào ${BYL.fmtTime(v.currentTime)} (mốc ${n}). ` +
        (n === 1 ? 'Cả bài dời theo. Nếu đoạn sau vẫn lệch, ghim thêm một dòng ở đoạn đó: chỉ phần giữa hai mốc co giãn, phần đã đúng giữ nguyên.' : 'Các dòng giữa các mốc tự co giãn theo.')
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
  const NO_TIMING = 'Lời này chưa có thời gian từng dòng. Bấm "🎯 Tự canh theo phụ đề" hoặc "⏱ Gõ nhịp" trước rồi xuất.';

  function exportFile(kind) {
    const lines = timedLines();
    if (!lines) return say(NO_TIMING);
    const meta = { title: state.song?.title, artist: state.song?.artist, duration: state.duration };
    const text = kind === 'srt' ? BYL.exporter.toSrt(lines, state.duration) : BYL.exporter.toLrc(lines, meta);
    BYL.exporter.download(text, BYL.exporter.fileName(meta, kind), kind === 'srt');
    const fixed = state.offset || state.warps[state.current.id]?.length;
    say(`⬇ Đã lưu file .${kind}` + (fixed ? ', đã tính cả độ lệch và các mốc 📍.' : '.'));
  }

  async function publishLrclib() {
    const lines = timedLines();
    if (!lines) return say(NO_TIMING);
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
      say('☁ Đã mở trang gửi lên LRCLIB trong tab mới. Kiểm tra lại tên bài, ca sĩ rồi mới bấm gửi.');
    } catch (err) {
      say('Không mở được trang gửi: ' + (err?.message || err));
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
    if (TAP) return renderTapLines();
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
            ? 'Đang tìm lời trong comment, các bản đăng khác và các trang lời bài hát…'
            : 'Chưa tìm thấy lời cho video này. Bạn có thể tự nhập (hoặc dịch) lời, extension sẽ nhớ cho video này. Hoặc mở tab "Tìm bản Karaoke".'
        )
      );
      if (!searching) {
        const b = el('button', '', '✍ Tự nhập lời');
        b.addEventListener('click', () => openEditor());
        box.lastChild.append(el('br'), b);
      }
      return;
    }
    if (!c.synced) {
      box.append(
        el('div', 'empty', api.hasCaptions?.()
            ? 'Lời này chưa có thời gian. Bấm "🎯 Tự canh theo phụ đề", hoặc bấm vào dòng đang hát để lời tự cuộn.'
            : 'Lời này chưa có thời gian và video không có phụ đề. Bấm vào dòng đang hát, lời sẽ tự cuộn theo nhịp ước lượng.')
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
          pin.title = 'Đang hát dòng này: canh lời ngay theo dòng này';
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
    if (ED && v) editorTick(v.currentTime);
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
      const o = el('option', '', c ? `${S[c.source].icon} ${c.label}${c.detail ? ' · ' + c.detail : ''}` : 'Không');
      o.value = c ? c.id : '';
      sel.append(o);
    };
    add(null);
    const list = state.candidates.filter((c) => c !== state.current && c.id !== 'tap');
    if (state.trans && !list.includes(state.trans)) list.unshift(state.trans);
    list.forEach(add);
    sel.value = state.trans?.id || '';
    P.rowT.style.display = state.current && list.length ? '' : 'none';
    P.swapBtn.hidden = !state.trans;
  }

  function transFor(i) {
    const c = state.current;
    const tr = state.trans;
    if (!c || !tr || tr === c || i < 0) return '';
    if (state.transMap?.c !== c) state.transMap = { c, m: matchTrans(c, tr) };
    return state.transMap.m[i] || '';
  }

  function matchTrans(c, tr) {
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

  // ---------- tap to time ----------

  // Play the song and press Space as each line starts: each press stamps the
  // next line with the video time. Saved as the user's own timed lyrics.
  let TAP = null;
  const TAP_LAG = 0.15; // presses land a little after the line starts

  function startTap() {
    const c = state.current;
    if (!c || !singable(c.lines).length) return say('Chưa có lời để gõ nhịp.');
    closeEditor();
    const lines = c.lines.map((l) => ({ text: l.text, section: l.section }));
    const idx = singable(lines);
    // Timed lyrics start from their current times; presses replace them.
    const stamps = {};
    if (c.synced) for (const i of idx) stamps[i] = effT(c.lines[i].t);
    const now = video()?.currentTime || 0;
    const ptr = idx.findIndex((i) => !(stamps[i] < now));
    TAP = { from: c, offset: state.offset, manual: state.manual, lines, idx, stamps, ptr: ptr < 0 ? idx.length : ptr };
    state.manual = true; // keep auto-pick from swapping the lyrics mid-way
    state.offset = 0; // stamps are video times
    for (const type of ['keydown', 'keypress', 'keyup']) window.addEventListener(type, onTapKey, true);

    const bar = P.tapbar;
    bar.replaceChildren();
    const tip = el('div', '', 'Phát bài và bấm Space đúng lúc bắt đầu hát dòng có viền. Backspace: lùi một dòng (video tua lại). Bấm vào một dòng để gõ lại từ đó.');
    const now2 = el('div', 'tapnow');
    const row = el('div', 'row');
    const go = el('button', 'on', '⏱ Gõ (Space)');
    const back = el('button', '', '↶ Lùi');
    const save = el('button', '', '💾 Lưu');
    const cancel = el('button', '', 'Huỷ');
    row.append(go, back, save, cancel);
    bar.append(tip, now2, row);
    bar.hidden = false;
    P.tapNow = now2;
    P.tapBtn.classList.add('on');
    go.addEventListener('click', tap);
    back.addEventListener('click', tapUndo);
    save.addEventListener('click', () => stopTap(true));
    cancel.addEventListener('click', () => stopTap(false));
    say('');
    tapRefresh();
  }

  // Space and Backspace belong to tapping while it runs, except in text fields.
  function onTapKey(e) {
    if (!TAP || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== ' ' && e.key !== 'Backspace') return;
    const t = e.composedPath()[0];
    if (t?.closest?.('input, textarea, [contenteditable=""], [contenteditable=true]')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'keydown' || e.repeat) return;
    e.key === ' ' ? tap() : tapUndo();
  }

  function tapCandidate() {
    // Stamped lines in order, then the one waiting for a press.
    const lines = [];
    TAP.idx.forEach((i, k) => {
      const t = TAP.stamps[i];
      if (t !== undefined || k === TAP.ptr) lines.push({ text: TAP.lines[i].text, t: t ?? Infinity, src: i });
    });
    return { id: 'tap', source: 'custom', label: 'Đang gõ nhịp', synced: true, lines, score: 0 };
  }

  function tapRefresh() {
    state.current = tapCandidate();
    state.transMap = null;
    state.lastActive = -2;
    renderTapLines();
  }

  function tap() {
    const v = video();
    if (!TAP || !v) return;
    if (v.paused) return v.play(); // the first press starts the song
    if (TAP.ptr >= TAP.idx.length) return;
    const t = Math.max(0, v.currentTime - TAP_LAG);
    TAP.stamps[TAP.idx[TAP.ptr]] = t;
    // Keep times in order: drop old stamps that now fall on the wrong side.
    TAP.idx.forEach((j, k) => {
      const s = TAP.stamps[j];
      if ((k > TAP.ptr && s <= t) || (k < TAP.ptr && s >= t)) delete TAP.stamps[j];
    });
    TAP.ptr++;
    tapRefresh();
  }

  function tapUndo() {
    if (!TAP || TAP.ptr <= 0) return;
    TAP.ptr--;
    const i = TAP.idx[TAP.ptr];
    const t = TAP.stamps[i];
    delete TAP.stamps[i];
    const v = video();
    if (v && t !== undefined) v.currentTime = Math.max(0, t - 3);
    tapRefresh();
  }

  function tapJump(i) {
    const k = TAP.idx.indexOf(i);
    if (k < 0) return;
    TAP.ptr = k;
    const at = TAP.stamps[i] ?? TAP.stamps[TAP.idx[k - 1]];
    const v = video();
    if (v && at !== undefined) v.currentTime = Math.max(0, at - 2);
    tapRefresh();
  }

  function renderTapLines() {
    const box = P.lines;
    const top = box.scrollTop;
    box.replaceChildren();
    box.classList.add('synced');
    P.row2.style.display = 'none';
    const next = TAP.idx[TAP.ptr];
    TAP.lines.forEach((l, i) => {
      if (!l.text) return box.append(el('div', 'ln blank'));
      const d = el('div', 'ln' + (l.section ? ' section' : '') + (i === next ? ' tapnext' : ''));
      d.dataset.i = i;
      if (!l.section) d.append(el('span', 'ts', TAP.stamps[i] === undefined ? '–' : BYL.fmtTime(TAP.stamps[i])));
      d.append(l.text);
      box.append(d);
    });
    box.scrollTop = top;
    const done = TAP.idx.filter((i) => TAP.stamps[i] !== undefined).length;
    P.tapNow.textContent =
      next === undefined
        ? `Đã gõ hết ${done} dòng. Bấm 💾 Lưu.`
        : `Dòng kế (${TAP.ptr + 1}/${TAP.idx.length}): ${TAP.lines[next].text}`;
  }

  // Leave tap mode without touching the lyrics (new video, or after save/cancel).
  function endTap() {
    if (!TAP) return null;
    const T = TAP;
    TAP = null;
    for (const type of ['keydown', 'keypress', 'keyup']) window.removeEventListener(type, onTapKey, true);
    P.tapbar.hidden = true;
    P.tapbar.replaceChildren();
    P.tapBtn.classList.remove('on');
    return T;
  }

  function stopTap(save) {
    const T = endTap();
    if (!T) return;
    state.offset = T.offset;
    state.manual = T.manual;
    const times = T.idx.map((i) => T.stamps[i]);
    const pressed = times.filter((t) => t !== undefined).length;
    if (!save || pressed < 2) {
      state.current = null;
      choose(T.from, false);
      if (save) say('Cần gõ ít nhất 2 dòng để lưu.');
      return;
    }
    // Lines that never got a press: spread them between their neighbours.
    for (let k = 0; k < times.length; k++) {
      if (times[k] !== undefined) continue;
      let b = k + 1;
      while (b < times.length && times[b] === undefined) b++;
      const ta = k > 0 ? times[k - 1] : null;
      const tb = b < times.length ? times[b] : null;
      times[k] = ta === null ? Math.max(0, tb - 3 * (b - k)) : tb === null ? ta + 3 : ta + (tb - ta) / (b - k + 1);
    }
    const text = T.lines
      .map((l, i) => {
        const k = T.idx.indexOf(i);
        return k >= 0 ? `${BYL.lrcStamp(times[k])} ${l.text}` : l.text;
      })
      .join('\n');
    const from = T.from;
    state.current = from;
    saveCustom(text, from.source === 'custom' ? from.label : 'Gõ nhịp từ ' + S[from.source].name, slotFor(from));
    const guessed = T.idx.length - pressed;
    say(`⏱ Đã lưu thời gian ${pressed} dòng${guessed ? `, ${guessed} dòng chưa gõ được ước lượng (bấm ⏱ Gõ nhịp để gõ lại)` : ''}.`);
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
      say('Trình duyệt này chưa hỗ trợ cửa sổ nổi (cần Chrome 116 trở lên).');
      return;
    }
    try {
      pipWin = await dpip.requestWindow({ width: 640, height: 260 });
    } catch (err) {
      say('Không mở được cửa sổ nổi: ' + (err?.message || err));
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
      if (TAP && (e.key === ' ' || e.key === 'Backspace')) {
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
    mk('prevSong', 'Bài trước', () => skipVideo(-1));
    mk('prevLine', 'Câu trước', () => skipLine(-1));
    const play = mk('play', 'Phát / dừng (Space)', () => {
      const v = video();
      if (v) v.paused ? v.play() : v.pause();
    }, 'big');
    mk('nextLine', 'Câu sau', () => skipLine(1));
    mk('nextSong', 'Bài sau', () => skipVideo(1));
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
      const hint = c.synced ? '♪' : 'Bấm vào dòng đang hát trong panel bên phải để bắt đầu';
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

  // ---------- karaoke search ----------

  async function loadKaraoke(extra) {
    if (!state.song) return;
    const key = state.videoId + '|' + (extra || '');
    if (state.karaokeLoadedFor === key) return;
    state.karaokeLoadedFor = key;

    if (!P.kchips.childElementCount) {
      const vn = BYL.isVietnamese(state.song.title + ' ' + state.song.artist);
      const variants = vn
        ? ['', 'tone nam', 'tone nữ', 'song ca', 'beat']
        : ['', 'lower key', 'higher key', 'duet', 'instrumental'];
      variants.forEach((v, i) => {
        const b = el('button', i === 0 ? 'on' : '', v ? (vn ? v[0].toUpperCase() + v.slice(1) : v) : 'Karaoke');
        b.addEventListener('click', () => {
          P.kchips.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          loadKaraoke(v);
        });
        P.kchips.append(b);
      });
    }

    const q = [state.song.title, state.song.artist, 'karaoke', extra].filter(Boolean).join(' ');
    P.klist.replaceChildren(el('div', 'empty', 'Đang tìm bản karaoke…'));
    try {
      const results = (await BYL.yt.search(q, 12)).filter((v) => v.videoId !== state.videoId);
      if (state.karaokeLoadedFor !== key) return;
      P.klist.replaceChildren();
      if (!results.length) P.klist.append(el('div', 'empty', 'Không tìm thấy bản karaoke nào.'));
      for (const v of results) {
        const a = el('a', 'kitem');
        a.href = '/watch?v=' + encodeURIComponent(v.videoId);
        if (/karaoke|beat|instrumental|off vocal|minus one/i.test(v.title)) a.classList.add('hit');
        const img = el('img');
        img.src = v.thumb;
        img.loading = 'lazy';
        img.alt = '';
        const meta = el('div');
        meta.append(el('b', '', v.title), el('div', 'muted', [v.channel, v.length, v.views].filter(Boolean).join(' · ')));
        a.append(img, meta);
        P.klist.append(a);
      }
    } catch {
      state.karaokeLoadedFor = null;
      P.klist.replaceChildren(el('div', 'empty', 'Không tải được kết quả. Thử lại sau.'));
    }
  }

  // ---------- history / favourites ----------

  function paintFav(on) {
    P.favBtn.classList.toggle('on', on);
    P.favBtn.textContent = on ? '★' : '☆';
    P.favBtn.title = on ? 'Bỏ khỏi bài yêu thích' : 'Thêm vào bài yêu thích (xem ở tab "Đã xem")';
  }

  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 60) return m <= 1 ? 'vừa xem' : m + ' phút trước';
    if (m < 1440) return Math.round(m / 60) + ' giờ trước';
    return Math.round(m / 1440) + ' ngày trước';
  };

  async function renderHistory() {
    if (P.historyTab.hidden) return;
    P.hAll.classList.toggle('on', !state.favOnly);
    P.hFav.classList.toggle('on', !!state.favOnly);
    const list = (await BYL.history.list()).filter((x) => !state.favOnly || x.fav);
    P.hlist.replaceChildren();
    if (!list.length) {
      P.hlist.append(el('div', 'empty', state.favOnly ? 'Chưa có bài yêu thích. Bấm ☆ cạnh tên bài để thêm.' : 'Chưa xem bài nào.'));
      return;
    }
    for (const x of list) {
      const a = el('a', 'kitem');
      a.href = (x.short ? '/shorts/' : '/watch?v=') + encodeURIComponent(x.id);
      if (x.id === state.videoId) a.classList.add('cur');
      const img = el('img');
      img.src = `https://i.ytimg.com/vi/${encodeURIComponent(x.id)}/mqdefault.jpg`;
      img.loading = 'lazy';
      img.alt = '';
      const meta = el('div');
      meta.append(el('b', '', x.title || x.id), el('div', 'muted', [x.artist, ago(x.at), x.n > 1 ? x.n + ' lần' : ''].filter(Boolean).join(' · ')));
      const star = el('button', 'fav' + (x.fav ? ' on' : ''), x.fav ? '★' : '☆');
      star.title = x.fav ? 'Bỏ khỏi bài yêu thích' : 'Thêm vào bài yêu thích';
      const del = el('button', 'x', '✕');
      del.title = 'Xoá khỏi lịch sử';
      for (const b of [star, del]) b.addEventListener('click', (e) => (e.preventDefault(), e.stopPropagation()));
      star.addEventListener('click', async () => {
        await BYL.history.setFav(x.id, !x.fav);
        if (x.id === state.videoId) paintFav(!x.fav);
        renderHistory();
      });
      del.addEventListener('click', async () => {
        await BYL.history.remove(x.id);
        renderHistory();
      });
      a.append(img, meta, star, del);
      P.hlist.append(a);
    }
  }

  // Called by main.js once the song is known.
  async function remember(song) {
    if (!state.videoId || !song?.title) return;
    const id = state.videoId;
    await BYL.history.add({ id, title: song.title, artist: song.artist, short: BYL.isShorts() });
    if (id !== state.videoId) return;
    paintFav(!!(await BYL.history.list()).find((x) => x.id === id)?.fav);
    renderHistory();
  }

  // main.js fills in onLoadSource, hasCaptions and captionWordsFor per video.
  // Keyboard shortcuts (keys.js). Each returns a short note for the toast.
  const actions = {
    overlay: () => (setOverlay(!state.overlayOn, true), state.overlayOn ? 'Lời trên video: bật' : 'Lời trên video: tắt'),
    pip: () => (togglePip(), 'Cửa sổ lời nổi'),
    nudge: (d) => (nudge(d), 'Lệch ' + fmtOffset(state.offset)),
    pin: () => {
      const v = video();
      const i = state.current && v ? position(v.currentTime).i : -1;
      if (i < 0) return 'Chưa có dòng nào đang hát';
      pinLine(i);
      return '📍 Đã ghim dòng đang hát';
    },
    font: (d) => (setFont(d), 'Cỡ chữ ' + BYL.settings.value.overlayFontSize),
  };
  const api = { mount, remount, stale, hide, setOverlay, reset, setSong, setSourceStatus, addCandidates, state, actions, onLoadSource: null };
  return api;
})();
