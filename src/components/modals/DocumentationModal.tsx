import React from 'react';
import { X } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleViewDocumentation = () => {
    window.open('https://documentation-flashfx.netlify.app', '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-4">View Documentation</h2>

          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            You are about to leave FlashFX to go to the documentation page. Are you sure?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleViewDocumentation}
              className="flex-1 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition-colors font-medium text-sm"
            >
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
