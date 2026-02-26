import { useRef, useCallback, useEffect } from 'react';
import { useAnimation } from './AnimationContext';
import { PlaybackScheduler } from '../engine/core/PlaybackScheduler';

interface UsePlaybackReturn {
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  seekToFrame: (frame: number) => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  isPlaying: boolean;
  currentTime: number;
  currentFrame: number;
  totalFrames: number;
  duration: number;
  fps: number;
}

export function usePlayback(): UsePlaybackReturn {
  const { state, setCurrentTime, setCurrentFrame, setPlaying } = useAnimation();
  const { currentTime, currentFrame, duration, fps, isPlaying, loop } = state.timeline;
  const totalFrames = Math.ceil(duration * fps);

  const schedulerRef = useRef<PlaybackScheduler | null>(null);
  const setCurrentTimeRef = useRef(setCurrentTime);
  const setPlayingRef = useRef(setPlaying);

  setCurrentTimeRef.current = setCurrentTime;
  setPlayingRef.current = setPlaying;

  if (!schedulerRef.current) {
    schedulerRef.current = new PlaybackScheduler(
      { fps, duration, loop },
      {
        onFrame: (time) => {
          setCurrentTimeRef.current(time);
        },
        onStateChange: (newState) => {
          setPlayingRef.current(newState === 'playing');
        },
        onComplete: () => {
          setPlayingRef.current(false);
        },
      }
    );
  }

  useEffect(() => {
    schedulerRef.current?.updateConfig({ fps, duration, loop });
    schedulerRef.current?.setLoop(loop);
  }, [fps, duration, loop]);

  useEffect(() => {
    return () => {
      schedulerRef.current?.destroy();
    };
  }, []);

  const play = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;
    scheduler.seek(state.timeline.currentTime);
    scheduler.play();
  }, [state.timeline.currentTime]);

  const pause = useCallback(() => {
    schedulerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    schedulerRef.current?.stop();
  }, []);

  const togglePlay = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    if (scheduler.getState() === 'playing') {
      scheduler.pause();
    } else {
      if (scheduler.getCurrentTime() >= duration) {
        scheduler.seek(0);
      }
      scheduler.play();
    }
  }, [duration]);

  const seekTo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    schedulerRef.current?.seek(clamped);
    setCurrentTime(clamped);
  }, [duration, setCurrentTime]);

  const seekToStart = useCallback(() => {
    schedulerRef.current?.seek(0);
    setCurrentTime(0);
  }, [setCurrentTime]);

  const seekToEnd = useCallback(() => {
    schedulerRef.current?.seek(duration);
    setCurrentTime(duration);
    if (schedulerRef.current?.getState() === 'playing') {
      schedulerRef.current.pause();
    }
  }, [duration, setCurrentTime]);

  const seekToFrame = useCallback((frame: number) => {
    const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));
    const time = clampedFrame / fps;
    schedulerRef.current?.seek(time);
    setCurrentFrame(clampedFrame);
  }, [totalFrames, fps, setCurrentFrame]);

  const stepForward = useCallback(() => {
    schedulerRef.current?.stepForward();
    const newFrame = Math.min(currentFrame + 1, totalFrames - 1);
    setCurrentFrame(newFrame);
  }, [currentFrame, totalFrames, setCurrentFrame]);

  const stepBackward = useCallback(() => {
    schedulerRef.current?.stepBackward();
    const newFrame = Math.max(currentFrame - 1, 0);
    setCurrentFrame(newFrame);
  }, [currentFrame, setCurrentFrame]);

  return {
    play,
    pause,
    stop,
    togglePlay,
    seekTo,
    seekToFrame,
    seekToStart,
    seekToEnd,
    stepForward,
    stepBackward,
    isPlaying,
    currentTime,
    currentFrame,
    totalFrames,
    duration,
    fps,
  };
}
