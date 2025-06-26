import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { useTerminalState } from './hooks/use-terminal-state.js';
import {
  type Environment,
  useEnvironmentStore,
} from './store/environment-store.js';
import { useAnalyticsStore } from './store/analytics-store.js';
import { useFlagsStore } from './store/flags-store.js';

// in the CLI, node_env is only production or development
const defaultEnv = process.env.NODE_ENV ?? 'development';

const cli = meow(
  `
	Usage
	  $ npx @app.build/cli

	Options
	  --env, -e Agent and platform environment (staging|production) (optional) [default: ${defaultEnv}]
	  --databricks Enable Databricks app creation mode

	Examples
	  $ npx @app.build/cli
	  $ npx @app.build/cli --agent-env staging
	  $ npx @app.build/cli --databricks
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
      databricks: {
        type: 'boolean',
        default: false,
        description: 'Enable Databricks app creation mode',
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

// set databricks mode
useFlagsStore.getState().setDatabricksMode(cli.flags.databricks);

render(<App />);
