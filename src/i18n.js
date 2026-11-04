'use strict';

// Interface text. The source strings are Vietnamese; src/lang/<code>.js
// translate them (BYL.DICT[code]). Follows the time zone, or the choice in the
// options page / the 🌐 button on the panel (uiLang).
// L('… {0} …', x) looks the text up and fills in {0}, {1}…
var BYL = (globalThis.BYL = globalThis.BYL || {});
BYL.DICT ||= {};
// Code, name in that language.
BYL.LANGS = [
  ['vi', 'Tiếng Việt'],
  ['en', 'English'],
  ['zh', '简体中文'],
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
// "auto": Vietnamese in the GMT+7 time zone (Vietnam), English elsewhere.
BYL.autoLang = () => (new Date().getTimezoneOffset() === -420 ? 'vi' : 'en');
BYL.setLang = (pref) => (BYL.lang = BYL.LANGS.some(([c]) => c === pref) ? pref : BYL.autoLang());
BYL.setLang();

// A string missing from a translation falls back to English, not Vietnamese.
const L = (BYL.L = (text, ...args) => {
  const s = BYL.lang === 'vi' ? text : BYL.DICT[BYL.lang]?.[text] ?? BYL.DICT.en?.[text] ?? text;
  return args.length ? s.replace(/\{(\d)\}/g, (m, i) => args[i] ?? m) : s;
});

// Static pages (popup, publish page): swap text nodes and titles in place.
BYL.localizePage = (root = document) => {
  document.documentElement.lang = BYL.lang;
  if (BYL.lang === 'vi') return;
  document.title = L(document.title);
  const walk = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const key = n.nodeValue.replace(/\s+/g, ' ').trim();
    const to = L(key);
    if (key && to !== key) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, () => to);
  }
  for (const a of ['title', 'placeholder']) {
    for (const e of root.querySelectorAll(`[${a}]`)) e.setAttribute(a, L(e.getAttribute(a).trim()));
  }
};
