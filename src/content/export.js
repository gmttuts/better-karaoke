'use strict';

// Save the lyrics shown in the panel as .lrc / .srt, with the timing the user
// fixed (offset, 📍 points, ⏱) already applied, or hand them to the LRCLIB
// publish page.
BYL.exporter = (() => {
  // lines: [{ t, text, section? }] in video time, sorted.
  const sung = (lines) => lines.filter((l) => typeof l.t === 'number' && l.text && !l.section);

  const srtStamp = (t) => {
    const ms = Math.max(0, Math.round(t * 1000));
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };

  function toLrc(lines, meta = {}) {
    const head = [];
    if (meta.title) head.push(`[ti:${meta.title}]`);
    if (meta.artist) head.push(`[ar:${meta.artist}]`);
    if (meta.duration) head.push(`[length:${BYL.fmtTime(meta.duration)}]`);
    head.push('[re:Better YouTube Lyric]');
    // Blank lines become empty stamps so players clear the previous line.
    const body = lines.filter((l) => typeof l.t === 'number' && !l.section).map((l) => `${BYL.lrcStamp(l.t)} ${l.text}`.trimEnd());
    return [...head, '', ...body].join('\n') + '\n';
  }

  // A cue lasts until the next line starts, at most 7 s (instrumental breaks).
  function toSrt(lines, duration) {
    const s = sung(lines);
    const allT = lines.filter((l) => typeof l.t === 'number').map((l) => l.t);
    return (
      s
        .map((l, i) => {
          const later = allT.find((t) => t > l.t + 0.05);
          const end = Math.min(l.t + 7, later ?? (duration || l.t + 5), duration || Infinity);
          return `${i + 1}\n${srtStamp(l.t)} --> ${srtStamp(Math.max(end - 0.05, l.t + 0.5))}\n${l.text}\n`;
        })
        .join('\n')
    );
  }

  const fileName = (meta, ext) =>
    ([meta.artist, meta.title].filter(Boolean).join(' - ') || 'lyrics').replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '.' + ext;

  // bom: some subtitle players only read UTF-8 (Vietnamese marks) with one.
  function download(text, name, bom) {
    const url = URL.createObjectURL(new Blob([bom ? '\ufeff' + text : text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // The publish page (an extension page, so it may talk to lrclib.net)
  // picks the draft up from storage and asks before sending anything.
  async function openPublish(draft) {
    await chrome.storage.local.set({ publishDraft: { ...draft, at: Date.now() } });
    return chrome.runtime.sendMessage({ type: 'openPublish' });
  }

  return { toLrc, toSrt, srtStamp, fileName, download, openPublish };
})();
