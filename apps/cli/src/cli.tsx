import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cli = meow(
  `
	⚠️  DEPRECATION NOTICE
	
	This CLI has been deprecated and is no longer supported.
	Please use https://app.build instead.
	
	For all new projects and continued development, 
	visit https://app.build in your web browser.
`,
  {
    importMeta: import.meta,
    flags: {},
  },
);

render(<App />);
