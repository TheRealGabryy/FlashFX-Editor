import React, { useState, useCallback } from 'react';
import ExportUI from '../export/ExportUI';
import LayoutManager from './layout/LayoutManager';
import LayoutModeSwitcher from './layout/LayoutModeSwitcher';
import ShortCutPopUpModal from './design-tool/ShortCutPopUpModal';
import JsonEditorModal from './design-tool/JsonEditorModal';
import ProjectJSONEditor from './design-tool/ProjectJSONEditor';
import LinePropertiesBar from './design-tool/LinePropertiesBar';
import EditorSettingsModal from './design-tool/EditorSettingsModal';
import FlashFXAIComponent from './FlashFX_AI_Component';
import ProjectManager from './project/ProjectManager';
import { TutorialProvider } from '../contexts/TutorialContext';
import { AnimationProvider, useAnimation } from '../animation-engine';
import { DesignElement } from '../types/design';
import { BackgroundConfig, createDefaultBackground } from '../types/background';
import { ProjectCanvas } from '../types/projectFile';
import { useCanvasHistory, CanvasState } from '../hooks/useCanvasHistory';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { useGlobalKeyboardShortcuts } from '../hooks/useGlobalKeyboardShortcuts';
import { useGridSystem } from '../hooks/useGridSystem';
import { usePreviewAutoBackup } from '../hooks/usePreviewAutoBackup';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, ungroupElements, updateElementInGroup, getAllElementsFlat } from '../utils/groupUtils';
import { CanvasViewport } from '../utils/canvasUtils';
import { PresetService } from '../services/PresetService';
import { supabase } from '../lib/supabase';
import { shapeDefaultsService } from '../services/ShapeDefaultsService';
import { getDefaultImageFilters } from '../utils/imageFilters';
import { Preset } from '../types/preset';
import { splitTextWithAnimation } from '../utils/textAnimationSplitter';

interface UIDesignToolProps {
  onBackToMain: () => void;
  editorMode?: boolean;
  projectId?: string | null;
}

interface ExportUIWrapperProps {
  showExportPanel: boolean;
  setShowExportPanel: (show: boolean) => void;
  elements: DesignElement[];
  selectedElements: string[];
  projectName: string;
  canvasSize: { width: number; height: number };
  background?: BackgroundConfig;
  projectCanvasSize: { width: number; height: number };
  onSaveProject?: () => void;
}

const ExportUIWrapper: React.FC<ExportUIWrapperProps> = ({
  showExportPanel,
  setShowExportPanel,
  elements,
  selectedElements,
  projectName,
  canvasSize,
  background,
  projectCanvasSize,
  onSaveProject
}) => {
  const { state, setCurrentTime, setPlaying, getActiveSequence } = useAnimation();
  const activeSequence = getActiveSequence();

  const handleSeekToTime = async (time: number) => {
    setPlaying(false);
    setCurrentTime(time);
    await new Promise(resolve => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          resolve(undefined);
        });
      }, 50);
    });
  };

  return (
    <ExportUI
      isOpen={showExportPanel}
      onClose={() => setShowExportPanel(false)}
      elements={elements}
      selectedElements={selectedElements}
      projectName={projectName}
      canvasWidth={canvasSize.width}
      canvasHeight={canvasSize.height}
      background={background}
      projectCanvasWidth={projectCanvasSize.width}
      projectCanvasHeight={projectCanvasSize.height}
      animationDuration={state.timeline.duration}
      animationFps={state.timeline.fps}
      onSeekToTime={handleSeekToTime}
      sequenceName={activeSequence?.name}
      hasActiveSequence={!!activeSequence}
      onSaveProject={onSaveProject}
    />
  );
};

interface UIDesignToolContentProps {
  onBackToMain: () => void;
  editorMode: boolean;
  projectId: string | null;
  isGuest: boolean;
  user: any;
}

const UIDesignToolContent: React.FC<UIDesignToolContentProps> = ({ onBackToMain, editorMode, projectId, isGuest, user }) => {
  const { updateKeyframesAtCurrentTime, state: animationState, deleteKeyframe, selectKeyframes, loadAnimations } = useAnimation();

  const initialState: CanvasState = {
    elements: [],
    selectedElements: []
  };

  const {
    currentState,
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    setCurrentState
  } = useCanvasHistory(initialState);

  const isManipulatingRef = React.useRef(false);
  const manipulationStartStateRef = React.useRef<CanvasState | null>(null);

  const [zoom, setZoom] = useState(0.25);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditorElement, setJsonEditorElement] = useState<DesignElement | null>(null);
  const [showProjectJsonEditor, setShowProjectJsonEditor] = useState(false);
  const [showLineProperties, setShowLineProperties] = useState(false);
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [background, setBackground] = useState<BackgroundConfig>(createDefaultBackground());
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 3840, height: 2160 });
  const [projectCanvasSize, setProjectCanvasSize] = useState({ width: 3840, height: 2160 });
  const [presets, setPresets] = useState<Preset[]>([]);
  const [autoBackupInterval, setAutoBackupInterval] = useState(60000);

  // Load presets
  React.useEffect(() => {
    const loadPresets = async () => {
      if (isGuest) {
        const localPresets = PresetService.loadPresetsFromLocalStorage();
        setPresets(localPresets);
      } else if (user?.id) {
        try {
          const userPresets = await PresetService.getUserPresets(user.id);
          setPresets(userPresets);
        } catch (error) {
          console.error('Failed to load presets:', error);
        }
      }
    };
    loadPresets();
  }, [isGuest, user]);

  // Load project data when projectId is provided
  React.useEffect(() => {
    const loadProject = async () => {
      if (!projectId || projectLoaded) return;

      try {
        if (isGuest) {
          const stored = localStorage.getItem('flashfx_guest_projects');
          if (stored) {
            const projects = JSON.parse(stored);
            const project = projects.find((p: any) => p.id === projectId);
            if (project) {
              setProjectName(project.name);

              if (project.data?.projectFileLoaded && project.data?.elements) {
                const loadedElements = project.data.elements;
                const loadedCanvas = project.data.canvas;

                if (loadedElements.length > 0) {
                  pushToHistory({ elements: loadedElements, selectedElements: [] });
                }

                if (loadedCanvas) {
                  setZoom(loadedCanvas.zoom || 1);
                  setPan(loadedCanvas.pan || { x: 0, y: 0 });
                  setShowGrid(loadedCanvas.grid?.enabled ?? true);
                  setSnapEnabled(loadedCanvas.grid?.snap ?? true);
                  if (loadedCanvas.background) {
                    setBackground(loadedCanvas.background);
                  }
                  if (loadedCanvas.width && loadedCanvas.height) {
                    const size = { width: loadedCanvas.width, height: loadedCanvas.height };
                    setCanvasSize(size);
                    setProjectCanvasSize(size);
                  }
                }
              } else if (project.data?.canvas) {
                const canvas = project.data.canvas;
                if (canvas.width && canvas.height) {
                  const size = { width: canvas.width, height: canvas.height };
                  setCanvasSize(size);
                  setProjectCanvasSize(size);
                }
              } else if (project.data?.backgroundColor) {
                const bgConfig: BackgroundConfig = {
                  enabled: true,
                  layers: [{
                    id: 'layer-1',
                    type: 'solid',
                    angle: 0,
                    colorStops: [{
                      color: project.data.backgroundColor,
                      position: 0
                    }],
                    blendMode: 'normal',
                    opacity: 100
                  }]
                };
                setBackground(bgConfig);
              }
            }
          }
        } else if (user) {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

          if (!error && data) {
            setProjectName(data.name);

            if (data.data?.projectFileLoaded && data.data?.elements) {
              const loadedElements = data.data.elements;
              const loadedCanvas = data.data.canvas;

              if (loadedElements.length > 0) {
                pushToHistory({ elements: loadedElements, selectedElements: [] });
              }

              if (loadedCanvas) {
                setZoom(loadedCanvas.zoom || 1);
                setPan(loadedCanvas.pan || { x: 0, y: 0 });
                setShowGrid(loadedCanvas.grid?.enabled ?? true);
                setSnapEnabled(loadedCanvas.grid?.snap ?? true);
                if (loadedCanvas.background) {
                  setBackground(loadedCanvas.background);
                }
                if (loadedCanvas.width && loadedCanvas.height) {
                  const size = { width: loadedCanvas.width, height: loadedCanvas.height };
                  setCanvasSize(size);
                  setProjectCanvasSize(size);
                }
              }
            } else if (data.data?.canvas) {
              const canvas = data.data.canvas;
              if (canvas.width && canvas.height) {
                const size = { width: canvas.width, height: canvas.height };
                setCanvasSize(size);
                setProjectCanvasSize(size);
              }
            } else if (data.data?.backgroundColor) {
              const bgConfig: BackgroundConfig = {
                enabled: true,
                layers: [{
                  id: 'layer-1',
                  type: 'solid',
                  angle: 0,
                  colorStops: [{
                    color: data.data.backgroundColor,
                    position: 0
                  }],
                  blendMode: 'normal',
                  opacity: 100
                }]
              };
              setBackground(bgConfig);
            }
          }
        }
        setProjectLoaded(true);
      } catch (error) {
        console.error('Error loading project:', error);
      }
    };

    loadProject();
  }, [projectId, isGuest, user, projectLoaded]);

  usePreviewAutoBackup({
    projectId,
    isGuest,
    enabled: true,
    intervalMs: autoBackupInterval,
    quality: 0.8,
    maxWidth: 1280,
    maxHeight: 720
  });

  // Layout mode state
  const { currentMode, setMode, isTransitioning } = useLayoutMode();

  // Grid system
  const {
    gridSettings,
    updateGridSettings,
    toggleGrid,
  } = useGridSystem(canvasSize);

  // Canvas viewport for shape creation
  const viewport: CanvasViewport = React.useMemo(() => ({
    width: window.innerWidth * 0.6,
    height: window.innerHeight * 0.6,
    scrollX: pan.x,
    scrollY: pan.y,
    zoom
  }), [pan.x, pan.y, zoom]);

  const currentCanvas: ProjectCanvas = {
    width: canvasSize.width,
    height: canvasSize.height,
    fps: 30,
    unit: 'px',
    background,
    grid: {
      enabled: showGrid,
      size: gridSettings.gridSize,
      snap: snapEnabled
    },
    zoom,
    pan
  };

  const handleProjectLoaded = useCallback((newElements: DesignElement[], newCanvas: ProjectCanvas) => {
    const newState: CanvasState = {
      elements: newElements,
      selectedElements: []
    };
    pushToHistory(newState);

    setZoom(newCanvas.zoom || 0.25);
    setPan(newCanvas.pan || { x: 0, y: 0 });
    setShowGrid(newCanvas.grid.enabled);
    setSnapEnabled(newCanvas.grid.snap);

    if (newCanvas.background) {
      setBackground(newCanvas.background);
    }
  }, [pushToHistory]);

  const updateCanvas = useCallback((newElements: DesignElement[], newSelectedElements?: string[], skipHistory = false) => {
    const newState: CanvasState = {
      elements: newElements,
      selectedElements: newSelectedElements ?? currentState.selectedElements
    };
    if (skipHistory || isManipulatingRef.current) {
      setCurrentState(newState);
    } else {
      pushToHistory(newState);
    }
  }, [pushToHistory, setCurrentState, currentState.selectedElements]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    updateKeyframesAtCurrentTime(id, updates);
    const newElements = updateElementInGroup(currentState.elements, id, updates);
    updateCanvas(newElements);
  }, [currentState.elements, updateCanvas, updateKeyframesAtCurrentTime]);

  const addElement = useCallback((element: DesignElement) => {
    const newElements = [...currentState.elements, element];
    updateCanvas(newElements, [element.id]);
  }, [currentState.elements, updateCanvas]);

  const addMultipleElements = useCallback((elements: DesignElement[]) => {
    const newElements = [...currentState.elements, ...elements];
    const newSelectedIds = elements.map(el => el.id);
    updateCanvas(newElements, newSelectedIds);
  }, [currentState.elements, updateCanvas]);

  const handleApplyTextAnimationControl = useCallback((elementId: string) => {
    const element = currentState.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'text' || !element.textAnimationMode || element.textAnimationMode === 'whole') {
      console.log('Cannot apply animation control: element not found, not text, or mode is "whole"');
      return;
    }

    const mode = element.textAnimationMode;
    const staggerDelay = element.textAnimationStaggerDelay || 0.1;

    const animation = animationState.animations[elementId];

    const result = splitTextWithAnimation(element, animation, mode, staggerDelay);

    if (result.newElements.length > 0) {
      let newElements = currentState.elements.filter(el => el.id !== elementId);
      newElements = [...newElements, ...result.newElements];

      const updatedAnimations = { ...animationState.animations };

      Object.entries(result.newAnimations).forEach(([newElId, newAnim]) => {
        updatedAnimations[newElId] = newAnim;
      });

      if (animation) {
        delete updatedAnimations[elementId];
      }

      loadAnimations(updatedAnimations);

      const newSelectedIds = result.newElements.map(el => el.id);
      updateCanvas(newElements, newSelectedIds);

      console.log(`Successfully split text into ${result.newElements.length} units`);
    }
  }, [currentState.elements, animationState, updateCanvas, loadAnimations]);

  const deleteElement = useCallback((id: string) => {
    const newElements = currentState.elements.filter(el => el.id !== id);
    const newSelected = currentState.selectedElements.filter(selId => selId !== id);
    updateCanvas(newElements, newSelected);
  }, [currentState.elements, currentState.selectedElements, updateCanvas]);

  const duplicateElement = useCallback((id: string) => {
    const allElements = getAllElementsFlat(currentState.elements);
    const element = allElements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...element,
        id: Date.now().toString(),
        x: element.x + 20,
        y: element.y + 20,
        name: `${element.name} Copy`
      };
      addElement(newElement);
    }
  }, [currentState.elements, addElement]);

  const setSelectedElements = useCallback((selectedIds: string[]) => {
    const newState: CanvasState = {
      elements: currentState.elements,
      selectedElements: selectedIds
    };
    pushToHistory(newState);
  }, [currentState.elements, pushToHistory]);

  // Manipulation tracking handlers
  const handleManipulationStart = useCallback(() => {
    if (!isManipulatingRef.current) {
      isManipulatingRef.current = true;
      manipulationStartStateRef.current = { ...currentState };
    }
  }, [currentState]);

  const handleManipulationEnd = useCallback(() => {
    if (isManipulatingRef.current && manipulationStartStateRef.current) {
      isManipulatingRef.current = false;
      pushToHistory(currentState);
      manipulationStartStateRef.current = null;
    }
  }, [currentState, pushToHistory]);

  // Keyboard shortcut handlers
  const handleDuplicate = useCallback(() => {
    if (currentState.selectedElements.length === 1) {
      duplicateElement(currentState.selectedElements[0]);
    }
  }, [currentState.selectedElements, duplicateElement]);

  const handleGroup = useCallback(() => {
    if (currentState.selectedElements.length >= 2) {
      const newElements = createGroup(currentState.elements, currentState.selectedElements);
      const newGroup = newElements.find(el => el.type === 'group' && !currentState.elements.find(existing => existing.id === el.id));
      updateCanvas(newElements, newGroup ? [newGroup.id] : []);
    }
  }, [currentState.elements, currentState.selectedElements, updateCanvas]);

  const handleUngroup = useCallback(() => {
    if (currentState.selectedElements.length === 1) {
      const selectedElement = currentState.elements.find(el => el.id === currentState.selectedElements[0]);
      if (selectedElement?.type === 'group') {
        const newElements = ungroupElements(currentState.elements, selectedElement.id);
        const childIds = selectedElement.children?.map(child => child.id) || [];
        updateCanvas(newElements, childIds);
      }
    }
  }, [currentState.elements, currentState.selectedElements, updateCanvas]);

  const handleDelete = useCallback(() => {
    const { selectedKeyframeIds, selectedClipId } = animationState.timeline;

    if (selectedKeyframeIds.length > 0 && selectedClipId) {
      const animation = animationState.animations[selectedClipId];
      if (animation) {
        animation.tracks.forEach(track => {
          selectedKeyframeIds.forEach(kfId => {
            const keyframe = track.keyframes.find(kf => kf.id === kfId);
            if (keyframe) {
              deleteKeyframe(selectedClipId, track.property, kfId);
            }
          });
        });
        selectKeyframes([]);
      }
    } else if (currentState.selectedElements.length > 0) {
      let newElements = [...currentState.elements];
      currentState.selectedElements.forEach(id => {
        newElements = newElements.filter(el => el.id !== id);
      });
      updateCanvas(newElements, []);
    }
  }, [currentState.elements, currentState.selectedElements, updateCanvas, animationState, deleteKeyframe, selectKeyframes]);

  const handleNudge = useCallback((direction: 'up' | 'down' | 'left' | 'right', amount: number) => {
    if (currentState.selectedElements.length === 0) return;

    let newElements = [...currentState.elements];
    currentState.selectedElements.forEach(id => {
      const elementIndex = newElements.findIndex(el => el.id === id);
      if (elementIndex !== -1) {
        const element = newElements[elementIndex];
        let updates: Partial<DesignElement> = {};

        switch (direction) {
          case 'up':
            updates.y = element.y - amount;
            break;
          case 'down':
            updates.y = element.y + amount;
            break;
          case 'left':
            updates.x = element.x - amount;
            break;
          case 'right':
            updates.x = element.x + amount;
            break;
        }

        newElements = updateElementInGroup(newElements, id, updates);
      }
    });

    updateCanvas(newElements);
  }, [currentState.elements, currentState.selectedElements, updateCanvas]);

  const handleSelectAll = useCallback(() => {
    const allIds = currentState.elements.map(el => el.id);
    setSelectedElements(allIds);
  }, [currentState.elements, setSelectedElements]);

  const handleExport = useCallback(() => {
    setShowExportPanel(true);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedElements([]);
  }, [setSelectedElements]);

  const moveElementUp = useCallback((id: string) => {
    const index = currentState.elements.findIndex(el => el.id === id);
    if (index < currentState.elements.length - 1) {
      const newElements = [...currentState.elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      updateCanvas(newElements);
    }
  }, [currentState.elements, updateCanvas]);

  const moveElementDown = useCallback((id: string) => {
    const index = currentState.elements.findIndex(el => el.id === id);
    if (index > 0) {
      const newElements = [...currentState.elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      updateCanvas(newElements);
    }
  }, [currentState.elements, updateCanvas]);

  const bringElementToFront = useCallback((id: string) => {
    const index = currentState.elements.findIndex(el => el.id === id);
    if (index !== -1 && index < currentState.elements.length - 1) {
      const newElements = [...currentState.elements];
      const [element] = newElements.splice(index, 1);
      newElements.push(element);
      updateCanvas(newElements);
    }
  }, [currentState.elements, updateCanvas]);

  const sendElementToBack = useCallback((id: string) => {
    const index = currentState.elements.findIndex(el => el.id === id);
    if (index > 0) {
      const newElements = [...currentState.elements];
      const [element] = newElements.splice(index, 1);
      newElements.unshift(element);
      updateCanvas(newElements);
    }
  }, [currentState.elements, updateCanvas]);

  const handleOpenJsonEditor = useCallback((element: DesignElement) => {
    setJsonEditorElement(element);
    setShowJsonEditor(true);
  }, []);

  const handleSaveJsonEdit = useCallback((updatedElement: DesignElement) => {
    updateElement(updatedElement.id, updatedElement);
    setShowJsonEditor(false);
    setJsonEditorElement(null);
  }, [updateElement]);

  const handleOpenLineProperties = useCallback(() => {
    const lineElements = currentState.elements.filter(el => 
      el.type === 'line' && currentState.selectedElements.includes(el.id)
    );
    if (lineElements.length > 0) {
      setShowLineProperties(true);
    }
  }, [currentState.elements, currentState.selectedElements]);
  const handleOpenProjectJsonEditor = useCallback(() => {
    setShowProjectJsonEditor(true);
  }, []);

  const handleApplyProject = useCallback((elements: DesignElement[], selectedElements: string[]) => {
    const newState: CanvasState = {
      elements,
      selectedElements
    };
    pushToHistory(newState);
    setShowProjectJsonEditor(false);
  }, [pushToHistory]);

  const handleShowShortcuts = useCallback(() => {
    setShowShortcutsModal(true);
  }, []);

  const handleOpenEditorSettings = useCallback(() => {
    setShowEditorSettings(true);
  }, []);

  const handleSavePreset = useCallback(async (name: string, description: string, elements: DesignElement[]) => {
    try {
      if (isGuest) {
        const localPresets = PresetService.loadPresetsFromLocalStorage();
        const newPreset = {
          id: `preset-${Date.now()}`,
          user_id: 'guest',
          name,
          description,
          elements,
          element_count: elements.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        PresetService.savePresetsToLocalStorage([...localPresets, newPreset]);
      } else if (user?.id) {
        await PresetService.createPreset(user.id, {
          name,
          description,
          elements,
          element_count: elements.length
        });
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      throw error;
    }
  }, [isGuest, user]);

  const handleSaveProject = useCallback(async () => {
    if (!projectId) return;

    try {
      if (isGuest) {
        const stored = localStorage.getItem('flashfx_guest_projects');
        if (stored) {
          const projects = JSON.parse(stored);
          const updatedProjects = projects.map((p: any) => {
            if (p.id === projectId) {
              return {
                ...p,
                name: projectName,
                data: {
                  ...p.data,
                  projectFileLoaded: true,
                  elements: currentState.elements,
                  selectedElements: currentState.selectedElements,
                  canvas: currentCanvas,
                  background
                },
                updated_at: new Date().toISOString()
              };
            }
            return p;
          });
          localStorage.setItem('flashfx_guest_projects', JSON.stringify(updatedProjects));
        }
      } else if (user) {
        await supabase
          .from('projects')
          .update({
            name: projectName,
            data: {
              projectFileLoaded: true,
              elements: currentState.elements,
              selectedElements: currentState.selectedElements,
              canvas: currentCanvas,
              background
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }, [projectId, isGuest, user, projectName, currentState.elements, currentState.selectedElements, currentCanvas, background]);

  // Canvas context menu handlers
  const handleCreateShapeAtPosition = useCallback((type: 'rectangle' | 'circle' | 'line' | 'text' | 'image', clientX: number, clientY: number) => {
    const canvasElement = document.getElementById('canvas-artboard');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;

    const defaultWidth = type === 'circle' ? 600 : type === 'text' ? 600 : type === 'line' ? 300 : 800;
    const defaultHeight = type === 'circle' ? 600 : type === 'text' ? 120 : type === 'line' ? 2 : 500;

    const element: Partial<DesignElement> = {
      id: Date.now().toString(),
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x: Math.max(0, x - defaultWidth / 2),
      y: Math.max(0, y - defaultHeight / 2),
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      locked: false,
      visible: true
    };

    const defaultsKey = type === 'chat-bubble' ? 'chatBubble' : type === 'chat-frame' ? 'chatFrame' : type;
    const defaults = shapeDefaultsService.getShapeDefaults(defaultsKey as any);

    if (type === 'line') {
      const lineElement: DesignElement = {
        ...element,
        ...defaults,
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
      } as DesignElement;
      addElement(lineElement);
    } else {
      addElement({ ...element, ...defaults } as DesignElement);
    }
  }, [addElement, pan, zoom]);

  const handleImportImageAtPosition = useCallback(async (clientX: number, clientY: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const asset = await mediaPoolService.createAssetFromFile(file);
        await mediaPoolService.addAsset(asset);

        const canvasElement = document.getElementById('canvas-artboard');
        if (!canvasElement) return;

        const rect = canvasElement.getBoundingClientRect();
        const x = (clientX - rect.left - pan.x) / zoom;
        const y = (clientY - rect.top - pan.y) / zoom;

        const maxImageSize = 400;
        let width = asset.width;
        let height = asset.height;
        const aspectRatio = width / height;

        if (width > maxImageSize || height > maxImageSize) {
          if (width > height) {
            width = maxImageSize;
            height = width / aspectRatio;
          } else {
            height = maxImageSize;
            width = height * aspectRatio;
          }
        }

        const imageElement: DesignElement = {
          id: Date.now().toString(),
          type: 'image',
          name: asset.name,
          x: Math.max(0, x - width / 2),
          y: Math.max(0, y - height / 2),
          width,
          height,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          fill: 'transparent',
          stroke: 'transparent',
          strokeWidth: 0,
          borderRadius: 0,
          shadow: {
            blur: 0,
            color: 'transparent',
            x: 0,
            y: 0
          },
          imageData: asset.data,
          originalWidth: asset.width,
          originalHeight: asset.height,
          aspectRatioLocked: true,
          blendMode: 'normal',
          filters: getDefaultImageFilters()
        };

        addElement(imageElement);
      } catch (error) {
        console.error('Failed to import image:', error);
      }
    };

    input.click();
  }, [addElement, pan, zoom]);

  const handleLoadPresetAtPosition = useCallback(async (preset: Preset, clientX: number, clientY: number) => {
    const canvasElement = document.getElementById('canvas-artboard');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;

    const elements = JSON.parse(JSON.stringify(preset.elements)) as DesignElement[];

    let minX = Infinity;
    let minY = Infinity;
    elements.forEach(el => {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
    });

    const offsetX = x - minX;
    const offsetY = y - minY;

    elements.forEach(el => {
      el.id = `${Date.now()}-${Math.random()}`;
      el.x += offsetX;
      el.y += offsetY;
    });

    addMultipleElements(elements);
  }, [addMultipleElements, pan, zoom]);

  const handlePasteAtPosition = useCallback((clientX: number, clientY: number, inPlace: boolean) => {
    // TODO: Implement paste functionality with clipboard
    console.log('Paste at position:', clientX, clientY, inPlace);
  }, []);

  const handleFitToScreen = useCallback(() => {
    const container = document.querySelector('.editor-cursor-default')?.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const padding = 100;

    const zoomX = (containerWidth - padding * 2) / canvasSize.width;
    const zoomY = (containerHeight - padding * 2) / canvasSize.height;
    const newZoom = Math.min(zoomX, zoomY, 1);

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, [canvasSize]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleClearCanvas = useCallback(() => {
    updateCanvas([], []);
  }, [updateCanvas]);

  const handleResetTransform = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Enhanced keyboard shortcuts with shortcut modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl + Alt + Shift + S
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleShowShortcuts();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleShowShortcuts]);
  
  // Global keyboard shortcuts
  React.useEffect(() => {
    console.log('[UIDesignTool] useGlobalKeyboardShortcuts props:', {
      canvasSize,
      viewport,
      addElement: typeof addElement,
      selectedElementsCount: currentState.selectedElements.length,
      elementsCount: currentState.elements.length
    });
  }, [canvasSize, viewport, currentState.selectedElements.length, currentState.elements.length]);

  useGlobalKeyboardShortcuts({
    onAddElement: addElement,
    selectedElements: currentState.selectedElements,
    elements: currentState.elements,
    setSelectedElements,
    updateElement,
    duplicateElement: handleDuplicate,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    canvasSize,
    viewport,
    snapEnabled,
    setSnapEnabled,
    gridEnabled: gridSettings.enabled,
    toggleGrid,
    onNudge: handleNudge,
    zoom,
    setZoom,
    onUndo: undo,
    onRedo: redo
  });
  
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onDuplicate: handleDuplicate,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    onDelete: handleDelete,
    onNudge: handleNudge,
    onSelectAll: handleSelectAll,
    onExport: handleExport,
    onDeselect: handleDeselect,
    canUndo,
    canRedo
  });


  return (
    <TutorialProvider>
      <ProjectManager
        elements={currentState.elements}
        canvas={currentCanvas}
        userId={user?.id || null}
        userName={user?.email || null}
        onProjectLoaded={handleProjectLoaded}
      >
        {({ handleSaveClick, handleLoadClick, currentProjectName }) => (
          <div className="h-full flex flex-col">
          {/* Main Layout Area */}
          <div className="flex-1">
            <LayoutManager
              currentMode={currentMode}
              setMode={setMode}
              isTransitioning={isTransitioning}
              elements={currentState.elements}
              selectedElements={currentState.selectedElements}
              setSelectedElements={setSelectedElements}
              updateElement={updateElement}
              deleteElement={deleteElement}
              duplicateElement={duplicateElement}
              moveElementUp={moveElementUp}
              moveElementDown={moveElementDown}
              bringElementToFront={bringElementToFront}
              sendElementToBack={sendElementToBack}
              onAddElement={addElement}
              canvasSize={canvasSize}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              setPan={setPan}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
              snapEnabled={snapEnabled}
              setSnapEnabled={setSnapEnabled}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
          onRedo={redo}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onManipulationStart={handleManipulationStart}
          onManipulationEnd={handleManipulationEnd}
          onOpenExport={handleExport}
          onOpenJsonEditor={handleOpenJsonEditor}
          onOpenLineProperties={handleOpenLineProperties}
          onOpenProjectJsonEditor={handleOpenProjectJsonEditor}
          onOpenEditorSettings={handleOpenEditorSettings}
          editorMode={editorMode}
          onBackToMain={onBackToMain}
          background={background}
          onUpdateBackground={setBackground}
          onAddMultipleElements={addMultipleElements}
          onSavePreset={handleSavePreset}
          userId={user?.id || null}
          isGuest={isGuest}
          onSaveProject={handleSaveProject}
          onExitToHome={onBackToMain}
          onSaveProjectFile={handleSaveClick}
          onLoadProjectFile={handleLoadClick}
          onCreateShape={handleCreateShapeAtPosition}
          onImportImage={handleImportImageAtPosition}
          onLoadPreset={handleLoadPresetAtPosition}
          onPasteElements={handlePasteAtPosition}
          onFitToScreen={handleFitToScreen}
          onResetZoom={handleResetZoom}
          onClearCanvas={handleClearCanvas}
          onResetTransform={handleResetTransform}
          presets={presets}
          canvasViewport={viewport}
          onApplyTextAnimationControl={handleApplyTextAnimationControl}
            />
          </div>

          <FlashFXAIComponent 
        onAddElement={addElement}
        onAddMultipleElements={addMultipleElements}
        onUpdateElement={updateElement}
      />
      
      <ExportUIWrapper
        showExportPanel={showExportPanel}
        setShowExportPanel={setShowExportPanel}
        elements={currentState.elements}
        selectedElements={currentState.selectedElements}
        projectName={projectName}
        canvasSize={canvasSize}
        background={background}
        projectCanvasSize={projectCanvasSize}
        onSaveProject={handleSaveClick}
      />
      
      <ShortCutPopUpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      
      <JsonEditorModal
        isOpen={showJsonEditor}
        onClose={() => {
          setShowJsonEditor(false);
          setJsonEditorElement(null);
        }}
        element={jsonEditorElement}
        onSave={handleSaveJsonEdit}
      />
      
      <ProjectJSONEditor
        isOpen={showProjectJsonEditor}
        onClose={() => setShowProjectJsonEditor(false)}
        onApplyProject={handleApplyProject}
        serializeProject={(elements, selected) => JSON.stringify({
          proj_id: `proj-${Date.now()}`,
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          canvas: { width: canvasSize.width, height: canvasSize.height },
          elements: {
            byId: Object.fromEntries(elements.map(el => [el.id, el])),
            order: elements.map(el => el.id)
          }
        }, null, 2)}
        deserializeProject={(jsonString) => {
          const parsed = JSON.parse(jsonString);
          const elements = parsed.elements.order.map((id: string) => parsed.elements.byId[id]);
          return { elements, selectedElements: [] };
        }}
        projectElements={currentState.elements}
        selectedElements={currentState.selectedElements}
      />
      
      <LinePropertiesBar
        selectedElements={currentState.elements.filter(el =>
          el.type === 'line' && currentState.selectedElements.includes(el.id)
        )}
        updateElement={updateElement}
        isOpen={showLineProperties}
        onClose={() => setShowLineProperties(false)}
      />

      <EditorSettingsModal
        isOpen={showEditorSettings}
        onClose={() => setShowEditorSettings(false)}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        gridSettings={gridSettings}
        updateGridSettings={updateGridSettings}
        shapeSnapEnabled={snapEnabled}
        onToggleShapeSnap={() => setSnapEnabled(!snapEnabled)}
        canvasSize={canvasSize}
        onCanvasSizeChange={setCanvasSize}
        autoBackupInterval={autoBackupInterval}
        onAutoBackupIntervalChange={setAutoBackupInterval}
      />
        </div>
        )}
      </ProjectManager>
    </TutorialProvider>
  );
};

const UIDesignTool: React.FC<UIDesignToolProps> = ({ onBackToMain, editorMode = false, projectId = null }) => {
  const { isGuest, user } = useAuth();

  return (
    <AnimationProvider>
      <UIDesignToolContent
        onBackToMain={onBackToMain}
        editorMode={editorMode}
        projectId={projectId}
        isGuest={isGuest}
        user={user}
      />
    </AnimationProvider>
  );
};

export default UIDesignTool;