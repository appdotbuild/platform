import { TerminalChat } from '../components/chat/terminal-chat.js';
import { useSafeSearchParams } from '../routes.js';

export const AppBuildScreen = () => {
  const [searchParams] = useSafeSearchParams('/app/build');
  const isDatabricksApp = Boolean(searchParams.databricksApiKey);

  const initialPrompt = isDatabricksApp
    ? 'What Databricks application would you like to build?'
    : 'What would you like to build?';

  return (
    <TerminalChat
      initialPrompt={initialPrompt}
      databricksApiKey={searchParams.databricksApiKey}
      databricksHost={searchParams.databricksHost}
    />
  );
};
