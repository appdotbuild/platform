import { Box, Text } from 'ink';
import { Loader } from '../ui/Loader';
import { DeployStatus, type DeployStatusType } from '@appdotbuild/core';
import { memo } from 'react';

/**
 * DO NOT try to modify this with real emojis, as it will
 * destroy the rendering in the terminal.
 */
const statusToSymbol = {
  [DeployStatus.DEPLOYED]: '✓',
  [DeployStatus.DEPLOYING]: Loader,
  [DeployStatus.FAILED]: '✗',
  [DeployStatus.STOPPING]: Loader,
  [DeployStatus.PENDING]: Loader,
};

const statusToColor = {
  [DeployStatus.DEPLOYED]: 'green',
  [DeployStatus.DEPLOYING]: 'yellow',
  [DeployStatus.FAILED]: 'red',
  [DeployStatus.STOPPING]: 'yellow',
  [DeployStatus.PENDING]: 'yellow',
};

const Status = memo(function Status({
  status,
}: {
  status: DeployStatusType | undefined;
}) {
  if (!status) {
    return null;
  }

  const StatusSymbol = statusToSymbol[status];
  const value =
    typeof StatusSymbol === 'string' ? StatusSymbol : <StatusSymbol />;

  return <Text color={statusToColor[status]}>{value} </Text>;
});

function AppUrlsComponent({
  ghUrl,
  deploymentUrl,
  deployStatus,
}: {
  ghUrl?: string | null;
  deploymentUrl?: string | null;
  deployStatus?: DeployStatusType;
}) {
  if (!ghUrl && !deploymentUrl) {
    return null;
  }

  return (
    <Box
      width="100%"
      height="100%"
      flexBasis="100%"
      alignItems="center"
      justifyContent="flex-end"
    >
      <Box
        borderStyle="round"
        borderColor="blackBright"
        borderDimColor={true}
        minWidth="50%"
        minHeight="100%"
        flexDirection="column"
        flexBasis="100%"
        paddingLeft={1}
        gap={1}
        flexGrow={1}
      >
        {ghUrl && (
          <Text>
            <Status status="deployed" />
            <Text bold>Repository:</Text>{' '}
            <Text underline color="blueBright">
              {ghUrl}
            </Text>
          </Text>
        )}
        {deploymentUrl && (
          <Text>
            <Status status={deployStatus} />
            <Text bold>Deployment:</Text>{' '}
            <Text underline color="blueBright">
              {deploymentUrl}
            </Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

export const AppUrls = memo(AppUrlsComponent);
