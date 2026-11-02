'use strict';

// The panel's "Bản Karaoke" and "Đã xem" tabs.
// Part of the panel in ui.js, which passes in the state and helpers it uses
// (see "parts" there).
BYL.uiParts = BYL.uiParts || {};
BYL.uiParts.tabs = ({ P, el, state }) => {
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
    P.klist.replaceChildren(el('div', 'empty', L('Đang tìm bản karaoke…')));
    try {
      const results = (await BYL.yt.search(q, 12)).filter((v) => v.videoId !== state.videoId);
      if (state.karaokeLoadedFor !== key) return;
      P.klist.replaceChildren();
      if (!results.length) P.klist.append(el('div', 'empty', L('Không tìm thấy bản karaoke nào.')));
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
      P.klist.replaceChildren(el('div', 'empty', L('Không tải được kết quả. Thử lại sau.')));
    }
  }

  // ---------- history / favourites ----------

  function paintFav(on) {
    P.favBtn.classList.toggle('on', on);
    P.favBtn.textContent = on ? '★' : '☆';
    P.favBtn.title = on ? L('Bỏ khỏi bài yêu thích') : L('Thêm vào bài yêu thích (xem ở tab "Đã xem")');
  }

  const ago = (t) => {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 60) return m <= 1 ? L('vừa xem') : m + L(' phút trước');
    if (m < 1440) return Math.round(m / 60) + L(' giờ trước');
    return Math.round(m / 1440) + L(' ngày trước');
  };

  async function renderHistory() {
    if (P.historyTab.hidden) return;
    P.hAll.classList.toggle('on', !state.favOnly);
    P.hFav.classList.toggle('on', !!state.favOnly);
    const list = (await BYL.history.list()).filter((x) => !state.favOnly || x.fav);
    P.hlist.replaceChildren();
    if (!list.length) {
      P.hlist.append(el('div', 'empty', state.favOnly ? L('Chưa có bài yêu thích. Bấm ☆ cạnh tên bài để thêm.') : L('Chưa xem bài nào.')));
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
      meta.append(el('b', '', x.title || x.id), el('div', 'muted', [x.artist, ago(x.at), x.n > 1 ? x.n + L(' lần') : ''].filter(Boolean).join(' · ')));
      const star = el('button', 'fav' + (x.fav ? ' on' : ''), x.fav ? '★' : '☆');
      star.title = x.fav ? L('Bỏ khỏi bài yêu thích') : L('Thêm vào bài yêu thích');
      const del = el('button', 'x', '✕');
      del.title = L('Xoá khỏi lịch sử');
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

  return { paintFav, renderHistory, loadKaraoke, remember };
};
