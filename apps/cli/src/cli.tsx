#!/usr/bin/env node
import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';

const defaultAgentEnvironment =
  process.env.NODE_ENV === 'production' ? 'production' : 'staging';
const cli = meow(
  `
	Usage
	  $ npx appdotbuild

	Options
	  --env, -e  Environment (staging|production) [default: ${defaultAgentEnvironment}]

	Examples
	  $ npx appdotbuild --env staging
	  $ npx appdotbuild --env production
`,
  {
    importMeta: import.meta,
    flags: {
      env: {
        type: 'string',
        shortFlag: 'e',
        default: defaultAgentEnvironment,
        choices: ['staging', 'production'],
      },
    },
  },
);

render(<App environment={cli.flags.env} />);
