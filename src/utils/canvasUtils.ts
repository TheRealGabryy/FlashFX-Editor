import { DesignElement } from '../types/design';
import { shapeDefaultsService, ShapeDefaults } from '../services/ShapeDefaultsService';
import { createSolidColorMaterialConfig } from '../types/material';

export interface CanvasViewport {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface CanvasCenter {
  x: number;
  y: number;
}

/**
 * Calculate the center of the visible canvas viewport
 * Accounts for zoom, pan, and scroll transforms
 */
export const calculateCanvasCenter = (
  canvasSize: { width: number; height: number },
  viewport: CanvasViewport
): CanvasCenter => {
  // Calculate the center of the visible viewport in canvas coordinates
  // The viewport center in viewport coordinates is (viewport.width / 2, viewport.height / 2)
  // Convert to canvas coordinates by dividing by zoom and subtracting pan offset
  const centerX = (viewport.width / 2 - viewport.scrollX) / viewport.zoom;
  const centerY = (viewport.height / 2 - viewport.scrollY) / viewport.zoom;

  // Clamp to canvas boundaries
  const clampedX = Math.max(0, Math.min(canvasSize.width, centerX));
  const clampedY = Math.max(0, Math.min(canvasSize.height, centerY));

  return { x: clampedX, y: clampedY };
};

/**
 * Map shape types to defaults service keys
 */
const mapShapeTypeToDefaultsKey = (type: string): keyof ShapeDefaults | null => {
  const mapping: Record<string, keyof ShapeDefaults> = {
    'rectangle': 'rectangle',
    'circle': 'circle',
    'text': 'text',
    'button': 'button',
    'chat-bubble': 'chatBubble',
    'chat-frame': 'chatFrame',
    'line': 'line',
    'star': 'star',
    'gradient': 'gradient',
    'adjustment-layer': 'adjustmentLayer',
    'svg': 'svg'
  };
  return mapping[type] || null;
};

/**
 * Get dimensions for a specific shape type
 */
const getShapeDimensions = (type: DesignElement['type']): { width: number; height: number } => {
  switch (type) {
    case 'circle':
      return { width: 600, height: 600 };
    case 'text':
      return { width: 600, height: 120 };
    case 'button':
      return { width: 300, height: 100 };
    case 'chat-bubble':
      return { width: 400, height: 120 };
    case 'chat-frame':
      return { width: 640, height: 1136 };
    case 'line':
      return { width: 300, height: 2 };
    case 'star':
      return { width: 600, height: 600 };
    case 'gradient':
      return { width: 800, height: 500 };
    case 'adjustment-layer':
      return { width: 800, height: 500 };
    case 'svg':
      return { width: 400, height: 400 };
    default:
      return { width: 800, height: 500 };
  }
};

/**
 * Create a new shape at the center of the visible canvas
 */
export const createShapeAtCenter = (
  type: DesignElement['type'],
  canvasSize: { width: number; height: number },
  viewport: CanvasViewport,
  customProps?: Partial<DesignElement>
): DesignElement => {
  const center = calculateCanvasCenter(canvasSize, viewport);
  const dimensions = getShapeDimensions(type);

  const x = center.x - (dimensions.width / 2);
  const y = center.y - (dimensions.height / 2);

  const defaultsKey = mapShapeTypeToDefaultsKey(type);
  const defaults = defaultsKey ? shapeDefaultsService.getShapeDefaults(defaultsKey) : {};

  const defaultColor = (defaults as any).material?.color || (defaults as any).fill || '#3B82F6';

  const baseElement: DesignElement = {
    id: Date.now().toString(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: dimensions.width,
    height: dimensions.height,
    rotation: 0,
    locked: false,
    visible: true,
    ...defaults,
    materialConfig: createSolidColorMaterialConfig(defaultColor),
    ...customProps
  };

  if (type === 'line') {
    return {
      ...baseElement,
      cornerRadius: 0,
      pointCornerRadii: [],
      points: [
        { x: 0, y: 0, radius: 0 },
        { x: 300, y: 0, radius: 0 }
      ],
      trimStart: 0,
      trimEnd: 1,
      closePath: false,
      autoScaleArrows: false
    };
  }

  if (type === 'star') {
    return {
      starPoints: 5,
      starInnerRadius: 50,
      ...baseElement
    };
  }

  if (type === 'gradient') {
    return {
      gradientEnabled: true,
      gradientType: 'linear',
      gradientAngle: 45,
      gradientCenterX: 50,
      gradientCenterY: 50,
      ...baseElement
    };
  }

  if (type === 'adjustment-layer') {
    return {
      adjustmentType: 'brightness-contrast',
      adjustmentIntensity: 50,
      blendMode: 'normal',
      ...baseElement,
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
    };
  }

  if (type === 'svg') {
    return {
      svgData: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
      svgViewBox: '0 0 24 24',
      svgPreserveAspectRatio: 'xMidYMid meet',
      svgFillColor: '#3B82F6',
      svgStrokeColor: '#1E40AF',
      ...baseElement
    };
  }

  return baseElement;
};

/**
 * Create a new shape centered at a specific canvas coordinate
 */
export const createShapeAtPosition = (
  type: DesignElement['type'],
  canvasX: number,
  canvasY: number,
  customProps?: Partial<DesignElement>,
  canvasSize?: { width: number; height: number }
): DesignElement => {
  const dimensions = getShapeDimensions(type);
  const x = canvasX - dimensions.width / 2;
  const y = canvasY - dimensions.height / 2;

  const defaultsKey = mapShapeTypeToDefaultsKey(type);
  const defaults = defaultsKey ? shapeDefaultsService.getShapeDefaults(defaultsKey) : {};
  const defaultColor = (defaults as any).material?.color || (defaults as any).fill || '#3B82F6';

  const baseElement: DesignElement = {
    id: Date.now().toString(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    x,
    y,
    width: dimensions.width,
    height: dimensions.height,
    rotation: 0,
    locked: false,
    visible: true,
    ...defaults,
    materialConfig: createSolidColorMaterialConfig(defaultColor),
    ...customProps
  };

  if (type === 'line') {
    return {
      ...baseElement,
      cornerRadius: 0,
      pointCornerRadii: [],
      points: [
        { x: 0, y: 0, radius: 0 },
        { x: 300, y: 0, radius: 0 }
      ],
      trimStart: 0,
      trimEnd: 1,
      closePath: false,
      autoScaleArrows: false
    };
  }

  if (type === 'star') {
    return {
      starPoints: 5,
      starInnerRadius: 50,
      ...baseElement
    };
  }

  if (type === 'gradient') {
    return {
      gradientEnabled: true,
      gradientType: 'linear',
      gradientAngle: 45,
      gradientCenterX: 50,
      gradientCenterY: 50,
      ...baseElement
    };
  }

  if (type === 'adjustment-layer') {
    const adjWidth = canvasSize?.width ?? baseElement.width;
    const adjHeight = canvasSize?.height ?? baseElement.height;
    return {
      adjustmentType: 'brightness-contrast',
      adjustmentIntensity: 50,
      blendMode: 'normal',
      ...baseElement,
      x: 0,
      y: 0,
      width: adjWidth,
      height: adjHeight,
    };
  }

  if (type === 'svg') {
    return {
      svgData: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
      svgViewBox: '0 0 24 24',
      svgPreserveAspectRatio: 'xMidYMid meet',
      svgFillColor: '#3B82F6',
      svgStrokeColor: '#1E40AF',
      ...baseElement
    };
  }

  return baseElement;
};