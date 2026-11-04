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
    head.push('[re:Better Lyric for YouTube]');
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

  // ---------- .ass: styled karaoke subtitles ----------
  // Same look as the lyrics on the video (🎨): font, colours, outline, box,
  // layout, and the sung colour sweeping word by word (\kf). Players that read
  // ASS (VLC, mpv, Aegisub, CapCut, ffmpeg -vf ass=…) show it as it looks here,
  // so burning it into the user's own video gives the same picture.
  const assStamp = (t) => {
    const cs = Math.max(0, Math.round(t * 100));
    const p = (n) => String(n).padStart(2, '0');
    return `${Math.floor(cs / 360000)}:${p(Math.floor(cs / 6000) % 60)}:${p(Math.floor(cs / 100) % 60)}.${p(cs % 100)}`;
  };
  // #rrggbb + opacity in percent -> &HAABBGGRR (ASS alpha 00 is opaque).
  const assColor = (hex, opacity = 100) => {
    const n = parseInt(String(hex || '#ffffff').replace('#', ''), 16) || 0;
    const h = (v) => v.toString(16).toUpperCase().padStart(2, '0');
    return `&H${h(Math.round(255 * (1 - opacity / 100)))}${h(n & 255)}${h((n >> 8) & 255)}${h((n >> 16) & 255)}`;
  };
  const tagColor = (hex) => assColor(hex).replace(/^&H00/, '&H') + '&';
  // The first family of a CSS font stack; the bundled karaoke font is Roboto
  // Condensed, the default one Roboto (as on YouTube).
  const assFont = (css) => {
    if (!css) return 'Roboto';
    const first = css.split(',')[0].replace(/["']/g, '').trim();
    return first === 'BYL Condensed' ? 'Roboto Condensed' : first;
  };
  // Braces start override tags and a backslash starts a code: keep them out.
  const assText = (s) => String(s).replace(/[{}]/g, (c) => (c === '{' ? '(' : ')')).replace(/\\/g, '＼').replace(/\s+/g, ' ').trim();

  // Karaoke tags for one line: each word sweeps over its own time (enhanced
  // LRC / caption word times in line.wd), or the line sweeps evenly by letters.
  function karaoke(line, dur, whole) {
    const words = assText(line.text).split(' ').filter(Boolean);
    if (whole) return `{\\k0}${words.join(' ')}`;
    const total = Math.round(dur * 100);
    const at = [];
    const byWord = line.wd?.length === words.length;
    if (byWord) {
      line.wd.forEach((w) => at.push(Math.min(total, Math.max(0, Math.round(w * 100)))));
    } else {
      const chars = words.reduce((n, w) => n + w.length + 1, 0);
      let acc = 0;
      for (const w of words) {
        at.push(Math.round((acc / chars) * total));
        acc += w.length + 1;
      }
    }
    let out = at[0] > 0 ? `{\\k${at[0]}}` : '';
    words.forEach((w, i) => {
      // A timed word's sweep runs to the next word, at most 1.5 s like the overlay.
      const next = at[i + 1] ?? total;
      const len = Math.max(1, byWord ? Math.min(next - at[i], 150) : next - at[i]);
      out += `{\\kf${len}}${w}${i < words.length - 1 ? ' ' : ''}`;
      if (next - at[i] > len && i < words.length - 1) out += `{\\k${next - at[i] - len}}`;
    });
    return out;
  }

  // lines: as for toSrt, plus wd. opts: { look, title, duration, width, height,
  // fontSize (px at a 1280 px wide player, 560 for Shorts), shorts, top, trans: [text by line index] }
  // Approximations: the 🖍 marker and the glow have no ASS equivalent, the
  // sung words keep their colour only; the shade (Phủ mờ) is a soft-edged band.
  function toAss(lines, opts = {}) {
    const look = { ...BYL.look.BASE_LOOK, ...(opts.look || {}) };
    if (look.upper) lines = lines.map((l) => ({ ...l, text: String(l.text).toLocaleUpperCase() }));
    const vw = opts.width || 1920;
    const vh = opts.height || 1080;
    // Shorter side 1080, so sizes and outlines don't depend on the stream quality.
    const k = 1080 / Math.min(vw, vh);
    const W = Math.round(vw * k);
    const H = Math.round(vh * k);
    const fs = Math.round(((opts.fontSize || 34) * look.scale) / 100 * (W / (opts.shorts ? 560 : 1280)));
    const nextFs = Math.round((fs * (look.nextScale ?? 100)) / 100);
    const transFs = Math.round((fs * (look.nextScale ?? 100) * 0.7) / 100);
    const boxed = look.shape && look.shape !== 'none' && look.shape !== 'fade';
    const outline = boxed ? Math.max(4, Math.round(fs * 0.3)) : Math.round((fs * (look.strokeW || 0)) / 200 * 10) / 10;
    const shadow = look.shadow && !boxed ? Math.max(1, Math.round(fs * 0.06)) : 0;
    // A box drawn with the karaoke text would get one box per word, and the
    // see-through boxes darken where they overlap: the box goes on a layer of
    // its own under the text (same text, invisible, BorderStyle 3).
    const style = (name, size, primary, secondary, align, box) =>
      `Style: ${name}${box ? 'Box' : ''},` +
      [
        assFont(look.font), size, primary, secondary,
        box ? assColor(look.bg, look.bgAlpha ?? 60) : assColor(look.stroke),
        box ? assColor(look.bg, look.bgAlpha ?? 60) : assColor('#000000', 55),
        look.weight >= 600 ? -1 : 0, 0, 0, 0, 100, 100, Math.round(size * ((look.tracking ?? 1) - 1)) / 100, 0,
        box ? 3 : 1, box ? outline : boxed ? 0 : outline, box ? 0 : shadow, align, 40, 40, 0, 1,
      ].join(',');
    const styles = (...a) => (boxed ? [style(...a), style(...a, true)] : [style(...a)]);
    const top = !!opts.top;
    const mv = Math.round((H * (look.margin ?? 10)) / 100);
    const sungC = assColor(look.sung);
    const textC = assColor(look.text, look.dim ?? 100);
    const A = top ? { c: 8, l: 7, r: 9 } : { c: 2, l: 1, r: 3 };

    const timed = lines.filter((l) => typeof l.t === 'number');
    const sungLines = sung(lines);
    const endOf = (l) => {
      const later = timed.find((x) => x.t > l.t + 0.05)?.t;
      return Math.min(later ?? (opts.duration || l.t + 5), l.t + 10, opts.duration || Infinity);
    };
    const wipeOf = (l) => Math.min(Math.max(endOf(l) - l.t, 0.5), 7);
    const whole = look.wipe === 'line';
    const trans = opts.trans || [];
    const trOf = (l) => assText(trans[lines.indexOf(l)] || '');
    const hasTrans = sungLines.some((l) => trOf(l));
    const ev = [];
    const dlg = (a, b, name, body, margins = '0,0,0') => {
      const at = `${assStamp(a)},${assStamp(b)}`;
      if (boxed) ev.push(`Dialogue: 0,${at},${name}Box,,${margins},,{\\1a&HFF&}${body.replace(/\{\\k[fo]?\d+\}/g, '').replace(/\\r/g, '\\r\\1a&HFF&')}`);
      ev.push(`Dialogue: 1,${at},${name},,${margins},,${body}`);
    };
    const fixed = (hex, size) => `{\\r\\fs${size}\\1c${tagColor(hex)}\\2c${tagColor(hex)}}`;

    if (look.layout === 'stagger') {
      // Two rows, the sung line alternating sides: each line shows up in its
      // row while the line before is sung, then lights up when its turn comes.
      const rowH = Math.round(fs * 1.25);
      const base = mv + (hasTrans ? Math.round(transFs * 1.35) : 0);
      const side = Math.round(W * 0.2);
      sungLines.forEach((l, i) => {
        const from = i > 0 ? Math.max(sungLines[i - 1].t, l.t - 8) : Math.max(0, l.t - 3);
        const upper = i % 2 === 0;
        const v = upper ? base + rowH : base;
        const len = assText(l.text).length;
        const size = len > 40 ? `{\\fs${Math.round(fs * Math.max(0.6, 40 / len))}}` : '';
        const name = upper === !top ? 'Left' : 'Right';
        dlg(from, endOf(l), name, `{\\k${Math.round((l.t - from) * 100)}}${size}${karaoke(l, wipeOf(l), whole)}`, `${side},${side},${v}`);
        if (trOf(l)) dlg(l.t, endOf(l), 'Trans', trOf(l), `0,0,${mv}`);
      });
    } else {
      // Sung line, its translation, then the next line smaller underneath
      // (center2), or the sung line alone (single), as one block.
      sungLines.forEach((l, i) => {
        let body = karaoke(l, wipeOf(l), whole);
        if (trOf(l)) body += `\\N${fixed(look.text, transFs)}${trOf(l)}`;
        const next = sungLines[i + 1];
        if (look.layout !== 'single' && next && next.t - l.t < 12) body += `\\N${fixed(look.text, nextFs)}${assText(next.text)}`;
        dlg(l.t, endOf(l), 'Lyric', body, `0,0,${mv}`);
      });
    }

    if (look.shape === 'fade' && sungLines.length) {
      // A shade under the lyrics for the whole song, blurred at its inner edge.
      const rows = fs * 1.25 + (look.layout === 'single' ? 0 : nextFs * 1.25 * (look.layout === 'stagger' ? 0.8 : 1)) + (hasTrans ? transFs * 1.3 : 0);
      const h = Math.round(mv + rows + fs * 1.6);
      const blur = Math.round(fs * 0.8);
      const y0 = top ? -blur : H - h;
      const at = `${assStamp(Math.max(0, sungLines[0].t - 3))},${assStamp(endOf(sungLines[sungLines.length - 1]))}`;
      ev.unshift(`Dialogue: 0,${at},Lyric,,0,0,0,,{\\an7\\pos(0,${y0})\\bord0\\shad0\\blur${blur}\\1c${tagColor(look.bg)}\\1a&H${Math.round(255 * (1 - (look.bgAlpha ?? 60) / 100)).toString(16).toUpperCase().padStart(2, '0')}&\\p1}m 0 0 l ${W} 0 ${W} ${h + blur} 0 ${h + blur}{\\p0}`);
    }

    return [
      '[Script Info]',
      `Title: ${assText(opts.title || 'Better Lyric for YouTube')}`,
      'ScriptType: v4.00+',
      `PlayResX: ${W}`,
      `PlayResY: ${H}`,
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      'YCbCr Matrix: TV.709',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      ...styles('Lyric', fs, sungC, textC, A.c),
      ...styles('Left', fs, sungC, textC, A.l),
      ...styles('Right', fs, sungC, textC, A.r),
      ...styles('Trans', transFs, textC, textC, A.c),
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      ...ev,
      '',
    ].join('\n');
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

  return { toLrc, toSrt, toAss, srtStamp, assStamp, assColor, fileName, download, openPublish };
})();
