import { useEffect, useRef } from 'react';
import { DeployStatus, type DeployStatusType } from '@appdotbuild/core';

export function useWatchDeployedStatus(
  deployStatus?: DeployStatusType,
  onDeployed?: () => void,
) {
  const previousStatusRef = useRef(deployStatus);
  const wasDeployed = useRef(deployStatus === DeployStatus.DEPLOYED);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;

    if (
      deployStatus === DeployStatus.DEPLOYED &&
      previousStatus !== DeployStatus.DEPLOYED &&
      wasDeployed.current === false
    ) {
      onDeployed?.();
    }

    if (deployStatus !== DeployStatus.DEPLOYED) {
      wasDeployed.current = false;
    } else if (deployStatus === DeployStatus.DEPLOYED) {
      wasDeployed.current = true;
    }

    previousStatusRef.current = deployStatus;
  }, [deployStatus, onDeployed]);
}
