'use strict';

// ⇆ So sánh lời: the lyrics being played next to another version (YouTube
// captions next to Hợp âm chuẩn…), line against line, editable on the left.
// ↺ Về bản gốc: drop the user's own edit of this video.
// Part of the panel in ui.js, which passes in the state and helpers it uses
// (see "parts" there).
BYL.uiParts = BYL.uiParts || {};
BYL.uiParts.compare = ({ P, S, baseId, effT, el, maybeAutoPick, renderLines, renderSelect, saveCustom, saveWarps, say, setSourceStatus, slotFor, state }) => {
  let box = null;

  const name = (c) => `${S[c.source].icon} ${S[c.source].name} · ${c.label}${c.synced ? ' ⏱' : ''}`;
  const sung = (c) => c.lines.filter((l) => l.text && !l.section);
  const alike = (a, b) => (BYL.similarity(a, b) + BYL.similarity(b, a)) / 2;

  // Lines of the two versions side by side, in order: each line on the left
  // meets the closest of the next few on the right, the rest stand alone.
  function pair(left, right) {
    const rows = [];
    let j = 0;
    for (const l of left) {
      let best = -1;
      let score = 0;
      for (let k = j; k < Math.min(right.length, j + 4); k++) {
        const s = alike(l.text, right[k].text);
        if (s > score) (score = s), (best = k);
      }
      if (best >= 0 && score >= 0.35) {
        for (let k = j; k < best; k++) rows.push({ r: right[k] });
        rows.push({ l, r: right[best], score });
        j = best + 1;
      } else rows.push({ l, score: 0 });
    }
    for (let k = j; k < right.length; k++) rows.push({ r: right[k] });
    return rows;
  }

  // The dialog lives in its own host on the page: inside the panel, YouTube's
  // side column would clip it.
  let host = null;
  const close = () => {
    host?.remove();
    host = box = null;
  };

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
    foot.append(el('span', 'muted', L('Dòng khác nhau được tô màu. Bấm ⇐ để lấy chữ của bản bên phải mà vẫn giữ thời gian của bản bên trái.')), cancel, save);
    dlg.append(head, cols, grid, foot);
    box.append(dlg);

    // The left column: the playing lyrics, as rows the user edits.
    let rows = [];
    const draw = () => {
      const other = others.find((c) => c.id === pick.value);
      cols.lastChild.textContent = name(other);
      rows = pair(sung(cur).map((l) => ({ ...l })), sung(other));
      grid.replaceChildren();
      for (const row of rows) {
        const t = el('span', 'ct', row.l && typeof row.l.t === 'number' ? BYL.fmtTime(effT(row.l.t)) : '');
        const input = el('input');
        input.type = 'text';
        input.value = row.l?.text ?? '';
        input.placeholder = row.l ? '' : L('(không có dòng này)');
        input.addEventListener('input', () => {
          if (!row.l) row.l = { text: '', added: true };
          row.l.text = input.value;
          mark();
        });
        const use = el('button', 'use', '⇐');
        use.title = L('⇐ dùng chữ bên phải, giữ thời gian');
        use.disabled = !row.r;
        use.addEventListener('click', () => {
          if (!row.l) row.l = { text: '', added: true };
          row.l.text = input.value = row.r.text;
          mark();
        });
        const r = el('span', 'cr', row.r?.text ?? '');
        const line = el('div', 'crow');
        const mark = () => line.classList.toggle('diff', !!row.r !== !!row.l?.text || (row.l?.text && row.r && alike(row.l.text, row.r.text) < 0.95));
        line.append(t, input, use, r);
        mark();
        grid.append(line);
      }
    };
    draw();
    pick.addEventListener('change', draw);
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
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = BYL.PANEL_CSS + ':host { all: initial; margin: 0; }';
    // Keys typed here must not reach YouTube's shortcuts (k, j, m, f…).
    for (const type of ['keydown', 'keypress', 'keyup']) root.addEventListener(type, (e) => e.stopPropagation());
    root.append(style, box);
    document.body.append(host);
  }

  // ↺ Về bản gốc: the edit is dropped, the best version found plays again.
  function resetCustom() {
    const c = state.current;
    if (c?.source !== 'custom') return;
    if (!confirm(L('Bỏ bản bạn đã sửa cho video này?'))) return;
    const slot = baseId(c);
    state.candidates = state.candidates.filter((x) => baseId(x) !== slot);
    BYL.videoStore.patch(state.videoId, { [slot]: null, pick: null });
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
