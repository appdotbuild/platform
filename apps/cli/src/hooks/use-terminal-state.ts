import { useEffect, useRef } from 'react';

export function useTerminalState() {
  const isRawModeRef = useRef(false);

  const setRawMode = (enabled: boolean) => {
    if (!process.stdin.isTTY) return;

    if (enabled && !isRawModeRef.current) {
      process.stdin.pause();
      process.stdin.setRawMode(true);
      process.stdin.resume();
      isRawModeRef.current = true;
    } else if (!enabled && isRawModeRef.current) {
      process.stdin.pause();
      process.stdin.setRawMode(false);
      process.stdin.resume();
      isRawModeRef.current = false;
    }
  };

  const clearTerminal = () => {
    process.stdout.write('\x1b[2J');
    process.stdout.write('\x1b[H');
  };

  useEffect(() => {
    return () => {
      if (isRawModeRef.current) {
        setRawMode(false);
      }
    };
  }, []);

  return { setRawMode, isRawMode: isRawModeRef.current, clearTerminal };
}
