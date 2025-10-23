import { useEffect, useState } from 'react';

interface ClickPosition {
  x: number;
  y: number;
  id: number;
}

export const ClickHighlight = () => {
  const [clicks, setClicks] = useState<ClickPosition[]>([]);

  useEffect(() => {
    let clickId = 0;

    const handleClick = (e: MouseEvent) => {
      const newClick: ClickPosition = {
        x: e.clientX,
        y: e.clientY,
        id: clickId++,
      };

      setClicks(prev => [...prev, newClick]);

      // Remove click after animation completes
      setTimeout(() => {
        setClicks(prev => prev.filter(click => click.id !== newClick.id));
      }, 1000);
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      {clicks.map(click => (
        <div
          key={click.id}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: click.x,
            top: click.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative">
            {/* Inner circle */}
            <div
              className="absolute inset-0 rounded-full bg-yellow-400 opacity-80"
              style={{
                width: '20px',
                height: '20px',
                animation: 'clickPulse 1s ease-out forwards',
              }}
            />
            {/* Outer expanding circle */}
            <div
              className="absolute inset-0 rounded-full border-4 border-yellow-400"
              style={{
                width: '20px',
                height: '20px',
                animation: 'clickExpand 1s ease-out forwards',
              }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes clickPulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes clickExpand {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
