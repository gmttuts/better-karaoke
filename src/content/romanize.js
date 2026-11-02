'use strict';

// Latin spelling for Korean, Japanese kana and Chinese lyrics, shown like a
// translation under each line (🌐 Song ngữ → 🔤 Phiên âm).
//   Korean: Revised Romanization, syllable by syllable, with the consonant
//     carried over to a following vowel (한국어 → hangugeo).
//   Japanese: Hepburn for hiragana / katakana. Kanji need a dictionary of
//     words and stay as they are.
//   Chinese: pinyin with tone marks, one reading per character (Unicode
//     Unihan kMandarin, data/pinyin.json, loaded the first time it's needed).
BYL.romanize = (() => {
  const HANGUL = /[가-힣]/;
  const KANA = /[ぁ-ゖァ-ヺー]/;
  const HAN = /[一-鿿]/;

  // ---------- Korean ----------
  const INI = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const MED = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  // Final consonant at the end of a word / before a consonant…
  const FIN = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
  // …and how it sounds when the next syllable starts with a vowel.
  const LINK = ['', 'g', 'kk', 'ks', 'n', 'nj', 'n', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'r', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', ''];

  function korean(text) {
    const parts = [...text].map((ch) => {
      const n = ch.charCodeAt(0) - 0xac00;
      return n >= 0 && n < 11172 ? { i: Math.floor(n / 588), m: Math.floor((n % 588) / 28), f: n % 28 } : ch;
    });
    let out = '';
    parts.forEach((p, k) => {
      if (typeof p === 'string') return void (out += p);
      const prev = parts[k - 1];
      const next = typeof parts[k + 1] === 'object' ? parts[k + 1] : null;
      // ㄹ after ㄹ reads l: 빨리 ppalli.
      const ini = p.i === 5 && prev?.f === 8 ? 'l' : INI[p.i];
      let fin = next?.i === 11 ? LINK[p.f] : FIN[p.f];
      // k / t / p before ㄴ or ㅁ turn nasal: 감사합니다 gamsahamnida.
      if (next && (next.i === 2 || next.i === 6)) fin = { k: 'ng', t: 'n', p: 'm' }[fin] || fin;
      out += ini + MED[p.m] + fin;
    });
    return out;
  }

  // ---------- Japanese kana ----------
  const KANA_MAP = {};
  const rows = {
    あいうえお: 'a i u e o', かきくけこ: 'ka ki ku ke ko', さしすせそ: 'sa shi su se so', たちつてと: 'ta chi tsu te to',
    なにぬねの: 'na ni nu ne no', はひふへほ: 'ha hi fu he ho', まみむめも: 'ma mi mu me mo', やゆよ: 'ya yu yo',
    らりるれろ: 'ra ri ru re ro', わゐゑを: 'wa i e o', ん: 'n', がぎぐげご: 'ga gi gu ge go', ざじずぜぞ: 'za ji zu ze zo',
    だぢづでど: 'da ji zu de do', ばびぶべぼ: 'ba bi bu be bo', ぱぴぷぺぽ: 'pa pi pu pe po', ぁぃぅぇぉ: 'a i u e o', ゔ: 'vu',
  };
  for (const [kana, roma] of Object.entries(rows)) [...kana].forEach((k, i) => (KANA_MAP[k] = roma.split(' ')[i]));
  const SMALL = { ゃ: 'ya', ゅ: 'yu', ょ: 'yo' };
  const toHira = (ch) => {
    const c = ch.charCodeAt(0);
    return c >= 0x30a1 && c <= 0x30f6 ? String.fromCharCode(c - 0x60) : ch;
  };

  function japanese(text) {
    const chars = [...text].map(toHira);
    let out = '';
    let double = false;
    for (let k = 0; k < chars.length; k++) {
      const ch = chars[k];
      if (ch === 'っ') {
        double = true;
        continue;
      }
      if (ch === 'ー') {
        out += out.match(/[aeiou]$/)?.[0] || '';
        continue;
      }
      let r = KANA_MAP[ch];
      if (r === undefined) {
        // Kanji, Latin, punctuation: as they are, spaced off from the kana.
        if (out && /[a-z]$/.test(out) && !/\s/.test(ch)) out += ' ';
        out += ch;
        double = false;
        continue;
      }
      const small = SMALL[chars[k + 1]];
      if (small) {
        // き+ゃ → kya, し+ゃ → sha, ち+ゃ → cha, じ+ゃ → ja
        r = /^(sh|ch|j)i$/.test(r) ? r.slice(0, -1) + small.slice(1) : r.slice(0, -1) + small;
        k++;
      }
      if (double) r = (r.startsWith('ch') ? 't' : r[0]) + r;
      double = false;
      // ん before a vowel or y gets an apostrophe: ken'ichi.
      if (out.endsWith('n') && chars[k - 1] === 'ん' && /^[aeiouy]/.test(r)) out += "'";
      out += r;
    }
    return out.replace(/([a-z])([^\sa-z'])/g, '$1 $2').trim();
  }

  // ---------- Chinese ----------
  let pinyin = null;
  async function loadPinyin() {
    pinyin ||= fetch(chrome.runtime.getURL('data/pinyin.json'))
      .then((r) => r.json())
      .catch(() => null);
    return pinyin;
  }
  const A62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function chinese(text, P) {
    const words = [];
    let buf = '';
    for (const ch of text) {
      const c = ch.codePointAt(0) - P.base;
      const code = c >= 0 && c * 2 < P.map.length ? A62.indexOf(P.map[c * 2]) * 62 + A62.indexOf(P.map[c * 2 + 1]) : 0;
      if (code) {
        if (buf) words.push(buf.trim()), (buf = '');
        words.push(P.syl[code - 1]);
      } else buf += ch;
    }
    if (buf.trim()) words.push(buf.trim());
    return words.filter(Boolean).join(' ').replace(/ ([,.!?，。！？、])/g, '$1');
  }

  // Which script the lyrics need romanizing for, or null.
  function scriptOf(text) {
    if (HANGUL.test(text)) return 'ko';
    if (KANA.test(text)) return 'ja';
    if (HAN.test(text)) return 'zh';
    return null;
  }

  // lines -> same lines with Latin text, or null when there's nothing to do.
  async function lines(src) {
    const all = src.map((l) => l.text || '').join('\n');
    const kind = scriptOf(all);
    if (!kind) return null;
    const P = kind === 'zh' ? await loadPinyin() : null;
    const one = (t) => {
      if (!t) return t;
      if (kind === 'ko') return korean(t);
      if (kind === 'ja') return japanese(t);
      return P ? chinese(t, P) : t;
    };
    return { kind, lines: src.map((l) => ({ ...l, text: one(l.text) })) };
  }

  return { scriptOf, lines, korean, japanese, chinese, loadPinyin };
})();
