import { useState, useCallback } from 'react';
import { DesignElement } from '../types/design';

export interface SnapGuide {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number;
  color: string;
  startPos: number;
  endPos: number;
  sourceElement: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
  targetBounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    centerX: number;
    centerY: number;
  };
  snapType: 'canvas-edge' | 'canvas-center' | 'element-edge' | 'element-center';
  markerPositions: { x: number; y: number }[];
}

export interface SnapResult {
  x?: number;
  y?: number;
  guides: SnapGuide[];
}

const SNAP_THRESHOLD = 8;

export const useSnapping = (
  elements: DesignElement[],
  canvasCenter: { x: number; y: number },
  zoom: number = 1,
  enabled: boolean = true,
  canvasSize?: { width: number; height: number }
) => {
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  const getElementBounds = useCallback((element: DesignElement) => {
    return {
      left: element.x,
      right: element.x + element.width,
      top: element.y,
      bottom: element.y + element.height,
      centerX: element.x + element.width / 2,
      centerY: element.y + element.height / 2,
      width: element.width,
      height: element.height
    };
  }, []);

  const calculateGuideExtent = useCallback((
    type: 'vertical' | 'horizontal',
    position: number,
    sourceBounds: { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number },
    targetBounds?: { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number }
  ): { startPos: number; endPos: number; markers: { x: number; y: number }[] } => {
    const EXTENSION = 40;
    const markers: { x: number; y: number }[] = [];

    if (type === 'vertical') {
      let minY: number, maxY: number;

      if (targetBounds) {
        minY = Math.min(sourceBounds.top, targetBounds.top) - EXTENSION;
        maxY = Math.max(sourceBounds.bottom, targetBounds.bottom) + EXTENSION;
        markers.push({ x: position, y: sourceBounds.top });
        markers.push({ x: position, y: sourceBounds.bottom });
        if (position === targetBounds.left || position === targetBounds.right || position === targetBounds.centerX) {
          markers.push({ x: position, y: targetBounds.top });
          markers.push({ x: position, y: targetBounds.bottom });
        }
      } else {
        minY = 0;
        maxY = canvasSize?.height || 2160;
        markers.push({ x: position, y: sourceBounds.top });
        markers.push({ x: position, y: sourceBounds.bottom });
      }

      return { startPos: minY, endPos: maxY, markers };
    } else {
      let minX: number, maxX: number;

      if (targetBounds) {
        minX = Math.min(sourceBounds.left, targetBounds.left) - EXTENSION;
        maxX = Math.max(sourceBounds.right, targetBounds.right) + EXTENSION;
        markers.push({ x: sourceBounds.left, y: position });
        markers.push({ x: sourceBounds.right, y: position });
        if (position === targetBounds.top || position === targetBounds.bottom || position === targetBounds.centerY) {
          markers.push({ x: targetBounds.left, y: position });
          markers.push({ x: targetBounds.right, y: position });
        }
      } else {
        minX = 0;
        maxX = canvasSize?.width || 3840;
        markers.push({ x: sourceBounds.left, y: position });
        markers.push({ x: sourceBounds.right, y: position });
      }

      return { startPos: minX, endPos: maxX, markers };
    }
  }, [canvasSize]);

  const detectSnaps = useCallback((
    movingElement: DesignElement,
    newX: number,
    newY: number,
    snapEnabled: boolean = enabled
  ): SnapResult => {
    if (!snapEnabled) {
      return { guides: [] };
    }

    const guides: SnapGuide[] = [];
    let snappedX = newX;
    let snappedY = newY;

    const movingBounds = {
      left: newX,
      right: newX + movingElement.width,
      top: newY,
      bottom: newY + movingElement.height,
      centerX: newX + movingElement.width / 2,
      centerY: newY + movingElement.height / 2,
      width: movingElement.width,
      height: movingElement.height
    };

    const threshold = SNAP_THRESHOLD / zoom;

    const createSourceBounds = (x: number, y: number) => ({
      left: x,
      right: x + movingElement.width,
      top: y,
      bottom: y + movingElement.height,
      centerX: x + movingElement.width / 2,
      centerY: y + movingElement.height / 2
    });

    if (canvasSize) {
      if (Math.abs(movingBounds.left) < threshold) {
        snappedX = 0;
        const sourceBounds = createSourceBounds(0, snappedY);
        const extent = calculateGuideExtent('vertical', 0, sourceBounds);
        guides.push({
          id: 'canvas-left',
          type: 'vertical',
          position: 0,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          snapType: 'canvas-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(movingBounds.right - canvasSize.width) < threshold) {
        snappedX = canvasSize.width - movingElement.width;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', canvasSize.width, sourceBounds);
        guides.push({
          id: 'canvas-right',
          type: 'vertical',
          position: canvasSize.width,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          snapType: 'canvas-edge',
          markerPositions: extent.markers
        });
      }

      if (Math.abs(movingBounds.top) < threshold) {
        snappedY = 0;
        const sourceBounds = createSourceBounds(snappedX, 0);
        const extent = calculateGuideExtent('horizontal', 0, sourceBounds);
        guides.push({
          id: 'canvas-top',
          type: 'horizontal',
          position: 0,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          snapType: 'canvas-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(movingBounds.bottom - canvasSize.height) < threshold) {
        snappedY = canvasSize.height - movingElement.height;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', canvasSize.height, sourceBounds);
        guides.push({
          id: 'canvas-bottom',
          type: 'horizontal',
          position: canvasSize.height,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          snapType: 'canvas-edge',
          markerPositions: extent.markers
        });
      }
    }

    if (Math.abs(movingBounds.centerX - canvasCenter.x) < threshold) {
      snappedX = canvasCenter.x - movingElement.width / 2;
      const sourceBounds = createSourceBounds(snappedX, snappedY);
      const extent = calculateGuideExtent('vertical', canvasCenter.x, sourceBounds);
      guides.push({
        id: 'canvas-center-x',
        type: 'vertical',
        position: canvasCenter.x,
        color: '#FFD700',
        startPos: extent.startPos,
        endPos: extent.endPos,
        sourceElement: sourceBounds,
        snapType: 'canvas-center',
        markerPositions: extent.markers
      });
    }

    if (Math.abs(movingBounds.centerY - canvasCenter.y) < threshold) {
      snappedY = canvasCenter.y - movingElement.height / 2;
      const sourceBounds = createSourceBounds(snappedX, snappedY);
      const extent = calculateGuideExtent('horizontal', canvasCenter.y, sourceBounds);
      guides.push({
        id: 'canvas-center-y',
        type: 'horizontal',
        position: canvasCenter.y,
        color: '#FFD700',
        startPos: extent.startPos,
        endPos: extent.endPos,
        sourceElement: sourceBounds,
        snapType: 'canvas-center',
        markerPositions: extent.markers
      });
    }

    const otherElements = elements.filter(el => el.id !== movingElement.id && el.visible);

    otherElements.forEach((element, index) => {
      const bounds = getElementBounds(element);

      const currentMovingBounds = {
        left: snappedX,
        right: snappedX + movingElement.width,
        top: snappedY,
        bottom: snappedY + movingElement.height,
        centerX: snappedX + movingElement.width / 2,
        centerY: snappedY + movingElement.height / 2
      };

      if (Math.abs(currentMovingBounds.top - bounds.top) < threshold) {
        snappedY = bounds.top;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', bounds.top, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-top`,
          type: 'horizontal',
          position: bounds.top,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.bottom - bounds.bottom) < threshold) {
        snappedY = bounds.bottom - movingElement.height;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', bounds.bottom, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-bottom`,
          type: 'horizontal',
          position: bounds.bottom,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.top - bounds.bottom) < threshold) {
        snappedY = bounds.bottom;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', bounds.bottom, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-stack-bottom`,
          type: 'horizontal',
          position: bounds.bottom,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.bottom - bounds.top) < threshold) {
        snappedY = bounds.top - movingElement.height;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', bounds.top, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-stack-top`,
          type: 'horizontal',
          position: bounds.top,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.centerY - bounds.centerY) < threshold) {
        snappedY = bounds.centerY - movingElement.height / 2;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('horizontal', bounds.centerY, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-center-y`,
          type: 'horizontal',
          position: bounds.centerY,
          color: '#FFD700',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-center',
          markerPositions: extent.markers
        });
      }

      if (Math.abs(currentMovingBounds.left - bounds.left) < threshold) {
        snappedX = bounds.left;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', bounds.left, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-left`,
          type: 'vertical',
          position: bounds.left,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.right - bounds.right) < threshold) {
        snappedX = bounds.right - movingElement.width;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', bounds.right, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-right`,
          type: 'vertical',
          position: bounds.right,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.left - bounds.right) < threshold) {
        snappedX = bounds.right;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', bounds.right, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-side-right`,
          type: 'vertical',
          position: bounds.right,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.right - bounds.left) < threshold) {
        snappedX = bounds.left - movingElement.width;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', bounds.left, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-side-left`,
          type: 'vertical',
          position: bounds.left,
          color: '#FF8C00',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-edge',
          markerPositions: extent.markers
        });
      } else if (Math.abs(currentMovingBounds.centerX - bounds.centerX) < threshold) {
        snappedX = bounds.centerX - movingElement.width / 2;
        const sourceBounds = createSourceBounds(snappedX, snappedY);
        const extent = calculateGuideExtent('vertical', bounds.centerX, sourceBounds, bounds);
        guides.push({
          id: `element-${index}-center-x`,
          type: 'vertical',
          position: bounds.centerX,
          color: '#FFD700',
          startPos: extent.startPos,
          endPos: extent.endPos,
          sourceElement: sourceBounds,
          targetBounds: bounds,
          snapType: 'element-center',
          markerPositions: extent.markers
        });
      }
    });

    return {
      x: snappedX !== newX ? snappedX : undefined,
      y: snappedY !== newY ? snappedY : undefined,
      guides
    };
  }, [elements, canvasCenter, zoom, getElementBounds, enabled, calculateGuideExtent]);

  const showGuides = useCallback((guides: SnapGuide[]) => {
    setActiveGuides(guides);
  }, []);

  const hideGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  return {
    detectSnaps,
    showGuides,
    hideGuides,
    activeGuides
  };
};