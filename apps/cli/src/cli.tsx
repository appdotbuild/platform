import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { useTerminalState } from './hooks/use-terminal-state.js';
import {
  type Environment,
  useEnvironmentStore,
} from './store/environment-store.js';
import { useAnalyticsStore } from './store/analytics-store.js';

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
      analytics: {
        type: 'boolean',
        default: true,
        description: 'Manage analytics. Example: --analytics false',
      },
    },
  },
);

const { clearTerminal } = useTerminalState();
clearTerminal();

// Set the environment for the agent
useEnvironmentStore.getState().setEnvironment(cli.flags.env as Environment);

// Set analytics preference
useAnalyticsStore.getState().setAnalyticsEnabled(cli.flags.analytics);

render(<App />);
