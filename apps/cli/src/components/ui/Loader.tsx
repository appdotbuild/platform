import { useEffect, useState } from 'react';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function useSpinner(intervalMs: number = 100) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return SPINNER_FRAMES[currentFrame];
}

export function Loader({ intervalMs = 100 }: { intervalMs?: number }) {
  return useSpinner(intervalMs);
}
