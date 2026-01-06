import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import {
  AnimationState,
  ElementAnimation,
  PropertyTrack,
  Keyframe,
  TimelineState,
  AnimatableProperty,
  DEFAULT_TIMELINE_STATE,
  createDefaultElementAnimation,
  createKeyframe,
  createPropertyTrack,
  EasingType,
  Sequence,
  createSequence as createSequenceHelper,
  getSequenceTotalFrames,
  getFrameTime,
  getFrameAtTime,
  getFrameDuration,
  TimelineMarker,
  createMarker,
} from './types';
import { getAnimatedValue, isColorProperty } from './interpolation';
import { DesignElement } from '../types/design';

type AnimationAction =
  | { type: 'SET_CURRENT_TIME'; time: number }
  | { type: 'SET_CURRENT_FRAME'; frame: number }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_FPS'; fps: number }
  | { type: 'SET_LOOP'; loop: boolean }
  | { type: 'SET_PIXELS_PER_SECOND'; pixelsPerSecond: number }
  | { type: 'SELECT_CLIP'; clipId: string | null }
  | { type: 'SELECT_KEYFRAMES'; keyframeIds: string[] }
  | { type: 'ADD_KEYFRAME'; elementId: string; property: AnimatableProperty; keyframe: Keyframe }
  | { type: 'UPDATE_KEYFRAME'; elementId: string; property: AnimatableProperty; keyframeId: string; updates: Partial<Keyframe> }
  | { type: 'DELETE_KEYFRAME'; elementId: string; property: AnimatableProperty; keyframeId: string }
  | { type: 'DELETE_TRACK'; elementId: string; property: AnimatableProperty }
  | { type: 'DELETE_ALL_KEYFRAMES'; elementId: string }
  | { type: 'UPDATE_CLIP'; elementId: string; updates: Partial<ElementAnimation> }
  | { type: 'SPLIT_CLIP'; elementId: string; time: number }
  | { type: 'INIT_ANIMATION'; elementId: string }
  | { type: 'REMOVE_ANIMATION'; elementId: string }
  | { type: 'LOAD_ANIMATIONS'; animations: Record<string, ElementAnimation> }
  | { type: 'RESET_TIMELINE' }
  | { type: 'CREATE_SEQUENCE'; sequence: Sequence }
  | { type: 'UPDATE_SEQUENCE'; sequenceId: string; updates: Partial<Sequence> }
  | { type: 'DELETE_SEQUENCE'; sequenceId: string }
  | { type: 'SET_ACTIVE_SEQUENCE'; sequenceId: string | null }
  | { type: 'STEP_FRAME'; direction: 'forward' | 'backward' }
  | { type: 'ADD_MARKER'; marker: TimelineMarker }
  | { type: 'UPDATE_MARKER'; markerId: string; updates: Partial<TimelineMarker> }
  | { type: 'DELETE_MARKER'; markerId: string }
  | { type: 'TOGGLE_SNAP_TO_MARKERS'; enabled: boolean };

function animationReducer(state: AnimationState, action: AnimationAction): AnimationState {
  switch (action.type) {
    case 'SET_CURRENT_TIME': {
      const newFrame = getFrameAtTime(state.timeline.fps, action.time);
      return {
        ...state,
        timeline: { ...state.timeline, currentTime: action.time, currentFrame: newFrame },
      };
    }

    case 'SET_CURRENT_FRAME': {
      const newTime = getFrameTime(state.timeline.fps, action.frame);
      const clampedTime = Math.max(0, Math.min(newTime, state.timeline.duration));
      const clampedFrame = getFrameAtTime(state.timeline.fps, clampedTime);
      return {
        ...state,
        timeline: { ...state.timeline, currentTime: clampedTime, currentFrame: clampedFrame },
      };
    }

    case 'SET_PLAYING':
      return {
        ...state,
        timeline: { ...state.timeline, isPlaying: action.isPlaying },
      };

    case 'SET_DURATION':
      return {
        ...state,
        timeline: { ...state.timeline, duration: action.duration },
      };

    case 'SET_FPS':
      return {
        ...state,
        timeline: { ...state.timeline, fps: action.fps },
      };

    case 'SET_LOOP':
      return {
        ...state,
        timeline: { ...state.timeline, loop: action.loop },
      };

    case 'SET_PIXELS_PER_SECOND':
      return {
        ...state,
        timeline: { ...state.timeline, pixelsPerSecond: action.pixelsPerSecond },
      };

    case 'SELECT_CLIP':
      return {
        ...state,
        timeline: { ...state.timeline, selectedClipId: action.clipId, selectedKeyframeIds: [] },
      };

    case 'SELECT_KEYFRAMES':
      return {
        ...state,
        timeline: { ...state.timeline, selectedKeyframeIds: action.keyframeIds },
      };

    case 'INIT_ANIMATION': {
      if (state.animations[action.elementId]) {
        return state;
      }
      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: createDefaultElementAnimation(action.elementId),
        },
      };
    }

    case 'REMOVE_ANIMATION': {
      const { [action.elementId]: removed, ...rest } = state.animations;
      return {
        ...state,
        animations: rest,
      };
    }

    case 'ADD_KEYFRAME': {
      const animation = state.animations[action.elementId] || createDefaultElementAnimation(action.elementId);
      let trackIndex = animation.tracks.findIndex((t) => t.property === action.property);

      let updatedTracks: PropertyTrack[];
      if (trackIndex === -1) {
        const newTrack = createPropertyTrack(action.property);
        newTrack.keyframes = [action.keyframe];
        updatedTracks = [...animation.tracks, newTrack];
      } else {
        updatedTracks = animation.tracks.map((track, idx) => {
          if (idx === trackIndex) {
            return {
              ...track,
              keyframes: [...track.keyframes, action.keyframe].sort((a, b) => a.time - b.time),
            };
          }
          return track;
        });
      }

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            tracks: updatedTracks,
          },
        },
      };
    }

    case 'UPDATE_KEYFRAME': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      const updatedTracks = animation.tracks.map((track) => {
        if (track.property !== action.property) return track;
        return {
          ...track,
          keyframes: track.keyframes
            .map((kf) => (kf.id === action.keyframeId ? { ...kf, ...action.updates } : kf))
            .sort((a, b) => a.time - b.time),
        };
      });

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            tracks: updatedTracks,
          },
        },
      };
    }

    case 'DELETE_KEYFRAME': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      const updatedTracks = animation.tracks
        .map((track) => {
          if (track.property !== action.property) return track;
          return {
            ...track,
            keyframes: track.keyframes.filter((kf) => kf.id !== action.keyframeId),
          };
        })
        .filter((track) => track.keyframes.length > 0);

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            tracks: updatedTracks,
          },
        },
      };
    }

    case 'DELETE_TRACK': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            tracks: animation.tracks.filter((t) => t.property !== action.property),
          },
        },
      };
    }

    case 'DELETE_ALL_KEYFRAMES': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            tracks: [],
          },
        },
        timeline: {
          ...state.timeline,
          selectedKeyframeIds: [],
        },
      };
    }

    case 'UPDATE_CLIP': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            ...action.updates,
          },
        },
      };
    }

    case 'SPLIT_CLIP': {
      const animation = state.animations[action.elementId];
      if (!animation) return state;

      const splitTime = action.time;
      const clipStart = animation.clipStart;
      const clipEnd = clipStart + animation.clipDuration;

      if (splitTime <= clipStart || splitTime >= clipEnd) return state;

      const firstClipDuration = splitTime - clipStart;
      const secondClipDuration = clipEnd - splitTime;

      const secondClipTracks = animation.tracks.map((track) => ({
        ...track,
        keyframes: track.keyframes
          .filter((kf) => kf.time >= splitTime)
          .map((kf) => ({
            ...kf,
            id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            time: kf.time - splitTime + clipStart,
          })),
      })).filter((track) => track.keyframes.length > 0);

      return {
        ...state,
        animations: {
          ...state.animations,
          [action.elementId]: {
            ...animation,
            clipDuration: firstClipDuration,
            tracks: animation.tracks.map((track) => ({
              ...track,
              keyframes: track.keyframes.filter((kf) => kf.time <= splitTime),
            })),
          },
        },
      };
    }

    case 'LOAD_ANIMATIONS':
      return {
        ...state,
        animations: action.animations,
      };

    case 'RESET_TIMELINE':
      return {
        ...state,
        timeline: DEFAULT_TIMELINE_STATE,
      };

    case 'CREATE_SEQUENCE': {
      const { sequence } = action;
      return {
        ...state,
        sequences: {
          ...state.sequences,
          [sequence.id]: sequence,
        },
        activeSequenceId: sequence.id,
        timeline: {
          ...state.timeline,
          duration: sequence.duration,
          fps: sequence.frameRate,
          currentTime: 0,
          currentFrame: 0,
        },
      };
    }

    case 'UPDATE_SEQUENCE': {
      const sequence = state.sequences[action.sequenceId];
      if (!sequence) return state;

      const updatedSequence = {
        ...sequence,
        ...action.updates,
        updatedAt: Date.now(),
      };

      const newState = {
        ...state,
        sequences: {
          ...state.sequences,
          [action.sequenceId]: updatedSequence,
        },
      };

      if (state.activeSequenceId === action.sequenceId) {
        newState.timeline = {
          ...state.timeline,
          duration: updatedSequence.duration,
          fps: updatedSequence.frameRate,
        };
      }

      return newState;
    }

    case 'DELETE_SEQUENCE': {
      const { [action.sequenceId]: deleted, ...remainingSequences } = state.sequences;
      return {
        ...state,
        sequences: remainingSequences,
        activeSequenceId: state.activeSequenceId === action.sequenceId ? null : state.activeSequenceId,
      };
    }

    case 'SET_ACTIVE_SEQUENCE': {
      if (!action.sequenceId) {
        return {
          ...state,
          activeSequenceId: null,
        };
      }

      const sequence = state.sequences[action.sequenceId];
      if (!sequence) return state;

      return {
        ...state,
        activeSequenceId: action.sequenceId,
        timeline: {
          ...state.timeline,
          duration: sequence.duration,
          fps: sequence.frameRate,
          currentTime: 0,
          currentFrame: 0,
        },
      };
    }

    case 'STEP_FRAME': {
      const { fps, currentFrame, duration } = state.timeline;
      const totalFrames = Math.ceil(duration * fps);
      let newFrame: number;

      if (action.direction === 'forward') {
        newFrame = Math.min(currentFrame + 1, totalFrames - 1);
      } else {
        newFrame = Math.max(currentFrame - 1, 0);
      }

      const newTime = getFrameTime(fps, newFrame);
      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentFrame: newFrame,
          currentTime: newTime,
        },
      };
    }

    case 'ADD_MARKER':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          markers: [...state.timeline.markers, action.marker],
        },
      };

    case 'UPDATE_MARKER': {
      const markers = state.timeline.markers.map(marker =>
        marker.id === action.markerId
          ? { ...marker, ...action.updates }
          : marker
      );
      return {
        ...state,
        timeline: { ...state.timeline, markers },
      };
    }

    case 'DELETE_MARKER': {
      const markers = state.timeline.markers.filter(marker => marker.id !== action.markerId);
      return {
        ...state,
        timeline: { ...state.timeline, markers },
      };
    }

    case 'TOGGLE_SNAP_TO_MARKERS':
      return {
        ...state,
        timeline: { ...state.timeline, snapToMarkers: action.enabled },
      };

    default:
      return state;
  }
}

interface AnimationContextValue {
  state: AnimationState;
  setCurrentTime: (time: number) => void;
  setCurrentFrame: (frame: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setLoop: (loop: boolean) => void;
  setPixelsPerSecond: (pps: number) => void;
  selectClip: (clipId: string | null) => void;
  selectKeyframes: (keyframeIds: string[]) => void;
  initAnimation: (elementId: string) => void;
  removeAnimation: (elementId: string) => void;
  addKeyframe: (elementId: string, property: AnimatableProperty, time: number, value: number | string, easing?: EasingType) => void;
  updateKeyframe: (elementId: string, property: AnimatableProperty, keyframeId: string, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (elementId: string, property: AnimatableProperty, keyframeId: string) => void;
  deleteTrack: (elementId: string, property: AnimatableProperty) => void;
  deleteAllKeyframes: (elementId: string) => void;
  updateClip: (elementId: string, updates: Partial<ElementAnimation>) => void;
  splitClip: (elementId: string, time: number) => void;
  loadAnimations: (animations: Record<string, ElementAnimation>) => void;
  getAnimatedElementState: (element: DesignElement) => Partial<DesignElement>;
  hasKeyframesForProperty: (elementId: string, property: AnimatableProperty) => boolean;
  getTrack: (elementId: string, property: AnimatableProperty) => PropertyTrack | null;
  createSequence: (name: string, frameRate: number, duration: number, canvasId: string) => Sequence;
  updateSequence: (sequenceId: string, updates: Partial<Sequence>) => void;
  deleteSequence: (sequenceId: string) => void;
  setActiveSequence: (sequenceId: string | null) => void;
  stepFrame: (direction: 'forward' | 'backward') => void;
  getActiveSequence: () => Sequence | null;
  computeAnimatedPropertiesAtTime: (element: DesignElement, time: number) => Partial<DesignElement>;
  addMarker: (time: number, name?: string, color?: string) => void;
  updateMarker: (markerId: string, updates: Partial<TimelineMarker>) => void;
  deleteMarker: (markerId: string) => void;
  toggleSnapToMarkers: (enabled: boolean) => void;
  getMarkerAtTime: (time: number, threshold?: number) => TimelineMarker | null;
  updateKeyframesAtCurrentTime: (elementId: string, updates: Partial<DesignElement>) => boolean;
}

const AnimationContext = createContext<AnimationContextValue | null>(null);

const initialState: AnimationState = {
  animations: {},
  timeline: DEFAULT_TIMELINE_STATE,
  sequences: {},
  activeSequenceId: null,
};

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(animationReducer, initialState);

  const setCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', time });
  }, []);

  const setCurrentFrame = useCallback((frame: number) => {
    dispatch({ type: 'SET_CURRENT_FRAME', frame });
  }, []);

  const setPlaying = useCallback((isPlaying: boolean) => {
    dispatch({ type: 'SET_PLAYING', isPlaying });
  }, []);

  const setDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_DURATION', duration });
  }, []);

  const setFps = useCallback((fps: number) => {
    dispatch({ type: 'SET_FPS', fps });
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    dispatch({ type: 'SET_LOOP', loop });
  }, []);

  const setPixelsPerSecond = useCallback((pixelsPerSecond: number) => {
    dispatch({ type: 'SET_PIXELS_PER_SECOND', pixelsPerSecond });
  }, []);

  const selectClip = useCallback((clipId: string | null) => {
    dispatch({ type: 'SELECT_CLIP', clipId });
  }, []);

  const selectKeyframes = useCallback((keyframeIds: string[]) => {
    dispatch({ type: 'SELECT_KEYFRAMES', keyframeIds });
  }, []);

  const initAnimation = useCallback((elementId: string) => {
    dispatch({ type: 'INIT_ANIMATION', elementId });
  }, []);

  const removeAnimation = useCallback((elementId: string) => {
    dispatch({ type: 'REMOVE_ANIMATION', elementId });
  }, []);

  const addKeyframe = useCallback(
    (elementId: string, property: AnimatableProperty, time: number, value: number | string, easing: EasingType = 'ease-out') => {
      const keyframe = createKeyframe(time, value, easing);
      dispatch({ type: 'ADD_KEYFRAME', elementId, property, keyframe });
    },
    []
  );

  const updateKeyframe = useCallback(
    (elementId: string, property: AnimatableProperty, keyframeId: string, updates: Partial<Keyframe>) => {
      dispatch({ type: 'UPDATE_KEYFRAME', elementId, property, keyframeId, updates });
    },
    []
  );

  const deleteKeyframe = useCallback((elementId: string, property: AnimatableProperty, keyframeId: string) => {
    dispatch({ type: 'DELETE_KEYFRAME', elementId, property, keyframeId });
  }, []);

  const deleteTrack = useCallback((elementId: string, property: AnimatableProperty) => {
    dispatch({ type: 'DELETE_TRACK', elementId, property });
  }, []);

  const deleteAllKeyframes = useCallback((elementId: string) => {
    dispatch({ type: 'DELETE_ALL_KEYFRAMES', elementId });
  }, []);

  const updateClip = useCallback((elementId: string, updates: Partial<ElementAnimation>) => {
    dispatch({ type: 'UPDATE_CLIP', elementId, updates });
  }, []);

  const splitClip = useCallback((elementId: string, time: number) => {
    dispatch({ type: 'SPLIT_CLIP', elementId, time });
  }, []);

  const loadAnimations = useCallback((animations: Record<string, ElementAnimation>) => {
    dispatch({ type: 'LOAD_ANIMATIONS', animations });
  }, []);

  const getAnimatedElementState = useCallback(
    (element: DesignElement): Partial<DesignElement> => {
      const animation = state.animations[element.id];
      if (!animation || animation.muted) {
        return {};
      }

      const { currentTime } = state.timeline;
      const animatedProps: Partial<DesignElement> = {};

      for (const track of animation.tracks) {
        if (!track.enabled || track.keyframes.length === 0) continue;

        const value = getAnimatedValue(animation.tracks, track.property, currentTime);
        if (value !== null) {
          switch (track.property) {
            case 'x':
              animatedProps.x = value as number;
              break;
            case 'y':
              animatedProps.y = value as number;
              break;
            case 'width':
              animatedProps.width = value as number;
              break;
            case 'height':
              animatedProps.height = value as number;
              break;
            case 'rotation':
              animatedProps.rotation = value as number;
              break;
            case 'opacity':
              animatedProps.opacity = value as number;
              break;
            case 'fill':
              animatedProps.fill = value as string;
              break;
            case 'stroke':
              animatedProps.stroke = value as string;
              break;
            case 'strokeWidth':
              animatedProps.strokeWidth = value as number;
              break;
            case 'borderRadius':
              animatedProps.borderRadius = value as number;
              break;
            case 'shadowBlur':
              animatedProps.shadow = { ...element.shadow, blur: value as number };
              break;
            case 'shadowX':
              animatedProps.shadow = { ...element.shadow, x: value as number };
              break;
            case 'shadowY':
              animatedProps.shadow = { ...element.shadow, y: value as number };
              break;
            case 'fontSize':
              animatedProps.fontSize = value as number;
              break;
            case 'letterSpacing':
              animatedProps.letterSpacing = value as number;
              break;
          }
        }
      }

      return animatedProps;
    },
    [state.animations, state.timeline.currentTime]
  );

  const hasKeyframesForProperty = useCallback(
    (elementId: string, property: AnimatableProperty): boolean => {
      const animation = state.animations[elementId];
      if (!animation) return false;
      const track = animation.tracks.find((t) => t.property === property);
      return track ? track.keyframes.length > 0 : false;
    },
    [state.animations]
  );

  const getTrack = useCallback(
    (elementId: string, property: AnimatableProperty): PropertyTrack | null => {
      const animation = state.animations[elementId];
      if (!animation) return null;
      return animation.tracks.find((t) => t.property === property) || null;
    },
    [state.animations]
  );

  const createSequence = useCallback(
    (name: string, frameRate: number, duration: number, canvasId: string): Sequence => {
      const sequence = createSequenceHelper(name, frameRate, duration, canvasId);
      dispatch({ type: 'CREATE_SEQUENCE', sequence });
      return sequence;
    },
    []
  );

  const updateSequence = useCallback((sequenceId: string, updates: Partial<Sequence>) => {
    dispatch({ type: 'UPDATE_SEQUENCE', sequenceId, updates });
  }, []);

  const deleteSequence = useCallback((sequenceId: string) => {
    dispatch({ type: 'DELETE_SEQUENCE', sequenceId });
  }, []);

  const setActiveSequence = useCallback((sequenceId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_SEQUENCE', sequenceId });
  }, []);

  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    dispatch({ type: 'STEP_FRAME', direction });
  }, []);

  const getActiveSequence = useCallback((): Sequence | null => {
    if (!state.activeSequenceId) return null;
    return state.sequences[state.activeSequenceId] || null;
  }, [state.activeSequenceId, state.sequences]);

  const computeAnimatedPropertiesAtTime = useCallback(
    (element: DesignElement, time: number): Partial<DesignElement> => {
      const animation = state.animations[element.id];
      if (!animation || animation.muted) {
        return {};
      }

      const animatedProps: Partial<DesignElement> = {};

      for (const track of animation.tracks) {
        if (!track.enabled || track.keyframes.length === 0) continue;

        const value = getAnimatedValue(animation.tracks, track.property, time);
        if (value !== null) {
          switch (track.property) {
            case 'x':
              animatedProps.x = value as number;
              break;
            case 'y':
              animatedProps.y = value as number;
              break;
            case 'width':
              animatedProps.width = value as number;
              break;
            case 'height':
              animatedProps.height = value as number;
              break;
            case 'rotation':
              animatedProps.rotation = value as number;
              break;
            case 'opacity':
              animatedProps.opacity = value as number;
              break;
            case 'fill':
              animatedProps.fill = value as string;
              break;
            case 'stroke':
              animatedProps.stroke = value as string;
              break;
            case 'strokeWidth':
              animatedProps.strokeWidth = value as number;
              break;
            case 'borderRadius':
              animatedProps.borderRadius = value as number;
              break;
            case 'shadowBlur':
              animatedProps.shadow = { ...element.shadow, blur: value as number };
              break;
            case 'shadowX':
              animatedProps.shadow = { ...element.shadow, x: value as number };
              break;
            case 'shadowY':
              animatedProps.shadow = { ...element.shadow, y: value as number };
              break;
            case 'fontSize':
              animatedProps.fontSize = value as number;
              break;
            case 'letterSpacing':
              animatedProps.letterSpacing = value as number;
              break;
          }
        }
      }

      return animatedProps;
    },
    [state.animations]
  );

  const addMarker = useCallback((time: number, name?: string, color?: string) => {
    const marker = createMarker(time, name, color);
    dispatch({ type: 'ADD_MARKER', marker });
  }, []);

  const updateMarker = useCallback((markerId: string, updates: Partial<TimelineMarker>) => {
    dispatch({ type: 'UPDATE_MARKER', markerId, updates });
  }, []);

  const deleteMarker = useCallback((markerId: string) => {
    dispatch({ type: 'DELETE_MARKER', markerId });
  }, []);

  const toggleSnapToMarkers = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_SNAP_TO_MARKERS', enabled });
  }, []);

  const getMarkerAtTime = useCallback((time: number, threshold: number = 0.1): TimelineMarker | null => {
    const markers = state.timeline.markers;
    for (const marker of markers) {
      if (Math.abs(marker.time - time) <= threshold) {
        return marker;
      }
    }
    return null;
  }, [state.timeline.markers]);

  const updateKeyframesAtCurrentTime = useCallback((elementId: string, updates: Partial<DesignElement>): boolean => {
    const animation = state.animations[elementId];
    if (!animation) return false;

    const currentTime = state.timeline.currentTime;
    const threshold = 0.016;
    let updatedAny = false;

    const propertyMapping: Record<string, AnimatableProperty> = {
      x: 'x',
      y: 'y',
      width: 'width',
      height: 'height',
      rotation: 'rotation',
      opacity: 'opacity',
      fill: 'fill',
      stroke: 'stroke',
      strokeWidth: 'strokeWidth',
      borderRadius: 'borderRadius',
      fontSize: 'fontSize',
      letterSpacing: 'letterSpacing',
    };

    Object.entries(updates).forEach(([key, value]) => {
      const animatableProp = propertyMapping[key];
      if (!animatableProp || value === undefined) return;

      const track = animation.tracks.find(t => t.property === animatableProp);
      if (!track) return;

      const keyframeAtCurrentTime = track.keyframes.find(
        kf => Math.abs(kf.time - currentTime) <= threshold
      );

      if (keyframeAtCurrentTime) {
        let keyframeValue = value;
        if (key === 'shadowBlur' && typeof updates.shadow === 'object' && updates.shadow) {
          keyframeValue = updates.shadow.blur;
        } else if (key === 'shadowX' && typeof updates.shadow === 'object' && updates.shadow) {
          keyframeValue = updates.shadow.x;
        } else if (key === 'shadowY' && typeof updates.shadow === 'object' && updates.shadow) {
          keyframeValue = updates.shadow.y;
        }

        updateKeyframe(elementId, animatableProp, keyframeAtCurrentTime.id, { value: keyframeValue });
        updatedAny = true;
      }
    });

    if (updates.shadow && typeof updates.shadow === 'object') {
      ['shadowBlur', 'shadowX', 'shadowY'].forEach((shadowProp) => {
        const animatableProp = propertyMapping[shadowProp];
        if (!animatableProp) return;

        const track = animation.tracks.find(t => t.property === animatableProp);
        if (!track) return;

        const keyframeAtCurrentTime = track.keyframes.find(
          kf => Math.abs(kf.time - currentTime) <= threshold
        );

        if (keyframeAtCurrentTime && updates.shadow) {
          let value: number | undefined;
          if (shadowProp === 'shadowBlur') value = updates.shadow.blur;
          else if (shadowProp === 'shadowX') value = updates.shadow.x;
          else if (shadowProp === 'shadowY') value = updates.shadow.y;

          if (value !== undefined) {
            updateKeyframe(elementId, animatableProp, keyframeAtCurrentTime.id, { value });
            updatedAny = true;
          }
        }
      });
    }

    return updatedAny;
  }, [state.animations, state.timeline.currentTime, updateKeyframe]);

  const value = useMemo(
    () => ({
      state,
      setCurrentTime,
      setCurrentFrame,
      setPlaying,
      setDuration,
      setFps,
      setLoop,
      setPixelsPerSecond,
      selectClip,
      selectKeyframes,
      initAnimation,
      removeAnimation,
      addKeyframe,
      updateKeyframe,
      deleteKeyframe,
      deleteTrack,
      deleteAllKeyframes,
      updateClip,
      splitClip,
      loadAnimations,
      getAnimatedElementState,
      hasKeyframesForProperty,
      getTrack,
      createSequence,
      updateSequence,
      deleteSequence,
      setActiveSequence,
      stepFrame,
      getActiveSequence,
      computeAnimatedPropertiesAtTime,
      addMarker,
      updateMarker,
      deleteMarker,
      toggleSnapToMarkers,
      getMarkerAtTime,
      updateKeyframesAtCurrentTime,
    }),
    [
      state,
      setCurrentTime,
      setCurrentFrame,
      setPlaying,
      setDuration,
      setFps,
      setLoop,
      setPixelsPerSecond,
      selectClip,
      selectKeyframes,
      initAnimation,
      removeAnimation,
      addKeyframe,
      updateKeyframe,
      deleteKeyframe,
      deleteTrack,
      deleteAllKeyframes,
      updateClip,
      splitClip,
      loadAnimations,
      getAnimatedElementState,
      hasKeyframesForProperty,
      getTrack,
      createSequence,
      updateSequence,
      deleteSequence,
      setActiveSequence,
      stepFrame,
      getActiveSequence,
      computeAnimatedPropertiesAtTime,
      addMarker,
      updateMarker,
      deleteMarker,
      toggleSnapToMarkers,
      getMarkerAtTime,
      updateKeyframesAtCurrentTime,
    ]
  );

  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>;
}

export function useAnimation(): AnimationContextValue {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}

export { AnimationContext };
