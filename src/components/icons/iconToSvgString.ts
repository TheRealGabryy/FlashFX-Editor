import type { IconData } from './types';

export function iconToSvgString(icon: IconData): string {
  const children = icon.elements
    .map(el => {
      const attrs = Object.entries(el.attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${el.tag} ${attrs} />`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${children}
</svg>`;
}
