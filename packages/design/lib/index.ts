export const breakpoints = {
  // Tailwind CSS default screen breakpoints
  // https://tailwindcss.com/docs/screens
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

export * from './utils';
