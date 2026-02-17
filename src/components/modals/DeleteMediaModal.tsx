import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  hasUsedMedia: boolean;
  onConfirm: () => void;
}

const DeleteMediaModal: React.FC<DeleteMediaModalProps> = ({
  isOpen,
  onClose,
  count,
  hasUsedMedia,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Delete Media</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {hasUsedMedia && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Warning</p>
                <p className="text-xs text-gray-300 mt-1">
                  {count === 1
                    ? 'This media is currently used in your project. Deleting it may affect your canvas or timeline.'
                    : 'Some of these media items are currently used in your project. Deleting them may affect your canvas or timeline.'}
                </p>
              </div>
            </div>
          )}

          <p className="text-gray-300">
            {count === 1
              ? 'Are you sure you want to delete this media item from your project?'
              : `Are you sure you want to delete ${count} media items from your project?`}
          </p>

          <p className="text-sm text-gray-400">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMediaModal;
