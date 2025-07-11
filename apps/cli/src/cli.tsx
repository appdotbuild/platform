import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { useTerminalState } from './hooks/use-terminal-state.js';
import {
  type Environment,
  useEnvironmentStore,
} from './store/environment-store.js';
import { useAnalyticsStore } from './store/analytics-store.js';
import { TemplateMap, useFlagsStore } from './store/flags-store.js';

// in the CLI, node_env is only production or development
const defaultEnv = process.env.NODE_ENV ?? 'development';

const cli = meow(
  `
	Usage
	  $ npx @app.build/cli

	Options
	  --env, -e Agent and platform environment (staging|production) (optional) [default: ${defaultEnv}]
	  --databricks deploy to databricks
    --template, -t Template to use for app creation (trpc_agent|nicegui_agent) [default: trpc_agent]

	Examples
	  $ npx @app.build/cli
	  $ npx @app.build/cli --agent-env staging
	  $ npx @app.build/cli --databricks
	  $ npx @app.build/cli --template nicegui_agent
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
      template: {
        type: 'string',
        shortFlag: 't',
        default: 'trpc-react',
        choices: ['python', 'trpc-react'],
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

// set template id
useFlagsStore.getState().setTemplateId(cli.flags.template as keyof TemplateMap);

render(<App />);
