import React, { useState } from 'react';
import { Copy, Clipboard, Palette, Plus, Trash2, GripVertical, Sparkles, Square } from 'lucide-react';
import { DesignElement } from '../../types/design';
import { useClipboard } from '../../hooks/useClipboard';
import ShapeMaterialPanel from './ShapeMaterialPanel';
import AlignPanel from './AlignPanel';
import { useAnimation } from '../../animation-engine';
import KeyframeButton from '../animation/KeyframeButton';
import { AnimatableProperty } from '../../animation-engine/types';

interface ShapePropertiesTabProps {
  selectedElements: DesignElement[];
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  canvasSize?: { width: number; height: number };
}

const ShapePropertiesTab: React.FC<ShapePropertiesTabProps> = ({
  selectedElements,
  updateElement,
  canvasSize = { width: 3840, height: 2160 }
}) => {
  const { copyStyle, pasteStyle, copyValue, pasteValue, copiedStyle } = useClipboard();
  const [isAdvancedMaterial, setIsAdvancedMaterial] = useState(false);

  const animation = useAnimation();
  const currentTime = animation.state.timeline.currentTime;

  if (selectedElements.length === 0) return null;

  const selectedElement = selectedElements[0];
  const isMultiSelect = selectedElements.length > 1;
  
  // Ensure shadow property exists with default values
  const safeSelectedElement = {
    ...selectedElement,
    shadow: selectedElement.shadow || { blur: 0, x: 0, y: 0, color: 'transparent' }
  };

  const handleUpdate = (updates: Partial<DesignElement>) => {
    if (isMultiSelect) {
      selectedElements.forEach(element => {
        updateElement(element.id, updates);
      });
    } else {
      updateElement(selectedElement.id, updates);
    }
  };

  const handleCopyStyle = () => {
    copyStyle(selectedElement);
  };

  const handlePasteStyle = () => {
    const updates = pasteStyle(selectedElement);
    if (updates) {
      handleUpdate(updates);
    }
  };

  const handleCopyValue = async (value: number) => {
    await copyValue(value);
  };

  const handlePasteValue = async (property: keyof DesignElement) => {
    const value = await pasteValue();
    if (value !== null) {
      handleUpdate({ [property]: value });
    }
  };

  const hasKeyframeAtCurrentTime = (property: AnimatableProperty): boolean => {
    if (!selectedElement) return false;
    const track = animation.getTrack(selectedElement.id, property);
    if (!track) return false;
    const threshold = 0.01;
    return track.keyframes.some(kf => Math.abs(kf.time - currentTime) < threshold);
  };

  const handleAddKeyframe = (property: AnimatableProperty, value: number | string) => {
    if (!selectedElement) return;
    animation.initAnimation(selectedElement.id);
    animation.addKeyframe(selectedElement.id, property, currentTime, value);
  };

  const handleKeyframeAll = () => {
    if (!selectedElement) return;
    animation.initAnimation(selectedElement.id);

    const properties: Array<{ prop: AnimatableProperty; value: number | string }> = [
      { prop: 'x', value: selectedElement.x },
      { prop: 'y', value: selectedElement.y },
      { prop: 'width', value: selectedElement.width },
      { prop: 'height', value: selectedElement.height },
      { prop: 'rotation', value: selectedElement.rotation || 0 },
      { prop: 'opacity', value: selectedElement.opacity ?? 1 },
      { prop: 'fill', value: selectedElement.fill },
      { prop: 'borderRadius', value: selectedElement.borderRadius || 0 },
    ];

    if (selectedElement.type !== 'text') {
      properties.push(
        { prop: 'stroke', value: selectedElement.stroke || '#000000' },
        { prop: 'strokeWidth', value: selectedElement.strokeWidth || 0 }
      );
    }

    properties.forEach(({ prop, value }) => {
      animation.addKeyframe(selectedElement.id, prop, currentTime, value);
    });
  };

  const handleGradientToggle = () => {
    const isEnabled = !safeSelectedElement.gradientEnabled;
    const updates: Partial<DesignElement> = {
      gradientEnabled: isEnabled
    };
    
    if (isEnabled && !safeSelectedElement.gradientColors) {
      // Initialize default gradient
      updates.gradientColors = [
        { color: safeSelectedElement.fill, position: 0, id: 'gradient-1' },
        { color: '#FFFFFF', position: 100, id: 'gradient-2' }
      ];
      updates.gradientType = 'linear';
      updates.gradientAngle = 45;
    }
    
    handleUpdate(updates);
  };

  const handleGradientColorChange = (colorId: string, newColor: string) => {
    const gradientColors = safeSelectedElement.gradientColors || [];
    const updatedColors = gradientColors.map(gc => 
      gc.id === colorId ? { ...gc, color: newColor } : gc
    );
    handleUpdate({ gradientColors: updatedColors });
  };

  const handleGradientPositionChange = (colorId: string, newPosition: number) => {
    const gradientColors = safeSelectedElement.gradientColors || [];
    const updatedColors = gradientColors.map(gc => 
      gc.id === colorId ? { ...gc, position: newPosition } : gc
    ).sort((a, b) => a.position - b.position);
    handleUpdate({ gradientColors: updatedColors });
  };

  const addGradientColor = () => {
    const gradientColors = safeSelectedElement.gradientColors || [];
    if (gradientColors.length >= 5) return;
    
    const newPosition = gradientColors.length > 0 
      ? Math.max(...gradientColors.map(gc => gc.position)) + 20
      : 50;
    
    const newColor = {
      color: '#3B82F6',
      position: Math.min(100, newPosition),
      id: `gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedColors = [...gradientColors, newColor].sort((a, b) => a.position - b.position);
    handleUpdate({ gradientColors: updatedColors });
  };

  const removeGradientColor = (colorId: string) => {
    const gradientColors = safeSelectedElement.gradientColors || [];
    if (gradientColors.length <= 2) return; // Keep at least 2 colors
    
    const updatedColors = gradientColors.filter(gc => gc.id !== colorId);
    handleUpdate({ gradientColors: updatedColors });
  };
  // Round values for display
  const roundedElement = {
    ...safeSelectedElement,
    x: Math.round(safeSelectedElement.x),
    y: Math.round(safeSelectedElement.y),
    width: Math.round(safeSelectedElement.width),
    height: Math.round(safeSelectedElement.height),
    rotation: Math.round(safeSelectedElement.rotation),
    strokeWidth: Math.round(safeSelectedElement.strokeWidth),
    borderRadius: Math.round(safeSelectedElement.borderRadius),
    shadow: {
      ...safeSelectedElement.shadow,
      blur: Math.round(safeSelectedElement.shadow.blur),
      x: Math.round(safeSelectedElement.shadow.x),
      y: Math.round(safeSelectedElement.shadow.y)
    }
  };

  return (
    <div className="h-full overflow-y-auto p-2 space-y-3 custom-scrollbar">
      {/* Style Copy/Paste */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-gray-300 flex items-center">
          <span className="w-1 h-1 bg-cyan-400 rounded-full mr-1.5"></span>
          Style
        </h4>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleCopyStyle}
            className="flex items-center justify-center space-x-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded text-xs text-gray-300 hover:text-yellow-400 transition-all duration-200"
            title="Copy all style properties"
          >
            <Copy className="w-3 h-3" />
            <span>Copy Style</span>
          </button>

          <button
            onClick={handlePasteStyle}
            disabled={!copiedStyle}
            className={`flex items-center justify-center space-x-1 px-2 py-1 border rounded text-xs transition-all duration-200 ${
              copiedStyle
                ? 'bg-gray-700/50 hover:bg-gray-600/50 border-gray-600/50 text-gray-300 hover:text-yellow-400'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
            }`}
            title="Paste copied style properties"
          >
            <Clipboard className="w-3 h-3" />
            <span>Paste Style</span>
          </button>

          <button
            onClick={handleKeyframeAll}
            className="flex items-center justify-center space-x-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded text-xs text-gray-300 hover:text-cyan-400 transition-all duration-200"
            title="Add keyframes to all properties"
          >
            <Sparkles className="w-3 h-3" />
            <span>Keyframe All</span>
          </button>
        </div>
      </div>

      {/* Align Panel */}
      <AlignPanel
        selectedElements={selectedElements}
        updateElement={updateElement}
        canvasSize={canvasSize}
      />

      {/* Position & Size */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-gray-300 flex items-center">
          <span className="w-1 h-1 bg-yellow-400 rounded-full mr-1.5"></span>
          Position & Size
        </h4>
        
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-400">X</label>
              <div className="flex items-center space-x-0.5">
                <KeyframeButton
                  onClick={() => handleAddKeyframe('x', roundedElement.x)}
                  isActive={hasKeyframeAtCurrentTime('x')}
                  title="Add keyframe for X position"
                />
                <button
                  onClick={() => handleCopyValue(roundedElement.x)}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Copy X position"
                >
                  <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
                <button
                  onClick={() => handlePasteValue('x')}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Paste X position"
                >
                  <Clipboard className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={roundedElement.x}
              onChange={(e) => handleUpdate({ x: Math.round(Number(e.target.value)) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="range"
              min={-2000}
              max={6000}
              value={roundedElement.x}
              onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
              className="w-full h-1 mt-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-400">Y</label>
              <div className="flex items-center space-x-0.5">
                <KeyframeButton
                  onClick={() => handleAddKeyframe('y', roundedElement.y)}
                  isActive={hasKeyframeAtCurrentTime('y')}
                  title="Add keyframe for Y position"
                />
                <button
                  onClick={() => handleCopyValue(roundedElement.y)}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Copy Y position"
                >
                  <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
                <button
                  onClick={() => handlePasteValue('y')}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Paste Y position"
                >
                  <Clipboard className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={roundedElement.y}
              onChange={(e) => handleUpdate({ y: Math.round(Number(e.target.value)) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="range"
              min={-2000}
              max={4000}
              value={roundedElement.y}
              onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
              className="w-full h-1 mt-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-400">Width</label>
              <div className="flex items-center space-x-0.5">
                <KeyframeButton
                  onClick={() => handleAddKeyframe('width', roundedElement.width)}
                  isActive={hasKeyframeAtCurrentTime('width')}
                  title="Add keyframe for width"
                />
                <button
                  onClick={() => handleCopyValue(roundedElement.width)}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Copy width"
                >
                  <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
                <button
                  onClick={() => handlePasteValue('width')}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Paste width"
                >
                  <Clipboard className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={roundedElement.width}
              onChange={(e) => handleUpdate({ width: Math.round(Number(e.target.value)) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="range"
              min={1}
              max={4000}
              value={roundedElement.width}
              onChange={(e) => handleUpdate({ width: Number(e.target.value) })}
              className="w-full h-1 mt-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-gray-400">Height</label>
              <div className="flex items-center space-x-0.5">
                <KeyframeButton
                  onClick={() => handleAddKeyframe('height', roundedElement.height)}
                  isActive={hasKeyframeAtCurrentTime('height')}
                  title="Add keyframe for height"
                />
                <button
                  onClick={() => handleCopyValue(roundedElement.height)}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Copy height"
                >
                  <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
                <button
                  onClick={() => handlePasteValue('height')}
                  className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                  title="Paste height"
                >
                  <Clipboard className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={roundedElement.height}
              onChange={(e) => handleUpdate({ height: Math.round(Number(e.target.value)) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
            <input
              type="range"
              min={1}
              max={3000}
              value={roundedElement.height}
              onChange={(e) => handleUpdate({ height: Number(e.target.value) })}
              className="w-full h-1 mt-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-gray-300 flex items-center">
          <span className="w-1 h-1 bg-blue-400 rounded-full mr-1.5"></span>
          Rotation
        </h4>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-xs text-gray-400">Angle (degrees)</label>
            <div className="flex items-center space-x-0.5">
              <KeyframeButton
                onClick={() => handleAddKeyframe('rotation', roundedElement.rotation || 0)}
                isActive={hasKeyframeAtCurrentTime('rotation')}
                title="Add keyframe for rotation"
              />
              <button
                onClick={() => handleCopyValue(roundedElement.rotation)}
                className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                title="Copy rotation"
              >
                <Copy className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
              </button>
              <button
                onClick={() => handlePasteValue('rotation')}
                className="p-0.5 hover:bg-gray-600/50 rounded transition-colors"
                title="Paste rotation"
              >
                <Clipboard className="w-2.5 h-2.5 text-gray-500 hover:text-gray-300" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <input
              type="number"
              min="0"
              max="360"
              value={roundedElement.rotation}
              onChange={(e) => {
                let value = Number(e.target.value);
                value = ((value % 360) + 360) % 360;
                handleUpdate({ rotation: Math.round(value) });
              }}
              className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-blue-400/50"
            />
            <button
              onClick={() => handleUpdate({ rotation: 0 })}
              className="px-2 py-0.5 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded text-xs text-gray-300 hover:text-blue-400 transition-all"
              title="Reset rotation"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={roundedElement.rotation}
            onChange={(e) => handleUpdate({ rotation: Number(e.target.value) })}
            className="w-full h-1 mt-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Material Subtabs - Hide for SVG and Adjustment Layer */}
      {selectedElement.type !== 'svg' && selectedElement.type !== 'adjustment-layer' && (
        <div className="space-y-1.5">
          {/* Material Mode - One-way conversion */}
          {!isAdvancedMaterial ? (
            <button
              onClick={() => setIsAdvancedMaterial(true)}
              className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded font-medium transition-all duration-200 text-xs text-cyan-400"
            >
              <Sparkles className="w-3 h-3" />
              <span>Convert to Advanced Shape</span>
            </button>
          ) : (
            <div className="flex items-center justify-center space-x-1 px-2 py-1.5 bg-cyan-400/20 border border-cyan-400/50 rounded text-xs">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-400 font-medium">Advanced Material Mode</span>
            </div>
          )}

          {/* Material Content */}
          {!isAdvancedMaterial ? (
            <div className="space-y-3">
              {/* Fill Color */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-300 flex items-center">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full mr-1.5"></span>
                    Fill Color
                  </h4>
                  <KeyframeButton
                    onClick={() => handleAddKeyframe('fill', safeSelectedElement.fill || '#3B82F6')}
                    isActive={hasKeyframeAtCurrentTime('fill')}
                    title="Add keyframe for fill color"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={safeSelectedElement.fill || '#3B82F6'}
                      onChange={(e) => handleUpdate({ fill: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
                    />
                    <input
                      type="text"
                      value={safeSelectedElement.fill || '#3B82F6'}
                      onChange={(e) => handleUpdate({ fill: e.target.value })}
                      className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-cyan-400/50"
                    />
                  </div>
                </div>
              </div>

              {/* Stroke & Border */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-gray-300 flex items-center">
                  <span className="w-1 h-1 bg-green-400 rounded-full mr-1.5"></span>
                  Stroke & Border
                </h4>

                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">Stroke Color</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={safeSelectedElement.stroke}
                      onChange={(e) => handleUpdate({ stroke: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
                    />
                    <input
                      type="text"
                      value={safeSelectedElement.stroke}
                      onChange={(e) => handleUpdate({ stroke: e.target.value })}
                      className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-green-400/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">Stroke Width</label>
                  <input
                    type="number"
                    min="0"
                    value={roundedElement.strokeWidth}
                    onChange={(e) => handleUpdate({ strokeWidth: Math.round(Number(e.target.value)) })}
                    className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">Border Radius</label>
                  <input
                    type="number"
                    min="0"
                    value={roundedElement.borderRadius}
                    onChange={(e) => handleUpdate({ borderRadius: Math.round(Number(e.target.value)) })}
                    className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-xs text-gray-400">Opacity</label>
                    <KeyframeButton
                      onClick={() => handleAddKeyframe('opacity', safeSelectedElement.opacity)}
                      isActive={hasKeyframeAtCurrentTime('opacity')}
                      title="Add keyframe for opacity"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={safeSelectedElement.opacity}
                      onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="text-xs text-gray-400 text-center">
                      {Math.round(safeSelectedElement.opacity * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Advanced Material Subtab Content */
            <ShapeMaterialPanel
              selectedElements={selectedElements}
              updateElement={updateElement}
            />
          )}
        </div>
      )}

      {/* Shadow - Hide shadow color for adjustment layers */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-gray-300 flex items-center">
          <span className="w-1 h-1 bg-purple-400 rounded-full mr-1.5"></span>
          Shadow
        </h4>

        <div>
          <label className="text-xs text-gray-400 block mb-0.5">Shadow Blur</label>
          <input
            type="number"
            min="0"
            value={roundedElement.shadow.blur}
            onChange={(e) => handleUpdate({
              shadow: { ...safeSelectedElement.shadow, blur: Math.round(Number(e.target.value)) }
            })}
            className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Shadow X</label>
            <input
              type="number"
              value={roundedElement.shadow.x}
              onChange={(e) => handleUpdate({
                shadow: { ...safeSelectedElement.shadow, x: Math.round(Number(e.target.value)) }
              })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Shadow Y</label>
            <input
              type="number"
              value={roundedElement.shadow.y}
              onChange={(e) => handleUpdate({
                shadow: { ...safeSelectedElement.shadow, y: Math.round(Number(e.target.value)) }
              })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
          </div>
        </div>

        {/* Hide shadow color for adjustment layers */}
        {selectedElement.type !== 'adjustment-layer' && (
          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Shadow Color</label>
            <div className="flex items-center space-x-1.5">
              <input
                type="color"
                value={safeSelectedElement.shadow.color}
                onChange={(e) => handleUpdate({
                  shadow: { ...safeSelectedElement.shadow, color: e.target.value }
                })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
              />
              <input
                type="text"
                value={safeSelectedElement.shadow.color}
                onChange={(e) => handleUpdate({
                  shadow: { ...safeSelectedElement.shadow, color: e.target.value }
                })}
                className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Star-specific properties */}
      {selectedElement.type === 'star' && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-300 flex items-center">
            <span className="w-1 h-1 bg-yellow-400 rounded-full mr-1.5"></span>
            Star Properties
          </h4>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Number of Points</label>
            <input
              type="number"
              min="3"
              max="20"
              value={safeSelectedElement.starPoints || 5}
              onChange={(e) => handleUpdate({ starPoints: Math.round(Number(e.target.value)) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Inner Radius (%)</label>
            <div className="space-y-0.5">
              <input
                type="range"
                min="0"
                max="100"
                value={safeSelectedElement.starInnerRadius || 50}
                onChange={(e) => handleUpdate({ starInnerRadius: Number(e.target.value) })}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-gray-400 text-center">
                {safeSelectedElement.starInnerRadius || 50}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gradient-specific properties */}
      {selectedElement.type === 'gradient' && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-300 flex items-center">
            <span className="w-1 h-1 bg-pink-400 rounded-full mr-1.5"></span>
            Gradient Properties
          </h4>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Gradient Type</label>
            <select
              value={safeSelectedElement.gradientType || 'linear'}
              onChange={(e) => handleUpdate({ gradientType: e.target.value as 'linear' | 'radial' | 'conic' })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
              <option value="conic">Conic</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Angle (degrees)</label>
            <input
              type="number"
              min="0"
              max="360"
              value={safeSelectedElement.gradientAngle || 45}
              onChange={(e) => handleUpdate({ gradientAngle: Number(e.target.value) })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Gradient Colors</label>
            {(safeSelectedElement.gradientColors || []).map((gradientColor) => (
              <div key={gradientColor.id} className="flex items-center space-x-1.5 mb-1.5">
                <KeyframeButton
                  onClick={() => handleAddKeyframe(`gradientColor-${gradientColor.id}` as AnimatableProperty, gradientColor.color)}
                  isActive={hasKeyframeAtCurrentTime(`gradientColor-${gradientColor.id}` as AnimatableProperty)}
                  title="Add keyframe for gradient color"
                />
                <input
                  type="color"
                  value={gradientColor.color}
                  onChange={(e) => handleGradientColorChange(gradientColor.id, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradientColor.position}
                  onChange={(e) => handleGradientPositionChange(gradientColor.id, Number(e.target.value))}
                  className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
                />
                <span className="text-xs text-gray-400">%</span>
                {(safeSelectedElement.gradientColors || []).length > 2 && (
                  <button
                    onClick={() => removeGradientColor(gradientColor.id)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Remove color stop"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                )}
              </div>
            ))}
            {(safeSelectedElement.gradientColors || []).length < 5 && (
              <button
                onClick={addGradientColor}
                className="w-full flex items-center justify-center space-x-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 rounded text-xs text-gray-300 hover:text-yellow-400 transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                <span>Add Color Stop</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Adjustment Layer-specific properties */}
      {selectedElement.type === 'adjustment-layer' && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-300 flex items-center">
            <span className="w-1 h-1 bg-indigo-400 rounded-full mr-1.5"></span>
            Adjustment Properties
          </h4>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Adjustment Type</label>
            <select
              value={safeSelectedElement.adjustmentType || 'brightness-contrast'}
              onChange={(e) => handleUpdate({ adjustmentType: e.target.value as any })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="brightness-contrast">Brightness/Contrast</option>
              <option value="hue-saturation">Hue/Saturation</option>
              <option value="color">Color</option>
              <option value="levels">Levels</option>
            </select>
          </div>

          {/* Brightness/Contrast Adjustments */}
          {(!safeSelectedElement.adjustmentType || safeSelectedElement.adjustmentType === 'brightness-contrast') && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Brightness</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.brightness || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, brightness: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.brightness || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Contrast</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.contrast || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, contrast: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.contrast || 0)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Hue/Saturation Adjustments */}
          {safeSelectedElement.adjustmentType === 'hue-saturation' && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Hue</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={(safeSelectedElement.filters?.hue || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, hue: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.hue || 0)}°
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Saturation</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.saturation || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, saturation: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.saturation || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Lightness</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.lightness || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, lightness: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.lightness || 0)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Color Adjustments */}
          {safeSelectedElement.adjustmentType === 'color' && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Temperature</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.temperature || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, temperature: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.temperature || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Tint</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.tint || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, tint: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.tint || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Vibrance</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={(safeSelectedElement.filters?.vibrance || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, vibrance: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.vibrance || 0)}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Levels Adjustments */}
          {safeSelectedElement.adjustmentType === 'levels' && (
            <>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Black Point</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={(safeSelectedElement.filters?.levelsBlackPoint || 0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, levelsBlackPoint: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.levelsBlackPoint || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Mid Point</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="0.1"
                    max="9.99"
                    step="0.1"
                    value={(safeSelectedElement.filters?.levelsMidPoint || 1.0)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, levelsMidPoint: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.levelsMidPoint || 1.0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-0.5">White Point</label>
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={(safeSelectedElement.filters?.levelsWhitePoint || 255)}
                    onChange={(e) => {
                      const filters = safeSelectedElement.filters || {};
                      handleUpdate({ filters: { ...filters, levelsWhitePoint: Number(e.target.value) } });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="text-xs text-gray-400 text-center">
                    {(safeSelectedElement.filters?.levelsWhitePoint || 255)}
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Blend Mode</label>
            <select
              value={safeSelectedElement.blendMode || 'normal'}
              onChange={(e) => handleUpdate({ blendMode: e.target.value as any })}
              className="w-full px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="darken">Darken</option>
              <option value="lighten">Lighten</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
            </select>
          </div>
        </div>
      )}

      {/* SVG-specific properties */}
      {selectedElement.type === 'svg' && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-300 flex items-center">
            <span className="w-1 h-1 bg-cyan-400 rounded-full mr-1.5"></span>
            SVG Properties
          </h4>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">SVG Code</label>
            <textarea
              value={safeSelectedElement.svgData || ''}
              onChange={(e) => handleUpdate({ svgData: e.target.value })}
              rows={4}
              className="w-full px-1.5 py-1 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50 font-mono"
              placeholder="<svg>...</svg>"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Fill Color Override</label>
            <div className="flex items-center space-x-1.5">
              <input
                type="color"
                value={safeSelectedElement.svgFillColor || '#3B82F6'}
                onChange={(e) => handleUpdate({ svgFillColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
              />
              <input
                type="text"
                value={safeSelectedElement.svgFillColor || '#3B82F6'}
                onChange={(e) => handleUpdate({ svgFillColor: e.target.value })}
                className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-0.5">Stroke Color Override</label>
            <div className="flex items-center space-x-1.5">
              <input
                type="color"
                value={safeSelectedElement.svgStrokeColor || '#1E40AF'}
                onChange={(e) => handleUpdate({ svgStrokeColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-600/50"
              />
              <input
                type="text"
                value={safeSelectedElement.svgStrokeColor || '#1E40AF'}
                onChange={(e) => handleUpdate({ svgStrokeColor: e.target.value })}
                className="flex-1 px-1.5 py-0.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
                placeholder="#1E40AF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShapePropertiesTab;