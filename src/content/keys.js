'use strict';

// Keyboard shortcuts on YouTube pages. All use Alt (Option on a Mac) so they
// don't clash with YouTube's own single-key shortcuts; e.code keeps them
// working whatever the keyboard layout types for Alt+key.
(() => {
  // Listed for users in the toolbar popup (options.html), keep both in step.
  const KEYS = {
    KeyL: (a) => a.overlay(),
    KeyP: (a) => a.pip(),
    KeyK: (a) => a.pin(),
    BracketLeft: (a, e) => a.nudge(e.shiftKey ? -0.1 : -0.5),
    BracketRight: (a, e) => a.nudge(e.shiftKey ? 0.1 : 0.5),
    Minus: (a) => a.font(-4),
    Equal: (a) => a.font(4),
  };

  const typing = (e) => {
    const t = e.composedPath()[0];
    return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };

  let toastHost, toastTimer;
  // Also used by score.js for the mark after each line.
  const toast = (BYL.toast = (text, ms = 1200) => {
    const player = BYL.playerEl();
    if (!player || !text) return;
    if (!toastHost?.isConnected) {
      toastHost = document.createElement('div');
      toastHost.id = 'byl-toast';
      const root = toastHost.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        :host { all: initial; position: absolute; top: 12%; left: 50%; transform: translateX(-50%); z-index: 70; pointer-events: none;
          font: 500 14px Roboto, Arial, sans-serif; color: #fff; background: rgba(0,0,0,.72); padding: 8px 14px; border-radius: 999px;
          transition: opacity .25s; }
        :host([hidden]) { display: block; opacity: 0; }
      </style><span></span>`;
      player.append(toastHost);
    }
    toastHost.shadowRoot.querySelector('span').textContent = text;
    toastHost.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastHost.hidden = true), ms);
  });

  window.addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || (e.repeat && e.code === 'KeyP')) return;
      const run = KEYS[e.code];
      const ui = BYL.ui;
      if (!run || typing(e) || !ui?.state.videoId || !BYL.settings.value.enabled) return;
      const host = document.getElementById('byl-panel-host');
      if (!host?.isConnected || host.hidden) return;
      e.preventDefault();
      e.stopPropagation();
      toast(run(ui.actions, e));
    },
    true
  );
})();
