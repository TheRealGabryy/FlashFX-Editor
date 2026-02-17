import React, { useState, useRef, useCallback, useMemo } from 'react';
import { DesignElement } from '../../types/design';
import { useSnapping, SnapGuide } from '../../hooks/useSnapping';
import EnhancedLineComponent from './EnhancedLineComponent';
import ImageWithFilters from '../image/ImageWithFilters';
import { materialStyleGenerator } from '../../services/MaterialStyleGenerator';
import { useAnimation } from '../../animation-engine';
import { generateShapeMaterialStyle } from '../../types/material';

interface EnhancedDesignElementComponentProps {
  element: DesignElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (ctrlKey: boolean) => void;
  onUpdate: (updates: Partial<DesignElement>) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onHover: (isHovered: boolean) => void;
  parentOffset?: { x: number; y: number };
  allElements?: DesignElement[];
  zoom?: number;
  snapEnabled?: boolean;
  canvasSize?: { width: number; height: number };
  onGridSnap?: (x: number, y: number) => { x: number; y: number };
  onGridSnapSize?: (width: number, height: number) => { width: number; height: number };
  onShowSnapGuides?: (guides: SnapGuide[]) => void;
  onHideSnapGuides?: () => void;
  disabled?: boolean;
  onManipulationStart?: (elementId: string) => void;
  onManipulationEnd?: (elementId: string) => void;
}

interface ResizeHandle {
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
  cursor: string;
  x: number;
  y: number;
}

const EnhancedDesignElementComponent: React.FC<EnhancedDesignElementComponentProps> = ({
  element,
  isSelected,
  isHovered,
  onSelect,
  onUpdate,
  onContextMenu,
  onHover,
  parentOffset = { x: 0, y: 0 },
  allElements = [],
  zoom = 1,
  snapEnabled = true,
  canvasSize = { width: 3840, height: 2160 },
  onGridSnap,
  onGridSnapSize,
  onShowSnapGuides,
  onHideSnapGuides,
  disabled = false,
  onManipulationStart,
  onManipulationEnd
}) => {
  if (!element.visible) return null;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0, y: 0, width: 0, height: 0, elementX: 0, elementY: 0
  });
  const [rotateStart, setRotateStart] = useState({ angle: 0, rotation: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const canvasCenter = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  const {
    detectSnaps
  } = useSnapping(allElements, canvasCenter, zoom, snapEnabled, canvasSize);

  const absoluteX = parentOffset.x + element.x;
  const absoluteY = parentOffset.y + element.y;

  // Clamp position to canvas boundaries
  const clampToCanvas = useCallback((x: number, y: number, width: number, height: number) => {
    const clampedX = Math.max(0, Math.min(canvasSize.width - width, x));
    const clampedY = Math.max(0, Math.min(canvasSize.height - height, y));
    return { x: clampedX, y: clampedY };
  }, [canvasSize]);

  // Generate resize handles
  const getResizeHandles = useCallback((): ResizeHandle[] => {
    const handleSize = 36; // 3x larger for easier interaction
    const halfHandle = handleSize / 2;

    return [
      { position: 'nw', cursor: 'nw-resize', x: -halfHandle, y: -halfHandle },
      { position: 'ne', cursor: 'ne-resize', x: element.width - halfHandle, y: -halfHandle },
      { position: 'sw', cursor: 'sw-resize', x: -halfHandle, y: element.height - halfHandle },
      { position: 'se', cursor: 'se-resize', x: element.width - halfHandle, y: element.height - halfHandle },
      { position: 'n', cursor: 'n-resize', x: element.width / 2 - halfHandle, y: -halfHandle },
      { position: 's', cursor: 's-resize', x: element.width / 2 - halfHandle, y: element.height - halfHandle },
      { position: 'e', cursor: 'e-resize', x: element.width - halfHandle, y: element.height / 2 - halfHandle },
      { position: 'w', cursor: 'w-resize', x: -halfHandle, y: element.height / 2 - halfHandle }
    ];
  }, [element.width, element.height]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (element.locked || disabled) return;

    e.stopPropagation();
    // Support both Ctrl/Cmd and Shift for multi-selection
    onSelect(e.ctrlKey || e.metaKey || e.shiftKey);

    // Check for Alt key for duplication
    if (e.altKey) {
      setIsDuplicating(true);
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y
    });

    if (onManipulationStart) {
      onManipulationStart(element.id);
    }
  }, [element.locked, element.x, element.y, element.id, onSelect, onManipulationStart, disabled]);

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    if (element.locked || disabled) return;

    e.stopPropagation();
    setIsResizing(handle.position);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
      elementX: element.x,
      elementY: element.y
    });

    if (onManipulationStart) {
      onManipulationStart(element.id);
    }
  }, [element.locked, element.width, element.height, element.x, element.y, element.id, onManipulationStart, disabled]);

  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    if (element.locked || disabled) return;

    e.stopPropagation();

    setIsRotating(true);
    setRotateStart({
      angle: e.clientY,
      rotation: element.rotation
    });

    if (onManipulationStart) {
      onManipulationStart(element.id);
    }
  }, [element.locked, element.rotation, element.id, onManipulationStart, disabled]);

  const calculateResize = useCallback((
    deltaX: number, 
    deltaY: number, 
    handle: string, 
    shiftKey: boolean
  ) => {
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.elementX;
    let newY = resizeStart.elementY;

    const aspectRatio = resizeStart.width / resizeStart.height;

    switch (handle) {
      case 'se':
        newWidth = Math.max(10, resizeStart.width + deltaX);
        newHeight = Math.max(10, resizeStart.height + deltaY);
        if (shiftKey) {
          // Maintain aspect ratio
          const widthRatio = newWidth / resizeStart.width;
          const heightRatio = newHeight / resizeStart.height;
          const ratio = Math.max(widthRatio, heightRatio);
          newWidth = resizeStart.width * ratio;
          newHeight = resizeStart.height * ratio;
        }
        break;
      case 'sw':
        newWidth = Math.max(10, resizeStart.width - deltaX);
        newHeight = Math.max(10, resizeStart.height + deltaY);
        newX = resizeStart.elementX + (resizeStart.width - newWidth);
        if (shiftKey) {
          const widthRatio = newWidth / resizeStart.width;
          const heightRatio = newHeight / resizeStart.height;
          const ratio = Math.max(widthRatio, heightRatio);
          newWidth = resizeStart.width * ratio;
          newHeight = resizeStart.height * ratio;
          newX = resizeStart.elementX + (resizeStart.width - newWidth);
        }
        break;
      case 'ne':
        newWidth = Math.max(10, resizeStart.width + deltaX);
        newHeight = Math.max(10, resizeStart.height - deltaY);
        newY = resizeStart.elementY + (resizeStart.height - newHeight);
        if (shiftKey) {
          const widthRatio = newWidth / resizeStart.width;
          const heightRatio = newHeight / resizeStart.height;
          const ratio = Math.max(widthRatio, heightRatio);
          newWidth = resizeStart.width * ratio;
          newHeight = resizeStart.height * ratio;
          newY = resizeStart.elementY + (resizeStart.height - newHeight);
        }
        break;
      case 'nw':
        newWidth = Math.max(10, resizeStart.width - deltaX);
        newHeight = Math.max(10, resizeStart.height - deltaY);
        newX = resizeStart.elementX + (resizeStart.width - newWidth);
        newY = resizeStart.elementY + (resizeStart.height - newHeight);
        if (shiftKey) {
          const widthRatio = newWidth / resizeStart.width;
          const heightRatio = newHeight / resizeStart.height;
          const ratio = Math.max(widthRatio, heightRatio);
          newWidth = resizeStart.width * ratio;
          newHeight = resizeStart.height * ratio;
          newX = resizeStart.elementX + (resizeStart.width - newWidth);
          newY = resizeStart.elementY + (resizeStart.height - newHeight);
        }
        break;
      case 'n':
        newHeight = Math.max(10, resizeStart.height - deltaY);
        newY = resizeStart.elementY + (resizeStart.height - newHeight);
        if (shiftKey) {
          newWidth = newHeight * aspectRatio;
          newX = resizeStart.elementX + (resizeStart.width - newWidth) / 2;
        }
        break;
      case 's':
        newHeight = Math.max(10, resizeStart.height + deltaY);
        if (shiftKey) {
          newWidth = newHeight * aspectRatio;
          newX = resizeStart.elementX + (resizeStart.width - newWidth) / 2;
        }
        break;
      case 'e':
        newWidth = Math.max(10, resizeStart.width + deltaX);
        if (shiftKey) {
          newHeight = newWidth / aspectRatio;
          newY = resizeStart.elementY + (resizeStart.height - newHeight) / 2;
        }
        break;
      case 'w':
        newWidth = Math.max(10, resizeStart.width - deltaX);
        newX = resizeStart.elementX + (resizeStart.width - newWidth);
        if (shiftKey) {
          newHeight = newWidth / aspectRatio;
          newY = resizeStart.elementY + (resizeStart.height - newHeight) / 2;
        }
        break;
    }

    return { newWidth, newHeight, newX, newY };
  }, [resizeStart]);

  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) / zoom;
        const deltaY = (e.clientY - dragStart.y) / zoom;
        
        const rawX = dragStart.elementX + deltaX;
        const rawY = dragStart.elementY + deltaY;
        
        const clamped = clampToCanvas(rawX, rawY, element.width, element.height);
        
        let finalX = clamped.x;
        let finalY = clamped.y;
        if (onGridSnap) {
          const gridSnapped = onGridSnap(clamped.x, clamped.y);
          finalX = gridSnapped.x;
          finalY = gridSnapped.y;
        }
        
        const snapResult = detectSnaps(element, finalX, finalY, snapEnabled);
        if (snapResult.x !== undefined) finalX = snapResult.x;
        if (snapResult.y !== undefined) finalY = snapResult.y;

        if (onShowSnapGuides) {
          onShowSnapGuides(snapResult.guides);
        }
        
        // Handle duplication
        if (isDuplicating) {
          // Create duplicate element
          const duplicateId = `${element.id}-duplicate-${Date.now()}`;
          const duplicateElement: DesignElement = {
            ...element,
            id: duplicateId,
            name: `${element.name} Copy`,
            x: finalX,
            y: finalY,
            startTime: 0,
            endTime: 5
          };
          
          // This would need to be handled by the parent component
          // For now, just update position
          onUpdate({ x: finalX, y: finalY });
          setIsDuplicating(false);
        } else {
          onUpdate({ x: finalX, y: finalY });
        }
      }
      
      if (isResizing) {
        const deltaX = (e.clientX - resizeStart.x) / zoom;
        const deltaY = (e.clientY - resizeStart.y) / zoom;

        const { newWidth, newHeight, newX, newY } = calculateResize(
          deltaX,
          deltaY,
          isResizing,
          e.shiftKey
        );

        // Apply grid snapping to size if available
        let finalWidth = newWidth;
        let finalHeight = newHeight;
        if (onGridSnapSize) {
          const sizeSnapped = onGridSnapSize(newWidth, newHeight);
          finalWidth = sizeSnapped.width;
          finalHeight = sizeSnapped.height;
        }

        // Ensure resized element stays within canvas bounds
        const maxWidth = canvasSize.width - newX;
        const maxHeight = canvasSize.height - newY;

        const clampedWidth = Math.min(finalWidth, maxWidth);
        const clampedHeight = Math.min(finalHeight, maxHeight);

        onUpdate({
          width: clampedWidth,
          height: clampedHeight,
          x: newX,
          y: newY
        });
      }

      if (isRotating) {
        const deltaY = (e.clientY - rotateStart.angle) / zoom;
        let newRotation = rotateStart.rotation + deltaY;

        // Snap to 15-degree increments when shift is pressed
        if (e.shiftKey) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        // Normalize rotation to 0-360 range
        newRotation = ((newRotation % 360) + 360) % 360;

        onUpdate({ rotation: newRotation });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
      setIsRotating(false);
      setIsDuplicating(false);
      if (onHideSnapGuides) {
        onHideSnapGuides();
      }
      if (onManipulationEnd) {
        onManipulationEnd(element.id);
      }
    };

    if (isDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    isRotating,
    isDuplicating,
    dragStart,
    resizeStart,
    rotateStart,
    onUpdate,
    element,
    detectSnaps,
    onShowSnapGuides,
    onHideSnapGuides,
    snapEnabled,
    zoom,
    canvasSize,
    onGridSnap,
    onGridSnapSize,
    calculateResize,
    clampToCanvas,
    absoluteX,
    absoluteY,
    onManipulationEnd
  ]);

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: absoluteX,
    top: absoluteY,
    width: element.width,
    height: element.height,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
    cursor: element.locked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    pointerEvents: element.locked ? 'none' : 'auto'
  };

  const { state: animationState } = useAnimation();

  const materialStyles = useMemo(() => {
    // New multi-layer material system (priority)
    if (element.materialConfig && element.materialConfig.enabled && element.materialConfig.layers.length > 0) {
      return generateShapeMaterialStyle(element.materialConfig);
    }
    // Legacy single material system (fallback)
    if (element.material) {
      materialStyleGenerator.setAnimationTime(animationState.timeline.currentTime);
      return materialStyleGenerator.generateMaterialStyles(element.material);
    }
    // Simple fill color
    if (element.fill) {
      return { backgroundColor: element.fill };
    }
    // Default blue color
    return { backgroundColor: '#3B82F6' };
  }, [element.materialConfig, element.material, element.fill, animationState.timeline.currentTime]);

  const strokeMaterialStyles = useMemo(() => {
    if (element.strokeMaterialConfig && element.strokeMaterialConfig.enabled && element.strokeMaterialConfig.layers.length > 0) {
      return generateShapeMaterialStyle(element.strokeMaterialConfig);
    }
    return null;
  }, [element.strokeMaterialConfig]);

  const shadowStyle = element.shadow.blur > 0 ? {
    boxShadow: `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
  } : {};

  const getBorderStyle = () => {
    if (strokeMaterialStyles) {
      if (strokeMaterialStyles.backgroundColor) {
        return element.strokeWidth > 0 ? `${element.strokeWidth}px solid ${strokeMaterialStyles.backgroundColor}` : 'none';
      }
      return 'none';
    }
    return element.strokeWidth > 0 ? `${element.strokeWidth}px solid ${element.stroke}` : 'none';
  };

  // Generate material CSS
  const getGradientStyle = (element: DesignElement) => {
    return materialStyles;
  };
  const renderElement = () => {
    if (element.type === 'group') {
      return (
        <div
          style={{
            ...baseStyle,
            border: isSelected ? '2px dashed #FFD700' : '2px dashed transparent',
            backgroundColor: 'transparent'
          }}
          onMouseDown={handleMouseDown}
          onContextMenu={onContextMenu}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        />
      );
    }

    switch (element.type) {
      case 'rectangle':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...getGradientStyle(element),
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          />
        );

      case 'circle':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...getGradientStyle(element),
              border: getBorderStyle(),
              borderRadius: '50%',
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          />
        );

      case 'text': {
        const generatePatternSvg = (type: string, color: string, bgColor: string, size: number, spacing: number, angle: number) => {
          const totalSize = size + spacing;
          let patternContent = '';

          switch (type) {
            case 'dots':
              patternContent = `<circle cx="${totalSize/2}" cy="${totalSize/2}" r="${size/2}" fill="${color}"/>`;
              break;
            case 'lines':
              patternContent = `<line x1="0" y1="${totalSize/2}" x2="${totalSize}" y2="${totalSize/2}" stroke="${color}" stroke-width="${size}"/>`;
              break;
            case 'grid':
              patternContent = `
                <line x1="0" y1="${totalSize/2}" x2="${totalSize}" y2="${totalSize/2}" stroke="${color}" stroke-width="${size/2}"/>
                <line x1="${totalSize/2}" y1="0" x2="${totalSize/2}" y2="${totalSize}" stroke="${color}" stroke-width="${size/2}"/>
              `;
              break;
            case 'diagonal':
              patternContent = `<line x1="0" y1="${totalSize}" x2="${totalSize}" y2="0" stroke="${color}" stroke-width="${size}"/>`;
              break;
            case 'chevron':
              patternContent = `
                <polyline points="0,${totalSize/2} ${totalSize/2},0 ${totalSize},${totalSize/2}" fill="none" stroke="${color}" stroke-width="${size}"/>
              `;
              break;
            default:
              patternContent = `<rect width="${totalSize}" height="${totalSize}" fill="${color}"/>`;
          }

          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}">
              <rect width="100%" height="100%" fill="${bgColor}"/>
              <g transform="rotate(${angle} ${totalSize/2} ${totalSize/2})">
                ${patternContent}
              </g>
            </svg>
          `;
          return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        };

        const textStyles: React.CSSProperties = {
          ...baseStyle,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontFamily: element.fontFamily || 'Inter',
          fontStyle: element.fontStyle || 'normal',
          textTransform: element.textTransform === 'small-caps' ? 'lowercase' : (element.textTransform || 'none') as any,
          fontVariant: element.textTransform === 'small-caps' ? 'small-caps' : 'normal',
          textDecoration: element.textDecoration || 'none',
          letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 'normal',
          lineHeight: element.lineHeight || 1.2,
          wordSpacing: element.wordSpacing ? `${element.wordSpacing}px` : 'normal',
          textAlign: element.textAlign || 'left',
          display: 'flex',
          alignItems: element.verticalAlign === 'top' ? 'flex-start' :
                    element.verticalAlign === 'bottom' ? 'flex-end' : 'center',
          justifyContent: element.textAlign === 'center' ? 'center' :
                       element.textAlign === 'right' ? 'flex-end' :
                       element.textAlign === 'justify' ? 'stretch' : 'flex-start',
          padding: `${element.textPaddingTop || 4}px ${element.textPaddingRight || 4}px ${element.textPaddingBottom || 4}px ${element.textPaddingLeft || 4}px`,
          whiteSpace: element.textWrap === 'nowrap' ? 'nowrap' :
                     element.textWrap === 'balance' ? 'balance' as any :
                     element.textAlign === 'justify' ? 'normal' : 'pre-wrap',
          textOverflow: element.textOverflow || 'clip',
          overflow: element.textOverflow === 'ellipsis' ? 'hidden' : 'visible',
          textIndent: element.textIndent ? `${element.textIndent}px` : '0',
          ...shadowStyle
        };

        let fillApplied = false;

        // Texture fill (highest priority)
        if (element.textTextureFillEnabled && element.textTextureFillImage) {
          const scale = element.textTextureFillScale || 100;
          const offsetX = element.textTextureFillOffsetX || 0;
          const offsetY = element.textTextureFillOffsetY || 0;
          textStyles.background = `url(${element.textTextureFillImage})`;
          textStyles.backgroundSize = `${scale}%`;
          textStyles.backgroundPosition = `${offsetX}px ${offsetY}px`;
          textStyles.backgroundRepeat = 'repeat';
          textStyles.WebkitBackgroundClip = 'text';
          textStyles.WebkitTextFillColor = 'transparent';
          textStyles.backgroundClip = 'text';
          fillApplied = true;
        }
        // Pattern fill
        else if (element.textPatternFillEnabled && element.textPatternType) {
          const patternType = element.textPatternType;
          const patternColor = element.textPatternColor || '#FFFFFF';
          const patternBgColor = element.textPatternBackgroundColor || 'transparent';
          const patternSize = element.textPatternSize || 10;
          const patternSpacing = element.textPatternSpacing || 5;
          const patternAngle = element.textPatternAngle || 0;

          if (patternType === 'custom' && element.textPatternCustomSvg) {
            textStyles.background = `url("data:image/svg+xml,${encodeURIComponent(element.textPatternCustomSvg)}")`;
          } else {
            textStyles.background = generatePatternSvg(patternType, patternColor, patternBgColor, patternSize, patternSpacing, patternAngle);
          }
          textStyles.backgroundRepeat = 'repeat';
          textStyles.WebkitBackgroundClip = 'text';
          textStyles.WebkitTextFillColor = 'transparent';
          textStyles.backgroundClip = 'text';
          fillApplied = true;
        }
        // Gradient fill
        else if (element.textGradientEnabled && element.textGradientColors && element.textGradientColors.length >= 2) {
          const sortedColors = [...element.textGradientColors].sort((a, b) => a.position - b.position);
          const gradientColors = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');

          if (element.textGradientType === 'radial') {
            textStyles.background = `radial-gradient(circle, ${gradientColors})`;
          } else {
            const angle = element.textGradientAngle || 90;
            textStyles.background = `linear-gradient(${angle}deg, ${gradientColors})`;
          }
          textStyles.WebkitBackgroundClip = 'text';
          textStyles.WebkitTextFillColor = 'transparent';
          textStyles.backgroundClip = 'text';
          fillApplied = true;
        }

        // Default solid color
        if (!fillApplied) {
          textStyles.color = element.textColor || '#FFFFFF';
        }

        // Text stroke
        if (element.textStrokeWidth && element.textStrokeWidth > 0) {
          textStyles.WebkitTextStroke = `${element.textStrokeWidth}px ${element.textStrokeColor || '#000000'}`;
        }

        // Text shadow (separate from box shadow)
        const textShadows: string[] = [];
        if (element.textShadowBlur || element.textShadowOffsetX || element.textShadowOffsetY) {
          textShadows.push(
            `${element.textShadowOffsetX || 0}px ${element.textShadowOffsetY || 0}px ${element.textShadowBlur || 0}px ${element.textShadowColor || '#000000'}`
          );
        }

        // Text glow (multiple shadows)
        if (element.textGlowSize && element.textGlowSize > 0 && element.textGlowIntensity && element.textGlowIntensity > 0) {
          const glowColor = element.textGlowColor || '#FFFFFF';
          const opacity = element.textGlowIntensity;
          for (let i = 1; i <= 3; i++) {
            const size = element.textGlowSize * (i / 3);
            const currentOpacity = opacity * (1 - i / 4);
            textShadows.push(`0 0 ${size}px ${glowColor}${Math.round(currentOpacity * 255).toString(16).padStart(2, '0')}`);
          }
        }

        if (textShadows.length > 0) {
          textStyles.textShadow = textShadows.join(', ');
        }

        // Baseline shift
        if (element.baselineShift && element.baselineShift !== 0) {
          textStyles.transform = `translateY(${-element.baselineShift}px)`;
        }

        // Max lines support
        if (element.maxLines && element.maxLines > 0) {
          textStyles.display = '-webkit-box';
          textStyles.WebkitLineClamp = element.maxLines;
          textStyles.WebkitBoxOrient = 'vertical';
          textStyles.overflow = 'hidden';
        }

        // Render rich text if enabled
        if (element.richTextEnabled && element.richTextSegments && element.richTextSegments.length > 0) {
          return (
            <div
              data-element-id={element.id}
              style={{
                ...textStyles,
                WebkitBackgroundClip: undefined,
                WebkitTextFillColor: undefined,
                backgroundClip: undefined,
                background: undefined,
                color: undefined
              }}
              onMouseDown={handleMouseDown}
              onContextMenu={onContextMenu}
              onMouseEnter={() => onHover(true)}
              onMouseLeave={() => onHover(false)}
            >
              {element.richTextSegments.map((segment) => (
                <span
                  key={segment.id}
                  style={{
                    fontFamily: segment.fontFamily || element.fontFamily || 'Inter',
                    fontSize: segment.fontSize ? `${segment.fontSize}px` : undefined,
                    fontWeight: segment.fontWeight || undefined,
                    fontStyle: segment.fontStyle || undefined,
                    color: segment.color || element.textColor || '#FFFFFF',
                    textDecoration: segment.textDecoration || 'none',
                    letterSpacing: segment.letterSpacing ? `${segment.letterSpacing}px` : undefined
                  }}
                >
                  {segment.text}
                </span>
              ))}
            </div>
          );
        }

        return (
          <div
            data-element-id={element.id}
            style={textStyles}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            {element.text}
          </div>
        );
      }

      case 'button':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...getGradientStyle(element),
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              color: element.textColor,
              fontSize: element.fontSize,
              fontWeight: element.fontWeight,
              fontFamily: element.fontFamily || 'Inter',
              fontStyle: element.fontStyle || 'normal',
              textTransform: element.textTransform || 'none',
              textDecoration: element.textDecoration || 'none',
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 'normal',
              lineHeight: element.lineHeight || 1.2,
              wordSpacing: element.wordSpacing ? `${element.wordSpacing}px` : 'normal',
              textAlign: element.textAlign || 'center',
              display: 'flex',
              alignItems: element.verticalAlign === 'top' ? 'flex-start' : 
                        element.verticalAlign === 'bottom' ? 'flex-end' : 'center',
              justifyContent: element.textAlign === 'center' ? 'center' : 
                           element.textAlign === 'right' ? 'flex-end' : 
                           element.textAlign === 'justify' ? 'stretch' : 'flex-start',
              whiteSpace: element.textAlign === 'justify' ? 'normal' : 'pre-wrap',
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            {element.text}
          </div>
        );

      case 'chat-bubble':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...getGradientStyle(element),
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              color: element.textColor,
              fontSize: element.fontSize,
              fontWeight: element.fontWeight,
              fontFamily: element.fontFamily || 'Inter',
              fontStyle: element.fontStyle || 'normal',
              textTransform: element.textTransform || 'none',
              letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 'normal',
              lineHeight: element.lineHeight || 1.2,
              wordSpacing: element.wordSpacing ? `${element.wordSpacing}px` : 'normal',
              textDecoration: element.textDecoration || 'none',
              display: 'flex',
              alignItems: element.verticalAlign === 'top' ? 'flex-start' : 
                        element.verticalAlign === 'bottom' ? 'flex-end' : 'center',
              justifyContent: element.textAlign === 'center' ? 'center' : 
                           element.textAlign === 'right' ? 'flex-end' : 
                           element.textAlign === 'justify' ? 'stretch' : 'flex-start',
              textAlign: element.textAlign || 'left',
              padding: '12px 16px',
              whiteSpace: element.textAlign === 'justify' ? 'normal' : 'pre-wrap',
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            {element.text}
          </div>
        );

      case 'chat-frame':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...getGradientStyle(element),
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '20px',
                ...(element.gradientEnabled ? getGradientStyle(element) : { backgroundColor: element.fill }),
                borderRadius: '0 0 12px 12px'
              }}
            />
          </div>
        );
        
      case 'line':
        return (
          <EnhancedLineComponent
            element={element}
            isSelected={isSelected}
            isHovered={isHovered}
            onUpdate={onUpdate}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            absoluteX={absoluteX}
            absoluteY={absoluteY}
            zoom={zoom}
          />
        );

      case 'image':
        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              overflow: 'hidden',
              borderRadius: element.borderRadius || 0,
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            {element.imageData && (
              <ImageWithFilters
                src={element.imageData}
                alt={element.name}
                filters={element.filters}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              />
            )}
          </div>
        );

      case 'star': {
        const points = element.starPoints || 5;
        const innerRadius = (element.starInnerRadius || 50) / 100;
        const centerX = element.width / 2;
        const centerY = element.height / 2;
        const outerRadius = Math.min(element.width, element.height) / 2;
        const innerRadiusCalc = outerRadius * innerRadius;

        const starPath: string[] = [];
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadiusCalc;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          starPath.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
        }
        starPath.push('Z');

        return (
          <div
            data-element-id={element.id}
            style={baseStyle}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            <svg width="100%" height="100%" style={{ display: 'block' }}>
              <defs>
                {element.shadow.blur > 0 && (
                  <filter id={`star-shadow-${element.id}`}>
                    <feDropShadow
                      dx={element.shadow.x}
                      dy={element.shadow.y}
                      stdDeviation={element.shadow.blur / 2}
                      floodColor={element.shadow.color}
                    />
                  </filter>
                )}
              </defs>
              <path
                d={starPath.join(' ')}
                fill={materialStyles.backgroundColor || '#FBBF24'}
                stroke={element.stroke}
                strokeWidth={element.strokeWidth}
                filter={element.shadow.blur > 0 ? `url(#star-shadow-${element.id})` : undefined}
              />
            </svg>
          </div>
        );
      }

      case 'gradient': {
        const gradientColors = element.gradientColors || [
          { color: '#3B82F6', position: 0, id: 'gradient-1' },
          { color: '#8B5CF6', position: 100, id: 'gradient-2' }
        ];
        const gradientType = element.gradientType || 'linear';
        const gradientAngle = element.gradientAngle || 45;
        const centerX = element.gradientCenterX || 50;
        const centerY = element.gradientCenterY || 50;

        let gradientStyle: React.CSSProperties = {};
        if (gradientType === 'linear') {
          const colorStops = gradientColors.map(c => `${c.color} ${c.position}%`).join(', ');
          gradientStyle.background = `linear-gradient(${gradientAngle}deg, ${colorStops})`;
        } else if (gradientType === 'radial') {
          const colorStops = gradientColors.map(c => `${c.color} ${c.position}%`).join(', ');
          gradientStyle.background = `radial-gradient(circle at ${centerX}% ${centerY}%, ${colorStops})`;
        } else if (gradientType === 'conic') {
          const colorStops = gradientColors.map(c => `${c.color} ${c.position}%`).join(', ');
          gradientStyle.background = `conic-gradient(from ${gradientAngle}deg at ${centerX}% ${centerY}%, ${colorStops})`;
        }

        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              ...gradientStyle,
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          />
        );
      }

      case 'adjustment-layer': {
        const adjustmentType = element.adjustmentType || 'brightness-contrast';
        const intensity = (element.adjustmentIntensity || 50) / 100;

        let filterStyle = '';
        switch (adjustmentType) {
          case 'brightness-contrast':
            filterStyle = `brightness(${0.5 + intensity}) contrast(${0.5 + intensity})`;
            break;
          case 'hue-saturation':
            filterStyle = `hue-rotate(${intensity * 360}deg) saturate(${intensity * 2})`;
            break;
          case 'color':
            filterStyle = `saturate(${intensity * 2})`;
            break;
          case 'levels':
            filterStyle = `brightness(${intensity}) contrast(${intensity})`;
            break;
          default:
            filterStyle = '';
        }

        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: element.strokeWidth > 0 ? `${element.strokeWidth}px dashed ${element.stroke}` : '2px dashed rgba(99, 102, 241, 0.5)',
              borderRadius: element.borderRadius,
              backdropFilter: filterStyle,
              WebkitBackdropFilter: filterStyle,
              mixBlendMode: element.blendMode || 'normal',
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              color: 'rgba(99, 102, 241, 0.8)',
              fontWeight: 'bold',
              pointerEvents: 'none',
              userSelect: 'none'
            }}>
              Adjustment Layer
            </div>
          </div>
        );
      }

      case 'svg': {
        const svgData = element.svgData || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
        const fillColor = element.svgFillColor || '#3B82F6';
        const strokeColor = element.svgStrokeColor || '#1E40AF';

        const processedSvg = svgData
          .replace(/fill="[^"]*"/g, `fill="${fillColor}"`)
          .replace(/stroke="[^"]*"/g, `stroke="${strokeColor}"`)
          .replace(/<svg/, `<svg style="width: 100%; height: 100%; display: block;"`);

        return (
          <div
            data-element-id={element.id}
            style={{
              ...baseStyle,
              border: getBorderStyle(),
              borderRadius: element.borderRadius,
              ...shadowStyle
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={onContextMenu}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            dangerouslySetInnerHTML={{ __html: processedSvg }}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <div>
      {renderElement()}
      
      {/* Enhanced selection outline and resize handles */}
      {(isSelected || isHovered) && !element.locked && element.type !== 'group' && element.type !== 'line' && (
        <div
          style={{
            position: 'absolute',
            left: absoluteX - 2,
            top: absoluteY - 2,
            width: element.width + 4,
            height: element.height + 4,
            border: isSelected ? '2px solid #FFD700' : '2px solid rgba(255, 215, 0, 0.5)',
            borderRadius: element.borderRadius + 2,
            pointerEvents: 'none',
            transform: `rotate(${element.rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          {/* Enhanced resize handles - only show when selected */}
          {isSelected && getResizeHandles().map((handle) => (
            <div
              key={handle.position}
              style={{
                position: 'absolute',
                left: handle.x,
                top: handle.y,
                width: 36,
                height: 36,
                backgroundColor: '#FFD700',
                border: '3px solid #FFA500',
                borderRadius: '4px',
                cursor: handle.cursor,
                pointerEvents: 'auto',
                opacity: isHovered || isSelected ? 1 : 0.7,
                transition: 'opacity 0.2s ease'
              }}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}

          {/* Rotation handle - only show when selected */}
          {isSelected && (
            <div
              style={{
                position: 'absolute',
                left: element.width / 2 - 36,
                top: -200,
                width: 72,
                height: 72,
                backgroundColor: '#3B82F6',
                border: '3px solid #2563EB',
                borderRadius: '50%',
                cursor: 'grab',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isHovered || isSelected ? 1 : 0.7,
                transition: 'opacity 0.2s ease'
              }}
              onMouseDown={handleRotateStart}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedDesignElementComponent;