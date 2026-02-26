import React from 'react';
import type { IconData } from './types';

interface SvgIconProps {
  icon: IconData;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

function SvgIconInner({ icon, size = 24, color = 'currentColor', strokeWidth = 2, className }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icon.elements.map((el, i) => {
        const props: Record<string, string | number> = {};
        for (const [key, val] of Object.entries(el.attrs)) {
          const reactKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          props[reactKey] = val;
        }
        return React.createElement(el.tag, { key: i, ...props });
      })}
    </svg>
  );
}

export const SvgIcon = React.memo(SvgIconInner);
