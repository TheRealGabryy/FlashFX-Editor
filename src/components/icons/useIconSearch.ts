import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { IconIndexEntry, IconData } from './types';
import { loadIconChunk } from './IconChunkLoader';

interface UseIconSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: IconData[];
  isLoading: boolean;
  totalIndexed: number;
}

function scoreEntry(entry: IconIndexEntry, terms: string[]): number {
  let score = 0;
  const nameLower = entry.name.toLowerCase();
  const idLower = entry.id.toLowerCase();
  for (const term of terms) {
    if (nameLower === term || idLower === term) { score += 100; continue; }
    if (nameLower.startsWith(term) || idLower.startsWith(term)) { score += 60; continue; }
    if (nameLower.includes(term) || idLower.includes(term)) { score += 30; continue; }
    const tagMatch = entry.tags.some(t => t.toLowerCase().includes(term));
    if (tagMatch) { score += 15; continue; }
  }
  return score;
}

function searchIndex(index: IconIndexEntry[], query: string, limit = 120): IconIndexEntry[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return index.slice(0, limit);

  const scored: { entry: IconIndexEntry; score: number }[] = [];
  for (const entry of index) {
    const s = scoreEntry(entry, terms);
    if (s > 0) scored.push({ entry, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.entry);
}

export function useIconSearch(): UseIconSearchReturn {
  const [index, setIndex] = useState<IconIndexEntry[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let cancelled = false;
    fetch('/icons/index.json')
      .then(res => res.json())
      .then((data: IconIndexEntry[]) => {
        if (!cancelled) setIndex(data);
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
      if (index.length === 0) return;
      setIsLoading(true);
      try {
        const entries = query.trim() === ''
          ? defaultEntries
          : searchIndex(index, query);
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
