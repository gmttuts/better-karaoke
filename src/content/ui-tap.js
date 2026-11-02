'use strict';

// ⏱ Gõ nhịp: stamp each line by pressing Space as it starts.
// Part of the panel in ui.js, which passes in the state and helpers it uses
// (see "parts" there).
BYL.uiParts = BYL.uiParts || {};
BYL.uiParts.tap = ({ P, S, choose, closeEditor, effT, el, saveCustom, say, singable, slotFor, state, video }) => {
  // Play the song and press Space as each line starts: each press stamps the
  // next line with the video time. Saved as the user's own timed lyrics.
  let TAP = null;
  const TAP_LAG = 0.15; // presses land a little after the line starts

  const tapping = () => !!TAP;

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

  return { tap, tapJump, endTap, tapUndo, stopTap, renderTapLines, startTap, tapping };
};
