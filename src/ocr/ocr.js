'use strict';

// Reads the text in one video frame with Tesseract (vendor/tesseract, all
// local). Chrome runs this in an offscreen document the service worker opens
// on demand; Firefox's background page loads it directly.
self.BYL_OCR = (() => {
  const base = chrome.runtime.getURL('vendor/tesseract/');
  let worker = null;
  const get = () =>
    (worker ||= Tesseract.createWorker('vie', 1, {
      workerPath: base + 'worker.min.js',
      corePath: base + 'tesseract-core-simd-lstm.js',
      langPath: base.replace(/\/$/, ''),
      gzip: false,
      cacheMethod: 'none',
      workerBlobURL: false,
    }).catch((err) => {
      worker = null;
      throw err;
    }));

  // image: data: URL. Returns [{ text, conf, box: [x0, y0, x1, y1], words: [{ text, conf, box }] }].
  async function recognize(image) {
    const w = await get();
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
      recognize(msg.image)
        .then((lines) => sendResponse({ lines }))
        .catch((err) => sendResponse({ error: String(err?.message || err) }));
      return true;
    });
  }
  return { recognize };
})();
