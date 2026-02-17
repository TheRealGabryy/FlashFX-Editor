import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Save } from 'lucide-react';
import { shapeDefaultsService, ShapeDefaults } from '../../services/ShapeDefaultsService';
import { DesignElement } from '../../types/design';

interface CategoryState {
  rectangle: boolean;
  circle: boolean;
  text: boolean;
  button: boolean;
  chatBubble: boolean;
  chatFrame: boolean;
  line: boolean;
  star: boolean;
  gradient: boolean;
  adjustmentLayer: boolean;
  svg: boolean;
}

const DefaultShapesSettings: React.FC = () => {
  const [expanded, setExpanded] = useState<CategoryState>({
    rectangle: false,
    circle: false,
    text: false,
    button: false,
    chatBubble: false,
    chatFrame: false,
    line: false,
    star: false,
    gradient: false,
    adjustmentLayer: false,
    svg: false
  });

  const [defaults, setDefaults] = useState<ShapeDefaults>(shapeDefaultsService.getDefaults());
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  useEffect(() => {
    const loadedDefaults = shapeDefaultsService.getDefaults();
    setDefaults(loadedDefaults);
  }, []);

  const toggleCategory = (category: keyof CategoryState) => {
    setExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const updateShapeDefault = (shapeType: keyof ShapeDefaults, updates: Partial<DesignElement>) => {
    setDefaults(prev => ({
      ...prev,
      [shapeType]: {
        ...prev[shapeType],
        ...updates
      }
    }));
    setHasChanges(true);
  };

  const updateShadow = (shapeType: keyof ShapeDefaults, shadowUpdates: Partial<DesignElement['shadow']>) => {
    const currentShadow = defaults[shapeType].shadow || { blur: 0, color: 'rgba(0, 0, 0, 0)', x: 0, y: 0 };
    updateShapeDefault(shapeType, {
      shadow: { ...currentShadow, ...shadowUpdates }
    });
  };

  const handleSave = () => {
    shapeDefaultsService.saveDefaults(defaults);
    setHasChanges(false);
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Reset all shapes to factory defaults? This cannot be undone.')) {
      shapeDefaultsService.resetToDefaults();
      const factoryDefaults = shapeDefaultsService.getFactoryDefaults();
      setDefaults(factoryDefaults);
      setHasChanges(false);
    }
  };

  const CategoryHeader: React.FC<{
    title: string;
    color: string;
    category: keyof CategoryState;
  }> = ({ title, color, category }) => (
    <button
      onClick={() => toggleCategory(category)}
      className="w-full flex items-center justify-between p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors group"
    >
      <div className="flex items-center">
        <span className={`w-2 h-2 ${color} rounded-full mr-2`}></span>
        <h4 className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
          {title}
        </h4>
      </div>
      {expanded[category] ? (
        <ChevronUp className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );

  const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-gray-600"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
        />
      </div>
    </div>
  );

  const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }> = ({ label, value, onChange, min, max, step = 1 }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
      />
    </div>
  );

  const TextInput: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => (
    <div>
      <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
      />
    </div>
  );

  const renderRectangleSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.rectangle.fill || '#3B82F6'}
          onChange={(value) => updateShapeDefault('rectangle', { fill: value })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.rectangle.stroke || '#1E40AF'}
          onChange={(value) => updateShapeDefault('rectangle', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label="Stroke Width"
          value={defaults.rectangle.strokeWidth || 2}
          onChange={(value) => updateShapeDefault('rectangle', { strokeWidth: value })}
          min={0}
          max={20}
        />
        <NumberInput
          label="Border Radius"
          value={defaults.rectangle.borderRadius || 8}
          onChange={(value) => updateShapeDefault('rectangle', { borderRadius: value })}
          min={0}
          max={100}
        />
        <NumberInput
          label="Opacity"
          value={defaults.rectangle.opacity || 1}
          onChange={(value) => updateShapeDefault('rectangle', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-400">Shadow</h5>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Blur"
            value={defaults.rectangle.shadow?.blur || 0}
            onChange={(value) => updateShadow('rectangle', { blur: value })}
            min={0}
            max={50}
          />
          <ColorInput
            label="Color"
            value={defaults.rectangle.shadow?.color || 'rgba(0, 0, 0, 0.3)'}
            onChange={(value) => updateShadow('rectangle', { color: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Offset X"
            value={defaults.rectangle.shadow?.x || 0}
            onChange={(value) => updateShadow('rectangle', { x: value })}
            min={-50}
            max={50}
          />
          <NumberInput
            label="Offset Y"
            value={defaults.rectangle.shadow?.y || 0}
            onChange={(value) => updateShadow('rectangle', { y: value })}
            min={-50}
            max={50}
          />
        </div>
      </div>
    </div>
  );

  const renderCircleSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.circle.fill || '#EF4444'}
          onChange={(value) => updateShapeDefault('circle', { fill: value })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.circle.stroke || '#DC2626'}
          onChange={(value) => updateShapeDefault('circle', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Stroke Width"
          value={defaults.circle.strokeWidth || 2}
          onChange={(value) => updateShapeDefault('circle', { strokeWidth: value })}
          min={0}
          max={20}
        />
        <NumberInput
          label="Opacity"
          value={defaults.circle.opacity || 1}
          onChange={(value) => updateShapeDefault('circle', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-400">Shadow</h5>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Blur"
            value={defaults.circle.shadow?.blur || 0}
            onChange={(value) => updateShadow('circle', { blur: value })}
            min={0}
            max={50}
          />
          <ColorInput
            label="Color"
            value={defaults.circle.shadow?.color || 'rgba(0, 0, 0, 0.3)'}
            onChange={(value) => updateShadow('circle', { color: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Offset X"
            value={defaults.circle.shadow?.x || 0}
            onChange={(value) => updateShadow('circle', { x: value })}
            min={-50}
            max={50}
          />
          <NumberInput
            label="Offset Y"
            value={defaults.circle.shadow?.y || 0}
            onChange={(value) => updateShadow('circle', { y: value })}
            min={-50}
            max={50}
          />
        </div>
      </div>
    </div>
  );

  const renderTextSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <TextInput
        label="Default Text"
        value={defaults.text.text || 'Hello World'}
        onChange={(value) => updateShapeDefault('text', { text: value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Text Color"
          value={defaults.text.textColor || '#FFFFFF'}
          onChange={(value) => updateShapeDefault('text', { textColor: value })}
        />
        <ColorInput
          label="Background"
          value={defaults.text.fill || '#FFFFFF'}
          onChange={(value) => updateShapeDefault('text', { fill: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Font Size"
          value={defaults.text.fontSize || 24}
          onChange={(value) => updateShapeDefault('text', { fontSize: value })}
          min={8}
          max={200}
        />
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Font Weight</label>
          <select
            value={defaults.text.fontWeight || '600'}
            onChange={(e) => updateShapeDefault('text', { fontWeight: e.target.value })}
            className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
          >
            <option value="300">Light</option>
            <option value="400">Normal</option>
            <option value="600">Semi Bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra Bold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Text Align</label>
          <select
            value={defaults.text.textAlign || 'left'}
            onChange={(e) => updateShapeDefault('text', { textAlign: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <NumberInput
          label="Opacity"
          value={defaults.text.opacity || 1}
          onChange={(value) => updateShapeDefault('text', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
    </div>
  );

  const renderButtonSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <TextInput
        label="Default Text"
        value={defaults.button.text || 'Click Me'}
        onChange={(value) => updateShapeDefault('button', { text: value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.button.fill || '#FFD700'}
          onChange={(value) => updateShapeDefault('button', { fill: value })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.button.stroke || '#FFA500'}
          onChange={(value) => updateShapeDefault('button', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Text Color"
          value={defaults.button.textColor || '#000000'}
          onChange={(value) => updateShapeDefault('button', { textColor: value })}
        />
        <NumberInput
          label="Font Size"
          value={defaults.button.fontSize || 16}
          onChange={(value) => updateShapeDefault('button', { fontSize: value })}
          min={8}
          max={100}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label="Stroke Width"
          value={defaults.button.strokeWidth || 2}
          onChange={(value) => updateShapeDefault('button', { strokeWidth: value })}
          min={0}
          max={20}
        />
        <NumberInput
          label="Border Radius"
          value={defaults.button.borderRadius || 12}
          onChange={(value) => updateShapeDefault('button', { borderRadius: value })}
          min={0}
          max={100}
        />
        <NumberInput
          label="Opacity"
          value={defaults.button.opacity || 1}
          onChange={(value) => updateShapeDefault('button', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-400">Shadow</h5>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Blur"
            value={defaults.button.shadow?.blur || 0}
            onChange={(value) => updateShadow('button', { blur: value })}
            min={0}
            max={50}
          />
          <ColorInput
            label="Color"
            value={defaults.button.shadow?.color || 'rgba(255, 215, 0, 0.4)'}
            onChange={(value) => updateShadow('button', { color: value })}
          />
        </div>
      </div>
    </div>
  );

  const renderChatBubbleSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <TextInput
        label="Default Text"
        value={defaults.chatBubble.text || 'Hello! How are you?'}
        onChange={(value) => updateShapeDefault('chatBubble', { text: value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.chatBubble.fill || '#1F2937'}
          onChange={(value) => updateShapeDefault('chatBubble', { fill: value })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.chatBubble.stroke || '#374151'}
          onChange={(value) => updateShapeDefault('chatBubble', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Text Color"
          value={defaults.chatBubble.textColor || '#FFFFFF'}
          onChange={(value) => updateShapeDefault('chatBubble', { textColor: value })}
        />
        <NumberInput
          label="Font Size"
          value={defaults.chatBubble.fontSize || 14}
          onChange={(value) => updateShapeDefault('chatBubble', { fontSize: value })}
          min={8}
          max={100}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label="Stroke Width"
          value={defaults.chatBubble.strokeWidth || 1}
          onChange={(value) => updateShapeDefault('chatBubble', { strokeWidth: value })}
          min={0}
          max={20}
        />
        <NumberInput
          label="Border Radius"
          value={defaults.chatBubble.borderRadius || 18}
          onChange={(value) => updateShapeDefault('chatBubble', { borderRadius: value })}
          min={0}
          max={100}
        />
        <NumberInput
          label="Opacity"
          value={defaults.chatBubble.opacity || 1}
          onChange={(value) => updateShapeDefault('chatBubble', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
    </div>
  );

  const renderChatFrameSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.chatFrame.fill || '#000000'}
          onChange={(value) => updateShapeDefault('chatFrame', { fill: value })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.chatFrame.stroke || '#374151'}
          onChange={(value) => updateShapeDefault('chatFrame', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label="Stroke Width"
          value={defaults.chatFrame.strokeWidth || 2}
          onChange={(value) => updateShapeDefault('chatFrame', { strokeWidth: value })}
          min={0}
          max={20}
        />
        <NumberInput
          label="Border Radius"
          value={defaults.chatFrame.borderRadius || 36}
          onChange={(value) => updateShapeDefault('chatFrame', { borderRadius: value })}
          min={0}
          max={100}
        />
        <NumberInput
          label="Opacity"
          value={defaults.chatFrame.opacity || 1}
          onChange={(value) => updateShapeDefault('chatFrame', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-medium text-gray-400">Shadow</h5>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Blur"
            value={defaults.chatFrame.shadow?.blur || 0}
            onChange={(value) => updateShadow('chatFrame', { blur: value })}
            min={0}
            max={50}
          />
          <ColorInput
            label="Color"
            value={defaults.chatFrame.shadow?.color || 'rgba(0, 0, 0, 0.5)'}
            onChange={(value) => updateShadow('chatFrame', { color: value })}
          />
        </div>
      </div>
    </div>
  );

  const renderLineSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Stroke Color"
          value={defaults.line.stroke || '#60A5FA'}
          onChange={(value) => updateShapeDefault('line', { stroke: value })}
        />
        <NumberInput
          label="Stroke Width"
          value={defaults.line.strokeWidth || 3}
          onChange={(value) => updateShapeDefault('line', { strokeWidth: value })}
          min={1}
          max={20}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Line Cap</label>
          <select
            value={defaults.line.lineCap || 'round'}
            onChange={(e) => updateShapeDefault('line', { lineCap: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
          >
            <option value="butt">Butt</option>
            <option value="round">Round</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">Line Join</label>
          <select
            value={defaults.line.lineJoin || 'round'}
            onChange={(e) => updateShapeDefault('line', { lineJoin: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
          >
            <option value="miter">Miter</option>
            <option value="round">Round</option>
            <option value="bevel">Bevel</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Arrowhead Size"
          value={defaults.line.arrowheadSize || 12}
          onChange={(value) => updateShapeDefault('line', { arrowheadSize: value })}
          min={5}
          max={30}
        />
        <NumberInput
          label="Opacity"
          value={defaults.line.opacity || 1}
          onChange={(value) => updateShapeDefault('line', { opacity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
    </div>
  );

  const renderStarSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Fill Color"
          value={defaults.star.material?.color || '#FBBF24'}
          onChange={(value) => updateShapeDefault('star', {
            material: { ...defaults.star.material, color: value }
          })}
        />
        <ColorInput
          label="Stroke Color"
          value={defaults.star.stroke || '#F59E0B'}
          onChange={(value) => updateShapeDefault('star', { stroke: value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label="Points"
          value={defaults.star.starPoints || 5}
          onChange={(value) => updateShapeDefault('star', { starPoints: value })}
          min={3}
          max={20}
        />
        <NumberInput
          label="Inner Radius %"
          value={defaults.star.starInnerRadius || 50}
          onChange={(value) => updateShapeDefault('star', { starInnerRadius: value })}
          min={0}
          max={100}
        />
        <NumberInput
          label="Stroke Width"
          value={defaults.star.strokeWidth || 2}
          onChange={(value) => updateShapeDefault('star', { strokeWidth: value })}
          min={0}
          max={20}
        />
      </div>
    </div>
  );

  const renderGradientSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Gradient Type</label>
        <select
          value={defaults.gradient.gradientType || 'linear'}
          onChange={(e) => updateShapeDefault('gradient', { gradientType: e.target.value as any })}
          className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
          <option value="conic">Conic</option>
        </select>
      </div>

      <NumberInput
        label="Gradient Angle"
        value={defaults.gradient.gradientAngle || 45}
        onChange={(value) => updateShapeDefault('gradient', { gradientAngle: value })}
        min={0}
        max={360}
      />

      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Default Colors</label>
        <p className="text-xs text-gray-500">Colors are set per-instance</p>
      </div>
    </div>
  );

  const renderAdjustmentLayerSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Adjustment Type</label>
        <select
          value={defaults.adjustmentLayer.adjustmentType || 'brightness-contrast'}
          onChange={(e) => updateShapeDefault('adjustmentLayer', { adjustmentType: e.target.value as any })}
          className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-xs text-white focus:outline-none focus:border-yellow-400/50"
        >
          <option value="brightness-contrast">Brightness/Contrast</option>
          <option value="hue-saturation">Hue/Saturation</option>
          <option value="color">Color</option>
          <option value="levels">Levels</option>
        </select>
      </div>

      <NumberInput
        label="Default Intensity %"
        value={defaults.adjustmentLayer.adjustmentIntensity || 50}
        onChange={(value) => updateShapeDefault('adjustmentLayer', { adjustmentIntensity: value })}
        min={0}
        max={100}
      />

      <NumberInput
        label="Opacity"
        value={defaults.adjustmentLayer.opacity || 0.8}
        onChange={(value) => updateShapeDefault('adjustmentLayer', { opacity: value })}
        min={0}
        max={1}
        step={0.1}
      />
    </div>
  );

  const renderSVGSettings = () => (
    <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <ColorInput
          label="Default Fill"
          value={defaults.svg.svgFillColor || '#3B82F6'}
          onChange={(value) => updateShapeDefault('svg', { svgFillColor: value })}
        />
        <ColorInput
          label="Default Stroke"
          value={defaults.svg.svgStrokeColor || '#1E40AF'}
          onChange={(value) => updateShapeDefault('svg', { svgStrokeColor: value })}
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1.5">Default SVG</label>
        <p className="text-xs text-gray-500">SVG code is set per-instance</p>
      </div>

      <NumberInput
        label="Opacity"
        value={defaults.svg.opacity || 1}
        onChange={(value) => updateShapeDefault('svg', { opacity: value })}
        min={0}
        max={1}
        step={0.1}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400">
          Configure default settings for new shapes. Changes will apply to shapes created after saving.
        </p>
      </div>

      {showSaveMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <p className="text-sm text-green-400">Settings saved successfully!</p>
        </div>
      )}

      <div className="space-y-2">
        <CategoryHeader title="Rectangle" color="bg-blue-400" category="rectangle" />
        {expanded.rectangle && renderRectangleSettings()}

        <CategoryHeader title="Circle" color="bg-red-400" category="circle" />
        {expanded.circle && renderCircleSettings()}

        <CategoryHeader title="Text" color="bg-green-400" category="text" />
        {expanded.text && renderTextSettings()}

        <CategoryHeader title="Button" color="bg-yellow-400" category="button" />
        {expanded.button && renderButtonSettings()}

        <CategoryHeader title="Chat Bubble" color="bg-purple-400" category="chatBubble" />
        {expanded.chatBubble && renderChatBubbleSettings()}

        <CategoryHeader title="Chat Frame" color="bg-pink-400" category="chatFrame" />
        {expanded.chatFrame && renderChatFrameSettings()}

        <CategoryHeader title="Line" color="bg-cyan-400" category="line" />
        {expanded.line && renderLineSettings()}

        <CategoryHeader title="Star" color="bg-yellow-400" category="star" />
        {expanded.star && renderStarSettings()}

        <CategoryHeader title="Gradient" color="bg-pink-400" category="gradient" />
        {expanded.gradient && renderGradientSettings()}

        <CategoryHeader title="Adjustment Layer" color="bg-indigo-400" category="adjustmentLayer" />
        {expanded.adjustmentLayer && renderAdjustmentLayerSettings()}

        <CategoryHeader title="SVG Icon" color="bg-cyan-400" category="svg" />
        {expanded.svg && renderSVGSettings()}
      </div>

      <div className="flex space-x-3 pt-4 border-t border-gray-700/50">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/50 text-yellow-400'
              : 'bg-gray-700/30 border border-gray-600/30 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>

        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Default</span>
        </button>
      </div>
    </div>
  );
};

export default DefaultShapesSettings;
