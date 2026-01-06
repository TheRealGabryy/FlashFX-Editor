import { DesignElement } from '../types/design';
import { createDefaultMaterial } from '../types/material';

export interface ShapeDefaults {
  rectangle: Partial<DesignElement>;
  circle: Partial<DesignElement>;
  text: Partial<DesignElement>;
  button: Partial<DesignElement>;
  chatBubble: Partial<DesignElement>;
  chatFrame: Partial<DesignElement>;
  line: Partial<DesignElement>;
  star: Partial<DesignElement>;
  gradient: Partial<DesignElement>;
  adjustmentLayer: Partial<DesignElement>;
  svg: Partial<DesignElement>;
}

const STORAGE_KEY = 'flashfx_shape_defaults';

const DEFAULT_SHAPE_SETTINGS: ShapeDefaults = {
  rectangle: {
    material: { ...createDefaultMaterial('matte'), color: '#3B82F6' },
    stroke: '#1E40AF',
    strokeWidth: 2,
    borderRadius: 8,
    opacity: 1,
    shadow: {
      blur: 8,
      color: 'rgba(0, 0, 0, 0.3)',
      x: 0,
      y: 4
    }
  },
  circle: {
    material: { ...createDefaultMaterial('matte'), color: '#EF4444' },
    stroke: '#DC2626',
    strokeWidth: 2,
    borderRadius: 50,
    opacity: 1,
    shadow: {
      blur: 8,
      color: 'rgba(0, 0, 0, 0.3)',
      x: 0,
      y: 4
    }
  },
  text: {
    material: { ...createDefaultMaterial('matte'), color: '#FFFFFF' },
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 0,
    opacity: 1,
    shadow: {
      blur: 0,
      color: 'rgba(0, 0, 0, 0)',
      x: 0,
      y: 0
    },
    text: 'Hello World',
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    textTransform: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    textColor: '#FFFFFF'
  },
  button: {
    material: { ...createDefaultMaterial('matte'), color: '#FFD700' },
    stroke: '#FFA500',
    strokeWidth: 2,
    borderRadius: 12,
    opacity: 1,
    shadow: {
      blur: 12,
      color: 'rgba(255, 215, 0, 0.4)',
      x: 0,
      y: 4
    },
    text: 'Click Me',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    textTransform: 'none',
    textAlign: 'center',
    verticalAlign: 'middle',
    textColor: '#000000'
  },
  chatBubble: {
    material: { ...createDefaultMaterial('matte'), color: '#1F2937' },
    stroke: '#374151',
    strokeWidth: 1,
    borderRadius: 18,
    opacity: 1,
    shadow: {
      blur: 8,
      color: 'rgba(0, 0, 0, 0.3)',
      x: 0,
      y: 2
    },
    text: 'Hello! How are you?',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    textTransform: 'none',
    textAlign: 'left',
    verticalAlign: 'middle',
    textColor: '#FFFFFF'
  },
  chatFrame: {
    material: { ...createDefaultMaterial('matte'), color: '#000000' },
    stroke: '#374151',
    strokeWidth: 2,
    borderRadius: 36,
    opacity: 1,
    shadow: {
      blur: 20,
      color: 'rgba(0, 0, 0, 0.5)',
      x: 0,
      y: 8
    }
  },
  line: {
    material: { ...createDefaultMaterial('matte'), color: 'transparent' },
    stroke: '#60A5FA',
    strokeWidth: 3,
    borderRadius: 0,
    opacity: 1,
    shadow: {
      blur: 0,
      color: 'transparent',
      x: 0,
      y: 0
    },
    lineType: 'line',
    arrowStart: false,
    arrowEnd: false,
    arrowheadType: 'triangle',
    arrowheadSize: 12,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: [],
    smoothing: 0
  },
  star: {
    material: { ...createDefaultMaterial('matte'), color: '#FBBF24' },
    stroke: '#F59E0B',
    strokeWidth: 2,
    borderRadius: 0,
    opacity: 1,
    shadow: {
      blur: 8,
      color: 'rgba(251, 191, 36, 0.3)',
      x: 0,
      y: 4
    },
    starPoints: 5,
    starInnerRadius: 50
  },
  gradient: {
    material: { ...createDefaultMaterial('matte'), color: 'transparent' },
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 0,
    opacity: 1,
    shadow: {
      blur: 0,
      color: 'transparent',
      x: 0,
      y: 0
    },
    gradientEnabled: true,
    gradientType: 'linear',
    gradientAngle: 45,
    gradientColors: [
      { color: '#3B82F6', position: 0, id: 'gradient-1' },
      { color: '#8B5CF6', position: 100, id: 'gradient-2' }
    ],
    gradientCenterX: 50,
    gradientCenterY: 50
  },
  adjustmentLayer: {
    material: { ...createDefaultMaterial('matte'), color: 'transparent' },
    stroke: 'rgba(99, 102, 241, 0.5)',
    strokeWidth: 2,
    borderRadius: 0,
    opacity: 0.8,
    shadow: {
      blur: 0,
      color: 'transparent',
      x: 0,
      y: 0
    },
    adjustmentType: 'brightness-contrast',
    adjustmentIntensity: 50,
    blendMode: 'normal'
  },
  svg: {
    material: { ...createDefaultMaterial('matte'), color: 'transparent' },
    stroke: 'transparent',
    strokeWidth: 0,
    borderRadius: 0,
    opacity: 1,
    shadow: {
      blur: 0,
      color: 'transparent',
      x: 0,
      y: 0
    },
    svgData: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
    svgViewBox: '0 0 24 24',
    svgPreserveAspectRatio: 'xMidYMid meet',
    svgFillColor: '#3B82F6',
    svgStrokeColor: '#1E40AF'
  }
};

class ShapeDefaultsService {
  getDefaults(): ShapeDefaults {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SHAPE_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load shape defaults:', error);
    }
    return DEFAULT_SHAPE_SETTINGS;
  }

  getShapeDefaults(shapeType: keyof ShapeDefaults): Partial<DesignElement> {
    const defaults = this.getDefaults();
    return defaults[shapeType] || {};
  }

  saveDefaults(defaults: ShapeDefaults): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch (error) {
      console.error('Failed to save shape defaults:', error);
      throw error;
    }
  }

  updateShapeDefaults(shapeType: keyof ShapeDefaults, updates: Partial<DesignElement>): void {
    const currentDefaults = this.getDefaults();
    currentDefaults[shapeType] = {
      ...currentDefaults[shapeType],
      ...updates
    };
    this.saveDefaults(currentDefaults);
  }

  resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset shape defaults:', error);
      throw error;
    }
  }

  getFactoryDefaults(): ShapeDefaults {
    return DEFAULT_SHAPE_SETTINGS;
  }
}

export const shapeDefaultsService = new ShapeDefaultsService();
