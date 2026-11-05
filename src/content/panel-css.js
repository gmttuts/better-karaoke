'use strict';

// Stylesheet for the side panel (shadow root, see ui.js).
BYL.PANEL_CSS = `
  :host { all: initial; display: block; margin-bottom: 12px; font-family: Roboto, Arial, sans-serif; }
  /* Shorts: no side column, so the panel floats beside the video. */
  :host([data-float]) { position: fixed; z-index: 2100; top: 72px; width: 360px; max-height: calc(100vh - 88px); overflow-y: auto;
    margin: 0; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,.25); }
  :host([data-float]) .lines { max-height: min(45vh, 420px); }
  :host([data-float]) .row > select { flex-basis: 100%; }
  * { box-sizing: border-box; }
  /* YouTube's own colour variables were renamed and are gone, so keep a
     light and a dark palette here and follow <html dark>. */
  .byl { --base: #fff; --fg: #0f0f0f; --fg2: #606060; --chip: rgba(0,0,0,.05); --line: rgba(0,0,0,.1); --raised: #fff;
    --accent: #ff2e63; --accent2: #ffb800;
    color: var(--fg); background: var(--base); border: 1px solid var(--line); border-radius: 12px;
    overflow: hidden; font-size: 14px; position: relative; }
  header { display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer; user-select: none; }
  .logo { display: grid; place-items: center; flex: none; width: 32px; height: 32px; border-radius: 50%; font-size: 16px;
    background: linear-gradient(135deg, #ff2e63, #ff8a3d); }
  .song { flex: 1; min-width: 0; }
  .song b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .song span { display: block; font-size: 12px; color: var(--fg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chev { color: var(--fg2); transition: transform .2s; }
  .byl.collapsed .chev { transform: rotate(-90deg); }
  .byl.collapsed .body { display: none; }
  nav { display: flex; gap: 2px; margin: 0 12px 10px; padding: 3px; border-radius: 10px; background: var(--chip); }
  nav[hidden] { display: none; }
  nav button { flex: 1 1 auto; min-width: 0; padding-left: 4px; padding-right: 4px; white-space: nowrap; background: transparent; color: var(--fg2); border-radius: 8px; }
  nav button:hover { background: transparent; color: var(--fg); }
  nav button.on { background: var(--raised); color: var(--fg); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
  button { font: inherit; font-size: 13px; font-weight: 500; color: var(--fg); background: var(--chip); border: 0;
    border-radius: 999px; padding: 7px 12px; cursor: pointer; white-space: nowrap; transition: background .15s; }
  button:hover { background: var(--line); }
  button.on { background: var(--fg); color: var(--base); }
  :host-context(html[dark]) .byl { --base: #0f0f0f; --fg: #f1f1f1; --fg2: #aaa; --chip: rgba(255,255,255,.1); --line: rgba(255,255,255,.2);
    --raised: #3f3f3f; color-scheme: dark; }
  :host-context(html[dark]) select option, :host-context(html[dark]) select optgroup { color: #f1f1f1; background: #272727; }
  /* Sources on one line that scrolls sideways (wheel too): the one in use
     first, then those with lyrics, the empty ones last (order from ui.js). */
  .status { display: flex; gap: 4px; padding: 0 12px 8px; overflow-x: auto; scrollbar-width: none; overscroll-behavior: contain;
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); }
  .status::-webkit-scrollbar { display: none; }
  .status .chip { flex: none; white-space: nowrap; }
  .chip { font: inherit; font-size: 12px; font-weight: 400; padding: 3px 10px; border-radius: 999px; background: var(--chip); color: var(--fg2);
    border: 1px solid transparent; cursor: pointer; }
  .chip:hover { border-color: var(--line); background: var(--line); }
  .chip.ok { color: var(--fg); }
  .chip.cur { border-color: var(--accent); color: var(--fg); font-weight: 600; }
  .chip.none { opacity: .6; background: transparent; border-color: var(--line); }
  .chip.idle { border: 1px dashed var(--fg2); }
  .chip.loading { cursor: progress; }
  .chip.loading::after { content: ' …'; }
  .row { display: flex; align-items: center; gap: 6px; padding: 0 12px 10px; flex-wrap: wrap; }
  select { flex: 1; min-width: 0; font: inherit; font-size: 13px; color: var(--fg); background: var(--chip);
    border: 0; border-radius: 10px; padding: 7px 8px; cursor: pointer; outline: none; }
  select.look { min-width: 140px; }
  select:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  select option, select optgroup { color: #0f0f0f; }
  .off { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; font-size: 13px; border-radius: 6px; }
  .off.flash { animation: flash .6s; }
  @keyframes flash { from { background: rgba(255,46,99,.35); } to { background: transparent; } }
  .muted { color: var(--fg2); font-size: 12px; }
  .stale { display: flex; align-items: center; gap: 8px; margin: 0 12px 10px; padding: 8px 10px; border-radius: 10px; font-size: 12px;
    line-height: 1.4; background: rgba(255,46,99,.12); }
  .stale span { flex: 1; }
  .note { margin: 0 12px 10px; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.45; background: rgba(62,166,255,.12); }
  .note:empty { display: none; }
  .offwrap { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
  button.sync { font-weight: 600; }
  button.sync:disabled { opacity: .5; cursor: default; }
  .row.links { padding-top: 8px; border-top: 1px solid var(--line); margin: 0; }
  .row.links button { background: transparent; padding: 5px 10px; color: var(--fg2); }
  .row.links button:hover { background: var(--chip); color: var(--fg); }
  .row.links a { font-size: 13px; text-decoration: none; padding: 5px 10px; border-radius: 999px; }
  .row.links a:hover { background: var(--chip); color: var(--fg); }
  .row.links button.on { background: var(--chip); color: var(--fg); }
  .row.exports { padding-top: 2px; }
  .row.findrow { padding-top: 2px; }
  .row.findrow[hidden] { display: none; }
  .findrow input { flex: 1 1 120px; min-width: 0; font: inherit; font-size: 13px; color: var(--fg); background: var(--chip);
    border: 1px solid transparent; border-radius: 999px; padding: 6px 12px; }
  .findrow input:focus { outline: none; border-color: var(--accent); }
  .findrow button[hidden] { display: none; }
  .row.exports[hidden] { display: none; }
  .warn { margin: 0 12px 10px; padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height: 1.45; background: rgba(255,184,0,.14); }
  .warn:empty { display: none; }
  .lines { position: relative; max-height: min(60vh, 560px); overflow-y: auto; padding: 4px 12px 40px; border-top: 1px solid var(--line); }
  .ln { position: relative; padding: 4px 30px 4px 6px; border-radius: 6px; line-height: 1.45; cursor: pointer; font-size: 15px; transition: color .15s, background .15s; }
  .ln:hover { background: var(--line); }
  .ln.blank { height: 10px; padding: 0; cursor: default; }
  .ln.blank:hover { background: none; }
  .ln.section { color: var(--fg2); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }
  .synced .ln { color: var(--fg2); }
  .ln.active { color: var(--fg); font-weight: 700; background: linear-gradient(90deg, rgba(255,46,99,.18), transparent); }
  .pin { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 13px; padding: 0 4px;
    border-radius: 4px; opacity: 0; }
  .ln:hover .pin { opacity: .8; }
  .pin:hover { opacity: 1; background: var(--line); }
  .ln .tr { font-size: 13px; font-weight: 400; color: var(--fg2); }
  .ln.active .tr { color: var(--fg); opacity: .75; }
  .ln .ts { display: inline-block; min-width: 3.4em; font-size: 11px; font-weight: 400; color: var(--fg2); font-variant-numeric: tabular-nums; }
  .ln.tapnext { outline: 2px dashed rgba(255,46,99,.75); outline-offset: -2px; }
  .tapbar { margin: 0 12px 8px; padding: 8px; border-radius: 8px; background: rgba(255,46,99,.12); font-size: 12px; line-height: 1.45; }
  .tapbar .tapnow { font-size: 14px; font-weight: 600; margin: 6px 0; }
  .tapbar .row { padding: 0; }
  .empty { padding: 16px 12px; color: var(--fg2); font-size: 13px; line-height: 1.5; }
  a { color: inherit; }
  .klist { padding: 0 8px 8px; max-height: min(60vh, 560px); overflow-y: auto; }
  /* Lists show their scrollbar (macOS hides it until you scroll, so a long
     list looked like it ended), and stop at their end instead of scrolling the page. */
  .klist, .lines { overscroll-behavior: contain; }
  .klist::-webkit-scrollbar, .lines::-webkit-scrollbar { width: 8px; }
  .klist::-webkit-scrollbar-thumb, .lines::-webkit-scrollbar-thumb { border-radius: 4px; background: var(--line); }
  .klist::-webkit-scrollbar-thumb:hover, .lines::-webkit-scrollbar-thumb:hover { background: var(--fg2); }
  .kitem { display: flex; gap: 8px; padding: 6px 4px; border-radius: 8px; text-decoration: none; color: inherit; }
  .kitem:hover { background: var(--line); }
  .kitem img { width: 120px; height: 68px; object-fit: cover; border-radius: 6px; flex: none; background: var(--line); }
  .kitem b { font-size: 13px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .kitem .muted { margin-top: 2px; }
  .kitem.hit b::before { content: '🎤 '; }
  .kitem { align-items: center; }
  .kitem > div { flex: 1; min-width: 0; }
  .kitem.cur { background: var(--chip); }
  .kitem button { flex: none; background: transparent; padding: 4px 8px; color: var(--fg2); }
  .kitem button.x { opacity: 0; }
  .kitem:hover button.x { opacity: 1; }
  button.fav { background: transparent; font-size: 18px; line-height: 1; padding: 4px 6px; color: var(--fg2); }
  button.fav:hover { background: var(--chip); }
  button.fav.on, .kitem button.fav.on { color: #f5b301; background: transparent; }
  /* 🌐: a see-through select over the label, so the list shows each
     language under its own name. */
  /* Key and vocal cut on one line: the slider takes what is left. */
  .row.fx { flex-wrap: nowrap; }
  .fx > * { flex: none; white-space: nowrap; }
  .fx input[type=range] { -webkit-appearance: none; appearance: none; flex: 1; min-width: 40px; height: 4px; margin: 0 4px; border-radius: 2px; cursor: pointer;
    background: linear-gradient(90deg, var(--accent, #e8212b) var(--fill, 100%), var(--line) var(--fill, 100%)); }
  .fx input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,.4); }
  .fx input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
  .fx .off.on { color: var(--accent, #e8212b); font-weight: 700; }
  .lang { position: relative; flex: none; font-size: 12px; font-weight: 600; color: var(--fg2); padding: 6px 7px; border-radius: 8px; white-space: nowrap; }
  .lang:hover { background: var(--chip); }

  /* 🎤 Karaoke switch at the top: red while the lyrics are on the video. */
  .ksw { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px 5px 10px; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .ksw .sw { position: relative; width: 28px; height: 16px; border-radius: 8px; background: rgba(0,0,0,.2); transition: background .15s; }
  .ksw .sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: left .15s; }
  .ksw.on, .ksw.on:hover { background: var(--accent); color: #fff; }
  .ksw.on .sw { background: rgba(255,255,255,.38); }
  .ksw.on .sw::after { left: 14px; }
  :host-context(html[dark]) .ksw .sw { background: rgba(255,255,255,.25); }
  :host([data-float]) .ksw .kt { display: none; }
  button.more { flex: none; width: 32px; height: 32px; padding: 0; background: transparent; font-size: 18px; line-height: 1; color: var(--fg2); }
  button.more:hover { background: var(--chip); }

  /* ⋯ menu */
  .menu { position: absolute; right: 10px; top: 52px; z-index: 5; min-width: 230px; padding: 6px; border-radius: 12px; background: var(--raised);
    box-shadow: 0 8px 30px rgba(0,0,0,.22); display: flex; flex-direction: column; }
  .menu[hidden] { display: none; }
  .menu > button { display: block; width: 100%; text-align: left; padding: 8px 10px; border-radius: 8px; background: transparent;
    font-size: 13px; font-weight: 400; color: var(--fg); }
  .menu > button:hover { background: var(--chip); }
  .menu > button.fav { font-size: 13px; line-height: 1.4; }
  .menu > button.fav.on { color: var(--fg); }

  /* Modes: a row with data-m shows only in its mode. */
  .byl[data-mode=view] [data-m]:not([data-m~=view]), .byl[data-mode=sing] [data-m]:not([data-m~=sing]),
  .byl[data-mode=edit] [data-m]:not([data-m~=edit]) { display: none !important; }
  .row.page { padding-top: 2px; }
  .row.page b { font-size: 14px; }
  .lang select { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; font-size: 14px; }

  .studio { margin: 0 12px 10px; padding: 4px 12px 12px; border-radius: 12px; background: var(--chip); }
  .studio[hidden], .studio [hidden] { display: none !important; }
  .studio section + section { border-top: 1px solid var(--line); }
  .studio h4 { margin: 0; padding: 12px 0 8px; font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--fg2); }
  .studio .grid { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px 12px; align-items: center; padding-bottom: 12px; }
  .studio .lbl { font-size: 13px; color: var(--fg2); }
  .studio .ctl { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
  .studio select { flex: 1; background: var(--raised); }
  .studio .range { flex: 1; min-width: 110px; display: flex; align-items: center; gap: 8px; }
  .studio input[type=range] { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 4px; margin: 0; border-radius: 2px; cursor: pointer;
    background: linear-gradient(var(--accent), var(--accent)) 0 / var(--fill, 0%) 100% no-repeat, var(--line); }
  .studio input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff;
    border: 0; box-shadow: 0 1px 3px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.06); transition: transform .12s; }
  .studio input[type=range]:active::-webkit-slider-thumb { transform: scale(1.15); }
  .studio .val { min-width: 38px; padding: 2px 6px; border-radius: 6px; background: var(--raised); font-size: 11px; text-align: center;
    color: var(--fg); font-variant-numeric: tabular-nums; }
  .studio .swatch { -webkit-appearance: none; appearance: none; flex: none; width: 26px; height: 26px; padding: 0; border: 2px solid var(--raised);
    border-radius: 50%; box-shadow: 0 0 0 1px var(--line); background: none; cursor: pointer; }
  .studio .swatch::-webkit-color-swatch-wrapper { padding: 0; }
  .studio .swatch::-webkit-color-swatch { border: 0; border-radius: 50%; }
  .studio .tg { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--fg); cursor: pointer; user-select: none; }
  .studio .tg input { -webkit-appearance: none; appearance: none; position: relative; flex: none; width: 30px; height: 18px; margin: 0;
    border-radius: 999px; background: var(--line); cursor: pointer; transition: background .15s; }
  .studio .tg input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: left .15s; }
  .studio .tg input:checked { background: var(--accent); }
  .studio .tg input:checked::after { left: 14px; }
  .studio .seg { flex: 1; display: flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--line); }
  .studio .seg button { flex: 1; padding: 5px 4px; border-radius: 8px; background: transparent; font-size: 12px; color: var(--fg2); white-space: nowrap; }
  .studio .seg button:hover { color: var(--fg); background: transparent; }
  .studio .seg button.on { background: var(--raised); color: var(--fg); box-shadow: 0 1px 3px rgba(0,0,0,.15); }
  .studio .pads { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .studio .pad { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .studio .pad .muted { width: 28px; flex: none; }
  .studio .pad .range { min-width: 0; }
  .studio .presets { display: flex; gap: 6px; padding-top: 12px; border-top: 1px solid var(--line); flex-wrap: wrap; }
  .studio .presets input[type=text] { flex: 1; min-width: 120px; font: inherit; font-size: 13px; color: var(--fg); background: var(--raised);
    border: 1px solid transparent; border-radius: 999px; padding: 7px 12px; outline: none; }
  .studio .presets input[type=text]:focus { border-color: var(--accent); }
  button.primary { background: var(--accent); color: #fff; }
  button.primary:hover { background: #e8114f; }
  button.danger { color: #e5484d; background: transparent; }
  .editor { margin: 0 12px 8px; }
  .editor[hidden] { display: none; }
  .tawrap { position: relative; }
  .editor textarea, .mirror { font: 14px/1.5 Roboto, Arial, sans-serif; padding: 8px; border: 1px solid var(--line); border-radius: 8px;
    white-space: pre-wrap; overflow-wrap: break-word; letter-spacing: normal; }
  .editor textarea { position: relative; z-index: 1; display: block; width: 100%; height: 360px; min-height: 120px; resize: vertical;
    color: var(--fg); background: transparent; }
  /* Same text laid out behind the (transparent) textarea, to paint the line
     playing now and the search hits. */
  .mirror { position: absolute; inset: 0; overflow: hidden; pointer-events: none; color: transparent; border-color: transparent;
    background: var(--base); }
  .mirror .now { background: rgba(255,46,99,.22); border-radius: 3px; box-shadow: -4px 0 0 rgba(255,46,99,.22), 4px 0 0 rgba(255,46,99,.22); }
  .mirror mark { color: transparent; background: rgba(255,184,0,.45); border-radius: 2px; }
  .mirror mark.cur { background: rgba(255,120,0,.9); }
  .editor .esearch { padding: 0 0 6px; flex-wrap: nowrap; }
  .editor .esearch input { flex: 1; min-width: 0; font: inherit; font-size: 13px; color: var(--fg); background: transparent;
    border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; }
  .editor .esearch button { padding: 4px 8px; }
  .editor label { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--fg2); cursor: pointer; }
  .editor label input { accent-color: var(--accent); margin: 0; }
  .grip { height: 10px; cursor: ns-resize; display: flex; align-items: center; justify-content: center; touch-action: none; }
  .grip::before { content: ''; width: 36px; height: 4px; border-radius: 2px; background: var(--line); }
  .grip:hover::before { background: var(--fg2); }
  .grip[hidden] { display: none; }
  .editor .row { padding: 6px 0 0; }
  .editor .tip { font-size: 12px; color: var(--fg2); line-height: 1.45; margin-bottom: 6px; }
  .empty button { margin-top: 8px; }
`;
