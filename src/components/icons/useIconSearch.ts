import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { IconIndexEntry, IconData } from './types';
import { loadIconChunk } from './IconChunkLoader';

interface UseIconSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: IconData[];
  isLoading: boolean;
  totalIndexed: number;
}

export function useIconSearch(): UseIconSearchReturn {
  const [index, setIndex] = useState<IconIndexEntry[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fuseRef = useRef<Fuse<IconIndexEntry> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    fetch('/icons/index.json')
      .then(res => res.json())
      .then((data: IconIndexEntry[]) => {
        if (cancelled) return;
        setIndex(data);
        fuseRef.current = new Fuse(data, {
          keys: ['name', 'tags'],
          threshold: 0.3,
          includeScore: true,
        });
      });
    return () => { cancelled = true; };
  }, []);

  const loadResults = useCallback(async (entries: IconIndexEntry[]) => {
    const chunkNames = [...new Set(entries.map(e => e.chunk))];
    const chunks = await Promise.all(chunkNames.map(loadIconChunk));
    const chunkMap = new Map<string, IconData[]>();
    chunkNames.forEach((name, i) => chunkMap.set(name, chunks[i]));

    const entryIds = new Set(entries.map(e => e.id));
    const icons: IconData[] = [];
    for (const [, chunkIcons] of chunkMap) {
      for (const icon of chunkIcons) {
        if (entryIds.has(icon.id)) icons.push(icon);
      }
    }

    const idOrder = new Map(entries.map((e, i) => [e.id, i]));
    icons.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
    return icons;
  }, []);

  const defaultEntries = useMemo(() => index.slice(0, 120), [index]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!fuseRef.current || index.length === 0) return;

      setIsLoading(true);
      try {
        let entries: IconIndexEntry[];
        if (query.trim() === '') {
          entries = defaultEntries;
        } else {
          const fuseResults = fuseRef.current.search(query, { limit: 120 });
          entries = fuseResults.map(r => r.item);
        }

        const icons = await loadResults(entries);
        setResults(icons);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, index, loadResults, defaultEntries]);

  return { query, setQuery, results, isLoading, totalIndexed: index.length };
}
