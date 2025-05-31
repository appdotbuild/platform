import type { TextProps } from 'ink';

const theme = {
  styles: {
    value: (): TextProps => ({}),
  },
};

export default theme;
export type Theme = typeof theme;
