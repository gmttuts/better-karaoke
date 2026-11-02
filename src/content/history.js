'use strict';

// Songs the user opened, newest first, with ★ favourites ('history' in
// storage.local). Shown in the panel's "Đã xem" tab.
BYL.history = {
  KEY: 'history',
  MAX: 300, // favourites don't count and are never dropped
  queue: Promise.resolve(),
  async list() {
    try {
      return (await chrome.storage.local.get(this.KEY))[this.KEY] || [];
    } catch {
      return [];
    }
  },
  // Read-modify-write one at a time, like videoStore.patch.
  edit(fn) {
    this.queue = this.queue.then(async () => {
      try {
        const next = fn(await this.list());
        if (next) await chrome.storage.local.set({ [this.KEY]: next });
      } catch {}
    });
    return this.queue;
  },
  add({ id, title, artist, short }) {
    return this.edit((list) => {
      const old = list.find((x) => x.id === id);
      const rest = list.filter((x) => x.id !== id);
      const entry = { id, title, artist, short: !!short, at: Date.now(), fav: !!old?.fav, n: (old?.n || 0) + 1 };
      let plain = 0;
      return [entry, ...rest].filter((x) => x.fav || ++plain <= this.MAX);
    });
  },
  setFav(id, fav) {
    return this.edit((list) => list.map((x) => (x.id === id ? { ...x, fav } : x)));
  },
  remove(id) {
    return this.edit((list) => list.filter((x) => x.id !== id));
  },
  clear() {
    return this.edit((list) => list.filter((x) => x.fav));
  },
};
