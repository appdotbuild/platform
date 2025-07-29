import { useState, useEffect } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}
