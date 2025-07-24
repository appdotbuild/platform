import { PlatformMessageType } from '@appdotbuild/core';
import {
  PLATFORM_MESSAGE_BG_COLORS,
  PLATFORM_MESSAGE_BORDER_COLORS,
  PLATFORM_MESSAGE_ICONS,
  PLATFORM_MESSAGE_TEXTS,
} from './constants';

export interface DeploymentState {
  type: PlatformMessageType;
  message: string;
  icon: string;
  borderColor: string;
  bgColor: string;
  displayMessage: string;
  isInProgress: boolean;
  isFailed: boolean;
  hasPollingError: boolean;
}

type DeploymentStatusData = { type: string; message: string } | undefined;

function getDeploymentType(
  originalType: PlatformMessageType | undefined,
  deploymentStatus: DeploymentStatusData,
  hasPollingError: boolean,
): PlatformMessageType {
  if (hasPollingError) {
    return PlatformMessageType.DEPLOYMENT_FAILED;
  }

  if (deploymentStatus?.type === 'HEALTHY') {
    return PlatformMessageType.DEPLOYMENT_COMPLETE;
  }

  if (deploymentStatus?.type === 'ERROR') {
    return PlatformMessageType.DEPLOYMENT_FAILED;
  }

  return originalType || PlatformMessageType.DEPLOYMENT_IN_PROGRESS;
}

function getDeploymentMessage(
  hasPollingError: boolean,
  deploymentStatus: DeploymentStatusData,
  originalMessage: string,
): string {
  if (hasPollingError) {
    return 'Could not verify deployment status';
  }

  return deploymentStatus?.message || originalMessage;
}

function getDeploymentStyling(type: PlatformMessageType) {
  return {
    icon: PLATFORM_MESSAGE_ICONS[type] || '🚀',
    borderColor: PLATFORM_MESSAGE_BORDER_COLORS[type] || 'border-border',
    bgColor: PLATFORM_MESSAGE_BG_COLORS[type] || 'bg-muted/50',
  };
}

function getDisplayMessage(
  type: PlatformMessageType,
  fallbackMessage: string,
): string {
  if (type && type in PLATFORM_MESSAGE_TEXTS) {
    return PLATFORM_MESSAGE_TEXTS[type as keyof typeof PLATFORM_MESSAGE_TEXTS];
  }

  return fallbackMessage;
}

function getDeploymentFlags(
  type: PlatformMessageType,
  hasPollingError: boolean,
) {
  return {
    isInProgress: type === PlatformMessageType.DEPLOYMENT_IN_PROGRESS,
    isFailed: type === PlatformMessageType.DEPLOYMENT_FAILED,
    hasPollingError,
  };
}

export function determineDeploymentState(
  originalType: PlatformMessageType | undefined,
  originalMessage: string,
  deploymentStatus: DeploymentStatusData,
  deploymentError: any,
): DeploymentState {
  const hasPollingError =
    deploymentError &&
    originalType === PlatformMessageType.DEPLOYMENT_IN_PROGRESS;

  const type = getDeploymentType(
    originalType,
    deploymentStatus,
    hasPollingError,
  );
  const message = getDeploymentMessage(
    hasPollingError,
    deploymentStatus,
    originalMessage,
  );
  const styling = getDeploymentStyling(type);
  const displayMessage = getDisplayMessage(type, message);
  const flags = getDeploymentFlags(type, hasPollingError);

  return {
    type,
    message,
    displayMessage,
    ...styling,
    ...flags,
  };
}
