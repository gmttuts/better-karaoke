'use strict';

// ⇆ So sánh lời: the lyrics being played next to another version (YouTube
// captions next to Hợp âm chuẩn…), line against line, editable on the left.
// ↺ Về bản gốc: drop the user's own edit of this video.
// Part of the panel in ui.js, which passes in the state and helpers it uses
// (see "parts" there).
BYL.uiParts = BYL.uiParts || {};
BYL.uiParts.compare = ({ P, S, baseId, effT, el, maybeAutoPick, renderLines, renderSelect, saveCustom, saveWarps, say, setSourceStatus, slotFor, state, video }) => {
  let box = null;

  const name = (c) => `${S[c.source].icon} ${S[c.source].name} · ${c.label}${c.synced ? ' ⏱' : ''}`;
  const sung = (c) => c.lines.filter((l) => l.text && !l.section);
  const alike = (a, b) => (BYL.similarity(a, b) + BYL.similarity(b, a)) / 2;

  // Lines of the two versions side by side, in order: the pairing that
  // matches the most alike lines over the whole song (a version may start
  // with credits, skip a verse or repeat a chorus), the rest stand alone.
  function pair(left, right) {
    const n = left.length;
    const m = right.length;
    const MIN = 0.35;
    const sim = left.map((l) => right.map((r) => alike(l.text, r.text)));
    // best[i][j]: the best total for left[i..] against right[j..].
    const best = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--) {
        const s = sim[i][j];
        best[i][j] = Math.max(best[i + 1][j], best[i][j + 1], s >= MIN ? s + best[i + 1][j + 1] : 0);
      }
    const rows = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      const s = sim[i][j];
      if (s >= MIN && best[i][j] === s + best[i + 1][j + 1]) rows.push({ l: left[i++], r: right[j++], score: s });
      else if (best[i][j] === best[i + 1][j]) rows.push({ l: left[i++], score: 0 });
      else rows.push({ r: right[j++] });
    }
    while (i < n) rows.push({ l: left[i++], score: 0 });
    while (j < m) rows.push({ r: right[j++] });
    return rows;
  }

  // The dialog lives in its own host on the page: inside the panel, YouTube's
  // side column would clip it.
  let host = null;
  let follow = 0;
  const close = () => {
    clearInterval(follow);
    host?.remove();
    host = box = null;
  };

  let root = null;
  function openCompare() {
    const cur = state.current;
    if (!cur) return say(L('Chưa có lời để so sánh.'));
    const others = state.candidates.filter((c) => c !== cur && sung(c).length);
    if (!others.length) return say(L('Chưa có bản lời nào khác để so sánh.'));
    close();
    box = el('div', 'cmp');
    const dlg = el('div', 'dlg');
    const head = el('div', 'chead');
    const pick = el('select');
    for (const c of others) {
      const o = el('option', '', name(c));
      o.value = c.id;
      pick.append(o);
    }
    // Start with another source than the one playing (captions vs Hợp âm chuẩn).
    pick.value = (others.find((c) => c.source !== cur.source) || others[0]).id;
    const x = el('button', 'x', '✕');
    head.append(el('b', '', L('⇆ So sánh lời')), el('span', 'muted', L('So với')), pick, x);
    // ⏵ / ⏹ from the video's clock, for the row clicked.
    const clock = el('div', 'cclock');
    const goStart = el('button', '', '');
    const goEnd = el('button', '', '');
    goStart.title = L('Lấy giờ đang phát làm giờ BẮT ĐẦU của dòng đang chọn');
    goEnd.title = L('Lấy giờ đang phát làm giờ KẾT THÚC của dòng đang chọn: chữ cuối của câu chạy xong đúng lúc đó');
    goStart.addEventListener('click', () => stampRow('ts'));
    goEnd.addEventListener('click', () => stampRow('te'));
    clock.append(goStart, goEnd, el('span', 'muted', L('Bấm vào một dòng, phát hoặc dừng video đúng chỗ câu bắt đầu / kết thúc, rồi bấm ⏵ / ⏹. Ô giờ cũng gõ tay được.')));
    clock.hidden = !cur.synced;
    dlg.classList.toggle('timed', !!cur.synced);
    let clockLabel = '';
    const paintClock = (t) => {
      const label = BYL.fmtTime(t) + '.' + String(Math.floor((t % 1) * 10));
      if (label === clockLabel) return;
      clockLabel = label;
      goStart.textContent = L('⏵ Bắt đầu = {0}', label);
      goEnd.textContent = L('⏹ Kết thúc = {0}', label);
    };
    const cols = el('div', 'ccols');
    cols.append(el('span', '', L('Bản đang phát (sửa được)')), el('span', ''), el('span', '', ''));
    const grid = el('div', 'cgrid');
    const foot = el('div', 'cfoot');
    const save = el('button', 'primary', L('💾 Lưu bản đã sửa'));
    const cancel = el('button', '', L('Huỷ'));
    const takeAll = el('button', '', L('⇐ Lấy hết bên phải'));
    takeAll.title = L('Lấy chữ của bản bên phải cho mọi dòng, giữ thời gian của bản bên trái');
    const undoAll = el('button', '', L('↺ Trả lại hết'));
    undoAll.title = L('Bỏ mọi chỗ đã đổi, về như lúc mở');
    foot.append(el('span', 'muted', L('Dòng khác nhau được tô màu. Bấm ⇐ để lấy chữ của bản bên phải mà vẫn giữ thời gian của bản bên trái, bấm ↺ để trả lại chữ cũ.')), takeAll, undoAll, cancel, save);
    dlg.append(head, clock, cols, grid, foot);
    box.append(dlg);

    // The left column: the playing lyrics, as rows the user edits. Each row
    // keeps what it started with: ⇐ takes the right-hand words, then the same
    // button turns into ↺ and gives the old words back.
    let rows = [];
    const paintAll = () => {
      takeAll.disabled = !rows.some((row) => row.r && row.l?.text !== row.r.text) && !rows.some((row) => !row.r && row.l?.text);
      undoAll.disabled = !rows.some((row) => (row.l?.text ?? '') !== row.orig || row.timeChanged);
    };
    // A time box: "1:20.5" (or seconds); empty end = until the next line.
    const fmt = (t) => (t == null ? '' : BYL.fmtTime(t) + '.' + String(Math.floor((t % 1) * 10 + 1e-6)));
    const parse = (v) => {
      v = v.trim().replace(',', '.');
      if (!v) return null;
      const m = v.match(/^(?:(\d{1,2}):)?(\d{1,2}(?:\.\d+)?)$/);
      return m ? (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]) : NaN;
    };
    function timeBox(row, key, hint) {
      const box = el('input', 'tin');
      box.type = 'text';
      box.value = fmt(row[key]);
      box.placeholder = key === 'te' ? '—' : '';
      box.title = key === 'ts' ? L('Giờ bắt đầu (phút:giây). Gõ tay hoặc bấm ⏵ ở trên để lấy giờ đang phát.') : L('Giờ kết thúc (phút:giây), để trống thì câu chạy tới lúc câu sau bắt đầu. Gõ tay hoặc bấm ⏹ ở trên để lấy giờ đang phát.');
      box.setAttribute('aria-label', hint);
      box.addEventListener('input', () => {
        const v = parse(box.value);
        box.classList.toggle('bad', Number.isNaN(v));
        if (!Number.isNaN(v)) setTime(row, key, v, false);
      });
      box.addEventListener('change', () => (box.value = fmt(row[key])));
      return box;
    }
    function setTime(row, key, v, write = true) {
      if (!row.l) row.l = { text: '', added: true };
      row[key] = v;
      row.timeChanged = true;
      if (write) {
        row[key === 'ts' ? 'tsIn' : 'teIn'].value = fmt(v);
        row[key === 'ts' ? 'tsIn' : 'teIn'].classList.remove('bad');
      }
      row.line.classList.add('tchg');
      paintAll();
    }
    // ⏵ / ⏹ act on the row last clicked, or else the row playing now.
    let picked = null;
    function selectRow(row) {
      picked?.line.classList.remove('sel');
      picked = row;
      row.line.classList.add('sel');
    }
    const rowAt = (t) => {
      let at = null;
      for (const row of rows) if (row.ts != null && row.ts <= t + 0.05) at = row;
      return at;
    };
    function stampRow(key) {
      const v = video();
      if (!v) return;
      const t = v.currentTime;
      const row = picked || rowAt(t);
      if (!row) return say(L('Bấm vào một dòng trước, rồi bấm ⏵ hoặc ⏹.'));
      if (key === 'te' && row.ts != null && t <= row.ts + 0.2)
        return say(L('Giờ kết thúc ({0}) phải sau giờ bắt đầu của dòng ({1}).', BYL.fmtTime(t), BYL.fmtTime(row.ts)));
      if (key === 'ts' && row.te != null && row.te <= t + 0.2) setTime(row, 'te', null);
      setTime(row, key, Math.round(t * 100) / 100);
      selectRow(row);
    }
    const draw = () => {
      picked = null;
      const other = others.find((c) => c.id === pick.value);
      cols.lastChild.textContent = name(other);
      rows = pair(sung(cur).map((l) => ({ ...l })), sung(other));
      grid.replaceChildren();
      for (const row of rows) {
        row.orig = row.l?.text ?? '';
        // Times on the video's clock (offset folded in), editable when the lyrics are timed.
        const timed = row.l && typeof row.l.t === 'number' && !row.l.added;
        row.ts = timed ? effT(row.l.t) : null;
        row.te = timed && row.l.e > row.l.t ? effT(row.l.e) : null;
        let t;
        if (cur.synced) {
          t = el('span', 'ctimes');
          row.tsIn = timeBox(row, 'ts', L('bắt đầu'));
          row.teIn = timeBox(row, 'te', L('kết thúc'));
          t.append(row.tsIn, row.teIn);
        } else t = el('span', 'ct', '');
        const input = el('input');
        input.type = 'text';
        input.value = row.orig;
        input.placeholder = row.l ? '' : L('(không có dòng này)');
        const use = el('button', 'use', '⇐');
        const r = el('span', 'cr', row.r?.text ?? '');
        const line = el('div', 'crow');
        const mark = () => {
          const changed = (row.l?.text ?? '') !== row.orig;
          line.classList.toggle('diff', !!row.r !== !!row.l?.text || !!(row.l?.text && row.r && alike(row.l.text, row.r.text) < 0.95));
          line.classList.toggle('chg', changed);
          use.textContent = changed ? '↺' : '⇐';
          use.title = changed ? L('↺ Trả lại chữ cũ của dòng này') : L('⇐ dùng chữ bên phải, giữ thời gian');
          use.disabled = !changed && !row.r;
        };
        row.set = (text) => {
          if (!row.l) row.l = { text: '', added: true };
          row.l.text = input.value = text;
          mark();
        };
        input.addEventListener('input', () => {
          row.set(input.value);
          paintAll();
        });
        use.addEventListener('click', () => {
          row.set((row.l?.text ?? '') !== row.orig ? row.orig : row.r.text);
          paintAll();
        });
        line.append(t, input, use, r);
        row.line = line;
        line.addEventListener('focusin', () => selectRow(row));
        mark();
        grid.append(line);
      }
      paintAll();
    };
    takeAll.addEventListener('click', () => {
      for (const row of rows) row.set(row.r ? row.r.text : '');
      paintAll();
    });
    undoAll.addEventListener('click', () => {
      for (const row of rows) {
        row.set(row.orig);
        if (row.timeChanged && row.tsIn) {
          const timed = row.l && typeof row.l.t === 'number' && !row.l.added;
          row.ts = timed ? effT(row.l.t) : null;
          row.te = timed && row.l.e > row.l.t ? effT(row.l.e) : null;
          row.tsIn.value = fmt(row.ts);
          row.teIn.value = fmt(row.te);
          row.timeChanged = false;
          row.line.classList.remove('tchg');
        }
      }
      paintAll();
    });
    draw();
    pick.addEventListener('change', () => {
      draw();
      shown = null;
    });
    // While the song plays, the line being sung is marked ♪ and kept in view
    // (unless the user just scrolled the list or is typing); paused, nothing moves.
    let shown = null;
    let handsOn = 0;
    const hands = () => (handsOn = Date.now() + 4000);
    grid.addEventListener('wheel', hands, { passive: true });
    grid.addEventListener('touchmove', hands, { passive: true });
    grid.addEventListener('focusin', hands);
    const tick = () => {
      const v = video();
      if (v) paintClock(v.currentTime);
      let now = null;
      if (v && !v.paused && cur.synced) {
        const t = v.currentTime;
        now = rowAt(t);
      }
      if (now === shown) return;
      shown?.line.classList.remove('now');
      shown = now;
      if (!now) return;
      now.line.classList.add('now');
      if (Date.now() > handsOn && !grid.contains(root.activeElement)) {
        grid.scrollTo({ top: now.line.offsetTop - grid.clientHeight * 0.3, behavior: 'smooth' });
      }
    };
    follow = setInterval(tick, 250);
    x.addEventListener('click', close);
    cancel.addEventListener('click', close);
    box.addEventListener('click', (e) => e.target === box && close());

    // Save as the user's own version: times kept, added lines placed between
    // their neighbours.
    save.addEventListener('click', () => {
      const kept = rows.filter((row) => row.l?.text?.trim());
      let text;
      if (cur.synced) {
        const times = kept.map((row) => (row.ts != null ? row.ts : undefined));
        for (let k = 0; k < times.length; k++) {
          if (times[k] !== undefined) continue;
          let b = k + 1;
          while (b < times.length && times[b] === undefined) b++;
          const a = k > 0 ? times[k - 1] : null;
          const z = b < times.length ? times[b] : null;
          times[k] = a === null ? Math.max(0, (z ?? 3) - 3) : z === null ? a + 3 : a + (z - a) / (b - k + 1);
        }
        text = kept
          .map((row, k) => `${BYL.lrcStamp(times[k])} ${row.l.text.trim()}${row.te != null && row.te > times[k] ? BYL.lrcEnd(row.te) : ''}`)
          .join('\n');
      } else text = kept.map((row) => row.l.text.trim()).join('\n');
      close();
      saveCustom(text, cur.source === 'custom' ? cur.label : L('Đã sửa từ ') + S[cur.source].name, slotFor(cur));
    });
    host = document.createElement('div');
    host.id = 'byl-compare-host';
    root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BYL.PANEL_CSS + ':host { all: initial; margin: 0; }';
    // Keys typed here must not reach YouTube's shortcuts (k, j, m, f…).
    for (const type of ['keydown', 'keypress', 'keyup']) root.addEventListener(type, (e) => e.stopPropagation());
    root.append(style, box);
    document.body.append(host);
    tick();
  }

  // ↺ Về bản gốc: the edit is dropped, the best version found plays again.
  function resetCustom() {
    const c = state.current;
    if (c?.source !== 'custom') return;
    if (!confirm(L('Bỏ bản bạn đã sửa cho video này?'))) return;
    const slot = baseId(c);
    state.candidates = state.candidates.filter((x) => baseId(x) !== slot);
    const starred = state.starId && baseId({ id: state.starId }) === slot;
    BYL.videoStore.patch(state.videoId, { [slot]: null, pick: null, ...(starred ? { star: null } : {}) });
    if (starred) state.starId = null;
    delete state.warps[slot];
    delete state.warps[slot + '#sync'];
    saveWarps();
    state.manual = false;
    state.current = null;
    const left = state.candidates.filter((x) => x.source === 'custom').length;
    setSourceStatus('custom', left ? 'ok' : 'none', left);
    renderSelect();
    maybeAutoPick();
    if (!state.current) renderLines();
    say(L('↺ Đã bỏ bản bạn sửa, quay về lời tìm được.'));
  }

  return { openCompare, resetCustom, closeCompare: close };
};
