import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import {
  AgentEnvironment,
  PlatformEnvironment,
  useEnvironmentStore,
} from './store/environment-store.js';

const defaultAgentEnvironment =
  process.env.NODE_ENV === 'production' ? 'production' : 'staging';

const defaultPlatformEnvironment = process.env.NODE_ENV;

const cli = meow(
  `
	Usage
	  $ npx @app.build/cli

	Options
	  --agent-env, -a  Agent environment (staging|production) (optional) [default: ${defaultAgentEnvironment}]
	  --platform-env, -p  Platform environment (staging|production) (optional) [default: ${defaultPlatformEnvironment}]

	Examples
	  $ npx @app.build/cli
	  $ npx @app.build/cli --agent-env staging
	  $ npx @app.build/cli --agent-env production --platform-env staging
`,
  {
    importMeta: import.meta,
    flags: {
      agentEnv: {
        type: 'string',
        shortFlag: 'a',
        default: defaultAgentEnvironment,
        choices: ['staging', 'production'],
      },
      platformEnv: {
        type: 'string',
        shortFlag: 'p',
        default: defaultPlatformEnvironment,
        choices: ['staging', 'production'],
      },
    },
  },
);

// Set the environment for the agent
useEnvironmentStore
  .getState()
  .setAgentEnvironment(cli.flags.agentEnv as AgentEnvironment);

// Set the environment for the platform
useEnvironmentStore
  .getState()
  .setPlatformEnvironment(cli.flags.platformEnv as PlatformEnvironment);

render(<App />);
