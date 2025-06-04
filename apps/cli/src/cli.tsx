import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { Environment, useEnvironmentStore } from './store/environment-store.js';

// in the CLI, node_env is only production or development
const defaultEnv = process.env.NODE_ENV ?? 'development';

const cli = meow(
  `
	Usage
	  $ npx @app.build/cli

	Options
	  --env, -e Agent and platform environment (staging|production) (optional) [default: ${defaultEnv}]

	Examples
	  $ npx @app.build/cli
	  $ npx @app.build/cli --agent-env staging
`,
  {
    importMeta: import.meta,
    flags: {
      env: {
        type: 'string',
        shortFlag: 'a',
        default: defaultEnv,
        choices: ['staging', 'production', 'development'],
      },
    },
  },
);

useEnvironmentStore.getState().setEnvironment(cli.flags.env as Environment);

render(<App />);
