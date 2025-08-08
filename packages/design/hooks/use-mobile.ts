import { useMediaQuery } from 'react-responsive';
import { breakpoints } from '../lib';

// < md
export function useIsSmallScreen() {
  const maxWidth = breakpoints.md - 1;
  return useMediaQuery({ maxWidth });
}

// Chat layout uses a compact (mobile) version on small/medium screens (< xl)
export function useIsTabletOrMobile() {
  const maxWidth = breakpoints.xl - 1;
  return useMediaQuery({ maxWidth });
}
