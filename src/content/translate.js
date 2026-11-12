'use strict';

// 🌐 Dịch lời: the lyrics' lines in another language, line for line, so the
// translation keeps the original's timing (a second version of the lyrics).
// Google Translate's public endpoint (no key): the lines go in blocks, each
// line on its own line, so the song's context helps the wording; if a block
// comes back with a different number of lines, its lines go one by one.
BYL.translate = (() => {
  // The panel's own languages, in Google's codes.
  const TARGETS = [
    ['vi', 'Tiếng Việt'],
    ['en', 'English'],
    ['zh-CN', '简体中文'],
    ['zh-TW', '繁體中文'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['th', 'ไทย'],
    ['id', 'Bahasa Indonesia'],
    ['es', 'Español'],
    ['pt', 'Português'],
    ['fr', 'Français'],
    ['de', 'Deutsch'],
    ['ru', 'Русский'],
  ];
  const URL_ = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=';
  const BLOCK = 3500; // characters per request

  async function ask(text, tl) {
    const res = await fetch(URL_ + encodeURIComponent(tl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'q=' + encodeURIComponent(text),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return { text: (data?.[0] || []).map((s) => s?.[0] || '').join(''), from: data?.[2] || '' };
  }

  // texts: [string] -> { lines: [string], from: 'en' | … } in the same order.
  async function lines(texts, tl) {
    const out = new Array(texts.length).fill('');
    let from = '';
    // Blocks of whole lines.
    const blocks = [];
    let cur = [];
    let size = 0;
    texts.forEach((t, i) => {
      if (size + t.length + 1 > BLOCK && cur.length) blocks.push(cur), (cur = []), (size = 0);
      cur.push(i);
      size += t.length + 1;
    });
    if (cur.length) blocks.push(cur);
    for (const b of blocks) {
      const r = await ask(b.map((i) => texts[i].replace(/\n/g, ' ')).join('\n'), tl);
      from ||= r.from;
      const got = r.text.replace(/\r/g, '').split('\n');
      if (got.length === b.length) b.forEach((i, k) => (out[i] = got[k].trim()));
      else {
        // Lines merged or split: one at a time, a few at once.
        for (let k = 0; k < b.length; k += 6) {
          const part = b.slice(k, k + 6);
          const rs = await Promise.all(part.map((i) => ask(texts[i], tl).catch(() => ({ text: '' }))));
          part.forEach((i, j) => (out[i] = rs[j].text.replace(/\s*\n\s*/g, ' ').trim()));
        }
      }
    }
    return { lines: out, from };
  }

  const nameOf = (tl) => TARGETS.find(([c]) => c === tl)?.[1] || tl;
  // The language picked last, else the panel's own (Chinese: 繁體 for zh-TW / HK
  // browsers), else English.
  function defaultLang(saved) {
    if (TARGETS.some(([c]) => c === saved)) return saved;
    const nav = (navigator.language || '').toLowerCase();
    const ui = BYL.lang || nav.split('-')[0];
    if (ui === 'zh') return /tw|hk|mo|hant/.test(nav) ? 'zh-TW' : 'zh-CN';
    return TARGETS.find(([c]) => c === ui)?.[0] || 'en';
  }
  return { TARGETS, lines, nameOf, defaultLang };
})();
