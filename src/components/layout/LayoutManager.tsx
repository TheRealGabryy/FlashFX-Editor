import React from 'react';
import { LayoutMode } from '../../hooks/useLayoutMode';
import DesignModeLayout from './modes/DesignModeLayout';
import AdvancedModeLayout from './modes/AdvancedModeLayout';
import { DesignElement } from '../../types/design';
import { BackgroundConfig } from '../../types/background';
import { Preset } from '../../types/preset';
import { CanvasViewport } from '../../utils/canvasUtils';

interface LayoutManagerProps {
  // Mode state
  currentMode: LayoutMode;
  setMode: (mode: LayoutMode) => void;
  isTransitioning: boolean;

  // Canvas state
  elements: DesignElement[];
  selectedElements: string[];
  setSelectedElements: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElementUp: (id: string) => void;
  moveElementDown: (id: string) => void;
  bringElementToFront: (id: string) => void;
  sendElementToBack: (id: string) => void;
  onAddElement: (element: DesignElement) => void;
  onAddMultipleElements?: (elements: DesignElement[]) => void;

  // Canvas dimensions
  canvasSize?: { width: number; height: number };

  // Canvas controls
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  
  // Group operations
  onGroup: () => void;
  onUngroup: () => void;
  
  // JSON Editor
  onOpenJsonEditor: (element: DesignElement) => void;
  
  // Line Properties
  onOpenLineProperties: () => void;
  
  // Export
  onOpenExport: () => void;

  // Project JSON Editor
  onOpenProjectJsonEditor: () => void;

  // Editor Settings
  onOpenEditorSettings?: () => void;

  // Editor mode
  editorMode?: boolean;
  onBackToMain?: () => void;

  // Background
  background?: BackgroundConfig;
  onUpdateBackground?: (background: BackgroundConfig) => void;

  // Presets
  onSavePreset?: (name: string, description: string, elements: DesignElement[]) => Promise<void>;
  userId?: string | null;
  isGuest?: boolean;

  // Project Save/Exit
  onSaveProject?: () => Promise<void>;
  onExitToHome?: () => void;

  // Project File Management
  onSaveProjectFile?: () => void;
  onLoadProjectFile?: () => void;

  // Canvas Context Menu
  onCreateShape?: (type: 'rectangle' | 'circle' | 'line' | 'text' | 'image', x: number, y: number) => void;
  onLoadPreset?: (preset: Preset, x: number, y: number) => void;
  onPasteElements?: (x: number, y: number, inPlace: boolean) => void;
  onFitToScreen?: () => void;
  onResetZoom?: () => void;
  onClearCanvas?: () => void;
  onResetTransform?: () => void;
  presets?: Preset[];
  canvasViewport?: CanvasViewport;

  // Text Animation Control
  onApplyTextAnimationControl?: (elementId: string) => void;
}

const LayoutManager: React.FC<LayoutManagerProps> = (props) => {
  const { currentMode, setMode, isTransitioning } = props;

  // Common props for all layouts
  const commonProps = {
    currentMode,
    setMode,
    isTransitioning,
    elements: props.elements,
    selectedElements: props.selectedElements,
    setSelectedElements: props.setSelectedElements,
    updateElement: props.updateElement,
    deleteElement: props.deleteElement,
    duplicateElement: props.duplicateElement,
    moveElementUp: props.moveElementUp,
    moveElementDown: props.moveElementDown,
    bringElementToFront: props.bringElementToFront,
    sendElementToBack: props.sendElementToBack,
    onAddElement: props.onAddElement,
    onAddMultipleElements: props.onAddMultipleElements,
    canvasSize: props.canvasSize,
    zoom: props.zoom,
    setZoom: props.setZoom,
    pan: props.pan,
    setPan: props.setPan,
    showGrid: props.showGrid,
    setShowGrid: props.setShowGrid,
    snapEnabled: props.snapEnabled,
    setSnapEnabled: props.setSnapEnabled,
    canUndo: props.canUndo,
    canRedo: props.canRedo,
    onUndo: props.onUndo,
    onRedo: props.onRedo,
    onGroup: props.onGroup,
    onUngroup: props.onUngroup,
    onOpenJsonEditor: props.onOpenJsonEditor,
    onOpenLineProperties: props.onOpenLineProperties,
    onOpenExport: props.onOpenExport,
    onOpenProjectJsonEditor: props.onOpenProjectJsonEditor,
    onOpenEditorSettings: props.onOpenEditorSettings,
    editorMode: props.editorMode,
    onBackToMain: props.onBackToMain,
    background: props.background,
    onUpdateBackground: props.onUpdateBackground,
    onSavePreset: props.onSavePreset,
    userId: props.userId,
    isGuest: props.isGuest,
    onSaveProject: props.onSaveProject,
    onExitToHome: props.onExitToHome,
    onSaveProjectFile: props.onSaveProjectFile,
    onLoadProjectFile: props.onLoadProjectFile,
    onCreateShape: props.onCreateShape,
    onLoadPreset: props.onLoadPreset,
    onPasteElements: props.onPasteElements,
    onFitToScreen: props.onFitToScreen,
    onResetZoom: props.onResetZoom,
    onClearCanvas: props.onClearCanvas,
    onResetTransform: props.onResetTransform,
    presets: props.presets,
    canvasViewport: props.canvasViewport,
    onApplyTextAnimationControl: props.onApplyTextAnimationControl
  };

  const renderLayout = () => {
    if (currentMode === 'advanced') {
      return <AdvancedModeLayout {...commonProps} />;
    }
    return <DesignModeLayout {...commonProps} />;
  };

  return (
    <div className={`w-full h-full transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
      {renderLayout()}
    </div>
  );
};

export default LayoutManager;