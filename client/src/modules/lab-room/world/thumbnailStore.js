import { createSnapStore } from "@/shared/utils/snapStore";

// Cabinet/hotbar thumbnails rendered from the real 3D models, one per frame in the background.
export const createThumbnailStore = () => {
  const store = createSnapStore({ urls: {}, current: null });
  const queue = [];

  const advance = () => {
    const { urls } = store.get();
    while (queue.length && urls[queue[0]]) queue.shift();
    store.set({ urls, current: queue[0] ?? null });
  };

  return {
    store,
    request: (typeIds) => {
      const { urls, current } = store.get();
      for (const id of typeIds) if (!urls[id] && !queue.includes(id)) queue.push(id);
      if (!current) advance();
    },
    done: (typeId, url) => {
      const { urls } = store.get();
      store.set({ urls: { ...urls, [typeId]: url }, current: store.get().current });
      queue.shift();
      advance();
    },
    skip: () => {
      queue.push(queue.shift());
      advance();
    },
  };
};
