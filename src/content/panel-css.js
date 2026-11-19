'use strict';

// Stylesheet for the side panel (shadow root, see ui.js).
BYL.PANEL_CSS = `
  :host { all: initial; display: block; margin-bottom: 32px; font-family: 'BYL Sans', 'Google Sans Flex', 'Google Sans', Roboto, Arial, sans-serif; }
  /* Shorts: no side column, so the panel floats beside the video. */
  :host([data-float]) { position: fixed; z-index: 2100; top: 72px; width: 360px; max-height: calc(100vh - 88px); overflow-y: auto;
    margin: 0; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,.25); }
  :host([data-float]) .lines { max-height: min(45vh, 420px); }
  :host([data-float]) .row > select { flex-basis: 100%; }
  * { box-sizing: border-box; }
  /* YouTube's own colour variables were renamed and are gone, so keep a
     light and a dark palette here and follow <html dark>. */
  /* Surfaces, text and borders follow YouTube's own theme (light / dark);
     the brand pink #FF2E63 marks what is on or playing. */
  .byl { --surface: #fff; --surface-low: #f2f2f2; --surface-high: #e5e5e5; --surface-bright: #fff; --on-surface: #0f0f0f; --on-surface-var: #606060;
    --outline: #909090; --outline-var: rgba(0,0,0,.1); --primary: #ff2e63; --on-primary: #fff; --primary-cont: rgba(255,46,99,.12); --on-primary-cont: #c2003f;
    --sec-cont: rgba(255,46,99,.12); --on-sec-cont: #0f0f0f; --scrim: rgba(0,0,0,.3);
    --base: var(--surface); --fg: var(--on-surface); --fg2: var(--on-surface-var); --chip: rgba(34,25,26,.06); --line: var(--outline-var); --raised: var(--surface-bright);
    --accent: var(--primary); --accent2: #ffb800;
    color: var(--fg); background: var(--base); border: 1px solid var(--line); border-radius: 12px;
    overflow: hidden; font-size: 14px; position: relative; }
  header { display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer; user-select: none; }
  .logo { display: block; flex: none; width: 34px; height: 34px; border-radius: 9px; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
  .song { flex: 1; min-width: 0; }
  .song b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .song span { display: block; font-size: 12px; color: var(--fg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chev { color: var(--fg2); transition: transform .2s; }
  .byl.drop { outline: 2px dashed var(--accent); outline-offset: -2px; }
  .byl.collapsed .chev { transform: rotate(-90deg); }
  .fold { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--fg2); }

  .fold .ft::after { content: attr(data-open); }
  .byl.collapsed .fold .ft::after { content: attr(data-closed); }
  .khint { position: relative; margin: -4px 12px 10px auto; width: max-content; max-width: calc(100% - 24px); display: flex; align-items: center; gap: 6px;
    padding: 7px 8px 7px 12px; border-radius: 10px; background: var(--accent, #e8212b); color: #fff; font-size: 12.5px; font-weight: 600; box-shadow: 0 6px 18px rgba(232,33,43,.3); }
  .khint::before { content: ''; position: absolute; top: -5px; right: 96px; width: 10px; height: 10px; background: inherit; transform: rotate(45deg); }
  .khint[hidden] { display: none; }
  .khint button { background: rgba(255,255,255,.2); color: #fff; padding: 2px 7px; }
  .byl.collapsed .khint { display: none; }
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
  :host-context(html[dark]) .byl { --surface: #0f0f0f; --surface-low: #272727; --surface-high: #3f3f3f; --surface-bright: #282828; --on-surface: #f1f1f1;
    --on-surface-var: #aaa; --outline: #717171; --outline-var: rgba(255,255,255,.2); --primary: #ff4f7b; --on-primary: #fff; --primary-cont: rgba(255,79,123,.18); --on-primary-cont: #ff8fab;
    --sec-cont: rgba(255,79,123,.18); --on-sec-cont: #f1f1f1; --chip: rgba(255,255,255,.1); color-scheme: dark; }
  :host-context(html[dark]) select option, :host-context(html[dark]) select optgroup { color: #f1f1f1; background: #272727; }
  /* Sources on two lines at most (+N for the rest): the one in use first,
     then those with lyrics, the empty ones last (order from ui.js). */
  .srchead { display: flex; align-items: center; gap: 6px; padding: 0 12px 6px; font-size: 12px; }
  .srchead .muted { flex: 1; font-weight: 600; }
  .srchead button { padding: 3px 9px; font-size: 12px; }
  .srchead button.star.on { background: #fff4c2; color: #8a5a00; }
  :host-context(html[dark]) .srchead button.star.on { background: #4a3b12; color: #ffd75e; }
  .status { display: flex; flex-wrap: wrap; gap: 5px 4px; padding: 0 12px 8px; }
  .status .chip { flex: none; white-space: nowrap; }
  .status .chip[hidden] { display: none; }
  .status .chip.more { font-weight: 600; color: var(--fg); }
  /* ⇆ So sánh lời: a dialog over the page, two versions line by line. */
  .cmp { --cb: #fff; --cf: #0f0f0f; --cm: #606060; --cl: rgba(0,0,0,.1); --cd: #fff4d6; position: fixed; inset: 0; z-index: 2147483000;
    background: rgba(0,0,0,.45); display: grid; place-items: center; padding: 24px; font: 13px Roboto, Arial, sans-serif; color: var(--cf); }
  :host-context(html[dark]) .cmp { --cb: #212121; --cf: #f1f1f1; --cm: #aaa; --cl: rgba(255,255,255,.14); --cd: #4a3b12; }
  .cmp .dlg { width: min(980px, 100%); max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: var(--cb); border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,.4); overflow: hidden; }
  .cmp .chead, .cmp .cfoot { display: flex; align-items: center; gap: 10px; padding: 14px 18px; flex-wrap: wrap; }
  .cmp .chead b { font-size: 16px; }
  .cmp .chead select { flex: 1; min-width: 160px; font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--cl); background: var(--cb); color: var(--cf); }
  .cmp .x { margin-left: auto; }
  .cmp .muted { color: var(--cm); }
  .cmp .cfoot { border-top: 1px solid var(--cl); }
  .cmp .cfoot .muted { flex: 1; min-width: 200px; }
  .cmp .ccols, .cmp .crow { display: grid; grid-template-columns: 52px minmax(0, 1fr) 34px minmax(0, 1fr); gap: 8px; align-items: center; padding: 3px 18px; }
  .cmp .ccols { font-size: 12px; font-weight: 600; color: var(--cm); border-bottom: 1px solid var(--cl); padding-bottom: 8px; }
  .cmp .ccols span:first-child { grid-column: 2; }
  .cmp .ccols span:last-child { grid-column: 4; }
  .cmp .cgrid { overflow: auto; padding: 6px 0; }
  .cmp .crow.diff { background: var(--cd); }
  .cmp .cgrid { position: relative; }
  .cmp .timed .ccols, .cmp .timed .crow { grid-template-columns: 136px minmax(0, 1fr) 34px minmax(0, 1fr); }
  .cmp .ctimes { display: flex; gap: 4px; }
  .cmp input.tin { width: 64px; flex: none; padding: 5px 3px; text-align: center; font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .cmp input.tin.bad { border-color: #e8212b; background: #ffe8e8; }
  .cmp .crow.tchg input.tin { border-color: #3ea6ff; }
  .cmp .crow.sel { box-shadow: inset 0 0 0 1.5px #3ea6ff; }
  .cmp .crow.now.sel { box-shadow: inset 4px 0 0 #e8212b, inset 0 0 0 1.5px #3ea6ff; }
  .cmp .cclock { display: flex; align-items: center; gap: 8px; padding: 0 18px 12px; flex-wrap: wrap; }
  .cmp .cclock[hidden] { display: none; }
  .cmp .cclock button { font-variant-numeric: tabular-nums; }
  .cmp .cclock .muted { font-size: 12px; flex: 1; min-width: 220px; }
  .cmp .crow.now { box-shadow: inset 4px 0 0 #e8212b; background: rgba(232,33,43,.08); }
  .cmp .crow.now .ct { color: #e8212b; font-weight: 700; }
  .cmp .crow.now .ct::before { content: '♪ '; }
  .cmp .crow.chg input { border-color: #e8212b; }
  .cmp .crow.chg button.use { color: #e8212b; border-color: #e8212b; font-size: 17px; line-height: 1; padding: 3px 0 5px; }
  .cmp .ct { font-variant-numeric: tabular-nums; color: var(--cm); font-size: 12px; }
  .cmp input { font: inherit; width: 100%; padding: 5px 7px; border-radius: 6px; border: 1px solid var(--cl); background: var(--cb); color: var(--cf); }
  .cmp .cr { line-height: 1.35; }
  .cmp button { font: 600 13px Roboto, Arial, sans-serif; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--cl); background: var(--cb); color: var(--cf); cursor: pointer; }
  .cmp button.use { padding: 4px 0; }
  .cmp button:disabled { opacity: .3; cursor: default; }
  .cmp button.primary { background: #e8212b; border-color: #e8212b; color: #fff; }
  .chip.best::before { content: none; }
  /* A source with several versions: the list to pick one from. */
  .picks { margin: -2px 12px 10px; padding: 6px; border-radius: 12px; background: var(--raised); box-shadow: 0 6px 24px rgba(0,0,0,.18); display: flex; flex-direction: column; gap: 2px; }
  .picks[hidden] { display: none; }
  .picks .phead { font-size: 12px; color: var(--fg2); padding: 4px 8px 6px; }
  .picks button { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left; background: transparent; padding: 7px 10px; border-radius: 8px; }
  .picks button:hover { background: var(--chip); }
  .picks button.on { background: var(--chip); color: var(--fg); box-shadow: inset 3px 0 0 var(--accent, #e8212b); }
  .picks button b { font-size: 13px; }
  .picks button .muted { font-size: 11.5px; font-weight: 400; }
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
  .row[hidden] { display: none !important; }
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
  .ln.pinned .pin { opacity: 1; background: rgba(255,46,99,.12); }
  .ln.pinned { box-shadow: inset 3px 0 0 rgba(255,46,99,.55); }
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
  .row.speed button { padding-left: 9px; padding-right: 9px; }
  .row.speed button.round { width: 30px; height: 30px; padding: 0; border-radius: 50%; display: inline-grid; place-items: center; font-size: 17px; line-height: 1; flex: none; }
  .row.speed .off { min-width: 44px; text-align: right; cursor: pointer; font-variant-numeric: tabular-nums; }
  .row.speed.steps { margin-top: -4px; }
  .row.speed.steps button { flex: 1 1 0; min-width: 0; padding-left: 4px; padding-right: 4px; }
  button.mic { background: var(--accent, #e8212b); color: #fff; }
  button.mic:hover { background: var(--accent, #e8212b); filter: brightness(1.08); }
  .row.fx { min-width: 0; }
  .fx input[type=range] { -webkit-appearance: none; appearance: none; flex: 1 1 0; min-width: 32px; height: 4px; margin: 0 4px; border-radius: 2px; cursor: pointer;
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
  /* A narrow side column: room for the song's name before the buttons. */
  .byl { container-type: inline-size; }
  @container (max-width: 380px) { .ksw .kt, .logo, .fold .ft { display: none; } }

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
  .studio h4 .acts { float: right; display: flex; gap: 4px; margin-top: -5px; text-transform: none; letter-spacing: 0; }
  .studio button.mini { padding: 3px 8px; font-size: 13px; background: var(--raised); }
  .studio .presets.top { padding-top: 10px; border-top: 0; }
  .studio .presets.top + .presets { border-top: 0; padding-top: 8px; padding-bottom: 4px; }
  .seg.pos { flex: none; display: inline-flex; gap: 0; padding: 2px; border-radius: 10px; background: var(--chip); }
  .seg.pos button { padding: 5px 7px; background: transparent; }
  .seg.pos button.on { background: var(--raised); box-shadow: 0 1px 3px rgba(0,0,0,.15); color: var(--fg); }
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
  .row.tr button:disabled { opacity: .6; cursor: progress; }
  .row.tr .new { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 1px 6px; border-radius: 9px; background: #ffd400; color: #111; }
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
  .mirror .sel { box-shadow: inset 0 0 0 1.5px #3ea6ff; border-radius: 3px; }
  .mirror .now.sel { box-shadow: inset 0 0 0 1.5px #3ea6ff, -4px 0 0 rgba(255,46,99,.22), 4px 0 0 rgba(255,46,99,.22); }
  .clock { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 12.5px; padding: 5px 9px; border-radius: 8px; background: rgba(62,166,255,.14); color: #0b6bcb; white-space: nowrap; }
  :host-context(html[dark]) .clock { color: #7cc4ff; }
  .lineinfo button.link[hidden] { display: none; }
  .lineinfo button.link { background: none; border: 0; padding: 0; color: #0b6bcb; font-size: 12px; cursor: pointer; text-decoration: underline; }
  .editor .lineinfo { font-size: 12px; padding: 6px 2px 0; line-height: 1.4; }
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
  .editor > .tip { margin-top: 8px; }
  .editor .tip { font-size: 12px; color: var(--fg2); line-height: 1.45; margin-bottom: 6px; }
  .empty button { margin-top: 8px; }

  /* ================= v3 layout ================= */
  .byl { border-radius: 16px; border-color: var(--outline-var); background: var(--surface); font-size: 14px; letter-spacing: .1px; overflow: hidden; }
  button { font-family: inherit; }
  .ico { display: inline-grid; place-items: center; flex: none; line-height: 0; }
  .ico svg { fill: currentColor; }
  button:focus-visible, .ver:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .iconbtn { width: 40px; height: 40px; padding: 0; border-radius: 50%; display: inline-grid; place-items: center; flex: none; background: transparent; color: var(--fg2); }
  .iconbtn:hover { background: var(--chip); color: var(--fg); }
  .outline { background: transparent; border: 1px solid var(--outline-var); color: var(--fg); }
  .outline:hover { background: var(--chip); }
  button.text { background: transparent; color: var(--primary); font-weight: 600; }
  button.text:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }

  /* header */
  header { gap: 8px; padding: 12px 8px 12px 12px; border-bottom: 1px solid var(--outline-var); }
  .byl.collapsed header { border-bottom: 0; }
  .avatar { width: 44px; height: 44px; border-radius: 12px; background: var(--primary-cont); display: grid; place-items: center; flex: none; }
  .avatar .logo { width: 30px; height: 30px; border-radius: 8px; box-shadow: none; }
  .song b { font-size: 16px; font-weight: 500; line-height: 22px; }
  .song span { font-size: 13px; line-height: 18px; }
  .kara { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 10px; font-weight: 500; flex: none; }
  .back { display: none; margin-left: -4px; }
  .byl.sub .back { display: inline-grid; }
  .byl.sub .avatar, .byl.sub .kara { display: none; }
  .fold .ico { transition: transform .2s; }
  .byl.collapsed .fold .ico { transform: rotate(180deg); }
  .lytg { position: relative; width: 40px; height: 40px; padding: 0; border-radius: 50%; display: inline-grid; place-items: center; flex: none;
    background: transparent; color: var(--fg2); }
  .lytg:hover { background: var(--chip); }
  .lytg.on, .lytg.on:hover { background: var(--sec-cont); color: var(--primary); }
  .lytg:not(.on)::after { content: ''; position: absolute; width: 24px; height: 2px; border-radius: 1px; background: currentColor; transform: rotate(-45deg); }
  .lytg.head { display: none; }
  .byl.collapsed .lytg.head { display: inline-grid; }
  @container (max-width: 380px) { .kara span { display: none; } .kara { padding: 0 8px; } .avatar { display: none; } }

  /* ⋯ menu */
  .menu { right: 8px; top: 60px; z-index: 30; min-width: 260px; padding: 8px 0; border-radius: 16px; background: var(--surface-bright);
    border: 1px solid var(--outline-var); box-shadow: 0 6px 24px rgba(34,25,26,.18); }
  .menu > .mi, .menu > button { display: flex; align-items: center; gap: 12px; width: 100%; height: 44px; padding: 0 16px; border-radius: 0;
    background: transparent; font-size: 14px; font-weight: 400; color: var(--fg); text-align: left; }
  .menu > .mi:hover, .menu > button:hover { background: var(--chip); }
  .menu .mi .ico { color: var(--fg2); }
  .menu .mt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .menu .mk { font-size: 12px; color: var(--fg2); }
  .menu .sep { height: 1px; background: var(--outline-var); margin: 8px 0; }
  .menu > .lang { position: relative; height: 44px; padding: 0 16px; border-radius: 0; display: flex; align-items: center; font-size: 14px; font-weight: 400; color: var(--fg); }

  /* body: lyrics | sources */
  nav { display: none !important; }
  .cols { display: flex; flex-direction: column; }
  .cols[hidden] { display: none; }
  .main { min-width: 0; padding-top: 8px; }
  .side { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 10px 12px 8px; order: -1; border-bottom: 1px solid var(--outline-var); }
  .colhead { display: flex; align-items: center; gap: 4px; width: 100%; font-size: 13px; color: var(--fg2); }
  .colhead .ct { flex: 1; font-weight: 500; }
  .syncbtn { position: relative; width: 32px; height: 32px; margin: -6px -6px -6px 0; color: var(--primary); }
  .syncbtn[hidden] { display: none; }
  .syncbtn.adj::after { content: ''; position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border-radius: 50%; background: var(--primary);
    box-shadow: 0 0 0 2px var(--surface); }
  .status { padding: 0; gap: 6px; flex: 1 1 100%; }
  .status .chip { height: 32px; padding: 0 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--fg); background: transparent;
    border: 1px solid var(--outline-var); display: inline-flex; align-items: center; gap: 6px; }
  .status .chip:hover { background: var(--chip); border-color: var(--outline-var); }
  .status .chip.cur { background: var(--sec-cont); border-color: transparent; color: var(--on-sec-cont); }
  .status .chip.cur::after { content: '✓'; margin-left: auto; font-weight: 700; }
  .status .chip.loading::after { content: ' …'; }
  .status .chip.none { opacity: .55; border-style: dashed; }
  .status .chip.best { font-weight: 600; }
  .trrow { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .trrow[hidden] { display: none; }
  .chip2 { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
    background: transparent; border: 1px solid var(--outline-var); color: var(--fg); }
  .chip2:hover { background: var(--chip); }
  .chip2.on { background: var(--sec-cont); border-color: transparent; color: var(--on-sec-cont); }
  .chip2 .ico { color: var(--fg2); }
  .chip2.on .ico { color: inherit; }
  /* wide: two columns, sources listed down the right */
  .byl.wide .cols { flex-direction: row; align-items: stretch; }
  .byl.wide .main { flex: 1 1 auto; }
  .byl.wide .side { order: 0; flex: 0 0 200px; flex-direction: column; flex-wrap: nowrap; align-items: stretch; gap: 8px; padding: 14px 12px 12px;
    border-bottom: 0; border-left: 1px solid var(--outline-var); }
  .byl.wide .status { flex-direction: column; flex-wrap: nowrap; flex: 0 0 auto; }
  .byl.wide .status .chip { width: 100%; justify-content: flex-start; text-align: left; overflow: hidden; text-overflow: ellipsis; }
  .byl.wide .trrow { margin: auto 0 0; }
  .byl.wide .lines { border-top: 0; }
  .lines { border-top: 0; padding: 4px 12px 24px; }
  .ln { font-size: 15px; padding: 5px 30px 5px 8px; border-radius: 8px; }
  .ln.active { background: var(--primary-cont); color: var(--on-primary-cont); font-weight: 600; }
  .ln.active .tr { color: var(--on-primary-cont); }
  .warn, .note, .stale { border-radius: 12px; }
  .row.links { border-top: 1px solid var(--outline-var); padding-top: 8px; margin-bottom: 8px; }

  /* dock */
  .dock { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 8px 8px 16px; border-top: 1px solid var(--outline-var); min-height: 60px; }
  .byl.collapsed .dock { display: none; }
  .byl[data-mode=karaoke] .dock, .byl[data-page=history] .dock { display: none; }
  .sa { display: inline-flex; align-items: center; gap: 8px; padding: 6px 4px; background: transparent; font-size: 14px; font-weight: 500; color: var(--fg); }
  .sa:hover, .sa.on, .sa.on:hover { background: transparent; color: var(--fg); }
  .speedpop .row > .muted:first-child { display: none; }
  .tile .sample { max-width: 100%; overflow: hidden; }
  .sa .sw { position: relative; width: 36px; height: 20px; border-radius: 999px; background: var(--surface-high); border: 2px solid var(--outline); transition: .15s; flex: none; }
  .sa .sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--outline); transition: .15s; }
  .sa.on .sw { background: var(--primary); border-color: var(--primary); }
  .sa.on .sw::after { left: 17px; top: 1px; width: 14px; height: 14px; background: var(--on-primary); }
  .tools { display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0; }
  .byl.notools .tools { display: none; }
  .dock .lytg { margin-left: auto; }
  .tools .grow { flex: 1; }
  .keypop .keyrow { flex-wrap: nowrap; justify-content: space-between; gap: 8px; padding: 0; border: 0; height: auto; }
  .keypop .keyrow button { width: auto; height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--outline-var); background: transparent; }
  .keypop .keyrow .off { font-size: 24px; font-weight: 500; color: var(--primary); min-width: 48px; }
  .dock .stepper { display: inline-flex; align-items: center; height: 32px; border-radius: 8px; border: 1px solid var(--outline-var); overflow: hidden; }
  .stepper.on { background: var(--sec-cont); border-color: transparent; }
  .stepper button { width: 30px; height: 30px; padding: 0; border-radius: 0; background: transparent; display: grid; place-items: center; color: var(--fg); }
  .stepper button:hover { background: var(--chip); }
  .stepper .off { min-width: 28px; font-size: 13px; font-weight: 600; cursor: pointer; }
  button.mic { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px 0 12px; border-radius: 999px; background: var(--primary); color: var(--on-primary); font-weight: 600; font-size: 14px; }
  button.mic:hover { background: var(--primary); filter: brightness(1.06); }
  /* narrow: tools on a second row */
  .byl:not(.wide) .tools { order: 5; flex-basis: 100%; }
  .byl:not(.wide) .dock { padding-left: 12px; }
  .dock { position: relative; }
  .khint { position: absolute; right: 8px; bottom: calc(100% + 8px); margin: 0; z-index: 4; background: var(--primary); max-width: calc(100% - 16px); }
  .khint::before { top: auto; bottom: -5px; right: 62px; }
  .byl:not(.wide) .khint { bottom: auto; top: -48px; }

  /* popovers: Surface Bright, over the panel */
  .pop { position: absolute; z-index: 40; width: min(320px, calc(100% - 16px)); padding: 16px; border-radius: 16px; background: var(--surface-bright);
    border: 1px solid var(--outline-var); box-shadow: 0 8px 28px rgba(34,25,26,.22); overflow-y: auto; overscroll-behavior: contain; color: var(--fg); }
  .pop[hidden] { display: none !important; }
  .pop h4 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }
  .pop .row { padding: 0 0 10px; }
  .pop .muted { font-size: 12px; }
  .speedpop .row.speed { flex-wrap: nowrap; }
  .vocalpop .row { flex-wrap: nowrap; }
  .vocalpop .row > .muted { display: none; }
  .syncpop .offval { text-align: center; white-space: nowrap; margin-bottom: 10px; }
  .syncpop .offval .off { display: block; font-size: 30px; line-height: 38px; font-weight: 500; color: var(--primary); cursor: default; }
  .syncpop .offbtns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
  .syncpop .offbtns button { padding: 8px 0; white-space: nowrap; }
  .syncpop > .muted { display: block; font-weight: 600; color: var(--primary); margin-bottom: 6px; }
  .pinlist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .pinlist > .muted { line-height: 1.45; }
  .pinrow { display: flex; align-items: center; gap: 4px; padding: 2px 2px 2px 12px; border-radius: 12px; background: var(--surface-low); font-size: 13px; }
  .pinrow .pt { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pinrow .iconbtn { width: 32px; height: 32px; }
  .syncpop .row { justify-content: center; }
  .syncpop button.text { display: block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* versions of one source */
  .picks { width: min(320px, calc(100% - 16px)); padding: 8px; margin: 0; gap: 2px; }
  .picks .phead { font-size: 14px; font-weight: 600; color: var(--fg); padding: 6px 10px 8px; }
  .picks .ver { display: flex; align-items: center; gap: 12px; padding: 6px 4px 6px 10px; border-radius: 12px; cursor: pointer; }
  .picks .ver:hover { background: var(--chip); }
  .picks .ver.on { background: var(--sec-cont); color: var(--on-sec-cont); box-shadow: none; }
  .picks .rad { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--outline); flex: none; }
  .picks .ver.on .rad { border-color: var(--primary); background: radial-gradient(var(--primary) 0 4px, transparent 5px); }
  .picks .vt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .picks .vt b { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picks .vt .muted { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picks .star { width: 36px; height: 36px; }
  .picks .star.on { color: var(--primary); }
  /* settings: one height, the tab scrolls */
  .setpop { display: flex; flex-direction: column; padding: 0; width: min(600px, calc(100% - 16px)); }
  .setpop .tabs { display: flex; border-bottom: 1px solid var(--outline-var); flex: none; }
  .setpop .tabs button { flex: 1; height: 48px; border-radius: 0; background: transparent; color: var(--fg2); font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .setpop .tabs button.on { color: var(--fg); border-bottom-color: var(--primary); }
  .setbody { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 12px 12px 4px; }
  .setbody .row { padding: 0 0 12px; }
  .setbody select.look { display: none; }
  .setbody .lookrow > .muted:first-child { display: none; }
  .setbody .studio { margin: 0 0 12px; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .tile { display: flex; flex-direction: column; gap: 4px; padding: 0; background: transparent; border-radius: 10px; color: var(--fg2); font-size: 12px; font-weight: 400; min-width: 0; }
  .tile:hover { background: transparent; color: var(--fg); }
  .tile .prev { height: 54px; border-radius: 10px; display: grid; place-items: center; overflow: hidden; border: 2px solid transparent;
    background: linear-gradient(135deg, #3b2a3a, #1d1622 60%, #5b3a3a); color: #fff; font-size: 20px; }
  .tile .sample { white-space: nowrap; font-family: Roboto, Arial, sans-serif; }
  .tile.on .prev { border-color: var(--primary); }
  .tile.on { color: var(--primary); font-weight: 600; }
  .tile .tn { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .transpop .row { flex-wrap: wrap; }
    select { border-radius: 8px; background: transparent; border: 1px solid var(--outline-var); }
  button.on { background: var(--sec-cont); color: var(--on-sec-cont); }
  .row.speed.steps button.on { background: var(--sec-cont); color: var(--on-sec-cont); }
  .klist .kitem.cur { background: var(--sec-cont); }
  .karaoke-tab, .historyTab { padding-top: 8px; }
  :host([data-float]) .byl { border-radius: 16px; }
  .menu .lang .mt { flex: 1; }
  .menu .lang, .menu > button { gap: 12px; }
  .menu .lang .ico, .menu > button .ico { color: var(--fg2); }
  .menu > button.fav.on .ico { color: var(--primary); }
  .pin { display: inline-grid; place-items: center; color: var(--primary); }
  .ln.pinned .pin { background: var(--primary-cont); }
  .row3 .iconbtn, .setbody .iconbtn { width: 36px; height: 36px; }
  .setbody .iconbtn.on { background: var(--sec-cont); color: var(--primary); }
  .avatar { background: var(--surface-low); }
  .kitem button.fav, .kitem button.x { display: inline-grid; place-items: center; width: 36px; height: 36px; padding: 0; border-radius: 50%; }
  .kitem button.fav.on { color: var(--primary); }
  .menu > button.fav { padding: 0 16px; font-size: 14px; line-height: normal; }
  .row.page button { display: none; }
  .row.page { padding-top: 12px; }
  /* Karaoke versions / History: filter chips in a row under the header */
  .ktab { padding: 12px 0 4px; }
  .ktab[hidden] { display: none; }
  .ktab .row.page { padding: 0 16px 10px; }
  .row.kchips { gap: 8px; padding: 0 16px 12px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .row.kchips::-webkit-scrollbar { display: none; }
  .row.kchips button { flex: none; height: 32px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    background: transparent; border: 1px solid var(--outline-var); color: var(--fg); }
  .row.kchips button:hover { background: var(--chip); }
  .row.kchips button.on { background: var(--sec-cont); border-color: transparent; color: var(--on-sec-cont); }
  .row.kchips button.danger { border-color: transparent; color: var(--primary); margin-left: auto; }
  .ktab .klist { padding: 0 8px 8px; }
  .ktab .empty { padding: 8px 16px 16px; }
  /* header: ⋯ and fold the same 40px round buttons */
  header .iconbtn { width: 40px; height: 40px; }
  header .iconbtn:hover, header .iconbtn[aria-expanded=true] { background: var(--chip); color: var(--fg); }
  /* menus and popovers may reach past a short panel (karaoke list, history) */
  .byl { overflow: visible; }
  header { border-radius: 16px 16px 0 0; }
  .menu { max-height: min(70vh, 520px); overflow-y: auto; }
  .lwrap { position: relative; }
  .pipfab { position: absolute; top: 4px; right: 12px; z-index: 3; width: 36px; height: 36px; background: var(--surface); color: var(--fg2);
    border: 1px solid var(--outline-var); opacity: 0; transition: opacity .15s; }
  .pipfab:hover { background: var(--surface-low); color: var(--fg); }
  .lwrap:hover .pipfab, .pipfab:focus-visible { opacity: 1; }
  .pipfab[hidden], .lines[hidden] ~ .pipfab { display: none; }
  /* Style tiles: plain grey thumbnails, three to a row */
  .gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tile, .tile.on, .tile:hover, .tile.on:hover { background: transparent; }
  .tile .prev { height: 64px; background: #4d4d4d; }
  :host-context(html[dark]) .tile .prev { background: #3f3f3f; }
  /* Dropdowns: a drawn chevron instead of the browser's arrow */
  select { -webkit-appearance: none; appearance: none; padding-right: 34px; background-repeat: no-repeat; background-position: right 8px center;
    background-size: 20px 20px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'%3E%3Cpath fill='%23606060' d='M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z'/%3E%3C/svg%3E"); }
  :host-context(html[dark]) select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'%3E%3Cpath fill='%23aaaaaa' d='M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z'/%3E%3C/svg%3E"); }
  .menu > .lang select { background-image: none; }
  /* dropdown chevron: never tiled, whatever background a select has */
  .byl select, .byl .studio select { background-repeat: no-repeat; background-position: right 8px center; background-size: 20px 20px; }
  .byl .studio select { background-color: var(--surface); border: 1px solid var(--outline-var); border-radius: 8px; padding-top: 7px; padding-bottom: 7px; }
  /* 🎨 customiser */
  .setbody { container-type: inline-size; }
  .setbody .studio { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 0; padding: 0; margin: 0 0 12px;
    background: transparent; border: 1px solid var(--outline-var); border-radius: 12px; overflow: hidden; }
  .studio .snav { display: flex; flex-direction: column; gap: 2px; padding: 8px; border-right: 1px solid var(--outline-var); }
  .studio .snav .sg { justify-content: flex-start; text-align: left; height: 40px; padding: 0 14px; border-radius: 999px; background: transparent;
    color: var(--fg); font-size: 14px; font-weight: 500; }
  .studio .snav .sg:hover { background: var(--chip); }
  .studio .snav .sg.on { background: var(--sec-cont); color: var(--on-sec-cont); }
  .studio .snav .presets.top { margin-top: auto; padding: 8px 0 0; border-top: 1px solid var(--outline-var); flex-direction: column; align-items: stretch; gap: 2px; }
  .studio .snav .presets.top button { justify-content: flex-start; display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; font-size: 13px; border-radius: 999px; }
  .studio .spane { min-width: 0; padding: 4px 16px 12px; }
  .studio section + section { border-top: 0; }
  .studio h4 { display: flex; align-items: center; gap: 8px; padding: 10px 0 8px; font-size: 14px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--fg); }
  .studio h4 .acts { float: none; margin: 0 0 0 auto; gap: 2px; }
  .studio h4 .acts .iconbtn { width: 32px; height: 32px; background: transparent; color: var(--fg2); }
  .studio h4 .acts .iconbtn:hover { background: var(--chip); color: var(--fg); }
  .studio .grid { grid-template-columns: minmax(84px, 112px) minmax(0, 1fr); gap: 12px 12px; padding-bottom: 8px; }
  .studio .lbl { font-size: 13px; color: var(--fg); line-height: 1.3; }
  .studio .val { background: var(--surface-low); }
  .studio .tg input { width: 36px; height: 20px; background: var(--surface-high); border: 2px solid var(--outline); }
  .studio .tg input::after { top: 2px; left: 2px; width: 12px; height: 12px; background: var(--outline); box-shadow: none; }
  .studio .tg input:checked { background: var(--primary); border-color: var(--primary); }
  .studio .tg input:checked::after { left: 17px; top: 1px; width: 14px; height: 14px; background: var(--on-primary); }
  .studio .swatch { width: 28px; height: 28px; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--outline-var); }
  .studio .seg { background: var(--surface-low); }
  .studio .seg button.on { background: var(--surface); }
  .studio .presets { padding-top: 12px; border-top: 1px solid var(--outline-var); }
  .studio .presets input[type=text] { background: var(--surface); border: 1px solid var(--outline-var); }
  .studio .presets button.primary { background: var(--primary); color: var(--on-primary); }
  /* Translate tab: label, language, then the action on the right */
  .setbody .row, .transpop .row { flex-wrap: nowrap; gap: 8px; }
  .row .lbl { flex: none; font-size: 13px; color: var(--fg2); min-width: 92px; }
  .row.tr select { flex: 1; min-width: 0; }
  button.tonal { flex: none; background: var(--sec-cont); color: var(--on-sec-cont); font-weight: 600; padding: 8px 16px; }
  button.tonal:hover { filter: brightness(1.05); background: var(--sec-cont); }
  .setbody .row > .muted:first-child, .transpop .row > .muted:first-child { flex: none; min-width: 92px; font-size: 13px; color: var(--fg2); }
  .setbody .row > select, .transpop .row > select { flex: 1; min-width: 0; }
  /* popovers and menus: no outline, the shadow sets them apart */
  .pop, .menu, .picks, .setpop { border: 0 !important; }
  .setbody .studio { border: 0; background: var(--surface-low); }
  .setpop .sethead { padding: 16px 16px 4px; flex: none; }
  .setpop .sethead h4 { margin: 0; font-size: 16px; font-weight: 600; }
  /* 🎨 customiser: horizontal tabs, no borders; shuffle / reset as icons */
  .setbody .studio { display: block; background: transparent; border: 0; padding: 0; }
  .studio .snav { display: flex; flex-direction: row; align-items: center; gap: 4px; padding: 0; border: 0 !important; }
  .studio .stabs { display: flex; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; box-shadow: inset 0 -1px 0 var(--outline-var); }
  .studio .stabs::-webkit-scrollbar { display: none; }
  .studio .snav .sg { flex: none; height: 44px; padding: 0 14px; border: 0 !important; border-radius: 0; background: transparent; color: var(--fg2);
    font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent !important; }
  .studio .snav .sg:hover { background: var(--chip); color: var(--fg); }
  .studio .snav .sg.on { background: transparent; color: var(--fg); border-bottom-color: var(--primary) !important; }
  .studio .snav .presets.top { display: flex !important; flex-direction: row; gap: 0; margin: 0; padding: 0; border: 0 !important; }
  .studio .snav .presets.top .iconbtn { width: 36px; height: 36px; color: var(--fg2); background: transparent; }
  .studio .snav .presets.top .iconbtn:hover { background: var(--chip); color: var(--fg); }
  .studio .spane { padding: 12px 0 0; }
  .studio section > h4 { display: none; }
  .studio .grid { padding-bottom: 12px; }
  .studio select, .byl .studio select { border: 0 !important; background-color: var(--surface-low); }
  .studio .presets { border: 0 !important; padding: 0; margin: 0; }
  .presetbox { padding: 12px; border-radius: 12px; background: var(--surface); }
  .presetbox .presets { flex-wrap: nowrap; }
  .presetbox .presets input[type=text] { border: 0 !important; background: var(--surface-low); }
  :host-context(html[dark]) .setbody .studio select { background-color: #3f3f3f; }
  .presetbox { background: var(--surface-low); }
  :host-context(html[dark]) .presetbox { background: var(--surface); }
  .presetbox .presets input[type=text] { background: var(--surface); }
  :host-context(html[dark]) .presetbox .presets input[type=text] { background: #272727; }
  /* buttons with a drawn icon in front of the label */
  button.wi { display: inline-flex; align-items: center; gap: 6px; }
  button.wi .ico { color: inherit; opacity: .9; }
  .cmp select { background-repeat: no-repeat !important; background-position: right 8px center !important; background-size: 20px 20px !important; padding-right: 34px; }
  .editbtn.on, .byl[data-mode=edit] .editbtn { background: var(--sec-cont); color: var(--primary); }
  /* folded: only the song, lyrics on video, ⋯ and unfold */
  .byl.collapsed .kara { display: none; }
  .colhead .again { width: 32px; height: 32px; margin: -6px 2px -6px 0; color: var(--fg2); }
  .colhead .again:hover { color: var(--fg); }
`;
