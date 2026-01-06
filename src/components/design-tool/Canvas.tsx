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
  canvasViewport
}) => {
  const { getAnimatedElementState, hasKeyframesForProperty, addKeyframe, getTrack, state: animationState } = useAnimation();
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

  const canvasCenter = { x: canvasWidth / 2, y: canvasHeight / 2 };

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
    const artboard = artboardRef.current;
    if (!artboard) return { x: 0, y: 0 };

    const rect = artboard.getBoundingClientRect();
    const canvasX = (clientX - rect.left) / zoom;
    const canvasY = (clientY - rect.top) / zoom;
    
    return { x: canvasX, y: canvasY };
  }, [zoom]);

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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (selectionBox) {
      const canvasX = (e.clientX - (artboardRef.current?.getBoundingClientRect().left || 0)) / zoom;
      const canvasY = (e.clientY - (artboardRef.current?.getBoundingClientRect().top || 0)) / zoom;

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
  }, [isDragging, dragStart, setPan, selectionBox, zoom, canvasWidth, canvasHeight]);

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
    <div className="w-full h-full relative overflow-hidden bg-gray-900 editor-cursor-default">
      <div
        ref={canvasRef}
        className={`w-full h-full flex items-center justify-center p-4 ${isDragging || selectionBox ? 'editor-cursor-dragging' : 'editor-cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => handleContextMenu(e)}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          minWidth: `${canvasWidth * zoom + 200}px`,
          minHeight: `${canvasHeight * zoom + 200}px`
        }}
      >
        {/* Artboard */}
        <div
          id="canvas-artboard"
          ref={artboardRef}
          className="relative border-2 border-gray-600 shadow-2xl flex-shrink-0"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: !background?.enabled ? '#1F2937' : undefined,
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
          <div
            className="absolute w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            style={{
              left: canvasWidth / 2,
              top: canvasHeight / 2
            }}
          />

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

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50">
        <span className="text-sm text-gray-300">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};

export default Canvas;