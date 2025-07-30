import { useState, useEffect } from 'react';
import { throttle } from '~/lib/utils';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    const throttledUpdate = throttle(updateSize, 200, {
      callFirst: false,
    });

    updateSize();

    window.addEventListener('resize', throttledUpdate);
    return () => window.removeEventListener('resize', throttledUpdate);
  }, []);

  return size;
}
