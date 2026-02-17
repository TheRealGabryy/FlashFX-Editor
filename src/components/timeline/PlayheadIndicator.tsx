import React, { useRef, useEffect } from 'react';
import { usePlayback } from '../../animation-engine';

interface PlayheadIndicatorProps {
  pixelsPerSecond: number;
  isDraggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showHandle?: boolean;
  className?: string;
  isSnapped?: boolean;
}

const PlayheadIndicator: React.FC<PlayheadIndicatorProps> = ({
  pixelsPerSecond,
  isDraggable = false,
  onDragStart,
  onDragEnd,
  showHandle = false,
  className = '',
  isSnapped = false
}) => {
  const { currentTime } = usePlayback();
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineRef.current) {
      const position = currentTime * pixelsPerSecond;
      lineRef.current.style.transform = `translateX(${position}px)`;
    }
  }, [currentTime, pixelsPerSecond]);

  const lineColorClass = isSnapped
    ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
    : 'bg-amber-400';

  const handleColorClass = isSnapped
    ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]'
    : 'bg-amber-400';

  return (
    <div
      ref={lineRef}
      className={`absolute top-0 bottom-0 w-0.5 transition-all duration-150 ${lineColorClass} ${className}`}
      style={{
        willChange: 'transform',
        left: 0,
        transform: `translateX(${currentTime * pixelsPerSecond}px)`
      }}
    >
      {showHandle && (
        <div
          className={`sticky top-0 left-1/2 -translate-x-1/2 w-3 h-3 cursor-ew-resize transition-all duration-150 ${handleColorClass}`}
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (isDraggable && onDragStart) {
              onDragStart();
            }
          }}
          onMouseUp={() => {
            if (isDraggable && onDragEnd) {
              onDragEnd();
            }
          }}
        />
      )}
    </div>
  );
};

export default PlayheadIndicator;
