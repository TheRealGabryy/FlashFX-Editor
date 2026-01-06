import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Keyframe, EasingType, AnimatableProperty, EASING_CONFIGS, BezierHandle } from '../../animation-engine/types';
import { getEasingFunction } from '../../animation-engine/interpolation';

interface KeyframeData {
  keyframe: Keyframe;
  property: AnimatableProperty;
  elementId: string;
}

interface SegmentData {
  elementId: string;
  property: AnimatableProperty;
  keyframeId: string;
  startTime: number;
  endTime: number;
  easing: EasingType;
}

interface InterpolationGraphProps {
  selectedKeyframes: KeyframeData[];
  onUpdateEasing: (elementId: string, property: AnimatableProperty, keyframeId: string, easing: EasingType) => void;
  onUpdateHandles?: (elementId: string, property: AnimatableProperty, keyframeId: string, handleIn?: BezierHandle, handleOut?: BezierHandle) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  segment: SegmentData | null;
}

const PROPERTY_COLORS: Record<string, string> = {
  x: '#ef4444',
  y: '#f97316',
  width: '#eab308',
  height: '#84cc16',
  rotation: '#22c55e',
  opacity: '#14b8a6',
  fill: '#06b6d4',
  stroke: '#0ea5e9',
  strokeWidth: '#3b82f6',
  borderRadius: '#6366f1',
  scaleX: '#8b5cf6',
  scaleY: '#a855f7',
  shadowBlur: '#d946ef',
  shadowX: '#ec4899',
  shadowY: '#f43f5e',
  fontSize: '#fb7185',
  letterSpacing: '#fda4af',
};

interface SelectedKeyframeState {
  elementId: string;
  property: AnimatableProperty;
  keyframeId: string;
}

interface DragState {
  isDragging: boolean;
  keyframeId: string;
  handleType: 'in' | 'out';
  keyframeX: number;
  keyframeY: number;
}

const InterpolationGraph: React.FC<InterpolationGraphProps> = ({
  selectedKeyframes,
  onUpdateEasing,
  onUpdateHandles,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<SegmentData | null>(null);
  const [selectedKeyframePoint, setSelectedKeyframePoint] = useState<SelectedKeyframeState | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'separate'>('single');
  const graphRef = useRef<HTMLDivElement>(null);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, segment: null });
  const [dragState, setDragState] = useState<DragState | null>(null);

  const graphWidth = 280;
  const graphHeight = 180;

  const groupedByProperty = useMemo(() => {
    const groups: Record<string, KeyframeData[]> = {};
    selectedKeyframes.forEach(kf => {
      if (!groups[kf.property]) {
        groups[kf.property] = [];
      }
      groups[kf.property].push(kf);
    });
    Object.keys(groups).forEach(prop => {
      groups[prop].sort((a, b) => a.keyframe.time - b.keyframe.time);
    });
    return groups;
  }, [selectedKeyframes]);

  const timeRange = useMemo(() => {
    if (selectedKeyframes.length === 0) return { min: 0, max: 1 };
    const times = selectedKeyframes.map(kf => kf.keyframe.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const padding = (max - min) * 0.1 || 0.5;
    return { min: min - padding, max: max + padding };
  }, [selectedKeyframes]);

  const valueRange = useMemo(() => {
    if (selectedKeyframes.length === 0) return { min: 0, max: 100 };
    const values = selectedKeyframes.map(kf => Number(kf.keyframe.value) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.15 || 10;
    return { min: min - padding, max: max + padding };
  }, [selectedKeyframes]);


  const handleSegmentClick = useCallback((segment: SegmentData, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedSegment(segment);
    setSelectedKeyframePoint({
      elementId: segment.elementId,
      property: segment.property,
      keyframeId: segment.keyframeId
    });
  }, []);

  const handleSegmentContextMenu = useCallback((segment: SegmentData, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({ visible: true, x, y, segment });
    setSelectedSegment(segment);
    setSelectedKeyframePoint({
      elementId: segment.elementId,
      property: segment.property,
      keyframeId: segment.keyframeId
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, segment: null });
  }, []);

  const handleSelectEasing = useCallback((easing: EasingType) => {
    if (contextMenu.segment) {
      onUpdateEasing(
        contextMenu.segment.elementId,
        contextMenu.segment.property,
        contextMenu.segment.keyframeId,
        easing
      );
      closeContextMenu();
    }
  }, [contextMenu.segment, onUpdateEasing, closeContextMenu]);

  const handleGraphClick = useCallback((e: React.MouseEvent) => {
    if (!isZoomMode) {
      setSelectedSegment(null);
      setSelectedKeyframePoint(null);
    }
    closeContextMenu();
  }, [isZoomMode, closeContextMenu]);

  const handleKeyframePointClick = useCallback((elementId: string, property: AnimatableProperty, keyframeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeyframePoint({ elementId, property, keyframeId });
    setSelectedSegment(null);
  }, []);

  const handleHandleMouseDown = useCallback((keyframeId: string, handleType: 'in' | 'out', keyframeX: number, keyframeY: number, e: React.MouseEvent<SVGPolygonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      isDragging: true,
      keyframeId,
      handleType,
      keyframeX,
      keyframeY,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !onUpdateHandles || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const cursorX = (e.clientX - svgRect.left) / svgRect.width * graphWidth;
    const cursorY = (e.clientY - svgRect.top) / svgRect.height * graphHeight;

    const keyframeData = selectedKeyframes.find(kf => kf.keyframe.id === dragState.keyframeId);
    if (!keyframeData) return;

    const handleX = (cursorX - dragState.keyframeX) / graphWidth;
    const handleY = -(cursorY - dragState.keyframeY) / graphHeight;

    if (dragState.handleType === 'out') {
      const handleOut: BezierHandle = { x: handleX, y: handleY };
      onUpdateHandles(keyframeData.elementId, keyframeData.property, keyframeData.keyframe.id, keyframeData.keyframe.handleIn, handleOut);
    } else {
      const handleIn: BezierHandle = { x: handleX, y: handleY };
      onUpdateHandles(keyframeData.elementId, keyframeData.property, keyframeData.keyframe.id, handleIn, keyframeData.keyframe.handleOut);
    }
  }, [dragState, onUpdateHandles, selectedKeyframes, graphWidth, graphHeight]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState?.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isZoomMode) {
      setIsZoomMode(false);
      setZoomLevel(1);
    } else {
      handleGraphClick(e);
    }
  }, [isZoomMode, handleGraphClick]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    if (isZoomMode) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  }, [isZoomMode]);

  const handleSvgDoubleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    setIsZoomMode(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomMode) {
          setIsZoomMode(false);
          setZoomLevel(1);
        }
        if (contextMenu.visible) {
          closeContextMenu();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible && graphRef.current && !graphRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const preventScroll = (e: WheelEvent) => {
      if (isZoomMode) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);

    if (isZoomMode) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('wheel', preventScroll, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = '';
      window.removeEventListener('wheel', preventScroll);
    };
  }, [isZoomMode, contextMenu.visible, closeContextMenu]);

  const cubicBezier = useCallback((p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }, []);

  const getRhombusPoints = useCallback((cx: number, cy: number, size: number = 5): string => {
    return `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
  }, []);

  const renderCurves = useCallback(() => {
    const elements: JSX.Element[] = [];

    Object.entries(groupedByProperty).forEach(([prop, keyframes]) => {
      const color = PROPERTY_COLORS[prop] || '#f59e0b';

      for (let i = 0; i < keyframes.length - 1; i++) {
        const startKf = keyframes[i];
        const endKf = keyframes[i + 1];

        const startX = ((startKf.keyframe.time - timeRange.min) / (timeRange.max - timeRange.min)) * graphWidth;
        const endX = ((endKf.keyframe.time - timeRange.min) / (timeRange.max - timeRange.min)) * graphWidth;
        const startY = graphHeight - ((Number(startKf.keyframe.value) - valueRange.min) / (valueRange.max - valueRange.min)) * graphHeight;
        const endY = graphHeight - ((Number(endKf.keyframe.value) - valueRange.min) / (valueRange.max - valueRange.min)) * graphHeight;

        const points: string[] = [];
        const numPoints = 50;

        if (startKf.keyframe.handleOut || endKf.keyframe.handleIn) {
          const p0X = startX;
          const p0Y = startY;
          const p3X = endX;
          const p3Y = endY;

          const deltaX = endX - startX;
          const deltaY = endY - startY;

          const p1X = startKf.keyframe.handleOut ? startX + startKf.keyframe.handleOut.x * graphWidth : startX + deltaX * 0.33;
          const p1Y = startKf.keyframe.handleOut ? startY - startKf.keyframe.handleOut.y * graphHeight : startY;

          const p2X = endKf.keyframe.handleIn ? endX + endKf.keyframe.handleIn.x * graphWidth : endX - deltaX * 0.33;
          const p2Y = endKf.keyframe.handleIn ? endY - endKf.keyframe.handleIn.y * graphHeight : endY;

          for (let j = 0; j <= numPoints; j++) {
            const t = j / numPoints;
            const x = cubicBezier(p0X, p1X, p2X, p3X, t);
            const y = cubicBezier(p0Y, p1Y, p2Y, p3Y, t);
            points.push(`${x},${y}`);
          }
        } else {
          const easingFn = getEasingFunction(startKf.keyframe.easing);
          for (let j = 0; j <= numPoints; j++) {
            const t = j / numPoints;
            const easedT = easingFn(t);
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * easedT;
            points.push(`${x},${y}`);
          }
        }

        const isSelected = selectedSegment?.keyframeId === startKf.keyframe.id &&
                          selectedSegment?.property === prop;

        const segmentData: SegmentData = {
          elementId: startKf.elementId,
          property: startKf.property,
          keyframeId: startKf.keyframe.id,
          startTime: startKf.keyframe.time,
          endTime: endKf.keyframe.time,
          easing: startKf.keyframe.easing
        };

        const easingLabel = EASING_CONFIGS.find(c => c.type === startKf.keyframe.easing)?.label || 'Linear';

        elements.push(
          <g key={`segment-${prop}-${i}`}>
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke="transparent"
              strokeWidth="12"
              style={{ cursor: 'pointer' }}
              onClick={(e) => handleSegmentClick(segmentData, e)}
              onContextMenu={(e) => handleSegmentContextMenu(segmentData, e)}
            >
              <title>{easingLabel}</title>
            </polyline>
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke={isSelected ? '#22c55e' : color}
              strokeWidth={isSelected ? 1.2 : 0.8}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              style={{ pointerEvents: 'none' }}
              shapeRendering="crispEdges"
            />
            {isSelected && (
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                opacity="0.3"
                style={{ pointerEvents: 'none' }}
                shapeRendering="crispEdges"
              />
            )}
          </g>
        );
      }

      keyframes.forEach((kf, idx) => {
        const x = ((kf.keyframe.time - timeRange.min) / (timeRange.max - timeRange.min)) * graphWidth;
        const y = graphHeight - ((Number(kf.keyframe.value) - valueRange.min) / (valueRange.max - valueRange.min)) * graphHeight;

        const isSelected = selectedKeyframePoint?.keyframeId === kf.keyframe.id && selectedKeyframePoint?.property === prop;

        elements.push(
          <g key={`point-${prop}-${idx}`}>
            <circle
              cx={x}
              cy={y}
              r="6"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={(e) => handleKeyframePointClick(kf.elementId, kf.property, kf.keyframe.id, e)}
            />
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 3 : 2}
              fill={isSelected ? '#22c55e' : color}
              stroke="#1f2937"
              strokeWidth={isSelected ? 1 : 0.5}
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={x}
              y={y - 10}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="9"
              fontWeight="500"
              style={{ pointerEvents: 'none' }}
            >
              {Number(kf.keyframe.value).toFixed(0)}
            </text>

            {isSelected && onUpdateHandles && (
              <>
                {kf.keyframe.handleOut && (
                  <>
                    <line
                      x1={x}
                      y1={y}
                      x2={x + kf.keyframe.handleOut.x * graphWidth}
                      y2={y - kf.keyframe.handleOut.y * graphHeight}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.6"
                    />
                    <polygon
                      points={getRhombusPoints(x + kf.keyframe.handleOut.x * graphWidth, y - kf.keyframe.handleOut.y * graphHeight, 5)}
                      fill="#ffffff"
                      stroke="#1f2937"
                      strokeWidth="1"
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'out', x, y, e)}
                    />
                  </>
                )}
                {kf.keyframe.handleIn && (
                  <>
                    <line
                      x1={x}
                      y1={y}
                      x2={x + kf.keyframe.handleIn.x * graphWidth}
                      y2={y - kf.keyframe.handleIn.y * graphHeight}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.6"
                    />
                    <polygon
                      points={getRhombusPoints(x + kf.keyframe.handleIn.x * graphWidth, y - kf.keyframe.handleIn.y * graphHeight, 5)}
                      fill="#ffffff"
                      stroke="#1f2937"
                      strokeWidth="1"
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'in', x, y, e)}
                    />
                  </>
                )}
                {!kf.keyframe.handleOut && idx < keyframes.length - 1 && (
                  <>
                    <line
                      x1={x}
                      y1={y}
                      x2={x + graphWidth * 0.2}
                      y2={y}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.4"
                    />
                    <polygon
                      points={getRhombusPoints(x + graphWidth * 0.2, y, 5)}
                      fill="#ffffff"
                      stroke="#1f2937"
                      strokeWidth="1"
                      opacity="0.5"
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'out', x, y, e)}
                    />
                  </>
                )}
                {!kf.keyframe.handleIn && idx > 0 && (
                  <>
                    <line
                      x1={x}
                      y1={y}
                      x2={x - graphWidth * 0.2}
                      y2={y}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.4"
                    />
                    <polygon
                      points={getRhombusPoints(x - graphWidth * 0.2, y, 5)}
                      fill="#ffffff"
                      stroke="#1f2937"
                      strokeWidth="1"
                      opacity="0.5"
                      style={{ cursor: 'grab' }}
                      onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'in', x, y, e)}
                    />
                  </>
                )}
              </>
            )}
          </g>
        );
      });
    });

    return elements;
  }, [groupedByProperty, timeRange, valueRange, selectedSegment, selectedKeyframePoint, handleSegmentClick, handleSegmentContextMenu, handleKeyframePointClick, handleHandleMouseDown, onUpdateHandles, graphWidth, graphHeight, cubicBezier, getRhombusPoints]);

  if (selectedKeyframes.length < 2) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Select 2 or more keyframes to view interpolation graph
      </div>
    );
  }

  const renderSingleGraph = () => (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 flex flex-col relative min-h-0">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={`bg-gray-800 ${isZoomMode ? 'cursor-zoom-in' : 'cursor-crosshair'}`}
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          preserveAspectRatio="none"
          onClick={handleSvgClick}
          onDoubleClick={handleSvgDoubleClick}
          onWheel={handleWheel}
        >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000000" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width={graphWidth} height={graphHeight} fill="#1f2937" />
            <rect width={graphWidth} height={graphHeight} fill="url(#grid)" />
            <g transform={`scale(${zoomLevel})`} transform-origin="center">
              {renderCurves()}
            </g>
        </svg>
        {isZoomMode && (
          <div className="absolute top-2 left-2 bg-green-500/20 border border-green-500/50 rounded px-2 py-1 text-xs text-green-400">
            Zoom: {(zoomLevel * 100).toFixed(0)}% (ESC to exit)
          </div>
        )}

        {Object.keys(groupedByProperty).length > 1 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 bg-gray-900/80 border border-gray-700/50 rounded px-2 py-1.5">
            {Object.keys(groupedByProperty).map(prop => (
              <div key={prop} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PROPERTY_COLORS[prop] || '#f59e0b' }}
                />
                <span className="text-xs text-gray-400 capitalize">{prop}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSeparateGraphs = () => (
    <div className="space-y-3">
      {Object.entries(groupedByProperty).map(([prop, keyframes]) => {
        const color = PROPERTY_COLORS[prop] || '#f59e0b';

        const times = keyframes.map(kf => kf.keyframe.time);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timePadding = (maxTime - minTime) * 0.1 || 0.5;
        const propTimeRange = { min: minTime - timePadding, max: maxTime + timePadding };

        const values = keyframes.map(kf => Number(kf.keyframe.value) || 0);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;
        const valuePadding = valueRange * 0.15 || 10;
        const propValueRange = { min: minValue - valuePadding, max: maxValue + valuePadding };

        const renderPropertyCurves = () => {
          const elements: JSX.Element[] = [];

          for (let i = 0; i < keyframes.length - 1; i++) {
            const startKf = keyframes[i];
            const endKf = keyframes[i + 1];

            const startX = ((startKf.keyframe.time - propTimeRange.min) / (propTimeRange.max - propTimeRange.min)) * graphWidth;
            const endX = ((endKf.keyframe.time - propTimeRange.min) / (propTimeRange.max - propTimeRange.min)) * graphWidth;
            const startY = graphHeight - ((Number(startKf.keyframe.value) - propValueRange.min) / (propValueRange.max - propValueRange.min)) * graphHeight;
            const endY = graphHeight - ((Number(endKf.keyframe.value) - propValueRange.min) / (propValueRange.max - propValueRange.min)) * graphHeight;

            const points: string[] = [];
            const numPoints = 50;

            if (startKf.keyframe.handleOut || endKf.keyframe.handleIn) {
              const p0X = startX;
              const p0Y = startY;
              const p3X = endX;
              const p3Y = endY;

              const deltaX = endX - startX;
              const deltaY = endY - startY;

              const p1X = startKf.keyframe.handleOut ? startX + startKf.keyframe.handleOut.x * graphWidth : startX + deltaX * 0.33;
              const p1Y = startKf.keyframe.handleOut ? startY - startKf.keyframe.handleOut.y * graphHeight : startY;

              const p2X = endKf.keyframe.handleIn ? endX + endKf.keyframe.handleIn.x * graphWidth : endX - deltaX * 0.33;
              const p2Y = endKf.keyframe.handleIn ? endY - endKf.keyframe.handleIn.y * graphHeight : endY;

              for (let j = 0; j <= numPoints; j++) {
                const t = j / numPoints;
                const x = cubicBezier(p0X, p1X, p2X, p3X, t);
                const y = cubicBezier(p0Y, p1Y, p2Y, p3Y, t);
                points.push(`${x},${y}`);
              }
            } else {
              const easingFn = getEasingFunction(startKf.keyframe.easing);
              for (let j = 0; j <= numPoints; j++) {
                const t = j / numPoints;
                const easedT = easingFn(t);
                const x = startX + (endX - startX) * t;
                const y = startY + (endY - startY) * easedT;
                points.push(`${x},${y}`);
              }
            }

            const isSelected = selectedSegment?.keyframeId === startKf.keyframe.id &&
                              selectedSegment?.property === prop;

            const segmentData: SegmentData = {
              elementId: startKf.elementId,
              property: startKf.property,
              keyframeId: startKf.keyframe.id,
              startTime: startKf.keyframe.time,
              endTime: endKf.keyframe.time,
              easing: startKf.keyframe.easing
            };

            elements.push(
              <g key={`segment-${prop}-${i}`}>
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleSegmentClick(segmentData, e)}
                  onContextMenu={(e) => handleSegmentContextMenu(segmentData, e)}
                />
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={isSelected ? '#22c55e' : color}
                  strokeWidth={isSelected ? 1.2 : 0.8}
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                  style={{ pointerEvents: 'none' }}
                  shapeRendering="crispEdges"
                />
                {isSelected && (
                  <polyline
                    points={points.join(' ')}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                    opacity="0.3"
                    style={{ pointerEvents: 'none' }}
                    shapeRendering="crispEdges"
                  />
                )}
              </g>
            );
          }

          keyframes.forEach((kf, idx) => {
            const x = ((kf.keyframe.time - propTimeRange.min) / (propTimeRange.max - propTimeRange.min)) * graphWidth;
            const y = graphHeight - ((Number(kf.keyframe.value) - propValueRange.min) / (propValueRange.max - propValueRange.min)) * graphHeight;

            const isSelected = selectedKeyframePoint?.keyframeId === kf.keyframe.id && selectedKeyframePoint?.property === prop;

            elements.push(
              <g key={`point-${prop}-${idx}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleKeyframePointClick(kf.elementId, kf.property, kf.keyframe.id, e)}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 3 : 2}
                  fill={isSelected ? '#22c55e' : color}
                  stroke="#1f2937"
                  strokeWidth={isSelected ? 1 : 0.5}
                  style={{ pointerEvents: 'none' }}
                />
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="9"
                  fontWeight="500"
                  style={{ pointerEvents: 'none' }}
                >
                  {Number(kf.keyframe.value).toFixed(0)}
                </text>

                {isSelected && onUpdateHandles && (
                  <>
                    {kf.keyframe.handleOut && (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + kf.keyframe.handleOut.x * graphWidth}
                          y2={y - kf.keyframe.handleOut.y * graphHeight}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.6"
                        />
                        <polygon
                          points={getRhombusPoints(x + kf.keyframe.handleOut.x * graphWidth, y - kf.keyframe.handleOut.y * graphHeight, 5)}
                          fill="#ffffff"
                          stroke="#1f2937"
                          strokeWidth="1"
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'out', x, y, e)}
                        />
                      </>
                    )}
                    {kf.keyframe.handleIn && (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + kf.keyframe.handleIn.x * graphWidth}
                          y2={y - kf.keyframe.handleIn.y * graphHeight}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.6"
                        />
                        <polygon
                          points={getRhombusPoints(x + kf.keyframe.handleIn.x * graphWidth, y - kf.keyframe.handleIn.y * graphHeight, 5)}
                          fill="#ffffff"
                          stroke="#1f2937"
                          strokeWidth="1"
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'in', x, y, e)}
                        />
                      </>
                    )}
                    {!kf.keyframe.handleOut && idx < keyframes.length - 1 && (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x + graphWidth * 0.2}
                          y2={y}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.4"
                        />
                        <polygon
                          points={getRhombusPoints(x + graphWidth * 0.2, y, 5)}
                          fill="#ffffff"
                          stroke="#1f2937"
                          strokeWidth="1"
                          opacity="0.5"
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'out', x, y, e)}
                        />
                      </>
                    )}
                    {!kf.keyframe.handleIn && idx > 0 && (
                      <>
                        <line
                          x1={x}
                          y1={y}
                          x2={x - graphWidth * 0.2}
                          y2={y}
                          stroke="#ffffff"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.4"
                        />
                        <polygon
                          points={getRhombusPoints(x - graphWidth * 0.2, y, 5)}
                          fill="#ffffff"
                          stroke="#1f2937"
                          strokeWidth="1"
                          opacity="0.5"
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleHandleMouseDown(kf.keyframe.id, 'in', x, y, e)}
                        />
                      </>
                    )}
                  </>
                )}
              </g>
            );
          });

          return elements;
        };

        return (
          <div key={prop} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-gray-300 capitalize">{prop}</span>
            </div>

            <div className="flex gap-3" style={{ height: graphHeight + 40 }}>
              <div style={{ width: '70%' }} className="flex flex-col relative">
                <svg
                  width="100%"
                  height={graphHeight}
                  className={`bg-gray-800 rounded ${isZoomMode ? 'cursor-zoom-in' : 'cursor-crosshair'}`}
                  viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                  preserveAspectRatio="none"
                  onClick={handleSvgClick}
                  onDoubleClick={handleSvgDoubleClick}
                  onWheel={handleWheel}
                >
                  <defs>
                    <pattern id={`grid-${prop}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000000" strokeWidth="0.3" />
                    </pattern>
                  </defs>
                  <rect width={graphWidth} height={graphHeight} fill="#1f2937" />
                  <rect width={graphWidth} height={graphHeight} fill={`url(#grid-${prop})`} />
                  <g transform={`scale(${zoomLevel})`} transform-origin="center">
                    {renderPropertyCurves()}
                  </g>
                </svg>
                {isZoomMode && (
                  <div className="absolute top-2 left-2 bg-green-500/20 border border-green-500/50 rounded px-2 py-1 text-xs text-green-400">
                    Zoom: {(zoomLevel * 100).toFixed(0)}% (ESC to exit)
                  </div>
                )}

                <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                  <span>{propTimeRange.min.toFixed(2)}s</span>
                  <span>{propTimeRange.max.toFixed(2)}s</span>
                </div>

                {selectedSegment && selectedSegment.property === prop && (
                  <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs">
                    <span className="text-green-400 font-medium">
                      ({selectedSegment.startTime.toFixed(2)}s - {selectedSegment.endTime.toFixed(2)}s)
                    </span>
                  </div>
                )}
              </div>

              <div style={{ width: '30%' }} className="border-l border-gray-700 pl-3 flex items-center justify-center">
                <span className="text-xs text-gray-500">Right-click curve to change easing</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (selectedKeyframes.length < 2) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Select 2 or more keyframes to view interpolation graph
      </div>
    );
  }

  const renderContextMenu = () => {
    if (!contextMenu.visible || !contextMenu.segment) return null;

    const currentEasing = contextMenu.segment.easing;
    const propertyColor = PROPERTY_COLORS[contextMenu.segment.property] || '#f59e0b';

    const menuHeight = 400;
    const menuY = Math.max(8, contextMenu.y - menuHeight);

    return (
      <div
        className="absolute z-[9999] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-[400px] overflow-y-auto"
        style={{
          left: `${contextMenu.x}px`,
          top: `${menuY}px`,
          minWidth: '220px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: propertyColor }}
            />
            <span className="text-xs font-medium text-gray-300 capitalize">
              {contextMenu.segment.property}
            </span>
            <span className="text-xs text-gray-500">
              ({contextMenu.segment.startTime.toFixed(2)}s - {contextMenu.segment.endTime.toFixed(2)}s)
            </span>
          </div>
          <button
            onClick={closeContextMenu}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span className="text-sm">✕</span>
          </button>
        </div>

        <div className="py-1">
          {EASING_CONFIGS.map(config => (
            <button
              key={config.type}
              onClick={() => handleSelectEasing(config.type)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                currentEasing === config.type
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <EasingPreview easing={config.type} size={14} />
              <span className="flex-1 text-left">{config.label}</span>
              {currentEasing === config.type && (
                <span className="text-green-400">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={graphRef} className="h-full flex flex-col relative">
      <div className="flex-1 overflow-auto min-h-0">
        {viewMode === 'single' ? renderSingleGraph() : renderSeparateGraphs()}
      </div>

      {renderContextMenu()}
    </div>
  );
};

const EasingPreview: React.FC<{ easing: EasingType; size?: number }> = ({ easing, size = 20 }) => {
  const easingFn = getEasingFunction(easing);
  const points: string[] = [];

  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = t * size;
    const y = size - easingFn(t) * size;
    points.push(`${x},${y}`);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default InterpolationGraph;
