import { DesignElement } from '../types/design';
import { v4 as uuidv4 } from 'uuid';

export interface TextUnit {
  text: string;
  x: number;
  y: number;
  index: number;
}

export function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  letterSpacing: number = 0
): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return metrics.width + (text.length - 1) * letterSpacing;
}

export function splitTextIntoUnits(
  element: DesignElement,
  mode: 'line' | 'word' | 'character'
): TextUnit[] {
  const text = element.text || '';
  const fontSize = element.fontSize || 16;
  const fontFamily = element.fontFamily || 'Inter';
  const fontWeight = element.fontWeight || '400';
  const letterSpacing = element.letterSpacing || 0;
  const lineHeight = element.lineHeight || 1.2;
  const textAlign = element.textAlign || 'left';

  const units: TextUnit[] = [];
  let currentX = element.x;
  let currentY = element.y;

  if (mode === 'line') {
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const lineWidth = measureText(line, fontSize, fontFamily, fontWeight, letterSpacing);
      let lineX = element.x;

      if (textAlign === 'center') {
        lineX = element.x + (element.width - lineWidth) / 2;
      } else if (textAlign === 'right') {
        lineX = element.x + element.width - lineWidth;
      }

      units.push({
        text: line,
        x: lineX,
        y: element.y + index * fontSize * lineHeight,
        index
      });
    });
  } else if (mode === 'word') {
    const lines = text.split('\n');
    let wordIndex = 0;

    lines.forEach((line, lineIndex) => {
      const words = line.split(/(\s+)/);
      const lineY = element.y + lineIndex * fontSize * lineHeight;

      const totalLineWidth = measureText(line, fontSize, fontFamily, fontWeight, letterSpacing);
      let lineStartX = element.x;

      if (textAlign === 'center') {
        lineStartX = element.x + (element.width - totalLineWidth) / 2;
      } else if (textAlign === 'right') {
        lineStartX = element.x + element.width - totalLineWidth;
      }

      let currentLineX = lineStartX;

      words.forEach((word) => {
        if (word.trim().length > 0) {
          const wordWidth = measureText(word, fontSize, fontFamily, fontWeight, letterSpacing);
          units.push({
            text: word,
            x: currentLineX,
            y: lineY,
            index: wordIndex++
          });
          currentLineX += wordWidth;
        } else {
          const spaceWidth = measureText(word, fontSize, fontFamily, fontWeight, letterSpacing);
          currentLineX += spaceWidth;
        }
      });
    });
  } else if (mode === 'character') {
    const lines = text.split('\n');
    let charIndex = 0;

    lines.forEach((line, lineIndex) => {
      const lineY = element.y + lineIndex * fontSize * lineHeight;
      const totalLineWidth = measureText(line, fontSize, fontFamily, fontWeight, letterSpacing);
      let lineStartX = element.x;

      if (textAlign === 'center') {
        lineStartX = element.x + (element.width - totalLineWidth) / 2;
      } else if (textAlign === 'right') {
        lineStartX = element.x + element.width - totalLineWidth;
      }

      let currentLineX = lineStartX;

      for (const char of line) {
        const charWidth = measureText(char, fontSize, fontFamily, fontWeight, letterSpacing);
        units.push({
          text: char,
          x: currentLineX,
          y: lineY,
          index: charIndex++
        });
        currentLineX += charWidth;
      }
    });
  }

  return units;
}

export function createTextElementFromUnit(
  originalElement: DesignElement,
  unit: TextUnit,
  index: number
): DesignElement {
  const unitWidth = measureText(
    unit.text,
    originalElement.fontSize || 16,
    originalElement.fontFamily || 'Inter',
    originalElement.fontWeight || '400',
    originalElement.letterSpacing || 0
  );

  const newElement: DesignElement = {
    ...originalElement,
    id: uuidv4(),
    name: `${originalElement.name} [${index + 1}]`,
    text: unit.text,
    x: unit.x,
    y: unit.y,
    width: unitWidth,
    height: originalElement.fontSize || 16,
    textAnimationMode: 'whole',
    textAnimationStaggerDelay: undefined
  };

  return newElement;
}
