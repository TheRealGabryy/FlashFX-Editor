import { useRef, useCallback, useEffect } from 'react';
import { useAnimation } from './AnimationContext';

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
  const { state, setCurrentTime, setCurrentFrame, setPlaying, stepFrame } = useAnimation();
  const { currentTime, currentFrame, duration, fps, isPlaying, loop } = state.timeline;
  const totalFrames = Math.ceil(duration * fps);

  // Use refs to store internal state that doesn't trigger re-renders
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const internalTimeRef = useRef<number>(currentTime);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const durationRef = useRef<number>(duration);
  const loopRef = useRef<boolean>(loop);
  const fpsRef = useRef<number>(fps);

  // Sync refs when props change (from external seeking, sequence changes, etc.)
  useEffect(() => {
    internalTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);

  const play = useCallback(() => {
    setPlaying(true);
  }, [setPlaying]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [setPlaying]);

  const stop = useCallback(() => {
    setPlaying(false);
    internalTimeRef.current = 0;
    setCurrentTime(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [setPlaying, setCurrentTime]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      // If at the end, restart from beginning
      if (internalTimeRef.current >= durationRef.current) {
        internalTimeRef.current = 0;
        setCurrentTime(0);
      }
      play();
    }
  }, [play, pause, setCurrentTime]);

  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, durationRef.current));
    internalTimeRef.current = clampedTime;
    setCurrentTime(clampedTime);
  }, [setCurrentTime]);

  const seekToStart = useCallback(() => {
    internalTimeRef.current = 0;
    setCurrentTime(0);
  }, [setCurrentTime]);

  const seekToEnd = useCallback(() => {
    internalTimeRef.current = durationRef.current;
    setCurrentTime(durationRef.current);
    if (isPlayingRef.current) {
      pause();
    }
  }, [setCurrentTime, pause]);

  const seekToFrame = useCallback((frame: number) => {
    const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));
    setCurrentFrame(clampedFrame);
    // Also update internal time ref
    const newTime = clampedFrame / fpsRef.current;
    internalTimeRef.current = newTime;
  }, [totalFrames, setCurrentFrame]);

  const stepForward = useCallback(() => {
    stepFrame('forward');
    // Sync internal time with new frame
    const newFrame = Math.min(currentFrame + 1, totalFrames - 1);
    internalTimeRef.current = newFrame / fpsRef.current;
  }, [stepFrame, currentFrame, totalFrames]);

  const stepBackward = useCallback(() => {
    stepFrame('backward');
    // Sync internal time with new frame
    const newFrame = Math.max(currentFrame - 1, 0);
    internalTimeRef.current = newFrame / fpsRef.current;
  }, [stepFrame, currentFrame]);

  // The main animation loop - runs independently of React's render cycle
  useEffect(() => {
    if (!isPlaying) {
      // Clean up when not playing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Initialize timestamp on play
    lastTimestampRef.current = performance.now();

    const animate = (timestamp: number) => {
      // Check if still playing (using ref to avoid stale closure)
      if (!isPlayingRef.current) {
        animationFrameRef.current = null;
        return;
      }

      // Calculate delta time in seconds
      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      const deltaSeconds = deltaMs / 1000;

      // Update internal time
      let newTime = internalTimeRef.current + deltaSeconds;

      // Handle end of timeline
      if (newTime >= durationRef.current) {
        if (loopRef.current) {
          // Loop back to start
          newTime = 0;
          internalTimeRef.current = 0;
          setCurrentTime(0);
        } else {
          // Stop at end
          newTime = durationRef.current;
          internalTimeRef.current = durationRef.current;
          setCurrentTime(durationRef.current);
          setPlaying(false);
          animationFrameRef.current = null;
          return;
        }
      } else {
        // Normal progression
        internalTimeRef.current = newTime;
        setCurrentTime(newTime);
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, setCurrentTime, setPlaying]);
  // NOTE: Deliberately NOT including currentTime, duration, loop, fps in dependencies
  // They are tracked via refs to avoid restarting the animation loop

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
