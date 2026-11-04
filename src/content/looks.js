'use strict';

// Overlay looks: the built-in styles, the 🎨 knobs and how a look is painted
// onto a renderer (the lyrics on the video and in the floating window).
BYL.look = (() => {
  // A look is a plain object of CSS knobs. The built-in styles are just looks;
  // the 🎨 editor changes the knobs and can save the result as a preset.
  // strokeW / tracking are in 1/100 em, dim / bgAlpha / nextScale / scale /
  // margin in percent.
  const KARAOKE_FONT = '"BYL Condensed", "Arial Narrow"';
  const BASE_LOOK = {
    font: '', // Roboto, like YouTube
    weight: 800,
    text: '#ffffff',
    textGrad: true, // white fading to silver, like karaoke discs
    dim: 100, // opacity of the words not sung yet (0: outline only)
    upper: false,
    tracking: 1,
    sung: '#e8212b',
    sung2: '',
    mark: '', // highlighter behind the sung words
    glow: false, // the sung words light up in their colours
    stroke: '#101010',
    sstroke: '#ffffff',
    strokeW: 20,
    shadow: true,
    shape: 'none',
    bg: '#000000',
    bgAlpha: 60,
    layout: 'stagger',
    nextScale: 100,
    scale: 115,
    margin: 10,
    wipe: 'word',
  };
  // Chữ thường trắng viền đen; chữ đã hát đổi màu và đổi viền sang trắng, bóng
  // đổ tối phía dưới giữ chữ đọc được trên mọi nền.
  BYL.LOOKS = {
    red: { get name() { return L('Karaoke đỏ'); }, look: {} },
    classic: { get name() { return L('Karaoke xanh dương'); }, look: { sung: '#3346f2' } },
    focus: {
      get name() { return L('Nổi bật'); },
      look: { textGrad: false, sung: '#ffe066', sung2: '#ff7aa2', strokeW: 0, layout: 'center2', nextScale: 50, scale: 100, margin: 13 },
    },
    box: {
      get name() { return L('Khung tối'); },
      look: { weight: 700, textGrad: false, sung: '#ffd23f', strokeW: 0, shadow: false, shape: 'box', bg: '#0a0a0e', bgAlpha: 62, layout: 'center2', nextScale: 55, scale: 100, margin: 13 },
    },
    captions: {
      get name() { return L('Phụ đề YouTube'); },
      look: { weight: 500, textGrad: false, sung: '#ffe14d', strokeW: 0, shadow: false, shape: 'lines', bg: '#080808', bgAlpha: 75, layout: 'center2', nextScale: 85, scale: 80, margin: 7 },
    },
    cinema: {
      get name() { return L('Dải điện ảnh'); },
      look: { weight: 600, textGrad: false, sung: '#7fd4ff', strokeW: 0, shape: 'band', bg: '#000000', bgAlpha: 50, layout: 'center2', nextScale: 60, scale: 90, margin: 6 },
    },
    fade: {
      get name() { return L('Sáng dần'); },
      look: { textGrad: false, dim: 45, sung: '#ffffff', strokeW: 0, shadow: false, shape: 'fade', bg: '#000000', bgAlpha: 60, layout: 'center2', nextScale: 75, scale: 115, margin: 12 },
    },
    big: {
      get name() { return L('Chữ lớn'); },
      look: { font: KARAOKE_FONT, weight: 900, textGrad: false, upper: true, stroke: '#000000', sstroke: '#000000', strokeW: 14, sung: '#ffe600', layout: 'single', scale: 175, margin: 36 },
    },
    mini: {
      get name() { return L('Gọn nhẹ'); },
      look: { weight: 600, textGrad: false, sung: '#ffd23f', strokeW: 0, shadow: false, shape: 'pill', layout: 'single', scale: 62, margin: 9 },
    },
  };
  // Padding inside the box / pill, in 1/100 em (top, right, bottom, left).
  // Left unset, each shape keeps its own default.
  const PAD_KEYS = ['padT', 'padR', 'padB', 'padL'];
  const SHAPE_PAD = { box: [35, 90, 45, 90], pill: [20, 80, 20, 80], band: [30, 0, 35, 0], lines: [6, 30, 10, 30], fade: [0, 0, 0, 0], none: [0, 0, 0, 0] };
  const padOf = (look, k) => look[k] ?? (SHAPE_PAD[look.shape] || SHAPE_PAD.none)[PAD_KEYS.indexOf(k)];
  // Labels go through L() where they're shown.
  const FONTS = [
    [KARAOKE_FONT, 'Chữ hẹp karaoke'],
    ['', 'Roboto (như YouTube)'],
    ['Arial, sans-serif', 'Arial'],
    ['Tahoma, sans-serif', 'Tahoma'],
    ['Verdana, sans-serif', 'Verdana'],
    ['"Trebuchet MS", sans-serif', 'Trebuchet'],
    ['Georgia, serif', 'Georgia (có chân)'],
    ['"Times New Roman", serif', 'Times New Roman'],
    ['"Comic Sans MS", cursive', 'Comic Sans'],
  ];

  // Roboto Condensed (bundled, Vietnamese subset included) for the karaoke
  // looks. Loaded through FontFace from bytes so YouTube's CSP doesn't apply.
  const FONT_FILES = [
    ['rc-latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
    ['rc-latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF'],
    ['rc-vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'],
  ];
  let fontBytes = null;
  async function loadFont(win) {
    try {
      fontBytes ||= Promise.all(FONT_FILES.map(([f]) => fetch(chrome.runtime.getURL(`fonts/${f}.woff2`)).then((r) => r.arrayBuffer())));
      const bufs = await fontBytes;
      for (let i = 0; i < bufs.length; i++) {
        const face = new win.FontFace('BYL Condensed', bufs[i].slice(0), { weight: '700 900', unicodeRange: FONT_FILES[i][1] });
        win.document.fonts.add(await face.load());
      }
    } catch (err) {
      console.debug('[Better Karaoke] font', err);
    }
  }

  const presetLook = (key) => {
    if (key?.startsWith('u:')) {
      const p = (BYL.settings.value.overlayPresets || []).find((x) => 'u:' + x.name === key);
      if (p) return p.look;
    }
    return (BYL.LOOKS[key] || BYL.LOOKS.classic).look;
  };

  const rgba = (hex, alpha) => {
    const n = parseInt(String(hex).replace('#', ''), 16) || 0;
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha / 100})`;
  };

  const OVERLAY_CSS = `
    :host { all: initial; position: absolute; left: 0; right: 0; bottom: max(var(--my, 13%), var(--lift, 0px)); z-index: 59; pointer-events: none;
      display: flex; justify-content: center; font-family: var(--font, Roboto), Roboto, Arial, sans-serif; }
    :host([data-pos=top]) { bottom: auto; top: var(--my, 13%); }
    :host([data-pip]) { position: absolute; inset: 0; align-items: center; }
    .ov { display: flex; flex-direction: column; align-items: center; max-width: 90%; text-align: center; }
    :host([data-pip]) .ov { max-width: 94%; }
    .ov:empty { display: none; }
    .l { line-height: 1.22; letter-spacing: var(--ls, .01em); font-weight: var(--wt, 800); color: var(--text, #fff);
      paint-order: stroke fill; -webkit-text-stroke: var(--sw, 0) var(--stroke, #000); filter: var(--shadow, none); }
    .w { position: relative; display: inline-block; white-space: pre; }
    /* Silver sheen sits on its own layer over the outlined text: on the text
       itself the transparent fill would let the stroke show through. */
    :host([data-tgrad]) .w::before { content: attr(data-t); position: absolute; left: 0; top: 0; -webkit-text-stroke: 0;
      background: linear-gradient(180deg, var(--text) 40%, #bfc3cc); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .w .f { position: absolute; left: 0; top: 0; color: var(--sung); -webkit-text-stroke-color: var(--sstroke); text-shadow: none;
      clip-path: inset(-20% calc(100% - var(--p, 0%)) -20% -20%); }
    /* The sung layer's outline pokes out past the word box, so an unsung word
       would show a sliver of it at its left edge: hide it until it starts. */
    .w:not(.s) .f { visibility: hidden; }
    :host([data-grad]) .w .f { background: linear-gradient(90deg, var(--sung), var(--sung2)); -webkit-background-clip: text;
      background-clip: text; color: transparent; }
    .prev, .next { font-size: var(--next, .8em); }
    .prev { opacity: .6; margin-bottom: .15em; }
    .next { opacity: .8; margin-top: .2em; }
    .tr { font-size: var(--trs, .7em); margin-top: .1em; }
    .hint { font-size: .45em; color: #fff; opacity: .85; -webkit-text-stroke: 0; filter: none; text-shadow: 0 1px 3px #000; font-weight: 500; font-family: Roboto, Arial, sans-serif; }

    :host([data-shape=box]) .ov { background: var(--bg); backdrop-filter: blur(6px); padding: var(--pad); border-radius: .45em; }
    /* Phủ mờ: a shade rising from the bottom of the video (from the top when
       the lyrics are on top), the words float on it without a box. */
    :host([data-shape=fade])::before { content: ''; position: absolute; left: -100vmax; right: -100vmax; top: -1.8em; bottom: -100vmax; z-index: -1;
      background: linear-gradient(transparent, var(--bg) 1.8em); }
    :host([data-shape=fade][data-pos=top])::before { top: -100vmax; bottom: -1.8em; background: linear-gradient(var(--bg) calc(100% - 1.8em), transparent); }
    :host([data-upper]) .l { text-transform: uppercase; }
    :host([data-glow]) .w .f { filter: drop-shadow(0 0 .05em #fff) drop-shadow(0 0 .14em var(--sung)) drop-shadow(0 0 .4em var(--sung2)); }
    /* Bút dạ quang: the sung part gets a marker behind it, swept with the words. */
    :host([data-mark]) .w .f { background: var(--mark); -webkit-background-clip: border-box; background-clip: border-box; color: var(--sung);
      border-radius: .08em; box-shadow: 0 0 0 .04em var(--mark); }
    :host([data-shape=pill]) .ov { background: var(--bg); padding: var(--pad); border-radius: 999px; }
    /* Dải ngang: a band across the whole video, like film subtitles. The
       shadow spreads sideways and the player clips it at its edges. */
    :host([data-shape=band]) .ov { background: var(--bg); padding: var(--pad); box-shadow: 0 0 0 100vmax var(--bg); clip-path: inset(0 -100vmax); }
    /* Từng dòng: each line on its own box, like YouTube captions. */
    :host([data-shape=lines]) .l { width: fit-content; max-width: 100%; background: var(--bg); padding: var(--pad); border-radius: .2em; }
    :host([data-shape=lines][data-layout=stagger]) .next, :host([data-shape=lines][data-layout=stagger]) .ov.flip .cur,
    :host([data-shape=lines][data-layout=stagger]) .ov.flip .tr { margin-left: auto; }

    /* So le: classic karaoke machine, two lines that take turns */
    :host([data-layout=stagger]) .ov { align-items: stretch; min-width: min(60%, 18em); }
    :host([data-layout=stagger]) .prev { display: none; }
    :host([data-layout=stagger]) .cur { text-align: left; }
    :host([data-layout=stagger]) .next { text-align: right; opacity: 1; margin-top: .15em; }
    :host([data-layout=stagger]) .ov.flip .cur { text-align: right; order: 2; margin-top: .15em; }
    :host([data-layout=stagger]) .ov.flip .next { text-align: left; order: 1; margin-top: 0; }
    :host([data-layout=stagger]) .tr { text-align: left; }
    :host([data-layout=stagger]) .ov.flip .tr { text-align: right; order: 3; }
    :host([data-layout=center2]) .prev { display: none; }
    :host([data-layout=single]) .prev, :host([data-layout=single]) .next { display: none; }
  `;

  // Push a look onto a renderer host as CSS variables / attributes.
  function paintLook(host, look) {
    const s = host.style;
    s.setProperty('--font', look.font || 'Roboto');
    s.setProperty('--wt', look.weight);
    s.setProperty('--text', rgba(look.text, look.dim ?? 100));
    s.setProperty('--ls', (look.tracking ?? 1) / 100 + 'em');
    s.setProperty('--mark', look.mark || 'transparent');
    s.setProperty('--sung', look.sung);
    s.setProperty('--sung2', look.sung2 || look.sung);
    s.setProperty('--stroke', look.stroke);
    s.setProperty('--sstroke', look.strokeW ? look.sstroke : 'transparent');
    s.setProperty('--sw', look.strokeW / 100 + 'em');
    // drop-shadow (not text-shadow) so it stays behind gradient-filled text.
    s.setProperty('--shadow', look.shadow ? 'drop-shadow(.03em .06em .02em rgba(0,0,0,.6)) drop-shadow(0 0 .12em rgba(0,0,0,.35))' : 'none');
    s.setProperty('--bg', rgba(look.bg, look.bgAlpha));
    s.setProperty('--next', look.nextScale / 100 + 'em');
    s.setProperty('--trs', (look.nextScale * 0.7) / 100 + 'em');
    s.setProperty('--pad', PAD_KEYS.map((k) => padOf(look, k) / 100 + 'em').join(' '));
    s.setProperty('--my', look.margin + '%');
    host.dataset.layout = look.layout;
    host.dataset.shape = look.shape;
    host.toggleAttribute('data-tgrad', !!look.textGrad);
    host.toggleAttribute('data-grad', !!look.sung2 && look.sung2 !== look.sung);
    host.toggleAttribute('data-upper', !!look.upper);
    host.toggleAttribute('data-glow', !!look.glow);
    host.toggleAttribute('data-mark', !!look.mark);
    host.dataset.pos = BYL.settings.value.overlayPosition === 'top' ? 'top' : 'bottom';
  }

  // A style key (built-in or 'u:<preset>') plus the user's edits on top.
  const compose = (style, tweaks) => ({ ...BASE_LOOK, ...presetLook(style), ...(tweaks || {}) });

  return { KARAOKE_FONT, BASE_LOOK, PAD_KEYS, SHAPE_PAD, padOf, FONTS, loadFont, presetLook, compose, OVERLAY_CSS, paintLook };
})();
