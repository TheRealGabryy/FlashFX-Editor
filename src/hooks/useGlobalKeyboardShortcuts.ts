import { useEffect, useCallback, useRef } from 'react';
import { DesignElement } from '../types/design';
import { createShapeAtCenter, CanvasViewport } from '../utils/canvasUtils';

interface GlobalKeyboardShortcutsProps {
  onAddElement: (element: DesignElement) => void;
  selectedElements: string[];
  elements: DesignElement[];
  setSelectedElements: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  duplicateElement: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  canvasSize: { width: number; height: number };
  viewport: CanvasViewport;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  gridEnabled: boolean;
  toggleGrid: () => void;
  onNudge: (direction: 'up' | 'down' | 'left' | 'right', amount: number) => void;
  zoom?: number;
  setZoom?: (zoom: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useGlobalKeyboardShortcuts = ({
  onAddElement,
  selectedElements,
  elements,
  setSelectedElements,
  updateElement,
  duplicateElement,
  onGroup,
  onUngroup,
  canvasSize,
  viewport,
  snapEnabled,
  setSnapEnabled,
  gridEnabled,
  toggleGrid,
  onNudge,
  zoom,
  setZoom,
  onUndo,
  onRedo,
}: GlobalKeyboardShortcutsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is typing in an input field
  const isTypingInInput = useCallback(() => {
    const activeElement = document.activeElement;
    return activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.getAttribute('role') === 'textbox'
    );
  }, []);

  const createShape = useCallback((type: DesignElement['type']) => {
    console.log('[createShape] Creating shape:', type, 'at viewport:', viewport);
    const element = createShapeAtCenter(type, canvasSize, viewport);
    console.log('[createShape] Element created:', element);
    onAddElement(element);
    console.log('[createShape] Element added, selecting:', element.id);
    setSelectedElements([element.id]);
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const createLine = useCallback((mode: 'line' | 'arrow') => {
    const element = createShapeAtCenter('line', canvasSize, viewport, {
      lineType: mode,
      points: [
        { x: 0, y: 0 },
        { x: 200, y: 0 }
      ],
      arrowStart: mode === 'arrow',
      arrowEnd: mode === 'arrow'
    });
    onAddElement(element);
    setSelectedElements([element.id]);
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const createButton = useCallback(() => {
    const element = createShapeAtCenter('button', canvasSize, viewport);
    onAddElement(element);
    setSelectedElements([element.id]);
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const createChatBubble = useCallback(() => {
    const element = createShapeAtCenter('chat-bubble', canvasSize, viewport);
    onAddElement(element);
    setSelectedElements([element.id]);
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const createChatFrame = useCallback(() => {
    const element = createShapeAtCenter('chat-frame', canvasSize, viewport);
    onAddElement(element);
    setSelectedElements([element.id]);
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const handleImageUpload = useCallback(() => {
    if (!fileInputRef.current) {
      // Create file input dynamically
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // For now, create a placeholder rectangle for image
          // In a full implementation, you'd handle image upload and create an image element
          const imageElement = createShapeAtCenter('rectangle', canvasSize, viewport, {
            name: `Image: ${file.name}`,
            fill: '#E5E7EB',
            stroke: '#9CA3AF',
            strokeWidth: 2
          });
          onAddElement(imageElement);
          setSelectedElements([imageElement.id]);
        }
        document.body.removeChild(input);
      };
      document.body.appendChild(input);
      input.click();
    }
  }, [onAddElement, canvasSize, viewport, setSelectedElements]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const typingInInput = isTypingInInput();
    console.log('[Keyboard Shortcut] Key event detected:', e.key, 'TypingInInput:', typingInInput, 'ActiveElement:', document.activeElement?.tagName);

    // Skip if user is typing in an input field
    if (typingInInput) {
      console.log('[Keyboard Shortcut] Skipping - user is typing in input');
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey } = e;
    const isModifierPressed = ctrlKey || metaKey;

    // Debug logging
    console.log('[Keyboard Shortcut] Key pressed:', key, 'Modifiers:', { ctrlKey, metaKey, shiftKey, altKey });

    // Shape Creation Shortcuts (only when no modifiers are pressed)
    if (!isModifierPressed && !shiftKey && !altKey) {
      switch (key.toLowerCase()) {
        case 'q':
          console.log('[Keyboard Shortcut] Creating rectangle');
          e.preventDefault();
          createShape('rectangle');
          return;
        case 'w':
          console.log('[Keyboard Shortcut] Creating circle');
          e.preventDefault();
          createShape('circle');
          return;
        case 'e':
          console.log('[Keyboard Shortcut] Creating text');
          e.preventDefault();
          createShape('text');
          return;
        case 'r':
          console.log('[Keyboard Shortcut] Creating button');
          e.preventDefault();
          createButton();
          return;
        case 't':
          console.log('[Keyboard Shortcut] Creating chat bubble');
          e.preventDefault();
          createChatBubble();
          return;
        case 'y':
          console.log('[Keyboard Shortcut] Creating chat frame');
          e.preventDefault();
          createChatFrame();
          return;
        case 'u':
          console.log('[Keyboard Shortcut] Creating line');
          e.preventDefault();
          createLine('line');
          return;
        case 'i':
          console.log('[Keyboard Shortcut] Opening image upload');
          e.preventDefault();
          handleImageUpload();
          return;
        case 'g':
          e.preventDefault();
          toggleGrid();
          return;
        case 'escape':
          e.preventDefault();
          setSelectedElements([]);
          return;
        case ' ':
          e.preventDefault();
          return;
        case '+':
        case '=':
          e.preventDefault();
          if (setZoom && zoom) {
            setZoom(Math.min(3, zoom + 0.05));
          }
          return;
        case '-':
          e.preventDefault();
          if (setZoom && zoom) {
            setZoom(Math.max(0.25, zoom - 0.05));
          }
          return;
      }
    }

    // Modifier-based shortcuts
    if (isModifierPressed) {
      switch (key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (onUndo) {
            onUndo();
          }
          return;
        case 'y':
          e.preventDefault();
          if (onRedo) {
            onRedo();
          }
          return;
        case 'd':
          if (selectedElements.length > 0) {
            selectedElements.forEach(id => duplicateElement(id));
          }
          return;
        case 'g':
          if (shiftKey) {
            onUngroup();
          } else {
            onGroup();
          }
          return;
        case ';':
          setSnapEnabled(!snapEnabled);
          return;
      }
    }

    // Arrow key nudging
    if (selectedElements.length > 0) {
      const nudgeAmount = shiftKey ? 10 : 1;
      switch (key) {
        case 'ArrowUp':
          onNudge('up', nudgeAmount);
          return;
        case 'ArrowDown':
          onNudge('down', nudgeAmount);
          return;
        case 'ArrowLeft':
          onNudge('left', nudgeAmount);
          return;
        case 'ArrowRight':
          onNudge('right', nudgeAmount);
          return;
      }
    }

  }, [
    isTypingInInput,
    createShape,
    createLine,
    createButton,
    createChatBubble,
    createChatFrame,
    handleImageUpload,
    toggleGrid,
    setSelectedElements,
    selectedElements,
    duplicateElement,
    onGroup,
    onUngroup,
    snapEnabled,
    setSnapEnabled,
    onNudge,
    zoom,
    setZoom,
    onUndo,
    onRedo
  ]);

  useEffect(() => {
    console.log('[useGlobalKeyboardShortcuts] Registering keyboard event listener');
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('[useGlobalKeyboardShortcuts] Removing keyboard event listener');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { fileInputRef };
};