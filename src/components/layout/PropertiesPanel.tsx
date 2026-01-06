import React from 'react';
import { Settings, Type, ChevronDown, Play, Minus, Image, ChevronRight, Pencil, Zap } from 'lucide-react';
import { DesignElement } from '../../types/design';
import { BackgroundConfig } from '../../types/background';
import ShapePropertiesTab from './ShapePropertiesTab';
import TextPropertiesTab from './TextPropertiesTab';
import LinePropertiesTab from './LinePropertiesTab';
import ImagePropertiesTab from './ImagePropertiesTab';
import BackgroundSettingsPanel from './BackgroundSettingsPanel';
import KeyframeEditor from '../animation/KeyframeEditor';
import FXShortcutsTab from './FXShortcutsTab';

interface PropertiesPanelProps {
  selectedElements: DesignElement[];
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  currentTime?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  background?: BackgroundConfig;
  onUpdateBackground?: (background: BackgroundConfig) => void;
  currentTab?: 'design' | 'edit' | 'fx';
  onTabChange?: (tab: 'design' | 'edit' | 'fx') => void;
  hideEditTab?: boolean;
  hideSelectionCount?: boolean;
  onApplyTextAnimationControl?: (elementId: string) => void;
  canvasSize?: { width: number; height: number };
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElements,
  updateElement,
  currentTime = 0,
  isCollapsed = false,
  onToggleCollapse,
  background,
  onUpdateBackground,
  currentTab = 'design',
  onTabChange,
  hideEditTab = false,
  hideSelectionCount = false,
  onApplyTextAnimationControl,
  canvasSize = { width: 3840, height: 2160 }
}) => {
  const [autoContentType, setAutoContentType] = React.useState<'shape' | 'text' | 'line' | 'image'>('shape');
  const [showTextSettings, setShowTextSettings] = React.useState(false);
  
  const hasTextElements = selectedElements.some(el => 
    el.type === 'text' || el.type === 'button' || el.type === 'chat-bubble'
  );
  
  const hasLineElements = selectedElements.some(el =>
    el.type === 'line'
  );

  const hasImageElements = selectedElements.some(el =>
    el.type === 'image'
  );

  // Auto-determine content type based on selected elements (internal only, not visible to user)
  React.useEffect(() => {
    if (selectedElements.length > 0 && selectedElements.every(el => el.type === 'image')) {
      setAutoContentType('image');
    } else if (selectedElements.length > 0 && selectedElements.every(el => el.type === 'line')) {
      setAutoContentType('line');
    } else if (selectedElements.length > 0 && selectedElements.some(el => el.type === 'text' || el.type === 'button' || el.type === 'chat-bubble')) {
      setAutoContentType('text');
    } else if (selectedElements.length > 0) {
      setAutoContentType('shape');
    }
  }, [selectedElements]);

  if (isCollapsed) {
    return (
      <div className="h-full bg-gray-800/50 backdrop-blur-xl flex flex-col items-center py-4 border-l border-gray-700/50">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-all duration-200"
          title="Expand Properties Panel"
        >
          <Settings className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    );
  }

  if (selectedElements.length === 0) {
    if (background && onUpdateBackground) {
      return <BackgroundSettingsPanel background={background} onUpdate={onUpdateBackground} />;
    }

    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white">Properties</h3>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-0.5 rounded hover:bg-gray-600/50 transition-colors"
                title="Collapse Panel"
              >
                <ChevronRight className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-700/50 flex items-center justify-center">
              <span className="text-sm">🎨</span>
            </div>
            <h3 className="text-xs font-medium text-gray-400 mb-1">No Selection</h3>
            <p className="text-xs text-gray-500">Select an element</p>
          </div>
        </div>
      </div>
    );
  }

  // Ensure all selected elements have shadow property with default values
  const elementsWithDefaults = selectedElements.map(element => ({
    ...element,
    shadow: element.shadow || { blur: 0, x: 0, y: 0, color: 'transparent' }
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      {/* Header with Tabs */}
      <div className="p-2 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-white">Properties</h3>
          <div className="flex items-center space-x-2">
            {!hideSelectionCount && selectedElements.length > 1 && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded text-xs">
                {selectedElements.length} selected
              </div>
            )}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-0.5 rounded hover:bg-gray-600/50 transition-colors"
                title="Collapse Panel"
              >
                <ChevronRight className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation for Properties Panel */}
        <div className="grid grid-cols-2 gap-0.5 bg-gray-700/30 rounded p-0.5 text-xs">
          <button
            onClick={() => onTabChange?.('design')}
            className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded font-medium transition-all duration-200 ${
              currentTab === 'design'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
            }`}
          >
            <Settings className="w-3 h-3" />
            <span>Design</span>
          </button>

          <button
            onClick={() => onTabChange?.('fx')}
            data-tutorial-target="fx-tab"
            className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded font-medium transition-all duration-200 ${
              currentTab === 'fx'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
            }`}
            title="FX Shortcuts - Animation presets"
          >
            <Zap className="w-3 h-3" />
            <span>FX</span>
          </button>
        </div>

        {/* Show Text Settings Button */}
        {hasTextElements && (
          <button
            onClick={() => setShowTextSettings(!showTextSettings)}
            className={`w-full mt-1.5 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
              showTextSettings
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Type className="w-2.5 h-2.5" />
              <span>Text Settings</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showTextSettings ? 'rotate-180' : ''}`} />
            </div>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div
        className="overflow-hidden min-w-0"
        style={{ flex: currentTab === 'edit' ? '1.2' : '1' }}
      >
        {currentTab === 'design' ? (
          <>
            {autoContentType === 'shape' ? (
              <ShapePropertiesTab
                selectedElements={elementsWithDefaults}
                updateElement={updateElement}
                canvasSize={canvasSize}
              />
            ) : autoContentType === 'text' ? (
              <TextPropertiesTab
                selectedElements={elementsWithDefaults.filter(el =>
                  el.type === 'text' || el.type === 'button' || el.type === 'chat-bubble'
                )}
                updateElement={updateElement}
                showAdvanced={showTextSettings}
                setShowAdvanced={setShowTextSettings}
                onApplyTextAnimationControl={onApplyTextAnimationControl}
              />
            ) : autoContentType === 'line' ? (
              <LinePropertiesTab
                selectedElements={elementsWithDefaults.filter(el =>
                  el.type === 'line'
                )}
                updateElement={updateElement}
              />
            ) : autoContentType === 'image' ? (
              <ImagePropertiesTab
                selectedElements={elementsWithDefaults.filter(el =>
                  el.type === 'image'
                )}
                updateElement={updateElement}
              />
            ) : null}
          </>
        ) : currentTab === 'edit' ? (
          <KeyframeEditor selectedElements={selectedElements} />
        ) : currentTab === 'fx' ? (
          <FXShortcutsTab selectedElements={selectedElements} />
        ) : null}
      </div>
    </div>
  );
};

export default PropertiesPanel;