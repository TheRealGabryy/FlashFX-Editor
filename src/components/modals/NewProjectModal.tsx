import React, { useState, useEffect } from 'react';
import { X, Palette, AlertCircle, Monitor, Smartphone, Square, Film, Image } from 'lucide-react';

interface CanvasSettings {
  width: number;
  height: number;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, canvasSettings: CanvasSettings) => void;
}

const CANVAS_PRESETS = [
  { name: '4K UHD', width: 3840, height: 2160, icon: Monitor },
  { name: 'Full HD', width: 1920, height: 1080, icon: Monitor },
  { name: 'HD', width: 1280, height: 720, icon: Monitor },
  { name: 'Square', width: 1080, height: 1080, icon: Square },
  { name: 'Instagram Story', width: 1080, height: 1920, icon: Smartphone },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, icon: Film },
  { name: 'Twitter Post', width: 1200, height: 675, icon: Image },
  { name: 'Facebook Cover', width: 820, height: 312, icon: Image },
];

const MAX_RATIO = 5;

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [projectName, setProjectName] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(3840);
  const [canvasHeight, setCanvasHeight] = useState(2160);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('4K UHD');
  const [ratioError, setRatioError] = useState<string | null>(null);

  useEffect(() => {
    validateRatio(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const validateRatio = (width: number, height: number): boolean => {
    if (width <= 0 || height <= 0) {
      setRatioError('Width and height must be greater than 0');
      return false;
    }

    const ratio = Math.max(width / height, height / width);
    if (ratio > MAX_RATIO) {
      if (width > height) {
        setRatioError(`Width cannot be more than ${MAX_RATIO}x the height`);
      } else {
        setRatioError(`Height cannot be more than ${MAX_RATIO}x the width`);
      }
      return false;
    }

    setRatioError(null);
    return true;
  };

  const handlePresetSelect = (preset: typeof CANVAS_PRESETS[0]) => {
    setCanvasWidth(preset.width);
    setCanvasHeight(preset.height);
    setSelectedPreset(preset.name);
  };

  const handleWidthChange = (value: number) => {
    setCanvasWidth(value);
    setSelectedPreset(null);
  };

  const handleHeightChange = (value: number) => {
    setCanvasHeight(value);
    setSelectedPreset(null);
  };

  const handleCreate = () => {
    if (projectName.trim() && !ratioError && canvasWidth > 0 && canvasHeight > 0) {
      onCreate(projectName, { width: canvasWidth, height: canvasHeight });
      setProjectName('');
      setCanvasWidth(3840);
      setCanvasHeight(2160);
      setSelectedPreset('4K UHD');
      setRatioError(null);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && projectName.trim() && !ratioError) {
      handleCreate();
    }
  };

  const handleClose = () => {
    setProjectName('');
    setCanvasWidth(3840);
    setCanvasHeight(2160);
    setSelectedPreset('4K UHD');
    setRatioError(null);
    onClose();
  };

  const aspectRatio = canvasWidth && canvasHeight
    ? (canvasWidth / canvasHeight).toFixed(2)
    : '0';

  const canCreate = projectName.trim() && !ratioError && canvasWidth > 0 && canvasHeight > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">New Project</h2>
                <p className="text-sm text-slate-400">Create a new project with custom canvas size</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter project name..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Canvas Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CANVAS_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                      selectedPreset === preset.name
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {preset.width}x{preset.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Custom Canvas Size
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Width (px)</label>
                <input
                  type="number"
                  min="100"
                  max="16000"
                  value={canvasWidth}
                  onChange={(e) => handleWidthChange(Math.max(100, Math.min(16000, parseInt(e.target.value) || 100)))}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Height (px)</label>
                <input
                  type="number"
                  min="100"
                  max="16000"
                  value={canvasHeight}
                  onChange={(e) => handleHeightChange(Math.max(100, Math.min(16000, parseInt(e.target.value) || 100)))}
                  className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                Aspect Ratio: <span className="text-white font-mono">{aspectRatio}:1</span>
              </span>
              <span className="text-slate-400">
                {canvasWidth} x {canvasHeight} px
              </span>
            </div>

            {ratioError && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-400">{ratioError}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-600">
                <Monitor className="w-4 h-4 text-slate-300" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Canvas Preview</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Your canvas will be {canvasWidth}px wide and {canvasHeight}px tall.
                  The maximum ratio between width and height is 5:1.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div
                className="bg-slate-900 border border-slate-500 rounded"
                style={{
                  width: Math.min(200, 200 * (canvasWidth / Math.max(canvasWidth, canvasHeight))),
                  height: Math.min(200, 200 * (canvasHeight / Math.max(canvasWidth, canvasHeight))),
                  minWidth: 40,
                  minHeight: 40
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                  {canvasWidth} x {canvasHeight}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className={`px-6 py-2.5 font-medium rounded-lg transition-all ${
              canCreate
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
