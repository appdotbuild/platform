import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { useTerminalState } from './hooks/use-terminal-state.js';
import {
  type AgentEnvironment,
  useEnvironmentStore,
} from './store/environment-store.js';

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

const { clearTerminal } = useTerminalState();
clearTerminal();

// Set the environment for the agent
useEnvironmentStore
  .getState()
  .setEnvironment(cli.flags.env as AgentEnvironment);
render(<App />);
