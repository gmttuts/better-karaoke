Vendored, unmodified:

- `tesseract.min.js`, `worker.min.js` — tesseract.js 5.1.1 (Apache 2.0), https://github.com/naptha/tesseract.js
- `tesseract-core-simd-lstm.js`, `tesseract-core-simd-lstm.wasm` — tesseract.js-core 5.1.1 (Apache 2.0), Tesseract OCR compiled to WebAssembly
- `vie.traineddata` — Vietnamese model from https://github.com/tesseract-ocr/tessdata_fast (Apache 2.0)

Used by `src/ocr/` (🔠 Đọc chữ trên video). Everything runs locally. Only for a video titled in Japanese, Korean, Chinese or Thai, that language's model (tessdata 4.0.0_best_int, Apache 2.0) is fetched once from cdn.jsdelivr.net/npm/@tesseract.js-data/ and cached.
