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
    dlg.append(head, cols, grid, foot);
    box.append(dlg);

    // The left column: the playing lyrics, as rows the user edits. Each row
    // keeps what it started with: ⇐ takes the right-hand words, then the same
    // button turns into ↺ and gives the old words back.
    let rows = [];
    const paintAll = () => {
      takeAll.disabled = !rows.some((row) => row.r && row.l?.text !== row.r.text) && !rows.some((row) => !row.r && row.l?.text);
      undoAll.disabled = !rows.some((row) => (row.l?.text ?? '') !== row.orig);
    };
    const draw = () => {
      const other = others.find((c) => c.id === pick.value);
      cols.lastChild.textContent = name(other);
      rows = pair(sung(cur).map((l) => ({ ...l })), sung(other));
      grid.replaceChildren();
      for (const row of rows) {
        row.orig = row.l?.text ?? '';
        const t = el('span', 'ct', row.l && typeof row.l.t === 'number' ? BYL.fmtTime(effT(row.l.t)) : '');
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
      for (const row of rows) row.set(row.orig);
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
      let now = null;
      if (v && !v.paused && cur.synced) {
        const t = v.currentTime;
        for (const row of rows) if (row.l && typeof row.l.t === 'number' && !row.l.added && effT(row.l.t) <= t) now = row;
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
        const times = kept.map((row) => (typeof row.l.t === 'number' && !row.l.added ? effT(row.l.t) : undefined));
        for (let k = 0; k < times.length; k++) {
          if (times[k] !== undefined) continue;
          let b = k + 1;
          while (b < times.length && times[b] === undefined) b++;
          const a = k > 0 ? times[k - 1] : null;
          const z = b < times.length ? times[b] : null;
          times[k] = a === null ? Math.max(0, (z ?? 3) - 3) : z === null ? a + 3 : a + (z - a) / (b - k + 1);
        }
        text = kept
          .map((row, k) => `${BYL.lrcStamp(times[k])} ${row.l.text.trim()}${row.l.e > row.l.t && !row.l.added ? BYL.lrcEnd(effT(row.l.e)) : ''}`)
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
