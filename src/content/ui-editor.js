'use strict';

// Lyric editor (✏️ Sửa lời / ✍ Tự nhập lời).
// Part of the panel in ui.js, which passes in the state and helpers it uses
// (see "parts" there).
BYL.uiParts = BYL.uiParts || {};
BYL.uiParts.editor = ({ P, S, addCandidates, api, baseId, choose, effT, el, frame, maybeAutoPick, renderLines, renderSelect, saveWarps, say, setOffset, setSourceStatus, slot, slotFor, state, stopTap, tap, tapping, video }) => {
  let ED = null; // lyric editor while open

  // Text with [mm:ss] stamps on most lines is timed; anything else is plain.
  function customCandidate(text, label, id = 'custom') {
    const rows = text.split('\n').filter((l) => l.trim());
    const stamped = rows.filter((l) => /^\s*\[\d{1,2}:\d{2}/.test(l)).length;
    const synced = rows.length > 0 && stamped >= rows.length * 0.5;
    return {
      id,
      source: 'custom',
      label: label || L('Bản đã sửa'),
      synced,
      lines: synced ? BYL.parseLrc(text) : BYL.plainLines(text),
      score: 1000,
    };
  }

  // opts.ocr: start 🔠 reading the video's on-screen text right away.
  function openEditor(opts) {
    const box = P.editor;
    if (!box.hidden) return closeEditor();
    if (tapping()) stopTap(false);
    const c = state.current;
    box.replaceChildren();
    const tip = el(
      'div',
      'tip',
      L('Sửa trực tiếp, mỗi câu một dòng, để trống một dòng giữa các đoạn. Giữ [phút:giây] ở đầu dòng để giữ thời gian (lời dịch vẫn chạy đúng nhịp). ') +
        L('Lời không có thời gian sẽ tự canh theo phụ đề nếu khớp, không thì bấm vào dòng đang hát.')
    );
    const ta = el('textarea');
    ta.spellcheck = false;
    ta.placeholder = L('Dán hoặc gõ lời bài hát vào đây…');
    // Timed lyrics are written with the current offset folded in.
    ta.value = c ? (c.synced ? BYL.toLrc(c.lines.map((l) => (l.t === undefined ? l : { ...l, t: effT(l.t) }))) : BYL.lyricsText(c.lines)) : '';
    const mirror = el('div', 'mirror');
    const taWrap = el('div', 'tawrap');
    taWrap.append(mirror, ta);

    const search = el('div', 'row esearch');
    const q = el('input');
    q.type = 'text';
    q.placeholder = L('🔎 Tìm trong lời (gõ không dấu cũng được)…');
    const count = el('span', 'muted', '');
    const up = el('button', '', '↑');
    const down = el('button', '', '↓');
    up.title = L('Kết quả trước (Shift+Enter)');
    down.title = L('Kết quả sau (Enter)');
    search.append(q, count, up, down);

    const tools = el('div', 'row');
    const stamp = el('button', '', L('📍 Gắn giờ đang phát'));
    stamp.title = L('Ghi thời gian video hiện tại vào đầu dòng có con trỏ rồi xuống dòng kế. Vừa nghe vừa bấm để canh lời (phím tắt: Ctrl/⌘ + Enter)');
    const followBox = el('label');
    const follow = el('input');
    follow.type = 'checkbox';
    follow.checked = true;
    followBox.append(follow, L('Cuộn theo nhạc'));
    followBox.title = L('Tô và cuộn tới dòng đang phát');
    tools.append(stamp, followBox, el('span', 'muted', L('Nháy đúp một dòng có giờ để tua tới đó')));

    const row = el('div', 'row');
    const save = el('button', 'on', L('💾 Lưu lời'));
    const cancel = el('button', '', L('Huỷ'));
    const fromCaps = el('button', '', L('📝 Lấy khung từ phụ đề'));
    fromCaps.title = L('Điền lời từ phụ đề YouTube kèm thời gian, bạn chỉ cần sửa chữ (hoặc thay bằng lời dịch)');
    fromCaps.hidden = !api.hasCaptions?.();
    const del = el('button', '', L('🗑 Xoá bản của bạn'));
    del.hidden = c?.source !== 'custom';
    const fromOcr = el('button', '', L('🔠 Đọc chữ trên video'));
    fromOcr.title = L('Video có chữ lời bài hát trên hình? Tua nhanh video (tắt tiếng) và đọc chữ trên từng khung hình, kèm thời gian. Mất khoảng nửa thời lượng bài.');
    row.append(save, cancel, fromCaps, fromOcr, del);
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
      saveCustom(ta.value, c?.source === 'custom' ? c.label : c ? L('Sửa từ ') + S[c.source].name : L('Tự nhập'), slotFor(c))
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
      say(L('Đã xoá bản lời của bạn cho video này.'));
    });
    async function readVideo() {
      if (BYL.ocr.busy()) return BYL.ocr.stop();
      const v = video();
      if (!v) return;
      fromOcr.textContent = L('⏹ Dừng đọc');
      say(L('🔠 Đang đọc chữ trên video…'));
      try {
        const song = state.song || {};
        const lines = await BYL.ocr.scan(
          v,
          (p) => ED?.ta === ta && say(L('🔠 Đang đọc chữ trên video: {0}%… (bấm ⏹ để dừng)', Math.round(p * 100))),
          [song.title, song.artist, [song.title, song.artist].filter(Boolean).join(' - ')]
        );
        if (ED?.ta !== ta) return;
        if (!lines.length) return say(L('Không đọc được dòng chữ nào trên video này.'));
        ta.value = BYL.ocr.toLrc(lines);
        paintEditor();
        say(L('🔠 Đọc được {0} dòng. Sửa chữ đọc sai (nếu có) rồi bấm 💾 Lưu lời. Thời gian là lúc dòng chữ hiện ra, lệch thì chỉnh "Lệch" hoặc ghim 📍.', lines.length));
      } catch (err) {
        say(L('Không đọc được chữ trên video: {0}', err?.message || err));
      } finally {
        fromOcr.textContent = L('🔠 Đọc chữ trên video');
      }
    }
    fromOcr.addEventListener('click', readVideo);
    if (opts?.ocr) readVideo();

    fromCaps.addEventListener('click', () => {
      const t = state.candidates.find((x) => x.source === 'transcript');
      if (t) {
        ta.value = BYL.toLrc(t.lines);
        paintEditor();
        return;
      }
      fromCaps.disabled = true;
      fromCaps.textContent = L('Đang tải phụ đề…');
      api.onLoadSource?.('transcript');
      // The transcript source reports back through addCandidates; poll briefly.
      let tries = 0;
      const wait = setInterval(() => {
        const got = state.candidates.find((x) => x.source === 'transcript');
        if (got || ++tries > 40 || state.sourceStatus.transcript === 'none' || state.sourceStatus.transcript === 'error') {
          clearInterval(wait);
          fromCaps.disabled = false;
          fromCaps.textContent = L('📝 Lấy khung từ phụ đề');
          if (got && ED?.ta === ta) {
            ta.value = BYL.toLrc(got.lines);
            paintEditor();
          } else if (!got) say(L('Không lấy được phụ đề của video này.'));
        }
      }, 250);
    });
  }

  function closeEditor() {
    BYL.ocr.stop();
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
    count.textContent = needle ? (ED.hits.length ? `${Math.max(1, ED.hit + 1)}/${ED.hits.length}` : L('0 kết quả')) : '';
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
    if (!ED) return;
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
    if (!text) return say(L('Chưa có lời để lưu.'));
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
    if (!P.note.textContent) say(L('💾 Đã lưu lời của bạn. Lần sau mở video này sẽ hiện bản này trước.'));
  }

  return { customCandidate, closeEditor, editorTick, openEditor, saveCustom };
};
