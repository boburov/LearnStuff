const FEED_LIMIT = 4;

// One place to push a toast: reactions also become the monitor's current topic.
export const pushFeed = (lab, item) => {
  const current = lab.feed.get();
  const items = [...current.items, { ...item, at: lab.now() }].slice(-FEED_LIMIT);
  const next = { ...current, items };
  if (item.kind === "reaction") {
    next.monitor = item.id;
    next.history = [item.id, ...current.history.filter((id) => id !== item.id)].slice(0, 6);
  }
  lab.feed.set(next);
};

// The same warning should not pop up again while the player is still dealing with it.
export const warnOnce = (lab, id, seconds, extra = {}) => {
  const notices = lab.notices;
  const last = notices.get(id) ?? -Infinity;
  if (lab.now() - last < seconds) return false;
  notices.set(id, lab.now());
  pushFeed(lab, { kind: "warning", id, ...extra });
  return true;
};
