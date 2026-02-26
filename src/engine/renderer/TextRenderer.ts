import type { RenderElement } from '../core/types';

interface MeasureEntry {
  width: number;
  lines: string[];
  lineHeight: number;
  accessCount: number;
}

export class TextRenderer {
  private measureCache: Map<string, MeasureEntry> = new Map();
  private maxCacheSize = 256;

  render(ctx: CanvasRenderingContext2D, el: RenderElement): void {
    const { x, y, width, height, text, fill } = el;
    if (!text) return;

    const fontSize = el.fontSize || 16;
    const fontFamily = el.fontFamily || 'Inter, sans-serif';
    const fontWeight = el.fontWeight || 400;
    const fontStyle = el.fontStyle || 'normal';
    const letterSpacing = el.letterSpacing || 0;
    const lineHeightFactor = el.lineHeight || 1.5;
    const textAlign = el.textAlign || 'left';
    const verticalAlign = el.textVerticalAlign || 'top';

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fill || '#000000';
    ctx.textBaseline = 'top';

    const lineHeightPx = fontSize * lineHeightFactor;
    const lines = text.split('\n');

    let textX = x;
    if (textAlign === 'center') {
      ctx.textAlign = 'center';
      textX = x + width / 2;
    } else if (textAlign === 'right') {
      ctx.textAlign = 'right';
      textX = x + width;
    } else {
      ctx.textAlign = 'left';
    }

    const totalTextH = lines.length * lineHeightPx;
    let startY = y;
    if (verticalAlign === 'middle') {
      startY = y + (height - totalTextH) / 2;
    } else if (verticalAlign === 'bottom') {
      startY = y + height - totalTextH;
    }

    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeightPx;
      if (letterSpacing !== 0) {
        this.renderWithSpacing(ctx, lines[i], textX, lineY, letterSpacing);
      } else {
        ctx.fillText(lines[i], textX, lineY);
      }
    }
  }

  private renderWithSpacing(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    spacing: number
  ): void {
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], currentX, y);
      currentX += ctx.measureText(text[i]).width + spacing;
    }
  }

  measureText(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: string | number,
    maxWidth: number
  ): { width: number; height: number; lines: string[] } {
    const cacheKey = `${text}|${fontSize}|${fontFamily}|${fontWeight}|${maxWidth}`;
    const cached = this.measureCache.get(cacheKey);
    if (cached) {
      cached.accessCount++;
      return { width: cached.width, height: cached.lines.length * cached.lineHeight, lines: cached.lines };
    }

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    let maxLine = 0;

    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxLine) maxLine = m.width;
    }

    const lineHeight = fontSize * 1.5;
    const entry: MeasureEntry = {
      width: Math.min(maxLine, maxWidth),
      lines,
      lineHeight,
      accessCount: 1,
    };

    if (this.measureCache.size >= this.maxCacheSize) {
      let minKey = '';
      let minCount = Infinity;
      for (const [k, v] of this.measureCache) {
        if (v.accessCount < minCount) {
          minCount = v.accessCount;
          minKey = k;
        }
      }
      if (minKey) this.measureCache.delete(minKey);
    }

    this.measureCache.set(cacheKey, entry);
    return { width: entry.width, height: lines.length * lineHeight, lines };
  }

  clearCache(): void {
    this.measureCache.clear();
  }
}
