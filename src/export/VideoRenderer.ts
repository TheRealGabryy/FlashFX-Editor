import { DesignElement } from '../types/design';
import { BackgroundConfig, generateBackgroundStyle } from '../types/background';

export interface VideoExportConfig {
  fps: number;
  duration: number;
  width: number;
  height: number;
  background?: BackgroundConfig;
  projectName: string;
}

export interface VideoRenderProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  message: string;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private progressCallback?: (progress: VideoRenderProgress) => void;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    if (!context) {
      throw new Error('Failed to get 2D context');
    }

    this.ctx = context;
  }

  setProgressCallback(callback: (progress: VideoRenderProgress) => void) {
    this.progressCallback = callback;
  }

  private updateProgress(progress: Partial<VideoRenderProgress>, totalFrames: number) {
    if (this.progressCallback) {
      const currentProgress: VideoRenderProgress = {
        currentFrame: progress.currentFrame || 0,
        totalFrames,
        percentage: progress.currentFrame ? (progress.currentFrame / totalFrames) * 100 : 0,
        status: progress.status || 'idle',
        message: progress.message || '',
      };
      this.progressCallback(currentProgress);
    }
  }

  private captureCanvasFrame(
    artboardElement: HTMLElement,
    width: number,
    height: number,
    background?: BackgroundConfig
  ): Promise<void> {
    return new Promise((resolve) => {
      this.canvas.width = width;
      this.canvas.height = height;

      if (background) {
        const bgStyle = generateBackgroundStyle(background);

        if (bgStyle.backgroundColor) {
          this.ctx.fillStyle = bgStyle.backgroundColor;
        } else if (bgStyle.backgroundImage) {
          this.ctx.fillStyle = '#000000';
        } else {
          this.ctx.fillStyle = '#ffffff';
        }
      } else {
        this.ctx.fillStyle = '#ffffff';
      }

      this.ctx.fillRect(0, 0, width, height);

      if (background?.type === 'gradient' && background.gradient) {
        const grad = background.gradient;
        let gradient: CanvasGradient;

        if (grad.type === 'linear') {
          const angle = (grad.angle || 0) * Math.PI / 180;
          const x1 = width / 2 + Math.cos(angle) * width / 2;
          const y1 = height / 2 + Math.sin(angle) * height / 2;
          const x2 = width / 2 - Math.cos(angle) * width / 2;
          const y2 = height / 2 - Math.sin(angle) * height / 2;
          gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        } else {
          gradient = this.ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
          );
        }

        grad.stops.forEach(stop => {
          gradient.addColorStop(stop.position, stop.color);
        });

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
      }

      import('html-to-image').then(({ toPng }) => {
        toPng(artboardElement, {
          width,
          height,
          backgroundColor: 'transparent',
          cacheBust: true,
          pixelRatio: 1,
        }).then(dataUrl => {
          const img = new Image();
          img.onload = () => {
            this.ctx.drawImage(img, 0, 0, width, height);
            resolve();
          };
          img.src = dataUrl;
        }).catch(() => {
          resolve();
        });
      });
    });
  }

  async renderVideo(
    config: VideoExportConfig,
    artboardElement: HTMLElement,
    onFrameUpdate: (time: number) => Promise<void>
  ): Promise<Blob> {
    const totalFrames = Math.ceil(config.duration * config.fps);
    const frameTime = 1 / config.fps;

    this.updateProgress({
      status: 'rendering',
      currentFrame: 0,
      message: 'Initializing video rendering...'
    }, totalFrames);

    this.canvas.width = config.width;
    this.canvas.height = config.height;

    const stream = this.canvas.captureStream(config.fps);

    this.recordedChunks = [];

    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('MediaRecorder error'));
      };
    });

    this.mediaRecorder.start();

    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame * frameTime;

      this.updateProgress({
        status: 'rendering',
        currentFrame: frame + 1,
        message: `Rendering frame ${frame + 1} of ${totalFrames}...`
      }, totalFrames);

      await onFrameUpdate(currentTime);

      await new Promise(resolve => setTimeout(resolve, 10));

      await this.captureCanvasFrame(
        artboardElement,
        config.width,
        config.height,
        config.background
      );

      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    this.updateProgress({
      status: 'encoding',
      currentFrame: totalFrames,
      message: 'Encoding phase started, all frames will be composed into a WebM video ready to download...'
    }, totalFrames);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    const videoBlob = await recordingPromise;

    this.updateProgress({
      status: 'completed',
      currentFrame: totalFrames,
      message: 'Video rendering completed!'
    }, totalFrames);

    return videoBlob;
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  downloadVideo(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.recordedChunks = [];
  }
}
