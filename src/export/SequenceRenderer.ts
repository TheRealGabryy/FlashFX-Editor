import { toPng } from 'html-to-image';

export interface SequenceRenderConfig {
  fps: number;
  duration: number;
  width: number;
  height: number;
}

export interface SequenceRenderProgress {
  status: 'idle' | 'preparing' | 'rendering' | 'encoding' | 'completed' | 'error';
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
  message: string;
  startTime: number | null;
}

export class SequenceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private capturedFrames: Blob[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async renderSequence(
    config: SequenceRenderConfig,
    artboardElement: HTMLElement,
    onSeekToTime: (time: number) => Promise<void>,
    onProgress: (progress: SequenceRenderProgress) => void
  ): Promise<Blob> {
    const totalFrames = Math.ceil(config.duration * config.fps);
    const frameDuration = 1 / config.fps;
    const startTime = Date.now();

    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.capturedFrames = [];

    const updateProgress = (
      status: SequenceRenderProgress['status'],
      currentFrame: number,
      message: string
    ) => {
      const elapsed = (Date.now() - startTime) / 1000;
      const framesPerSecond = currentFrame > 0 ? currentFrame / elapsed : 0;
      const remainingFrames = totalFrames - currentFrame;
      const estimatedTimeRemaining = framesPerSecond > 0
        ? remainingFrames / framesPerSecond
        : 0;

      onProgress({
        status,
        currentFrame,
        totalFrames,
        percentage: Math.round((currentFrame / totalFrames) * 100),
        estimatedTimeRemaining,
        message,
        startTime,
      });
    };

    try {
      updateProgress('preparing', 0, 'Preparing sequence...');

      updateProgress('rendering', 0, 'Capturing frames...');

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const time = frameIndex * frameDuration;

        await onSeekToTime(time);

        await new Promise(resolve => setTimeout(resolve, 50));

        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

        const dataUrl = await toPng(artboardElement, {
          width: config.width,
          height: config.height,
          pixelRatio: 1,
          cacheBust: true,
        });

        const blob = await (await fetch(dataUrl)).blob();
        this.capturedFrames.push(blob);

        updateProgress(
          'rendering',
          frameIndex + 1,
          `Captured frame ${frameIndex + 1} of ${totalFrames}`
        );

        if (frameIndex % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      updateProgress('encoding', totalFrames, 'Encoding phase started, all frames will be composed into a WebM video ready to download...');

      const videoBlob = await this.encodeFramesToVideo(this.capturedFrames, config);

      updateProgress('completed', totalFrames, 'Render complete!');

      return videoBlob;
    } catch (error) {
      updateProgress('error', 0, error instanceof Error ? error.message : 'Render failed');
      throw error;
    }
  }

  private async encodeFramesToVideo(
    frames: Blob[],
    config: SequenceRenderConfig
  ): Promise<Blob> {
    this.canvas.width = config.width;
    this.canvas.height = config.height;

    const stream = this.canvas.captureStream(config.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000,
    });

    this.recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    return new Promise(async (resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.onerror = (e) => {
        reject(new Error('MediaRecorder error'));
      };

      mediaRecorder.start();

      const frameDuration = 1000 / config.fps;

      for (let i = 0; i < frames.length; i++) {
        const frameBlob = frames[i];
        const img = await this.loadImage(URL.createObjectURL(frameBlob));

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, config.width, config.height);

        const track = stream.getVideoTracks()[0];
        if (track && 'requestFrame' in track) {
          (track as any).requestFrame();
        }

        await new Promise(resolve => setTimeout(resolve, frameDuration));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      mediaRecorder.stop();
    });
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  cleanup(): void {
    this.capturedFrames = [];
    this.recordedChunks = [];
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
  }
}
