'use strict';

// Reads the text in one video frame with Tesseract (vendor/tesseract, all
// local). Chrome runs this in an offscreen document the service worker opens
// on demand; Firefox's background page loads it directly.
self.BYL_OCR = (() => {
  const base = chrome.runtime.getURL('vendor/tesseract/');
  // Vietnamese (which reads English too) ships with the extension. Japanese,
  // Korean, Chinese and Thai models (1–2 MB each, Apache 2.0, from
  // tessdata via jsDelivr) are fetched the first time a video needs one,
  // then kept by Tesseract in the extension's IndexedDB.
  const CDN = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/';
  const OTHER = ['jpn', 'kor', 'chi_sim', 'chi_tra', 'tha'];
  let worker = null;
  let workerLang = '';
  const get = (lang) => {
    lang = OTHER.includes(lang) ? lang : 'vie';
    if (worker && workerLang !== lang) {
      const old = worker;
      worker = null;
      old.then((w) => w.terminate()).catch(() => {});
    }
    workerLang = lang;
    const local = lang === 'vie';
    return (worker ||= Tesseract.createWorker(lang, 1, {
      workerPath: base + 'worker.min.js',
      corePath: base + 'tesseract-core-simd-lstm.js',
      langPath: local ? base.replace(/\/$/, '') : `${CDN}${lang}/4.0.0_best_int`,
      gzip: !local,
      // Downloaded models are kept (IndexedDB) for next time.
      cacheMethod: local ? 'none' : 'write',
      workerBlobURL: false,
    }).catch((err) => {
      worker = null;
      throw err;
    }));
  };

  // image: data: URL; lang: a Tesseract code (vie when left out). Returns [{ text, conf, box: [x0, y0, x1, y1], words: [{ text, conf, box }] }].
  async function recognize(image, lang) {
    const w = await get(lang);
    const { data } = await w.recognize(image);
    const box = (b) => [b.x0, b.y0, b.x1, b.y1];
    return (data.lines || []).map((l) => ({
      text: l.text.trim(),
      conf: Math.round(l.confidence),
      box: box(l.bbox),
      words: (l.words || []).map((w) => ({ text: w.text, conf: Math.round(w.confidence), box: box(w.bbox) })),
    }));
  }

  if (location.pathname.endsWith('/ocr.html')) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.target !== 'ocr') return;
      recognize(msg.image, msg.lang)
        .then((lines) => sendResponse({ lines }))
        .catch((err) => sendResponse({ error: String(err?.message || err) }));
      return true;
    });
  }
  return { recognize };
})();
