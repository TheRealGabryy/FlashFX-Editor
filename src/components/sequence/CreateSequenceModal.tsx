import React, { useState, useEffect } from 'react';
import { X, Film, Clock, Gauge, AlertCircle } from 'lucide-react';
import { Sequence, FRAME_RATE_PRESETS } from '../../types/sequence';

interface CreateSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, frameRate: number, duration: number) => void;
  editingSequence?: Sequence | null;
}

const DURATION_PRESETS = [
  { value: 1, label: '1s' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
];

const CreateSequenceModal: React.FC<CreateSequenceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  editingSequence,
}) => {
  const [name, setName] = useState('');
  const [frameRate, setFrameRate] = useState(30);
  const [duration, setDuration] = useState(5);
  const [customFrameRate, setCustomFrameRate] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);

  useEffect(() => {
    if (editingSequence) {
      setName(editingSequence.name);
      setFrameRate(editingSequence.frameRate);
      setDuration(editingSequence.duration);
      setCustomFrameRate(!FRAME_RATE_PRESETS.some(p => p.value === editingSequence.frameRate));
      setCustomDuration(!DURATION_PRESETS.some(p => p.value === editingSequence.duration));
    } else {
      setName('');
      setFrameRate(30);
      setDuration(5);
      setCustomFrameRate(false);
      setCustomDuration(false);
    }
  }, [editingSequence, isOpen]);

  const handleCreate = () => {
    if (name.trim() && frameRate > 0 && duration > 0) {
      onCreate(name.trim(), frameRate, duration);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && frameRate > 0 && duration > 0) {
      handleCreate();
    }
  };

  const handleClose = () => {
    setName('');
    setFrameRate(30);
    setDuration(5);
    setCustomFrameRate(false);
    setCustomDuration(false);
    onClose();
  };

  const totalFrames = Math.ceil(duration * frameRate);
  const estimatedFileSize = Math.round((totalFrames * 1920 * 1080 * 3) / 1024 / 1024 * 0.1);
  const canCreate = name.trim() && frameRate > 0 && frameRate <= 240 && duration > 0 && duration <= 3600;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingSequence ? 'Edit Sequence' : 'Create Sequence'}
                </h2>
                <p className="text-sm text-slate-400">
                  Configure your animation timeline
                </p>
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
              Sequence Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="My Animation"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <Gauge className="w-4 h-4 inline mr-2" />
              Frame Rate (FPS)
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {FRAME_RATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setFrameRate(preset.value);
                    setCustomFrameRate(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                    frameRate === preset.value && !customFrameRate
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  {preset.value}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={customFrameRate}
                  onChange={(e) => setCustomFrameRate(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                Custom
              </label>
              {customFrameRate && (
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={frameRate}
                  onChange={(e) => setFrameRate(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                  className="w-24 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <Clock className="w-4 h-4 inline mr-2" />
              Duration
            </label>
            <div className="grid grid-cols-7 gap-2 mb-3">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setDuration(preset.value);
                    setCustomDuration(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                    duration === preset.value && !customDuration
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={customDuration}
                  onChange={(e) => setCustomDuration(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                Custom (seconds)
              </label>
              {customDuration && (
                <input
                  type="number"
                  min="0.1"
                  max="3600"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(0.1, Math.min(3600, parseFloat(e.target.value) || 0.1)))}
                  className="w-24 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <h4 className="text-sm font-medium text-white mb-3">Sequence Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Total Frames:</span>
                <span className="text-white font-mono ml-2">{totalFrames.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Frame Duration:</span>
                <span className="text-white font-mono ml-2">{(1000 / frameRate).toFixed(2)}ms</span>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <span className="text-white font-mono ml-2">
                  {duration >= 60
                    ? `${Math.floor(duration / 60)}m ${(duration % 60).toFixed(1)}s`
                    : `${duration}s`}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Est. Render:</span>
                <span className="text-white font-mono ml-2">~{estimatedFileSize}MB</span>
              </div>
            </div>

            {totalFrames > 1800 && (
              <div className="mt-3 flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-amber-400">
                  Large frame count. Rendering may take longer and use more memory.
                </span>
              </div>
            )}
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
            {editingSequence ? 'Update Sequence' : 'Create Sequence'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSequenceModal;
