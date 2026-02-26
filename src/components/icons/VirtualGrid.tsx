import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  itemSize: number;
  gap: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  overscan?: number;
}

export function VirtualGrid<T>({
  items,
  itemSize,
  gap,
  renderItem,
  containerHeight,
  overscan = 2,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const cellSize = itemSize + gap;
  const columns = Math.max(1, Math.floor((containerWidth + gap) / cellSize));
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * cellSize - gap;

  const startRow = Math.max(0, Math.floor(scrollTop / cellSize) - overscan);
  const visibleRows = Math.ceil(containerHeight / cellSize) + overscan * 2;
  const endRow = Math.min(totalRows, startRow + visibleRows);

  const visibleItems: { item: T; index: number; row: number; col: number }[] = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      if (idx < items.length) {
        visibleItems.push({ item: items[idx], index: idx, row, col });
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: Math.max(totalHeight, 0), position: 'relative' }}>
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: row * cellSize,
              left: col * cellSize,
              width: itemSize,
              height: itemSize,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
