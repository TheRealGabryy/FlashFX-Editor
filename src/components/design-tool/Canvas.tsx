import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { DesignElement } from '../../types/design';
import { BackgroundConfig, generateBackgroundStyle } from '../../types/background';
import EnhancedDesignElementComponent from './EnhancedDesignElementComponent';
import ContextMenu from './ContextMenu';
import CanvasContextMenu from './CanvasContextMenu';
import SnapGuides from './SnapGuides';
import { useSnapping } from '../../hooks/useSnapping';
import AdvancedGrid from './AdvancedGrid';
import { GridSettings, GridCalculations } from '../../hooks/useGridSystem';
import { findParentGroup } from '../../utils/groupUtils';
import { useAnimation } from '../../animation-engine';
import { Preset } from '../../types/preset';
import { CanvasViewport } from '../../utils/canvasUtils';

interface CanvasProps {
  elements: DesignElement[];
  selectedElements: string[];
  setSelectedElements: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  zoom: number;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  showGrid: boolean;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onMoveElementUp: (id: string) => void;
  onMoveElementDown: (id: string) => void;
  onBringElementToFront: (id: string) => void;
  onSendElementToBack: (id: string) => void;
  snapEnabled?: boolean;
  gridSettings?: GridSettings;
  gridCalculations?: GridCalculations;
  onGridSnap?: (x: number, y: number) => { x: number; y: number };
  background?: BackgroundConfig;
  canvasWidth?: number;
  canvasHeight?: number;
  isEditMode?: boolean;
  onCreateShape?: (type: 'rectangle' | 'circle' | 'line' | 'text' | 'image', x: number, y: number) => void;
  onLoadPreset?: (preset: Preset, x: number, y: number) => void;
  onPasteElements?: (x: number, y: number, inPlace: boolean) => void;
  setZoom?: (zoom: number) => void;
  onFitToScreen?: () => void;
  onResetZoom?: () => void;
  setShowGrid?: (show: boolean) => void;
  setSnapEnabled?: (enabled: boolean) => void;
  onClearCanvas?: () => void;
  onResetTransform?: () => void;
  hasClipboard?: boolean;
  presets?: Preset[];
  canvasViewport?: CanvasViewport;
  activeTool?: 'select' | 'line' | 'pen';
  onSetActiveTool?: (tool: 'select' | 'line' | 'pen') => void;
  onAddElement?: (element: DesignElement) => void;
}

const DEFAULT_CANVAS_WIDTH = 3840;
const DEFAULT_CANVAS_HEIGHT = 2160;

const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedElements,
  setSelectedElements,
  updateElement,
  zoom,
  pan,
  setPan,
  showGrid,
  onDuplicateElement,
  onDeleteElement,
  onMoveElementUp,
  onMoveElementDown,
  onBringElementToFront,
  onSendElementToBack,
  snapEnabled = true,
  gridSettings,
  gridCalculations,
  onGridSnap,
  background,
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
  isEditMode = false,
  onCreateShape,
  onLoadPreset,
  onPasteElements,
  setZoom,
  onFitToScreen,
  onResetZoom,
  setShowGrid,
  setSnapEnabled,
  onClearCanvas,
  onResetTransform,
  hasClipboard = false,
  presets = [],
  canvasViewport,
  activeTool = 'select',
  onSetActiveTool,
  onAddElement
}) => {
  const { getAnimatedElementState, hasKeyframesForProperty, addKeyframe, getTrack, state: animationState } = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [shouldClearSelection, setShouldClearSelection] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
    type: 'element' | 'canvas';
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [manipulatingElements, setManipulatingElements] = useState<Set<string>>(new Set());
  const manipulatedPropertiesRef = useRef<Map<string, Set<string>>>(new Map());

  const [lineDrawingPoints, setLineDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePreviewPos, setMousePreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [penDrawingActive, setPenDrawingActive] = useState(false);
  const lastPenPoint = useRef<{ x: number; y: number } | null>(null);

  const canvasCenter = { x: canvasWidth / 2, y: canvasHeight / 2 };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!setZoom) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;
    const newZoom = e.deltaY < 0
      ? Math.min(3, zoom + 0.05)
      : Math.max(0.05, zoom - 0.05);
    const newPanX = mouseX - canvasX * newZoom;
    const newPanY = mouseY - canvasY * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, setZoom, pan.x, pan.y, setPan]);

  // Callbacks to track element manipulation state
  const handleManipulationStart = useCallback((elementId: string) => {
    setManipulatingElements(prev => new Set(prev).add(elementId));
    manipulatedPropertiesRef.current.set(elementId, new Set());
  }, []);

  const handleManipulationEnd = useCallback((elementId: string) => {
    setManipulatingElements(prev => {
      const next = new Set(prev);
      next.delete(elementId);
      return next;
    });

    // Auto-create keyframes for manipulated properties
    if (isEditMode) {
      const manipulatedProps = manipulatedPropertiesRef.current.get(elementId);
      if (manipulatedProps && manipulatedProps.size > 0) {
        const currentTime = animationState.timeline.currentTime;
        const element = elements.find(el => el.id === elementId);

        if (element) {
          manipulatedProps.forEach(propKey => {
            const animProperty = propKey as any;

            // Check if this property has keyframes
            if (hasKeyframesForProperty(elementId, animProperty)) {
              const track = getTrack(elementId, animProperty);
              if (!track) return;

              // Check if there's already a keyframe at current time
              const existingKeyframe = track.keyframes.find(kf => Math.abs(kf.time - currentTime) < 0.01);

              if (!existingKeyframe) {
                // Get the current value from the element
                let value: any;
                if (animProperty === 'shadowBlur' || animProperty === 'shadowX' || animProperty === 'shadowY') {
                  if (element.shadow) {
                    if (animProperty === 'shadowBlur') value = element.shadow.blur;
                    else if (animProperty === 'shadowX') value = element.shadow.x;
                    else if (animProperty === 'shadowY') value = element.shadow.y;
                  }
                } else {
                  value = (element as any)[animProperty];
                }

                if (value !== undefined) {
                  addKeyframe(elementId, animProperty, currentTime, value);
                }
              }
            }
          });
        }
      }

      manipulatedPropertiesRef.current.delete(elementId);
    }
  }, [isEditMode, animationState.timeline.currentTime, elements, hasKeyframesForProperty, getTrack, addKeyframe]);

  // Track which properties are being manipulated (for auto-keyframe on release)
  const trackManipulatedProperties = useCallback((elementId: string, updates: Partial<DesignElement>) => {
    if (!isEditMode) return;

    const propsSet = manipulatedPropertiesRef.current.get(elementId);
    if (!propsSet) return;

    // Map of DesignElement properties to AnimatableProperty types
    const propertyMap: Record<string, string> = {
      'x': 'x',
      'y': 'y',
      'width': 'width',
      'height': 'height',
      'rotation': 'rotation',
      'opacity': 'opacity',
      'fill': 'fill',
      'stroke': 'stroke',
      'strokeWidth': 'strokeWidth',
      'borderRadius': 'borderRadius',
      'fontSize': 'fontSize',
      'letterSpacing': 'letterSpacing'
    };

    for (const [key, value] of Object.entries(updates)) {
      const animProperty = propertyMap[key];
      if (!animProperty) {
        // Handle shadow properties
        if (key === 'shadow' && typeof value === 'object' && value !== null) {
          const shadow = value as any;
          if (shadow.blur !== undefined) propsSet.add('shadowBlur');
          if (shadow.x !== undefined) propsSet.add('shadowX');
          if (shadow.y !== undefined) propsSet.add('shadowY');
        }
        continue;
      }

      if (value !== undefined) {
        propsSet.add(animProperty);
      }
    }
  }, [isEditMode]);

  const displayElements = useMemo(() => {
    if (!isEditMode) return elements;
    return elements.map((element) => {
      // Skip animated state for elements currently being manipulated
      if (manipulatingElements.has(element.id)) {
        return element;
      }
      const animatedState = getAnimatedElementState(element);
      return { ...element, ...animatedState };
    });
  }, [elements, isEditMode, getAnimatedElementState, manipulatingElements]);

  const {
    detectSnaps,
    showGuides,
    hideGuides,
    activeGuides
  } = useSnapping(elements, canvasCenter, zoom, snapEnabled, { width: canvasWidth, height: canvasHeight });

  // Clamp position to canvas boundaries
  const clampToCanvas = useCallback((x: number, y: number, width: number, height: number) => {
    const clampedX = Math.max(0, Math.min(canvasWidth - width, x));
    const clampedY = Math.max(0, Math.min(canvasHeight - height, y));
    return { x: clampedX, y: clampedY };
  }, [canvasWidth, canvasHeight]);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const canvasX = (clientX - rect.left - pan.x) / zoom;
    const canvasY = (clientY - rect.top - pan.y) / zoom;
    return { x: canvasX, y: canvasY };
  }, [pan.x, pan.y, zoom]);

  const finalizeDrawnLine = useCallback((absPoints: { x: number; y: number }[], toolType: 'line' | 'pen') => {
    if (absPoints.length < 2) return;

    const minX = Math.min(...absPoints.map(p => p.x));
    const maxX = Math.max(...absPoints.map(p => p.x));
    const minY = Math.min(...absPoints.map(p => p.y));
    const maxY = Math.max(...absPoints.map(p => p.y));

    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    const relativePoints = absPoints.map(p => ({ x: p.x - minX, y: p.y - minY, radius: 0 }));

    const element: DesignElement = {
      id: Date.now().toString(),
      type: 'line',
      name: toolType === 'pen' ? 'Pen' : 'Line',
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: 'none',
      stroke: '#FFFFFF',
      strokeWidth: 4,
      borderRadius: 0,
      shadow: { blur: 0, color: 'transparent', x: 0, y: 0 },
      points: relativePoints,
      lineType: toolType,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: [],
      trimStart: 0,
      trimEnd: 1,
      closePath: false,
      arrowStart: false,
      arrowEnd: false,
      arrowheadType: 'triangle',
      arrowheadSize: 12,
      smoothing: 0,
      cornerRadius: 0,
      pointCornerRadii: [],
      autoScaleArrows: false
    };

    onAddElement?.(element);
  }, [onAddElement]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && activeTool === 'line' && lineDrawingPoints.length >= 2) {
        finalizeDrawnLine(lineDrawingPoints, 'line');
        setLineDrawingPoints([]);
        setMousePreviewPos(null);
        onSetActiveTool?.('select');
      }
      if (e.key === 'Escape') {
        if (activeTool === 'line') {
          setLineDrawingPoints([]);
          setMousePreviewPos(null);
          onSetActiveTool?.('select');
        }
        if (activeTool === 'pen') {
          setPenPoints([]);
          setPenDrawingActive(false);
          lastPenPoint.current = null;
          onSetActiveTool?.('select');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, lineDrawingPoints, finalizeDrawnLine, onSetActiveTool]);

  useEffect(() => {
    if (activeTool === 'select') {
      setLineDrawingPoints([]);
      setMousePreviewPos(null);
      setPenPoints([]);
      setPenDrawingActive(false);
      lastPenPoint.current = null;
    }
  }, [activeTool]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click

    const { x: canvasX, y: canvasY } = getCanvasCoordinates(e.clientX, e.clientY);

    // Check if clicking inside artboard
    if (canvasX < 0 || canvasX > canvasWidth || canvasY < 0 || canvasY > canvasHeight) {
      // Outside artboard - start viewport panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setShouldClearSelection(false);
      return;
    }

    // Check if clicking on an element
    const clickedElement = elements.find(element => {
      return canvasX >= element.x &&
             canvasX <= element.x + element.width &&
             canvasY >= element.y &&
             canvasY <= element.y + element.height;
    });

    if (!clickedElement) {
      // Start selection box or pan
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // Start selection box for multi-select
        setSelectionBox({
          startX: canvasX,
          startY: canvasY,
          endX: canvasX,
          endY: canvasY
        });
        setShouldClearSelection(false);
      } else {
        // Prepare for potential pan or clear selection
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        // Mark that we might clear selection on mouseup (if no drag occurs)
        setShouldClearSelection(true);
      }
    }
  }, [pan, zoom, elements, getCanvasCoordinates, canvasWidth, canvasHeight]);

  const handleDrawingMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (activeTool === 'line') {
      setLineDrawingPoints(prev => [...prev, { x, y }]);
    } else if (activeTool === 'pen') {
      setPenPoints([{ x, y }]);
      setPenDrawingActive(true);
      lastPenPoint.current = { x, y };
    }
  }, [activeTool]);

  const handleDrawingMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (activeTool === 'line') {
      setMousePreviewPos({ x, y });
    } else if (activeTool === 'pen' && penDrawingActive) {
      const last = lastPenPoint.current;
      if (last) {
        const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
        if (dist >= 4) {
          setPenPoints(prev => [...prev, { x, y }]);
          lastPenPoint.current = { x, y };
        }
      }
    }
  }, [activeTool, penDrawingActive]);

  const handleDrawingMouseUp = useCallback(() => {
    if (activeTool === 'pen' && penDrawingActive) {
      setPenDrawingActive(false);
      if (penPoints.length >= 2) {
        finalizeDrawnLine(penPoints, 'pen');
      }
      setPenPoints([]);
      lastPenPoint.current = null;
      onSetActiveTool?.('select');
    }
  }, [activeTool, penDrawingActive, penPoints, finalizeDrawnLine, onSetActiveTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (selectionBox) {
      const rect = containerRef.current?.getBoundingClientRect();
      const canvasX = rect ? (e.clientX - rect.left - pan.x) / zoom : 0;
      const canvasY = rect ? (e.clientY - rect.top - pan.y) / zoom : 0;

      setSelectionBox(prev => prev ? {
        ...prev,
        endX: Math.max(0, Math.min(canvasWidth, canvasX)),
        endY: Math.max(0, Math.min(canvasHeight, canvasY))
      } : null);
    } else if (isDragging) {
      // Zoom-adjusted panning
      const newPan = {
        x: (e.clientX - dragStart.x),
        y: (e.clientY - dragStart.y)
      };
      setPan(newPan);
      // If we're actually panning, don't clear selection
      setShouldClearSelection(false);
    }
  }, [isDragging, dragStart, setPan, selectionBox, zoom, pan.x, pan.y, canvasWidth, canvasHeight]);

  const handleMouseUp = useCallback(() => {
    if (selectionBox) {
      // Complete selection box
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);

      const selectedIds = elements.filter(element => {
        return element.x >= minX &&
               element.x + element.width <= maxX &&
               element.y >= minY &&
               element.y + element.height <= maxY;
      }).map(el => el.id);

      setSelectedElements(selectedIds);
      setSelectionBox(null);
    } else if (shouldClearSelection) {
      // Only clear selection if this was a click (not a drag)
      setSelectedElements([]);
    }

    setIsDragging(false);
    setShouldClearSelection(false);
  }, [selectionBox, elements, setSelectedElements, shouldClearSelection]);

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId?: string) => {
    e.preventDefault();
    if (elementId) {
      e.stopPropagation();
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      elementId: elementId || null,
      type: elementId ? 'element' : 'canvas'
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeContextMenu]);

  // Grid lines for the artboard
  const renderLegacyGrid = () => {
    if (gridSettings?.enabled) return null; // Don't render legacy grid if advanced grid is enabled
    
    return renderLegacyGridLines();
  };

  const gridSize = 40;
  const renderLegacyGridLines = () => {
    const gridLines = [];

    if (showGrid) {
    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={canvasWidth}
          y2={y}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      );
    }
    }

    return gridLines;
  };

  // Enhanced element update with grid snapping
  const renderElements = (elementList: DesignElement[], parentOffset = { x: 0, y: 0 }) => {
    return elementList.map((element) => {
      if (element.type === 'group' && element.children) {
        return (
          <div key={element.id}>
            {/* Group container */}
            <EnhancedDesignElementComponent
              element={element}
              isSelected={selectedElements.includes(element.id)}
              isHovered={hoveredElement === element.id}
              onSelect={(multiSelect) => {
                if (multiSelect) {
                  if (selectedElements.includes(element.id)) {
                    setSelectedElements(selectedElements.filter(id => id !== element.id));
                  } else {
                    setSelectedElements([...selectedElements, element.id]);
                  }
                } else {
                  setSelectedElements([element.id]);
                }
              }}
              onUpdate={(updates) => {
                // Clamp group position to canvas
                if (updates.x !== undefined || updates.y !== undefined) {
                  // Apply grid snapping if enabled
                  if (onGridSnap && gridSettings?.snapEnabled) {
                    const snapped = onGridSnap(
                      updates.x !== undefined ? updates.x : element.x,
                      updates.y !== undefined ? updates.y : element.y
                    );
                    updates = { ...updates, x: snapped.x, y: snapped.y };
                  }
                  const newX = updates.x !== undefined ? updates.x : element.x;
                  const newY = updates.y !== undefined ? updates.y : element.y;
                  const clamped = clampToCanvas(newX, newY, element.width, element.height);
                  updates = { ...updates, ...clamped };
                }
                trackManipulatedProperties(element.id, updates);
                updateElement(element.id, updates);
              }}
              onContextMenu={(e) => handleContextMenu(e, element.id)}
              onHover={(isHovered) => setHoveredElement(isHovered ? element.id : null)}
              parentOffset={parentOffset}
              allElements={elements}
              zoom={zoom}
              snapEnabled={snapEnabled}
              canvasSize={{ width: canvasWidth, height: canvasHeight }}
              onShowSnapGuides={showGuides}
              onHideSnapGuides={hideGuides}
              onManipulationStart={handleManipulationStart}
              onManipulationEnd={handleManipulationEnd}
            />
            {/* Group children - with parent group selection */}
            {element.children.map((child) => (
              <EnhancedDesignElementComponent
                key={child.id}
                element={child}
                isSelected={selectedElements.includes(element.id)}
                isHovered={hoveredElement === element.id}
                onSelect={(ctrlKey) => {
                  if (ctrlKey) {
                    if (selectedElements.includes(element.id)) {
                      setSelectedElements(selectedElements.filter(id => id !== element.id));
                    } else {
                      setSelectedElements([...selectedElements, element.id]);
                    }
                  } else {
                    setSelectedElements([element.id]);
                  }
                }}
                onUpdate={(updates) => {
                  if (updates.x !== undefined || updates.y !== undefined) {
                    const deltaX = (updates.x !== undefined ? updates.x : child.x) - child.x;
                    const deltaY = (updates.y !== undefined ? updates.y : child.y) - child.y;

                    const groupUpdates = {
                      x: element.x + deltaX,
                      y: element.y + deltaY
                    };

                    if (onGridSnap && gridSettings?.snapEnabled) {
                      const snapped = onGridSnap(groupUpdates.x, groupUpdates.y);
                      groupUpdates.x = snapped.x;
                      groupUpdates.y = snapped.y;
                    }

                    const clamped = clampToCanvas(groupUpdates.x, groupUpdates.y, element.width, element.height);
                    trackManipulatedProperties(element.id, clamped);
                    updateElement(element.id, clamped);
                  } else {
                    trackManipulatedProperties(element.id, updates);
                    updateElement(element.id, updates);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, element.id)}
                onHover={(isHovered) => setHoveredElement(isHovered ? element.id : null)}
                parentOffset={{
                  x: parentOffset.x + element.x,
                  y: parentOffset.y + element.y
                }}
                allElements={elements}
                zoom={zoom}
                snapEnabled={snapEnabled}
                canvasSize={{ width: canvasWidth, height: canvasHeight }}
                onShowSnapGuides={showGuides}
                onHideSnapGuides={hideGuides}
                onManipulationStart={handleManipulationStart}
                onManipulationEnd={handleManipulationEnd}
              />
            ))}
          </div>
        );
      } else {
        return (
          <EnhancedDesignElementComponent
            key={element.id}
            element={element}
            isSelected={selectedElements.includes(element.id)}
            isHovered={hoveredElement === element.id}
            onSelect={(ctrlKey) => {
              if (ctrlKey) {
                if (selectedElements.includes(element.id)) {
                  setSelectedElements(selectedElements.filter(id => id !== element.id));
                } else {
                  setSelectedElements([...selectedElements, element.id]);
                }
              } else {
                setSelectedElements([element.id]);
              }
            }}
            onUpdate={(updates) => {
              // Clamp element position to canvas
              if (updates.x !== undefined || updates.y !== undefined) {
                // Apply grid snapping if enabled
                if (onGridSnap && gridSettings?.snapEnabled) {
                  const snapped = onGridSnap(
                    updates.x !== undefined ? updates.x : element.x,
                    updates.y !== undefined ? updates.y : element.y
                  );
                  updates = { ...updates, x: snapped.x, y: snapped.y };
                }
                const newX = updates.x !== undefined ? updates.x : element.x;
                const newY = updates.y !== undefined ? updates.y : element.y;
                const clamped = clampToCanvas(newX, newY, element.width, element.height);
                updates = { ...updates, ...clamped };
              }
              trackManipulatedProperties(element.id, updates);
              updateElement(element.id, updates);
            }}
            onContextMenu={(e) => handleContextMenu(e, element.id)}
            onHover={(isHovered) => setHoveredElement(isHovered ? element.id : null)}
            parentOffset={parentOffset}
            allElements={elements}
            zoom={zoom}
            snapEnabled={snapEnabled}
            canvasSize={{ width: canvasWidth, height: canvasHeight }}
            onShowSnapGuides={showGuides}
            onHideSnapGuides={hideGuides}
            onManipulationStart={handleManipulationStart}
            onManipulationEnd={handleManipulationEnd}
          />
        );
      }
    });
  };

  return (
    <div
      ref={containerRef}
      id="canvas-container"
      className={`w-full h-full relative overflow-hidden bg-gray-900 ${activeTool !== 'select' ? '' : 'editor-cursor-default'}`}
      style={{ cursor: activeTool !== 'select' ? 'crosshair' : undefined }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      <div
        ref={canvasRef}
        className={isDragging || selectionBox ? 'editor-cursor-dragging' : ''}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Artboard */}
        <div
          id="canvas-artboard"
          ref={artboardRef}
          className="relative border-2 border-black shadow-2xl flex-shrink-0"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: !background?.enabled ? '#000000' : undefined,
            ...( background?.enabled ? generateBackgroundStyle(background) : {})
          }}
        >
          {/* Grid */}
          {gridSettings && gridCalculations ? (
            <AdvancedGrid
              gridSettings={gridSettings}
              gridCalculations={gridCalculations}
              canvasSize={{ width: canvasWidth, height: canvasHeight }}
            />
          ) : (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
            >
              {renderLegacyGrid()}
            </svg>
          )}
          )

          {/* Canvas Center Point */}
          {gridSettings?.showCenterPoint && (
            <div
              className="absolute w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50"
              style={{
                left: canvasWidth / 2,
                top: canvasHeight / 2
              }}
            />
          )}

          {/* Elements */}
          {renderElements(displayElements)}

          {/* Snap Guides */}
          <SnapGuides
            guides={activeGuides}
            canvasSize={{ width: canvasWidth, height: canvasHeight }}
            zoom={1}
            pan={{ x: 0, y: 0 }}
          />

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border-2 border-yellow-400 bg-yellow-400/10 pointer-events-none"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY)
              }}
            />
          )}

          {/* Drawing tool overlay — intercepts mouse events when in drawing mode */}
          {(activeTool === 'line' || activeTool === 'pen') && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasWidth,
                height: canvasHeight,
                zIndex: 998,
                cursor: 'crosshair'
              }}
              onMouseDown={handleDrawingMouseDown}
              onMouseMove={handleDrawingMouseMove}
              onMouseUp={handleDrawingMouseUp}
            />
          )}

          {/* Line drawing preview */}
          {activeTool === 'line' && lineDrawingPoints.length > 0 && (
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight, pointerEvents: 'none', overflow: 'visible', zIndex: 999 }}
            >
              {lineDrawingPoints.slice(0, -1).map((p, i) => (
                <line key={i} x1={p.x} y1={p.y} x2={lineDrawingPoints[i + 1].x} y2={lineDrawingPoints[i + 1].y} stroke="#FFD700" strokeWidth={3} strokeDasharray="8,4" />
              ))}
              {mousePreviewPos && (
                <line x1={lineDrawingPoints[lineDrawingPoints.length - 1].x} y1={lineDrawingPoints[lineDrawingPoints.length - 1].y} x2={mousePreviewPos.x} y2={mousePreviewPos.y} stroke="rgba(255,215,0,0.45)" strokeWidth={2} strokeDasharray="8,4" />
              )}
              {lineDrawingPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={6} fill="#FFD700" stroke="#FFA500" strokeWidth={2} />
              ))}
              {lineDrawingPoints.length >= 2 && mousePreviewPos && (
                <text x={mousePreviewPos.x + 14} y={mousePreviewPos.y - 10} fill="#FFD700" fontSize={14} fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>
                  Press Enter to finish · ESC to cancel
                </text>
              )}
            </svg>
          )}

          {/* Pen drawing preview */}
          {activeTool === 'pen' && penPoints.length > 1 && (
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth, height: canvasHeight, pointerEvents: 'none', overflow: 'visible', zIndex: 999 }}
            >
              <polyline points={penPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#FFD700" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.type === 'element' && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={closeContextMenu}
          onDuplicate={onDuplicateElement}
          onDelete={onDeleteElement}
          onMoveUp={onMoveElementUp}
          onMoveDown={onMoveElementDown}
          onBringToFront={onBringElementToFront}
          onSendToBack={onSendElementToBack}
        />
      )}

      {/* Canvas Context Menu */}
      {contextMenu && contextMenu.type === 'canvas' && onCreateShape && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onCreateShape={onCreateShape}
          onLoadPreset={onLoadPreset || (() => {})}
          onPaste={onPasteElements || (() => {})}
          onZoomIn={() => setZoom && setZoom(Math.min(3, zoom + 0.05))}
          onZoomOut={() => setZoom && setZoom(Math.max(0.25, zoom - 0.05))}
          onFitToScreen={onFitToScreen || (() => {})}
          onResetZoom={onResetZoom || (() => {})}
          onToggleGrid={() => setShowGrid && setShowGrid()}
          onToggleSnap={() => setSnapEnabled && setSnapEnabled()}
          onSelectAll={() => setSelectedElements(elements.map(el => el.id))}
          onDeselectAll={() => setSelectedElements([])}
          onSelectByType={(type) => {
            const filtered = elements.filter(el => {
              if (type === 'shape') return ['rectangle', 'circle', 'button', 'chat-bubble', 'chat-frame'].includes(el.type);
              if (type === 'text') return el.type === 'text';
              if (type === 'image') return el.type === 'image';
              return false;
            });
            setSelectedElements(filtered.map(el => el.id));
          }}
          onLockCanvas={() => {}}
          onClearCanvas={onClearCanvas || (() => {})}
          onResetTransform={onResetTransform || (() => {})}
          gridEnabled={gridSettings?.enabled ?? showGrid}
          snapEnabled={gridSettings?.snapEnabled ?? snapEnabled}
          hasClipboard={hasClipboard}
          presets={presets}
        />
      )}

      {/* Zoom and position indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3 px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
        <span className="text-xs text-gray-400 font-mono">
          <span className="text-gray-500 mr-1">X</span>
          <span className="text-gray-200">{Math.round(pan.x)}</span>
          <span className="text-gray-500 mx-1.5">Y</span>
          <span className="text-gray-200">{Math.round(pan.y)}</span>
          <span className="text-gray-500 ml-1 text-[10px]">px</span>
        </span>
        <div className="w-px h-3 bg-gray-600" />
        <span className="text-sm text-gray-300 font-mono">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};

export default Canvas;