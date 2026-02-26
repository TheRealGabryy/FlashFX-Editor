import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2 } from 'lucide-react';
import type { IconData } from './types';
import { useIconSearch } from './useIconSearch';
import { SvgIcon } from './SvgIcon';
import { VirtualGrid } from './VirtualGrid';

interface IconLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (icon: IconData, color: string) => void;
}

export function IconLibraryModal({ isOpen, onClose, onSelect }: IconLibraryModalProps) {
  const { query, setQuery, results, isLoading, totalIndexed } = useIconSearch();
  const [selectedIcon, setSelectedIcon] = useState<IconData | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIcon(null);
      setSelectedColor('#ffffff');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedIcon) {
          setSelectedIcon(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, selectedIcon]);

  const handleInsert = useCallback(() => {
    if (!selectedIcon) return;
    onSelect(selectedIcon, selectedColor);
    onClose();
  }, [selectedIcon, selectedColor, onSelect, onClose]);

  const renderItem = useCallback((icon: IconData) => {
    const isActive = selectedIcon?.id === icon.id;
    return (
      <button
        onClick={() => setSelectedIcon(icon)}
        className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg border transition-all duration-150 cursor-pointer group ${
          isActive
            ? 'border-blue-500/70 bg-blue-500/10'
            : 'border-gray-700/50 bg-gray-800/40 hover:bg-gray-700/60 hover:border-gray-500/60'
        }`}
        title={icon.name}
      >
        <SvgIcon icon={icon} size={28} color={isActive ? '#3B82F6' : '#d1d5db'} />
        <span className={`text-[9px] truncate w-full text-center px-0.5 leading-tight transition-colors ${
          isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
        }`}>
          {icon.name}
        </span>
      </button>
    );
  }, [selectedIcon]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[720px] max-w-[95vw] h-[600px] max-h-[90vh] bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-100">Icon Library</h2>
            <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              {totalIndexed.toLocaleString()} icons
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search icons... (e.g. arrow, user, settings)"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-800/70 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 px-3 py-3 overflow-hidden">
            {results.length === 0 && !isLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {query ? 'No icons found' : 'Loading icons...'}
              </div>
            ) : (
              <VirtualGrid
                items={results}
                itemSize={72}
                gap={6}
                containerHeight={440}
                renderItem={renderItem}
              />
            )}
          </div>

          <div className="w-52 border-l border-gray-800 px-4 py-4 flex flex-col items-center gap-4 shrink-0">
            {selectedIcon ? (
              <>
                <div className="w-24 h-24 flex items-center justify-center bg-gray-800/50 rounded-xl border border-gray-700/40">
                  <SvgIcon icon={selectedIcon} size={56} color={selectedColor} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-200">{selectedIcon.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{selectedIcon.id}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {selectedIcon.tags.slice(0, 6).map(tag => (
                    <span key={tag} className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="w-full">
                  <label className="text-[10px] text-gray-500 block mb-1.5">Color</label>
                  <div className="flex gap-1.5">
                    {['#ffffff', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'].map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          selectedColor === c ? 'border-white scale-110' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleInsert}
                  className="w-full mt-auto py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Insert Icon
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <p className="text-[11px] text-gray-500 leading-relaxed">Click an icon to preview and configure it</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
