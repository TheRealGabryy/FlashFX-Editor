import React, { useState } from 'react';
import { X, BookOpen, MessageSquare, Youtube, Check } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('flashfx_welcome_shown', 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes textFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes buttonAppear {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div
        className="rounded-2xl border border-yellow-500/40 shadow-2xl max-w-xl w-full overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 50%, rgba(0, 0, 0, 0.98) 100%)',
          animation: 'slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>

        <div className="p-6 text-center">
          <h1
            className="text-2xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4"
            style={{ animation: 'textFadeIn 0.6s ease-out 0.2s both' }}
          >
            Welcome to FlashFX
          </h1>

          <p
            className="text-sm text-gray-300 leading-relaxed mb-3"
            style={{ animation: 'textFadeIn 0.6s ease-out 0.4s both' }}
          >
            FlashFX is a professional web-based motion graphics and animation design tool built with modern web technologies.
            It combines the power of vector design tools with advanced animation capabilities, allowing you to create stunning
            animations and export professional videos directly in your browser.
          </p>

          <div
            className="mt-5 mb-5"
            style={{ animation: 'textFadeIn 0.6s ease-out 0.5s both' }}
          >
            <h2 className="text-base font-semibold text-yellow-400 mb-3">Key Capabilities</h2>
            <ul className="text-left text-xs text-gray-300 space-y-1.5 max-w-xl mx-auto">
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Create vector graphics and designs with an intuitive interface</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Animate any property with precise keyframe control</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Apply 60+ professional image filters and effects</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Work with advanced text animation and styling</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Export videos (WebM, MP4) and image sequences</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Save projects to the cloud or work offline in guest mode</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Collaborate with AI-powered design assistance</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <a
              href="https://documentation-flashfx.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700 hover:border-yellow-500/50 rounded-lg transition-all duration-300 group backdrop-blur-sm"
              style={{ animation: 'buttonAppear 0.5s ease-out 0.7s both' }}
            >
              <BookOpen className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xs font-medium text-white">Documentation</span>
            </a>

            <a
              href="https://discord.gg/QrbjWT3ZcD"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700 hover:border-yellow-500/50 rounded-lg transition-all duration-300 group backdrop-blur-sm"
              style={{ animation: 'buttonAppear 0.5s ease-out 0.8s both' }}
            >
              <MessageSquare className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xs font-medium text-white">Discord</span>
            </a>

            <a
              href="https://www.youtube.com/@gabriele-bolgnese"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-700 hover:border-yellow-500/50 rounded-lg transition-all duration-300 group backdrop-blur-sm"
              style={{ animation: 'buttonAppear 0.5s ease-out 0.9s both' }}
            >
              <Youtube className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xs font-medium text-white">YouTube</span>
            </a>
          </div>

          <div
            className="pt-4 border-t border-gray-800/50"
            style={{ animation: 'textFadeIn 0.6s ease-out 1s both' }}
          >
            <label className="flex items-center justify-center space-x-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  dontShowAgain
                    ? 'bg-yellow-400 border-yellow-400'
                    : 'border-gray-600 bg-gray-900'
                }`}
                onClick={() => setDontShowAgain(!dontShowAgain)}
              >
                {dontShowAgain && <Check className="w-2.5 h-2.5 text-black" />}
              </div>
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="hidden"
              />
              <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                Don't show again
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
