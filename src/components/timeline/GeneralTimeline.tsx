import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, ChevronLeft, ChevronRight, Lock, Volume2, VolumeX, Scissors, EyeOff, Bookmark, Edit, Magnet, ChevronDown, ChevronUp } from 'lucide-react';
import { DesignElement } from '../../types/design';
import { useAnimation, usePlayback } from '../../animation-engine';
import ClipContextMenu from './ClipContextMenu';
import ClipSpeedDurationModal from './ClipSpeedDurationModal';
import ClipRenameModal from './ClipRenameModal';
import MarkerEditModal from './MarkerEditModal';
import PlayheadIndicator from './PlayheadIndicator';
import { TimelineMarker } from '../../animation-engine/types';
import { getAllElementsFlat } from '../../utils/groupUtils';

interface GeneralTimelineProps {
  elements: DesignElement[];
  compactMode?: boolean;
}

const SNAP_THRESHOLD = 0.2;
const LAYOUT_ZOOM = 0.8; // The layout is zoomed to 80%

const GeneralTimeline: React.FC<GeneralTimelineProps> = ({ elements, compactMode = false }) => {
  const { state, selectClip, updateClip, initAnimation, splitClip, deleteAllKeyframes, selectKeyframes, removeAnimation, addMarker, updateMarker, deleteMarker, toggleSnapToMarkers, getMarkerAtTime } = useAnimation();
  const { play, pause, stop, togglePlay, seekTo, seekToStart, seekToEnd, stepForward, stepBackward, isPlaying, currentTime, currentFrame, totalFrames, duration, fps } = usePlayback();

  const { pixelsPerSecond, selectedClipId, markers, snapToMarkers } = state.timeline;
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ id: string; startX: number; originalStart: number } | null>(null);
  const [resizingClip, setResizingClip] = useState<{ id: string; edge: 'left' | 'right'; startX: number; originalStart: number; originalDuration: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [speedDurationModal, setSpeedDurationModal] = useState<{ clipId: string; clipName: string; duration: number; speed: number } | null>(null);
  const [renameModal, setRenameModal] = useState<{ clipId: string; currentName: string } | null>(null);
  const [clipboardClip, setClipboardClip] = useState<{ elementId: string; animation: any } | null>(null);
  const [editingMarker, setEditingMarker] = useState<TimelineMarker | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);

  const displayElements = useMemo(() => {
    const result: Array<{ element: DesignElement; depth: number; parentId?: string }> = [];

    const processElement = (element: DesignElement, depth: number = 0, parentId?: string) => {
      result.push({ element, depth, parentId });

      if (element.type === 'group' && element.children && !collapsedGroups.has(element.id)) {
        element.children.forEach(child => processElement(child, depth + 1, element.id));
      }
    };

    elements.forEach(element => processElement(element));
    return result;
  }, [elements, collapsedGroups]);

  useEffect(() => {
    const allElements = getAllElementsFlat(elements);
    allElements.forEach((element) => {
      if (!state.animations[element.id]) {
        initAnimation(element.id);
      }
    });
  }, [elements, state.animations, initAnimation]);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    if (rulerRef.current) {
      const rect = rulerRef.current.getBoundingClientRect();
      const scrollLeft = rulerRef.current.scrollLeft;
      const x = (e.clientX - rect.left) / LAYOUT_ZOOM + scrollLeft;
      const time = x / pixelsPerSecond;
      seekTo(Math.max(0, Math.min(time, duration)));
    }
  }, [pixelsPerSecond, duration, seekTo]);

  const findNearestMarker = useCallback((time: number): number | null => {
    if (!snapToMarkers) return null;

    let nearestTime: number | null = null;
    let minDistance = SNAP_THRESHOLD;

    markers.forEach(marker => {
      const distance = Math.abs(time - marker.time);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTime = marker.time;
      }
    });

    return nearestTime;
  }, [snapToMarkers, markers]);

  const handlePlayheadDrag = useCallback((e: React.MouseEvent) => {
    if (isDraggingPlayhead && rulerRef.current) {
      const rect = rulerRef.current.getBoundingClientRect();
      const scrollLeft = rulerRef.current.scrollLeft;
      const x = (e.clientX - rect.left) / LAYOUT_ZOOM + scrollLeft;
      let time = x / pixelsPerSecond;
      time = Math.max(0, Math.min(time, duration));

      const nearestMarkerTime = findNearestMarker(time);
      if (nearestMarkerTime !== null) {
        seekTo(nearestMarkerTime);
      } else {
        seekTo(time);
      }
    }
  }, [isDraggingPlayhead, pixelsPerSecond, duration, seekTo, findNearestMarker]);

  const handleClipClick = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(selectedClipId === elementId ? null : elementId);
  }, [selectClip, selectedClipId]);

  const handleClipDragStart = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const animation = state.animations[elementId];
    if (!animation || animation.locked) return;

    setDraggingClip({
      id: elementId,
      startX: e.clientX / LAYOUT_ZOOM,
      originalStart: animation.clipStart,
    });
  }, [state.animations]);

  const handleClipResize = useCallback((elementId: string, edge: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const animation = state.animations[elementId];
    if (!animation || animation.locked) return;

    setResizingClip({
      id: elementId,
      edge,
      startX: e.clientX / LAYOUT_ZOOM,
      originalStart: animation.clipStart,
      originalDuration: animation.clipDuration,
    });
  }, [state.animations]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingClip) {
      const deltaX = (e.clientX / LAYOUT_ZOOM) - draggingClip.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStart = Math.max(0, draggingClip.originalStart + deltaTime);
      updateClip(draggingClip.id, { clipStart: newStart });
    } else if (resizingClip) {
      const deltaX = (e.clientX / LAYOUT_ZOOM) - resizingClip.startX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (resizingClip.edge === 'left') {
        const newStart = Math.max(0, resizingClip.originalStart + deltaTime);
        const newDuration = Math.max(0.1, resizingClip.originalDuration - deltaTime);
        updateClip(resizingClip.id, { clipStart: newStart, clipDuration: newDuration });
      } else {
        const newDuration = Math.max(0.1, resizingClip.originalDuration + deltaTime);
        updateClip(resizingClip.id, { clipDuration: newDuration });
      }
    }
  }, [draggingClip, resizingClip, pixelsPerSecond, updateClip]);

  const handleMouseUp = useCallback(() => {
    setDraggingClip(null);
    setResizingClip(null);
    setIsDraggingPlayhead(false);
  }, []);

  const handleCutClip = useCallback(() => {
    if (!selectedClipId) return;
    const animation = state.animations[selectedClipId];
    if (!animation) return;

    const clipStart = animation.clipStart;
    const clipEnd = clipStart + animation.clipDuration;

    if (currentTime > clipStart && currentTime < clipEnd) {
      splitClip(selectedClipId, currentTime);
    }
  }, [selectedClipId, currentTime, state.animations, splitClip]);

  const handleClipContextMenu = useCallback((elementId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, clipId: elementId });
  }, []);

  const handleContextMenuCut = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    if (!animation) return;

    setClipboardClip({ elementId: contextMenu.clipId, animation });
    alert('Cut: Animation copied to clipboard. Note: Full element removal requires parent component integration.');
  }, [contextMenu, state.animations]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    if (!animation) return;

    alert('Duplicate: This feature requires parent component integration to duplicate the element.');
  }, [contextMenu, state.animations]);

  const handleContextMenuSpeedDuration = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    const displayElement = displayElements.find(de => de.element.id === contextMenu.clipId);
    const element = displayElement?.element;
    if (!animation || !element) return;

    setSpeedDurationModal({
      clipId: contextMenu.clipId,
      clipName: element.name || (element.type === 'group' ? 'Group' : 'Layer'),
      duration: animation.clipDuration,
      speed: 1,
    });
  }, [contextMenu, state.animations, displayElements]);

  const handleContextMenuSelectAllKeyframes = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    if (!animation) return;

    const keyframeIds: string[] = [];
    animation.tracks.forEach(track => {
      track.keyframes.forEach(kf => {
        keyframeIds.push(kf.id);
      });
    });

    selectKeyframes(keyframeIds);
  }, [contextMenu, state.animations, selectKeyframes]);

  const handleContextMenuDeleteAllKeyframes = useCallback(() => {
    if (!contextMenu) return;
    deleteAllKeyframes(contextMenu.clipId);
  }, [contextMenu, deleteAllKeyframes]);

  const handleContextMenuToggleLock = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    if (!animation) return;

    updateClip(contextMenu.clipId, { locked: !animation.locked });
  }, [contextMenu, state.animations, updateClip]);

  const handleContextMenuRename = useCallback(() => {
    if (!contextMenu) return;
    const element = elements.find(e => e.id === contextMenu.clipId);
    if (!element) return;

    setRenameModal({
      clipId: contextMenu.clipId,
      currentName: element.name || 'Layer',
    });
  }, [contextMenu, elements]);

  const handleContextMenuConvertToStatic = useCallback(() => {
    if (!contextMenu) return;
    deleteAllKeyframes(contextMenu.clipId);
  }, [contextMenu, deleteAllKeyframes]);

  const handleContextMenuToggleDisable = useCallback(() => {
    if (!contextMenu) return;
    const animation = state.animations[contextMenu.clipId];
    if (!animation) return;

    updateClip(contextMenu.clipId, { muted: !animation.muted });
  }, [contextMenu, state.animations, updateClip]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu) return;
    if (confirm('Delete this clip? This will remove animation data but the element will remain on canvas.')) {
      removeAnimation(contextMenu.clipId);
    }
  }, [contextMenu, removeAnimation]);

  const handleApplySpeedDuration = useCallback((duration: number, speed: number) => {
    if (!speedDurationModal) return;
    updateClip(speedDurationModal.clipId, { clipDuration: duration });
    setSpeedDurationModal(null);
  }, [speedDurationModal, updateClip]);

  const handleRename = useCallback((newName: string) => {
    if (!renameModal) return;
    alert(`Rename: New name "${newName}" - This feature requires parent component integration to update the element.`);
    setRenameModal(null);
  }, [renameModal]);

  const handleAddMarker = useCallback(() => {
    addMarker(currentTime);
  }, [currentTime, addMarker]);

  const handleEditMarker = useCallback(() => {
    const marker = getMarkerAtTime(currentTime, 0.05);
    if (marker) {
      setEditingMarker(marker);
    }
  }, [currentTime, getMarkerAtTime]);

  const handleToggleDisableClip = useCallback(() => {
    if (!selectedClipId) return;
    const animation = state.animations[selectedClipId];
    if (!animation) return;
    updateClip(selectedClipId, { muted: !animation.muted });
  }, [selectedClipId, state.animations, updateClip]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * fps);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  const renderRulerTicks = () => {
    const ticks = [];
    const totalSeconds = Math.ceil(duration);
    const majorTickInterval = pixelsPerSecond >= 100 ? 1 : pixelsPerSecond >= 50 ? 2 : 5;

    for (let i = 0; i <= totalSeconds; i++) {
      const x = i * pixelsPerSecond;
      const isMajor = i % majorTickInterval === 0;

      ticks.push(
        <div key={i} className="absolute top-0 flex flex-col items-start" style={{ left: `${x}px` }}>
          <div className={`w-px ${isMajor ? 'h-4 bg-gray-400' : 'h-2 bg-gray-600'}`}></div>
          {isMajor && <span className="text-[10px] text-gray-400 mt-0.5 -ml-2">{i}s</span>}
        </div>
      );

      if (pixelsPerSecond >= 80) {
        for (let f = 1; f < 4; f++) {
          const frameX = x + (f / 4) * pixelsPerSecond;
          ticks.push(
            <div key={`${i}-${f}`} className="absolute top-0" style={{ left: `${frameX}px` }}>
              <div className="w-px h-1.5 bg-gray-700"></div>
            </div>
          );
        }
      }
    }

    return ticks;
  };

  const playheadPosition = currentTime * pixelsPerSecond;
  const timelineWidth = duration * pixelsPerSecond;

  return (
    <div className="h-full bg-gray-900 border-t border-r border-gray-700/50 flex flex-col relative">
      <div className="h-10 bg-gray-800/80 border-b border-gray-700/50 flex items-center px-2 justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {!compactMode && (
            <>
              <div className="flex items-center gap-1">
                <button
                  onClick={seekToStart}
                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  title="Go to start"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={stepBackward}
                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  title="Previous frame"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className={`p-2 rounded-lg transition-all ${
                    isPlaying
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={stop}
                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={stepForward}
                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  title="Next frame"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={seekToEnd}
                  className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  title="Go to end"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-700/50" />
            </>
          )}

          <button
            onClick={handleCutClip}
            disabled={!selectedClipId || !state.animations[selectedClipId]}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedClipId && state.animations[selectedClipId]
                ? 'bg-gray-700/50 text-gray-300 hover:bg-blue-500/20 hover:text-blue-400'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title="Cut clip at playhead (requires selected clip)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Cut Clip</span>
          </button>

          <button
            onClick={handleToggleDisableClip}
            disabled={!selectedClipId || !state.animations[selectedClipId]}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              selectedClipId && state.animations[selectedClipId]
                ? state.animations[selectedClipId]?.muted
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title="Disable/Enable clip"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{selectedClipId && state.animations[selectedClipId]?.muted ? 'Enable' : 'Disable'}</span>
          </button>

          <div className="h-6 w-px bg-gray-700/50" />

          <button
            onClick={handleAddMarker}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-gray-700/50 text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
            title="Add marker at playhead"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Add Marker</span>
          </button>

          {getMarkerAtTime(currentTime, 0.05) && (
            <button
              onClick={handleEditMarker}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
              title="Edit marker at playhead"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Marker</span>
            </button>
          )}

          <button
            onClick={() => toggleSnapToMarkers(!snapToMarkers)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              snapToMarkers
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-gray-700/50 text-gray-500 hover:bg-gray-600/50'
            }`}
            title="Toggle snap to markers"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!compactMode && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <div className="text-xs text-amber-400 font-mono bg-gray-800 px-2 py-1 rounded">
                F {currentFrame + 1} / {totalFrames}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-36 flex-shrink-0 bg-gray-800/40 border-r border-gray-700/50">
          <div className="h-8 border-b border-gray-700/50 flex items-center px-3">
            <span className="text-xs font-medium text-gray-400">Layers</span>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
            {displayElements.map(({ element, depth }) => {
              const animation = state.animations[element.id];
              const isSelected = selectedClipId === element.id;
              const isLocked = animation?.locked || false;
              const isMuted = animation?.muted || false;
              const isGroup = element.type === 'group';
              const isCollapsed = collapsedGroups.has(element.id);

              return (
                <div
                  key={element.id}
                  className={`h-10 border-b border-gray-700/30 flex items-center gap-1 cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-500/20' : 'hover:bg-gray-700/30'
                  }`}
                  style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
                  onClick={(e) => handleClipClick(element.id, e)}
                >
                  {isGroup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupCollapse(element.id);
                      }}
                      className="p-0.5 rounded hover:bg-gray-600/50"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  )}
                  {!isGroup && depth > 0 && (
                    <div className="w-3 h-3 flex-shrink-0" />
                  )}
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: element.fill || '#60a5fa' }}
                  />
                  <span className="text-xs text-gray-300 truncate flex-1">
                    {element.name || (isGroup ? 'Group' : 'Layer')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateClip(element.id, { muted: !isMuted });
                    }}
                    className={`p-0.5 rounded ${isMuted ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateClip(element.id, { locked: !isLocked });
                    }}
                    className={`p-0.5 rounded ${isLocked ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
                    title={isLocked ? 'Unlock' : 'Lock'}
                  >
                    <Lock className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={rulerRef}
            className="h-8 bg-gray-850 border-b border-gray-700/50 relative cursor-pointer overflow-x-auto flex-shrink-0"
            onClick={handleRulerClick}
            onMouseMove={(e) => {
              handlePlayheadDrag(e);
              handleMouseMove(e);
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="relative h-full" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
              {renderRulerTicks()}

              {markers.map(marker => {
                const markerX = marker.time * pixelsPerSecond;
                return (
                  <div
                    key={marker.id}
                    className="absolute top-0 bottom-0 w-0.5 z-5 cursor-pointer group"
                    style={{ left: `${markerX}px`, backgroundColor: marker.color }}
                    onMouseEnter={() => setHoveredMarkerId(marker.id)}
                    onMouseLeave={() => setHoveredMarkerId(null)}
                    onClick={() => setEditingMarker(marker)}
                  >
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3"
                      style={{
                        backgroundColor: marker.color,
                        clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
                      }}
                    />
                    {hoveredMarkerId === marker.id && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
                        {marker.name}
                      </div>
                    )}
                  </div>
                );
              })}

              <PlayheadIndicator
                pixelsPerSecond={pixelsPerSecond}
                isDraggable={true}
                showHandle={true}
                onDragStart={() => setIsDraggingPlayhead(true)}
                onDragEnd={() => setIsDraggingPlayhead(false)}
                className="z-10 pointer-events-auto"
              />
            </div>
          </div>

          <div
            ref={tracksContainerRef}
            className="flex-1 overflow-auto relative"
            onScroll={(e) => {
              if (rulerRef.current) {
                rulerRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Full-height playhead and markers container */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {markers.map(marker => {
                const markerX = marker.time * pixelsPerSecond;
                return (
                  <div
                    key={marker.id}
                    className="absolute top-0 bottom-0 w-0.5"
                    style={{ left: `${markerX}px`, backgroundColor: marker.color }}
                  />
                );
              })}

              <PlayheadIndicator pixelsPerSecond={pixelsPerSecond} />
            </div>

            {displayElements.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No layers available. Create shapes to see timeline clips.
              </div>
            ) : (
              <div className="relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>

                {displayElements.map(({ element, depth }) => {
                  const animation = state.animations[element.id];
                  const clipStart = animation?.clipStart || 0;
                  const clipDuration = animation?.clipDuration || 5;
                  const clipX = clipStart * pixelsPerSecond;
                  const clipWidth = clipDuration * pixelsPerSecond;
                  const isSelected = selectedClipId === element.id;
                  const isHovered = hoveredClipId === element.id;
                  const isMuted = animation?.muted || false;
                  const isLocked = animation?.locked || false;
                  const hasKeyframes = animation?.tracks.some((t) => t.keyframes.length > 0) || false;
                  const isGroup = element.type === 'group';

                  return (
                    <div
                      key={element.id}
                      className="h-10 border-b border-gray-700/30 relative"
                    >
                      <div
                        className={`absolute top-1 bottom-1 rounded transition-all group ${
                          isSelected
                            ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-gray-900'
                            : isHovered
                            ? 'ring-1 ring-gray-500'
                            : ''
                        }`}
                        style={{
                          left: `${clipX}px`,
                          width: `${clipWidth}px`,
                          backgroundColor: element.fill || '#60a5fa',
                          opacity: isMuted ? 0.3 : (depth > 0 ? 0.7 : 0.85),
                        }}
                        onMouseEnter={() => setHoveredClipId(element.id)}
                        onMouseLeave={() => setHoveredClipId(null)}
                      >
                        <div
                          className="absolute inset-0 px-2 flex items-center justify-between overflow-hidden cursor-move"
                          onClick={(e) => handleClipClick(element.id, e)}
                          onMouseDown={(e) => !isLocked && handleClipDragStart(element.id, e)}
                          onContextMenu={(e) => handleClipContextMenu(element.id, e)}
                        >
                          <span className="text-xs text-white font-medium truncate drop-shadow-sm pointer-events-none">
                            {element.name || (isGroup ? 'Group' : 'Layer')}
                          </span>
                          {hasKeyframes && (
                            <div className="flex items-center gap-0.5 pointer-events-none">
                              {animation?.tracks.slice(0, 3).map((track, i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 bg-white/80 rounded-full"
                                  title={`${track.keyframes.length} keyframes`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 rounded-l z-10"
                          onMouseDown={(e) => !isLocked && handleClipResize(element.id, 'left', e)}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/30 hover:bg-white/50 rounded-r z-10"
                          onMouseDown={(e) => !isLocked && handleClipResize(element.id, 'right', e)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {contextMenu && (() => {
        const displayElement = displayElements.find(de => de.element.id === contextMenu.clipId);
        const element = displayElement?.element;
        return (
          <ClipContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            clipId={contextMenu.clipId}
            clipName={element?.name || (element?.type === 'group' ? 'Group' : 'Layer')}
            isLocked={state.animations[contextMenu.clipId]?.locked || false}
            isDisabled={state.animations[contextMenu.clipId]?.muted || false}
            hasKeyframes={state.animations[contextMenu.clipId]?.tracks.some(t => t.keyframes.length > 0) || false}
            onClose={() => setContextMenu(null)}
            onCut={handleContextMenuCut}
            onDuplicate={handleContextMenuDuplicate}
            onSpeedDuration={handleContextMenuSpeedDuration}
            onSelectAllKeyframes={handleContextMenuSelectAllKeyframes}
            onDeleteAllKeyframes={handleContextMenuDeleteAllKeyframes}
            onToggleLock={handleContextMenuToggleLock}
            onRename={handleContextMenuRename}
            onConvertToStatic={handleContextMenuConvertToStatic}
            onToggleDisable={handleContextMenuToggleDisable}
            onDelete={handleContextMenuDelete}
          />
        );
      })()}

      {speedDurationModal && (
        <ClipSpeedDurationModal
          clipName={speedDurationModal.clipName}
          currentDuration={speedDurationModal.duration}
          currentSpeed={speedDurationModal.speed}
          onClose={() => setSpeedDurationModal(null)}
          onApply={handleApplySpeedDuration}
        />
      )}

      {renameModal && (
        <ClipRenameModal
          currentName={renameModal.currentName}
          onClose={() => setRenameModal(null)}
          onRename={handleRename}
        />
      )}

      {editingMarker && (
        <MarkerEditModal
          marker={editingMarker}
          onClose={() => setEditingMarker(null)}
          onSave={(updates) => updateMarker(editingMarker.id, updates)}
          onDelete={() => deleteMarker(editingMarker.id)}
        />
      )}
    </div>
  );
};

export default GeneralTimeline;
