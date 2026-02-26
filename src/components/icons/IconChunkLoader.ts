import type { IconData } from './types';

const chunkCache = new Map<string, IconData[]>();
const inflight = new Map<string, Promise<IconData[]>>();

export async function loadIconChunk(chunkName: string): Promise<IconData[]> {
  const cached = chunkCache.get(chunkName);
  if (cached) return cached;

  const existing = inflight.get(chunkName);
  if (existing) return existing;

  const promise = fetch(`/icons/chunks/${chunkName}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load chunk ${chunkName}`);
      return res.json() as Promise<IconData[]>;
    })
    .then(data => {
      chunkCache.set(chunkName, data);
      inflight.delete(chunkName);
      return data;
    })
    .catch(err => {
      inflight.delete(chunkName);
      throw err;
    });

  inflight.set(chunkName, promise);
  return promise;
}

export function getLoadedIcon(chunkName: string, iconId: string): IconData | undefined {
  const chunk = chunkCache.get(chunkName);
  return chunk?.find(ic => ic.id === iconId);
}

export function clearChunkCache(): void {
  chunkCache.clear();
}
