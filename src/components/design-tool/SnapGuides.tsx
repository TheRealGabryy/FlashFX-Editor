import React from 'react';
import { SnapGuide } from '../../hooks/useSnapping';

interface SnapGuidesProps {
  guides: SnapGuide[];
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
}

const SnapGuides: React.FC<SnapGuidesProps> = ({ guides }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {guides.map((guide) => {
        const isYellowGuide = guide.color === '#FFD700';
        const lineWidth = isYellowGuide ? 2 : 1.5;

        if (guide.type === 'vertical') {
          const lineHeight = guide.endPos - guide.startPos;

          return (
            <React.Fragment key={guide.id}>
              <div
                className="absolute"
                style={{
                  left: guide.position,
                  top: guide.startPos,
                  width: `${lineWidth}px`,
                  height: `${lineHeight}px`,
                  backgroundColor: guide.color,
                  boxShadow: isYellowGuide
                    ? `0 0 8px 2px ${guide.color}, 0 0 14px 4px ${guide.color}`
                    : `0 0 6px 1px ${guide.color}, 0 0 10px 3px ${guide.color}`,
                  opacity: 1,
                  transform: `translateX(-${lineWidth / 2}px)`,
                  animation: 'snapPulse 0.8s ease-in-out infinite'
                }}
              />
              {guide.markerPositions.map((marker, idx) => (
                <div
                  key={`${guide.id}-marker-${idx}`}
                  className="absolute"
                  style={{
                    left: marker.x,
                    top: marker.y,
                    width: '8px',
                    height: '8px',
                    backgroundColor: guide.color,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 6px 2px ${guide.color}`,
                    animation: 'snapMarkerPulse 0.8s ease-in-out infinite'
                  }}
                />
              ))}
              {guide.targetBounds && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: guide.position,
                      top: Math.min(guide.sourceElement.top, guide.targetBounds.top, guide.targetBounds.bottom) - 20,
                      width: `${lineWidth}px`,
                      height: '20px',
                      background: `linear-gradient(to bottom, transparent, ${guide.color})`,
                      transform: `translateX(-${lineWidth / 2}px)`,
                      opacity: 0.7
                    }}
                  />
                  <div
                    className="absolute"
                    style={{
                      left: guide.position,
                      top: Math.max(guide.sourceElement.bottom, guide.targetBounds.top, guide.targetBounds.bottom),
                      width: `${lineWidth}px`,
                      height: '20px',
                      background: `linear-gradient(to top, transparent, ${guide.color})`,
                      transform: `translateX(-${lineWidth / 2}px)`,
                      opacity: 0.7
                    }}
                  />
                </>
              )}
            </React.Fragment>
          );
        } else {
          const lineWidth2 = guide.endPos - guide.startPos;

          return (
            <React.Fragment key={guide.id}>
              <div
                className="absolute"
                style={{
                  left: guide.startPos,
                  top: guide.position,
                  width: `${lineWidth2}px`,
                  height: `${lineWidth}px`,
                  backgroundColor: guide.color,
                  boxShadow: isYellowGuide
                    ? `0 0 8px 2px ${guide.color}, 0 0 14px 4px ${guide.color}`
                    : `0 0 6px 1px ${guide.color}, 0 0 10px 3px ${guide.color}`,
                  opacity: 1,
                  transform: `translateY(-${lineWidth / 2}px)`,
                  animation: 'snapPulse 0.8s ease-in-out infinite'
                }}
              />
              {guide.markerPositions.map((marker, idx) => (
                <div
                  key={`${guide.id}-marker-${idx}`}
                  className="absolute"
                  style={{
                    left: marker.x,
                    top: marker.y,
                    width: '8px',
                    height: '8px',
                    backgroundColor: guide.color,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 6px 2px ${guide.color}`,
                    animation: 'snapMarkerPulse 0.8s ease-in-out infinite'
                  }}
                />
              ))}
              {guide.targetBounds && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: Math.min(guide.sourceElement.left, guide.targetBounds.left, guide.targetBounds.right) - 20,
                      top: guide.position,
                      width: '20px',
                      height: `${lineWidth}px`,
                      background: `linear-gradient(to right, transparent, ${guide.color})`,
                      transform: `translateY(-${lineWidth / 2}px)`,
                      opacity: 0.7
                    }}
                  />
                  <div
                    className="absolute"
                    style={{
                      left: Math.max(guide.sourceElement.right, guide.targetBounds.left, guide.targetBounds.right),
                      top: guide.position,
                      width: '20px',
                      height: `${lineWidth}px`,
                      background: `linear-gradient(to left, transparent, ${guide.color})`,
                      transform: `translateY(-${lineWidth / 2}px)`,
                      opacity: 0.7
                    }}
                  />
                </>
              )}
            </React.Fragment>
          );
        }
      })}
      <style>{`
        @keyframes snapPulse {
          0%, 100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.8;
            filter: brightness(1.2);
          }
        }
        @keyframes snapMarkerPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default SnapGuides;
