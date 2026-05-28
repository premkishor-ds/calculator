"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';

interface VirtualStockListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  containerClassName?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  getItemKey: (item: T, index: number) => string;
}

/**
 * High-performance virtualized list.
 * Only renders visible items + overscan buffer for smooth scrolling.
 * Handles 5000+ items with minimal memory/DOM footprint.
 */
export default function VirtualStockList<T>({
  items,
  itemHeight,
  overscan = 8,
  containerClassName = '',
  renderItem,
  emptyState,
  getItemKey,
}: VirtualStockListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Observe container size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObs.observe(el);
    setContainerHeight(el.clientHeight);
    return () => resizeObs.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (containerHeight === 0 || items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end)
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${containerClassName}`}
      onScroll={handleScroll}
      style={{ willChange: 'transform' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={getItemKey(item, actualIndex)}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
