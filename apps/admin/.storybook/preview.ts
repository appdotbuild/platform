import type { Preview } from '@storybook/react';
import '@appdotbuild/design/globals.css';
import '../app/global.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
