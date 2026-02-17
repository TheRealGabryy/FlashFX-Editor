import React, { useState, useCallback, useEffect } from 'react';
import HorizontalShapesBar from '../HorizontalShapesBar';
import LayersPanel from '../../design-tool/LayersPanel';
import Canvas from '../../design-tool/Canvas';
import PropertiesPanel from '../PropertiesPanel';
import LayoutBar from '../LayoutBar';
import ExitConfirmModal from '../../modals/ExitConfirmModal';
import AdvancedModeConfirmModal from '../../modals/AdvancedModeConfirmModal';
import { DesignElement } from '../../../types/design';
import { BackgroundConfig } from '../../../types/background';
import { useGridSystem } from '../../../hooks/useGridSystem';
import { LayoutMode } from '../../../hooks/useLayoutMode';
import { useAnimation, Sequence } from '../../../animation-engine';
import { CanvasViewport } from '../../../utils/canvasUtils';
import GridSettingsPanel from '../../design-tool/GridSettingsPanel';
import GeneralTimeline from '../../timeline/GeneralTimeline';
import AnimationTimeline from '../../timeline/AnimationTimeline';
import ResizableSplitter from '../../timeline/ResizableSplitter';
import TutorialOverlay from '../../tutorial/TutorialOverlay';
import TutorialWelcomeModal from '../../tutorial/TutorialWelcomeModal';
import { useTutorial } from '../../../contexts/TutorialContext';
import { Preset } from '../../../types/preset';
import { SequenceCompositor } from '../../sequence';

interface DesignModeLayoutProps {
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
  
  // Project JSON Editor
  onOpenProjectJsonEditor: () => void;
  
  // Export
  onOpenExport: () => void;

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

const DesignModeLayout: React.FC<DesignModeLayoutProps> = ({
  currentMode,
  setMode,
  isTransitioning,
  elements,
  selectedElements,
  setSelectedElements,
  updateElement,
  deleteElement,
  duplicateElement,
  moveElementUp,
  moveElementDown,
  bringElementToFront,
  sendElementToBack,
  onAddElement,
  onAddMultipleElements,
  canvasSize: canvasSizeProp,
  zoom,
  setZoom,
  pan,
  setPan,
  showGrid,
  setShowGrid,
  snapEnabled,
  setSnapEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onGroup,
  onUngroup,
  onOpenJsonEditor,
  onOpenLineProperties,
  onOpenProjectJsonEditor,
  onOpenExport,
  onOpenEditorSettings,
  editorMode = false,
  onBackToMain,
  background,
  onUpdateBackground,
  onSavePreset,
  userId,
  isGuest = false,
  onSaveProject,
  onExitToHome,
  onSaveProjectFile,
  onLoadProjectFile,
  onCreateShape,
  onLoadPreset,
  onPasteElements,
  onFitToScreen,
  onResetZoom,
  onClearCanvas,
  onResetTransform,
  presets,
  canvasViewport,
  onApplyTextAnimationControl
}) => {
  const { startTutorial, showWelcomeModal, hideWelcomeModal, state: tutorialState } = useTutorial();
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [isLayersPanelCollapsed, setIsLayersPanelCollapsed] = useState(false);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showAdvancedConfirm, setShowAdvancedConfirm] = useState(false);

  const [leftColumnWidth, setLeftColumnWidth] = useState(25);
  const [rightColumnWidth, setRightColumnWidth] = useState(25);
  const [topRowHeight, setTopRowHeight] = useState(60);

  // Properties panel tab state (independent from layout mode)
  const [propertiesPanelTab, setPropertiesPanelTab] = useState<'design' | 'edit' | 'fx'>('design');

  // Animation context for syncing selection
  const { selectClip, state: animationState, createSequence, getActiveSequence, updateSequence } = useAnimation();
  const activeSequence = getActiveSequence();

  // Store design mode pan/zoom when switching to edit mode
  const [designModePan, setDesignModePan] = useState({ x: 0, y: 0 });
  const [designModeZoom, setDesignModeZoom] = useState(1);

  // Track if we're syncing to prevent infinite loops
  const syncingRef = React.useRef(false);

  // Grid system - use prop or default to 4K
  const canvasSize = canvasSizeProp || { width: 3840, height: 2160 };
  const {
    gridSettings,
    gridCalculations,
    updateGridSettings,
    toggleGrid,
    toggleSnap
  } = useGridSystem(canvasSize);

  // Canvas viewport for shape creation
  const viewport: CanvasViewport = React.useMemo(() => ({
    width: window.innerWidth * 0.5, // 50% for canvas
    height: window.innerHeight,
    scrollX: pan.x,
    scrollY: pan.y,
    zoom
  }), [pan.x, pan.y, zoom]);

  // Calculate initial zoom to fit canvas properly
  const calculateInitialZoom = useCallback(() => {
    const layersWidth = window.innerWidth * 0.25;
    const propertiesWidth = window.innerWidth * 0.25;
    const padding = 40;

    const availableWidth = window.innerWidth - layersWidth - propertiesWidth - padding;
    const availableHeight = window.innerHeight - 100;

    const zoomX = availableWidth / canvasSize.width;
    const zoomY = availableHeight / canvasSize.height;

    return Math.min(zoomX, zoomY, 1) * 0.8;
  }, [canvasSize.width, canvasSize.height]);

  // Initialize zoom on mount
  useEffect(() => {
    const initialZoom = calculateInitialZoom();
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [calculateInitialZoom, setZoom, setPan]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newZoom = calculateInitialZoom();
      setZoom(newZoom);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateInitialZoom, setZoom]);

  // Handle mode switching - center canvas in edit mode
  // Note: pan and zoom are intentionally NOT in dependency array to avoid infinite loops
  // We capture their values at the moment of mode switch, which is the desired behavior
  useEffect(() => {
    if (currentMode === 'edit') {
      // Save current design mode state (capture current pan/zoom values)
      setDesignModePan(pan);
      setDesignModeZoom(zoom);

      // Calculate center position for edit mode
      // Calculate center column width first (must be done before using it)
      const calculatedCenterColumnWidth = 100 - leftColumnWidth - rightColumnWidth;

      // Available viewport is the center column in the top row
      const centerColumnWidthPx = window.innerWidth * (calculatedCenterColumnWidth / 100);
      const availableHeight = window.innerHeight * (topRowHeight / 100);

      // Calculate zoom to fit canvas in available space with padding
      const padding = 60;
      const availableWidthForCanvas = centerColumnWidthPx - padding;
      const availableHeightForCanvas = availableHeight - padding;

      const zoomX = availableWidthForCanvas / canvasSize.width;
      const zoomY = availableHeightForCanvas / canvasSize.height;
      const newZoom = Math.min(zoomX, zoomY, 1) * 0.9;

      // Center the canvas in the available viewport
      const scaledCanvasWidth = canvasSize.width * newZoom;
      const scaledCanvasHeight = canvasSize.height * newZoom;
      const centerX = (centerColumnWidthPx - scaledCanvasWidth) / 2;
      const centerY = (availableHeight - scaledCanvasHeight) / 2;

      setZoom(newZoom);
      setPan({ x: -centerX / newZoom, y: -centerY / newZoom });
    } else if (currentMode === 'design') {
      // Restore design mode state
      setZoom(designModeZoom);
      setPan(designModePan);
    }
  }, [currentMode, leftColumnWidth, rightColumnWidth, topRowHeight, canvasSize.width, canvasSize.height, setZoom, setPan]);

  // Sync canvas selection to timeline clip selection
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }

    if (selectedElements.length === 1) {
      // Single element selected - sync to timeline
      syncingRef.current = true;
      selectClip(selectedElements[0]);
    } else if (selectedElements.length === 0) {
      // No elements selected - deselect timeline clip
      syncingRef.current = true;
      selectClip(null);
    }
    // Note: Multiple selections are not synced to timeline (timeline only supports single clip selection)
  }, [selectedElements, selectClip]);

  // Sync timeline clip selection to canvas selection
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }

    const selectedClipId = animationState.timeline.selectedClipId;

    if (selectedClipId && selectedElements.length === 1 && selectedElements[0] === selectedClipId) {
      // Already in sync, no need to update
      return;
    }

    if (selectedClipId) {
      // Clip selected in timeline - sync to canvas
      syncingRef.current = true;
      setSelectedElements([selectedClipId]);
    } else if (selectedElements.length > 0) {
      // No clip selected in timeline - deselect canvas
      syncingRef.current = true;
      setSelectedElements([]);
    }
  }, [animationState.timeline.selectedClipId, selectedElements, setSelectedElements]);

  const handleExitClick = useCallback(() => {
    setShowExitConfirmModal(true);
  }, []);

  const handleSaveAndExit = useCallback(async () => {
    setShowExitConfirmModal(false);
    if (onSaveProject) {
      try {
        await onSaveProject();
      } catch (error) {
        console.error('Error saving project:', error);
      }
    }
    if (onExitToHome) {
      onExitToHome();
    }
  }, [onSaveProject, onExitToHome]);

  const handleExitOnly = useCallback(() => {
    setShowExitConfirmModal(false);
    if (onExitToHome) {
      onExitToHome();
    }
  }, [onExitToHome]);

  const handleSaveCurrentProject = useCallback(async () => {
    if (onSaveProject) {
      try {
        await onSaveProject();
      } catch (error) {
        console.error('Error saving project:', error);
      }
    }
  }, [onSaveProject]);

  const handleCreateSequence = useCallback((sequence: Sequence) => {
    createSequence(sequence.name, sequence.frameRate, sequence.duration, sequence.canvasId);
  }, [createSequence]);

  const handleEditSequence = useCallback((sequence: Sequence) => {
    updateSequence(sequence.id, {
      name: sequence.name,
      frameRate: sequence.frameRate,
      duration: sequence.duration,
    });
  }, [updateSequence]);

  const selectedElementsData = elements.filter(el => selectedElements.includes(el.id));

  const centerColumnWidth = 100 - leftColumnWidth - rightColumnWidth;
  const bottomRowHeight = 100 - topRowHeight;

  // Determine grid layout based on current mode
  const gridLayout = currentMode === 'design'
    ? {
        gridTemplateColumns: `${leftColumnWidth}% ${centerColumnWidth}% ${rightColumnWidth}%`,
        gridTemplateRows: '100%', // Single row for design mode
      }
    : {
        gridTemplateColumns: `${leftColumnWidth}% ${centerColumnWidth}% ${rightColumnWidth}%`,
        gridTemplateRows: `${topRowHeight}% ${bottomRowHeight}%`, // Two rows for edit mode
      };

  return (
    <div className={`${editorMode ? 'h-screen' : 'h-[calc(100vh-80px)]'} bg-gray-900 overflow-hidden editor-cursor-default`}>
      <div className={`h-full transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`} style={{
        display: 'grid',
        zoom: '0.8',
        transformOrigin: 'top left',
        ...gridLayout
      }}>
        {/* Top Row - Three Columns */}
        {/* Layers Panel (Left Column) */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 overflow-hidden">
          <LayersPanel
            elements={elements}
            selectedElements={selectedElements}
            setSelectedElements={setSelectedElements}
            updateElement={updateElement}
            deleteElement={deleteElement}
            duplicateElement={duplicateElement}
            moveElementUp={moveElementUp}
            moveElementDown={moveElementDown}
            bringElementToFront={bringElementToFront}
            sendElementToBack={sendElementToBack}
            onGroup={onGroup}
            onUngroup={onUngroup}
            onOpenJsonEditor={onOpenJsonEditor}
            onOpenLineProperties={onOpenLineProperties}
            onOpenProjectJsonEditor={onOpenProjectJsonEditor}
            onAddElement={onAddElement}
            onAddMultipleElements={onAddMultipleElements}
            onUpdateElement={updateElement}
            isCollapsed={isLayersPanelCollapsed}
            onToggleCollapse={() => setIsLayersPanelCollapsed(!isLayersPanelCollapsed)}
            onSavePreset={onSavePreset}
            userId={userId}
            isGuest={isGuest}
            onSaveProject={onSaveProject}
            onExitToHome={onExitToHome}
          />
        </div>

        {/* Center Column (Canvas + Red Bar) */}
        <div className="flex flex-col overflow-hidden">
          {/* Red Toolbar Bar - Preserved exactly as is */}
          <div className="flex-shrink-0">
            <HorizontalShapesBar
              onAddElement={onAddElement}
              onAddMultipleElements={onAddMultipleElements}
              canvasSize={canvasSize}
              viewport={viewport}
              zoom={zoom}
              setZoom={setZoom}
              onOpenGridSettings={() => setShowGridSettings(true)}
              onOpenEditorSettings={onOpenEditorSettings}
              onOpenTutorial={showWelcomeModal}
              onOpenExport={onOpenExport}
              gridEnabled={gridSettings.enabled}
              snapEnabled={gridSettings.snapEnabled}
              onToggleGrid={toggleGrid}
              onToggleSnap={toggleSnap}
              onLoadProject={onLoadProjectFile}
              onSaveCurrentProject={handleSaveCurrentProject}
              onExitToHome={handleExitClick}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              currentMode="design"
              onModeChange={() => {}}
              isTransitioning={false}
            />
          </div>

          {/* Canvas Area + Layout Bar Container */}
          <div className="flex-1 flex flex-col bg-gray-900 relative overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden" data-tutorial-target="canvas">
              <Canvas
                elements={elements}
                selectedElements={selectedElements}
                setSelectedElements={setSelectedElements}
                updateElement={updateElement}
                zoom={zoom}
                pan={pan}
                setPan={setPan}
                showGrid={!gridSettings.enabled && showGrid}
                onDuplicateElement={duplicateElement}
                onDeleteElement={deleteElement}
                onMoveElementUp={moveElementUp}
                onMoveElementDown={moveElementDown}
                onBringElementToFront={bringElementToFront}
                onSendElementToBack={sendElementToBack}
                snapEnabled={snapEnabled}
                gridSettings={gridSettings}
                gridCalculations={gridCalculations}
                onGridSnap={gridCalculations.snapToGrid}
                background={background}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                isEditMode={currentMode === 'edit'}
                onCreateShape={onCreateShape}
                onLoadPreset={onLoadPreset}
                onPasteElements={onPasteElements}
                setZoom={setZoom}
                onFitToScreen={onFitToScreen}
                onResetZoom={onResetZoom}
                setShowGrid={toggleGrid}
                setSnapEnabled={toggleSnap}
                onClearCanvas={onClearCanvas}
                onResetTransform={onResetTransform}
                hasClipboard={false}
                presets={presets}
                canvasViewport={viewport}
              />
            </div>

            {/* Layout Bar - Fixed at bottom of preview panel */}
            <div className="flex-shrink-0">
              <LayoutBar
                currentMode={currentMode}
                onModeChange={setMode}
                isTransitioning={isTransitioning}
                onRequestAdvancedMode={() => setShowAdvancedConfirm(true)}
              />
            </div>
          </div>
        </div>

        {/* Properties Panel (Right Column) */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-l border-gray-700/50 overflow-hidden" data-tutorial-target="properties-panel">
          <PropertiesPanel
            selectedElements={selectedElementsData}
            updateElement={updateElement}
            isCollapsed={isPropertiesPanelCollapsed}
            onToggleCollapse={() => setIsPropertiesPanelCollapsed(!isPropertiesPanelCollapsed)}
            background={background}
            onUpdateBackground={onUpdateBackground}
            currentTab={propertiesPanelTab}
            onTabChange={setPropertiesPanelTab}
            canvasSize={canvasSize}
            onApplyTextAnimationControl={onApplyTextAnimationControl}
          />
        </div>

        {/* Bottom Row - Two Timelines (50% / 50%) spanning full width - Only visible in Edit mode */}
        {currentMode === 'edit' && (
          <div style={{ gridColumn: '1 / 4' }} className="overflow-hidden">
            {activeSequence ? (
              <div className="h-full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* General Timeline (Left 50%) */}
                <div className="overflow-hidden" data-tutorial-target="general-timeline">
                  <GeneralTimeline elements={elements} />
                </div>
                {/* Animation Timeline (Right 50%) */}
                <div className="overflow-hidden" data-tutorial-target="animation-timeline">
                  <AnimationTimeline
                    elements={elements}
                    activeSequence={activeSequence}
                    onEditSequence={handleEditSequence}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-900/50">
                <SequenceCompositor
                  activeSequence={null}
                  onCreateSequence={handleCreateSequence}
                  onEditSequence={handleEditSequence}
                  canvasId="current-canvas"
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Grid Settings Panel */}
      <GridSettingsPanel
        isOpen={showGridSettings}
        onClose={() => setShowGridSettings(false)}
        gridSettings={gridSettings}
        updateGridSettings={updateGridSettings}
        shapeSnapEnabled={snapEnabled}
        onToggleShapeSnap={() => setSnapEnabled(!snapEnabled)}
      />

      {/* Tutorial Overlay */}
      <TutorialOverlay />

      {/* Tutorial Welcome Modal */}
      <TutorialWelcomeModal
        isOpen={tutorialState.showWelcomeModal}
        onStartTutorial={startTutorial}
        onOpenYoutube={() => {
          window.open('https://www.youtube.com/@FlashFX', '_blank');
          hideWelcomeModal();
        }}
        onClose={hideWelcomeModal}
      />

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={showExitConfirmModal}
        onClose={() => setShowExitConfirmModal(false)}
        onSaveAndExit={handleSaveAndExit}
        onExitOnly={handleExitOnly}
      />

      {/* Advanced Mode Confirmation Modal */}
      <AdvancedModeConfirmModal
        isOpen={showAdvancedConfirm}
        onConfirm={() => {
          setShowAdvancedConfirm(false);
          setMode('advanced');
        }}
        onCancel={() => setShowAdvancedConfirm(false)}
      />
    </div>
  );
};

export default DesignModeLayout;