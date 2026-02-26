import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Send, ImageIcon } from 'lucide-react';

interface DalleGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (imageUrl: string) => void;
}

type AITier = 'free' | 'limited' | 'ultra';

const DalleGenerateModal: React.FC<DalleGenerateModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTier, setActiveTier] = useState<AITier>('free');
  const [prompt, setPrompt] = useState('');

  const isFree = activeTier === 'free';
  const isLimited = activeTier === 'limited';
  const isUltra = activeTier === 'ultra';

  const tierLabel = isFree ? 'Basic' : isLimited ? 'Medium' : 'Premium';
  const tierModel = isFree ? 'Standard model' : isLimited ? 'Advanced model' : 'Premium model (DALL-E 3)';

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-gray-700"
        style={{ zIndex: 1000000 }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-white">Generate Image with AI</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-2 border-b border-gray-700/50">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTier('free')}
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                isFree
                  ? 'bg-green-500/10 text-green-400 border border-green-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
              }`}
            >
              <span>Basic</span>
              <span className="text-[8px] px-1 py-0.5 rounded border font-semibold bg-green-500/10 text-green-400 border-green-500/30">Free</span>
            </button>
            <button
              onClick={() => setActiveTier('limited')}
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                isLimited
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
              }`}
            >
              <span>Medium</span>
              <span className="text-[8px] px-1 py-0.5 rounded border font-semibold bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Limited</span>
            </button>
            <button
              onClick={() => setActiveTier('ultra')}
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                isUltra
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
              }`}
            >
              <span>Premium</span>
              <span className="text-[8px] px-1 py-0.5 rounded border font-semibold bg-blue-500/10 text-blue-400 border-blue-500/30">Ultra</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-gray-500" />
          </div>
          <h3 className="text-sm font-semibold text-white">AI Image Generation Disabled</h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
            AI image generation is NOT available in the MVP stage. Please contact{' '}
            <a
              href="https://www.linkedin.com/in/gabriele-bolognese/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 underline transition-colors"
            >
              pre-sales on LinkedIn
            </a>
            {' '}to use AI features in early beta testing.
          </p>
          <p className={`text-[10px] font-medium ${isFree ? 'text-green-400' : isLimited ? 'text-yellow-400' : 'text-blue-400'}`}>
            {tierLabel} plan · {tierModel}
          </p>
        </div>

        <div className="p-3 border-t border-gray-700/50">
          <div className={`flex items-end gap-2 rounded-lg border bg-gray-900/50 px-2 py-1.5 transition-colors ${
            isFree ? 'border-green-500/50' : isLimited ? 'border-yellow-500/50' : 'border-blue-500/50'
          }`}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled
              placeholder={`${tierLabel} plan — contact pre-sales to unlock...`}
              className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-600 resize-none outline-none leading-relaxed"
              rows={2}
            />
            <button
              disabled
              className="p-1 rounded-md text-gray-600 cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DalleGenerateModal;
