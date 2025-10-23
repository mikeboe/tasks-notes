import { useEffect, useRef } from 'react';

interface WebcamOverlayProps {
  stream: MediaStream | null;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  shape: 'circle' | 'rounded';
  size?: number;
}

export const WebcamOverlay = ({
  stream,
  position,
  shape,
  size = 160,
}: WebcamOverlayProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 border-4 border-white shadow-2xl overflow-hidden ${shapeClasses[shape]}`}
      style={{ width: size, height: size }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          transform: 'scaleX(-1)', // Mirror the webcam feed
        }}
      />
    </div>
  );
};
