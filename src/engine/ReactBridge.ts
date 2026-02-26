import { useRef, useCallback, useEffect, useMemo } from 'react';
import { TimelineEngine } from './core/TimelineEngine';
import { PlaybackScheduler } from './core/PlaybackScheduler';
import { RenderPipeline } from './renderer/RenderPipeline';
import { ExportPipeline } from './export/ExportPipeline';
import type {
  RenderElement, RenderFrame, TimelineConfig,
  AnimatableProperty, EngineKeyframe, PlaybackState,
} from './core/types';
import type { ExportConfig, ExportProgress } from './export/ExportPipeline';
import type { DesignElement } from '../types/design';
import type { ElementAnimation } from '../animation-engine/types';

export function designElementToRenderElement(el: DesignElement): RenderElement {
  return {
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    opacity: el.opacity,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    borderRadius: el.borderRadius,
    scaleX: 1,
    scaleY: 1,
    shadow: el.shadow ? { ...el.shadow } : undefined,
    text: el.text,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    textAlign: el.textAlign,
    letterSpacing: el.letterSpacing,
    lineHeight: el.lineHeight,
    imageData: el.imageData,
    blendMode: el.blendMode,
    points: el.points,
    lineType: el.lineType,
    arrowStart: el.arrowStart,
    arrowEnd: el.arrowEnd,
    children: el.children?.map(designElementToRenderElement),
    visible: el.visible,
    locked: el.locked,
    materialConfig: el.materialConfig,
    cornerRadius: el.cornerRadius,
    name: el.name,
  };
}

export function animationsToEngineClips(
  animations: Record<string, ElementAnimation>
): Record<string, {
  elementId: string;
  tracks: Array<{
    property: AnimatableProperty;
    keyframes: EngineKeyframe[];
    enabled: boolean;
  }>;
  clipStart: number;
  clipDuration: number;
  locked: boolean;
  muted: boolean;
}> {
  const result: Record<string, {
    elementId: string;
    tracks: Array<{
      property: AnimatableProperty;
      keyframes: EngineKeyframe[];
      enabled: boolean;
    }>;
    clipStart: number;
    clipDuration: number;
    locked: boolean;
    muted: boolean;
  }> = {};

  for (const key of Object.keys(animations)) {
    const anim = animations[key];
    result[key] = {
      elementId: anim.elementId,
      tracks: anim.tracks.map((t) => ({
        property: t.property as AnimatableProperty,
        keyframes: t.keyframes.map((kf) => ({
          id: kf.id,
          time: kf.time,
          value: kf.value,
          easing: kf.easing,
          handleIn: kf.handleIn,
          handleOut: kf.handleOut,
        })),
        enabled: t.enabled,
      })),
      clipStart: anim.clipStart,
      clipDuration: anim.clipDuration,
      locked: anim.locked,
      muted: anim.muted,
    };
  }

  return result;
}

export interface UseEngineOptions {
  fps: number;
  duration: number;
  loop: boolean;
  onTimeUpdate?: (time: number, frame: number) => void;
  onStateChange?: (state: PlaybackState) => void;
  onComplete?: () => void;
}

export interface EngineHandle {
  timeline: TimelineEngine;
  renderer: RenderPipeline;
  scheduler: PlaybackScheduler;
  exporter: ExportPipeline;

  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekToFrame: (frame: number) => void;
  stepForward: () => void;
  stepBackward: () => void;

  syncAnimations: (animations: Record<string, ElementAnimation>) => void;
  resolveFrame: (
    time: number,
    elements: DesignElement[],
    width: number,
    height: number,
    background?: RenderFrame['background']
  ) => RenderFrame;
  getAnimatedState: (time: number) => Map<string, Record<string, number | string | undefined>>;

  exportVideo: (
    config: ExportConfig,
    elements: DesignElement[],
    background: RenderFrame['background'],
    onProgress?: (progress: ExportProgress) => void
  ) => Promise<Blob>;
}

export function useEngine(options: UseEngineOptions): EngineHandle {
  const timelineRef = useRef<TimelineEngine | null>(null);
  const schedulerRef = useRef<PlaybackScheduler | null>(null);
  const rendererRef = useRef<RenderPipeline | null>(null);
  const exporterRef = useRef<ExportPipeline | null>(null);

  const callbacksRef = useRef({
    onTimeUpdate: options.onTimeUpdate,
    onStateChange: options.onStateChange,
    onComplete: options.onComplete,
  });

  callbacksRef.current.onTimeUpdate = options.onTimeUpdate;
  callbacksRef.current.onStateChange = options.onStateChange;
  callbacksRef.current.onComplete = options.onComplete;

  if (!timelineRef.current) {
    timelineRef.current = new TimelineEngine({
      fps: options.fps,
      duration: options.duration,
      loop: options.loop,
    });
  }

  if (!rendererRef.current) {
    rendererRef.current = new RenderPipeline();
  }

  if (!schedulerRef.current) {
    schedulerRef.current = new PlaybackScheduler(
      { fps: options.fps, duration: options.duration, loop: options.loop },
      {
        onFrame: (time, frame) => callbacksRef.current.onTimeUpdate?.(time, frame),
        onStateChange: (state) => callbacksRef.current.onStateChange?.(state),
        onComplete: () => callbacksRef.current.onComplete?.(),
      }
    );
  }

  if (!exporterRef.current) {
    exporterRef.current = new ExportPipeline(timelineRef.current, rendererRef.current);
  }

  useEffect(() => {
    const config: Partial<TimelineConfig> = {
      fps: options.fps,
      duration: options.duration,
      loop: options.loop,
    };
    timelineRef.current?.setConfig(config);
    schedulerRef.current?.updateConfig(config);
    schedulerRef.current?.setLoop(options.loop);
  }, [options.fps, options.duration, options.loop]);

  useEffect(() => {
    return () => {
      schedulerRef.current?.destroy();
      rendererRef.current?.destroy();
      timelineRef.current?.destroy();
    };
  }, []);

  const play = useCallback(() => schedulerRef.current?.play(), []);
  const pause = useCallback(() => schedulerRef.current?.pause(), []);
  const stop = useCallback(() => schedulerRef.current?.stop(), []);

  const togglePlay = useCallback(() => {
    const s = schedulerRef.current;
    if (!s) return;
    if (s.getState() === 'playing') s.pause();
    else s.play();
  }, []);

  const seek = useCallback((time: number) => schedulerRef.current?.seek(time), []);
  const seekToFrame = useCallback((frame: number) => schedulerRef.current?.seekToFrame(frame), []);
  const stepForward = useCallback(() => schedulerRef.current?.stepForward(), []);
  const stepBackward = useCallback(() => schedulerRef.current?.stepBackward(), []);

  const syncAnimations = useCallback((animations: Record<string, ElementAnimation>) => {
    const clips = animationsToEngineClips(animations);
    timelineRef.current?.loadClipsFromAnimations(clips);
  }, []);

  const resolveFrame = useCallback((
    time: number,
    elements: DesignElement[],
    width: number,
    height: number,
    background?: RenderFrame['background']
  ): RenderFrame => {
    const renderElements = elements.map(designElementToRenderElement);
    return timelineRef.current!.resolveFrame(time, renderElements, width, height, background);
  }, []);

  const getAnimatedState = useCallback((time: number) => {
    return timelineRef.current!.getStateAtTime(time);
  }, []);

  const exportVideo = useCallback(async (
    config: ExportConfig,
    elements: DesignElement[],
    background: RenderFrame['background'],
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> => {
    const renderElements = elements.map(designElementToRenderElement);
    return exporterRef.current!.exportVideo(config, renderElements, background, onProgress);
  }, []);

  return useMemo(() => ({
    timeline: timelineRef.current!,
    renderer: rendererRef.current!,
    scheduler: schedulerRef.current!,
    exporter: exporterRef.current!,
    play, pause, stop, togglePlay,
    seek, seekToFrame, stepForward, stepBackward,
    syncAnimations, resolveFrame, getAnimatedState, exportVideo,
  }), [
    play, pause, stop, togglePlay,
    seek, seekToFrame, stepForward, stepBackward,
    syncAnimations, resolveFrame, getAnimatedState, exportVideo,
  ]);
}
