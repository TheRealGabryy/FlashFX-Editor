import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MoveUpLeft, MoveUp, MoveUpRight, MoveLeft, Circle, MoveRight, MoveDownLeft, MoveDown, MoveDownRight, Maximize2 } from 'lucide-react';
import { DesignElement } from '../../types/design';

interface AlignPanelProps {
  selectedElements: DesignElement[];
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  canvasSize: { width: number; height: number };
}

const AlignPanel: React.FC<AlignPanelProps> = ({
  selectedElements,
  updateElement,
  canvasSize
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (selectedElements.length === 0) return null;

  const isMultiSelect = selectedElements.length > 1;

  const handleAlign = (position: string) => {
    selectedElements.forEach(element => {
      let updates: Partial<DesignElement> = {};

      const centerX = (canvasSize.width - element.width) / 2;
      const centerY = (canvasSize.height - element.height) / 2;

      switch (position) {
        case 'top-left':
          updates = { x: 0, y: 0 };
          break;
        case 'top-center':
          updates = { x: centerX, y: 0 };
          break;
        case 'top-right':
          updates = { x: canvasSize.width - element.width, y: 0 };
          break;
        case 'middle-left':
          updates = { x: 0, y: centerY };
          break;
        case 'center':
          updates = { x: centerX, y: centerY };
          break;
        case 'middle-right':
          updates = { x: canvasSize.width - element.width, y: centerY };
          break;
        case 'bottom-left':
          updates = { x: 0, y: canvasSize.height - element.height };
          break;
        case 'bottom-center':
          updates = { x: centerX, y: canvasSize.height - element.height };
          break;
        case 'bottom-right':
          updates = { x: canvasSize.width - element.width, y: canvasSize.height - element.height };
          break;
      }

      updateElement(element.id, updates);
    });
  };

  const handleExtend = (direction: string) => {
    selectedElements.forEach(element => {
      let updates: Partial<DesignElement> = {};

      switch (direction) {
        case 'top-left':
          updates = {
            x: 0,
            y: 0,
            width: element.x + element.width,
            height: element.y + element.height
          };
          break;
        case 'top':
          updates = {
            y: 0,
            height: element.y + element.height
          };
          break;
        case 'top-right':
          updates = {
            y: 0,
            width: canvasSize.width - element.x,
            height: element.y + element.height
          };
          break;
        case 'left':
          updates = {
            x: 0,
            width: element.x + element.width
          };
          break;
        case 'fill':
          updates = {
            x: 0,
            y: 0,
            width: canvasSize.width,
            height: canvasSize.height
          };
          break;
        case 'right':
          updates = {
            width: canvasSize.width - element.x
          };
          break;
        case 'bottom-left':
          updates = {
            x: 0,
            width: element.x + element.width,
            height: canvasSize.height - element.y
          };
          break;
        case 'bottom':
          updates = {
            height: canvasSize.height - element.y
          };
          break;
        case 'bottom-right':
          updates = {
            width: canvasSize.width - element.x,
            height: canvasSize.height - element.y
          };
          break;
      }

      updateElement(element.id, updates);
    });
  };

  return (
    <div className="space-y-1.5 border border-gray-600/50 rounded bg-gray-800/40 p-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 rounded hover:from-green-500/30 hover:to-cyan-500/30 transition-all duration-200"
      >
        <div className="flex items-center">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          <span className="text-xs font-semibold text-green-300">Align & Extend Panel</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-green-300" />
        ) : (
          <ChevronRight className="w-4 h-4 text-green-300" />
        )}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-3 p-2">
          {/* Left Column - Align Position (Yellow) */}
          <div className="space-y-1">
            <h5 className="text-[10px] font-medium text-yellow-400 mb-1.5 text-center">Position</h5>
            <div className="grid grid-cols-3 gap-1">
              {/* Top Row */}
              <button
                onClick={() => handleAlign('top-left')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to top-left corner"
              >
                <MoveUpLeft className="w-1.5 h-1.5 text-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('top-center')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to top-center"
              >
                <MoveUp className="w-1.5 h-1.5 text-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('top-right')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to top-right corner"
              >
                <MoveUpRight className="w-1.5 h-1.5 text-gray-900" />
              </button>

              {/* Middle Row */}
              <button
                onClick={() => handleAlign('middle-left')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to middle-left"
              >
                <MoveLeft className="w-1.5 h-1.5 text-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('center')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to center"
              >
                <Circle className="w-1 h-1 text-gray-900 fill-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('middle-right')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to middle-right"
              >
                <MoveRight className="w-1.5 h-1.5 text-gray-900" />
              </button>

              {/* Bottom Row */}
              <button
                onClick={() => handleAlign('bottom-left')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to bottom-left corner"
              >
                <MoveDownLeft className="w-1.5 h-1.5 text-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('bottom-center')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to bottom-center"
              >
                <MoveDown className="w-1.5 h-1.5 text-gray-900" />
              </button>
              <button
                onClick={() => handleAlign('bottom-right')}
                className="aspect-square bg-yellow-400/80 hover:bg-yellow-400 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Align to bottom-right corner"
              >
                <MoveDownRight className="w-1.5 h-1.5 text-gray-900" />
              </button>
            </div>
          </div>

          {/* Right Column - Extend Dimensions (Blue) */}
          <div className="space-y-1">
            <h5 className="text-[10px] font-medium text-blue-400 mb-1.5 text-center">Extend</h5>
            <div className="grid grid-cols-3 gap-1">
              {/* Top Row */}
              <button
                onClick={() => handleExtend('top-left')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to top-left corner"
              >
                <MoveUpLeft className="w-1.5 h-1.5 text-white" />
              </button>
              <button
                onClick={() => handleExtend('top')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to top edge"
              >
                <MoveUp className="w-1.5 h-1.5 text-white" />
              </button>
              <button
                onClick={() => handleExtend('top-right')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to top-right corner"
              >
                <MoveUpRight className="w-1.5 h-1.5 text-white" />
              </button>

              {/* Middle Row */}
              <button
                onClick={() => handleExtend('left')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to left edge"
              >
                <MoveLeft className="w-1.5 h-1.5 text-white" />
              </button>
              <button
                onClick={() => handleExtend('fill')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Fill entire canvas"
              >
                <Maximize2 className="w-1 h-1 text-white" />
              </button>
              <button
                onClick={() => handleExtend('right')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to right edge"
              >
                <MoveRight className="w-1.5 h-1.5 text-white" />
              </button>

              {/* Bottom Row */}
              <button
                onClick={() => handleExtend('bottom-left')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to bottom-left corner"
              >
                <MoveDownLeft className="w-1.5 h-1.5 text-white" />
              </button>
              <button
                onClick={() => handleExtend('bottom')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to bottom edge"
              >
                <MoveDown className="w-1.5 h-1.5 text-white" />
              </button>
              <button
                onClick={() => handleExtend('bottom-right')}
                className="aspect-square bg-blue-500/80 hover:bg-blue-500 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Extend to bottom-right corner"
              >
                <MoveDownRight className="w-1.5 h-1.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlignPanel;
