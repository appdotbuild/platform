import type {
  PlatformMessageMetadata,
  PlatformMessageType,
} from '@appdotbuild/core';
import { DeploymentMessage } from './deployment-message';
import { GitMessage } from './git-message';

interface PlatformMessageProps {
  message: string;
  type?: PlatformMessageType;
  metadata?: PlatformMessageMetadata;
  messageId?: string;
}

export function PlatformMessage({
  message,
  type,
  metadata,
  messageId,
}: PlatformMessageProps) {
  const isDeploymentMessage = type?.includes('deployment');

  if (isDeploymentMessage) {
    return (
      <DeploymentMessage
        message={message}
        type={type}
        metadata={metadata}
        messageId={messageId}
      />
    );
  }
  return <GitMessage message={message} type={type} metadata={metadata} />;
}
