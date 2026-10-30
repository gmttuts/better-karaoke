'use strict';

// Only the settings shown in this popup; the overlay look is edited in the
// panel (🎨) on YouTube. Defaults must match BYL.DEFAULTS in content/util.js.
const DEFAULTS = {
  srcDescription: true,
  srcComments: true,
  srcDuplicates: true,
  srcLrclib: true,
  srcHopamchuan: true,
  srcTranscript: true,
  preferSynced: false,
  overlayOnByDefault: false,
  commentPages: 3,
};

const saved = document.getElementById('saved');
let timer;

chrome.storage.sync.get(DEFAULTS).then((values) => {
  for (const input of document.querySelectorAll('[data-k]')) {
    const k = input.dataset.k;
    if (input.type === 'checkbox') input.checked = !!values[k];
    else input.value = values[k];
    input.addEventListener('change', async () => {
      let v = input.type === 'checkbox' ? input.checked : Number(input.value);
      if (input.type === 'number') {
        v = Math.min(Number(input.max), Math.max(Number(input.min), v || DEFAULTS[k]));
        input.value = v;
      }
      await chrome.storage.sync.set({ [k]: v });
      saved.textContent = 'Đã lưu, áp dụng từ video tiếp theo.';
      clearTimeout(timer);
      timer = setTimeout(() => (saved.textContent = ''), 2000);
    });
  }
});
