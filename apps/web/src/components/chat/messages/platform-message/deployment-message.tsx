import {
  type PlatformMessageMetadata,
  PlatformMessageType,
} from '@appdotbuild/core';
import { motion } from 'motion/react';
import { useDeploymentStatus } from '~/hooks/useDeploymentStatus';
import { determineDeploymentState } from './utils';

interface DeploymentMessageProps {
  message: string;
  type?: PlatformMessageType;
  metadata?: PlatformMessageMetadata;
  messageId?: string;
}

export function DeploymentMessage({
  message,
  type,
  metadata,
  messageId,
}: DeploymentMessageProps) {
  const deploymentId = metadata?.deploymentId;
  const deploymentUrl = metadata?.deploymentUrl;

  const { data: deploymentStatus, error: deploymentError } =
    useDeploymentStatus(deploymentId, messageId, {
      enabled: type === PlatformMessageType.DEPLOYMENT_IN_PROGRESS,
    });

  const state = determineDeploymentState(
    type,
    message,
    deploymentStatus,
    deploymentError,
  );

  return (
    <div
      className={`group relative border ${state.borderColor} rounded-lg overflow-hidden ${state.bgColor}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{state.icon}</span>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {state.displayMessage}{' '}
              {deploymentUrl && !state.hasPollingError && (
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-800"
                >
                  View deployment
                </a>
              )}
            </p>

            {state.isInProgress && <ProgressIndicator />}
            {state.isFailed && (
              <ErrorMessage hasPollingError={state.hasPollingError} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressIndicator() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-purple-500 rounded-full"
              animate={{
                y: ['0%', '-50%', '0%'],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          This may take up some minutes...
        </span>
      </div>

      <div className="w-full bg-purple-200/30 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
          animate={{
            x: ['-100%', '400%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    </div>
  );
}

function ErrorMessage({ hasPollingError }: { hasPollingError: boolean }) {
  if (hasPollingError) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        Unable to verify status automatically. Your deployment may have
        completed successfully.
      </p>
    );
  }

  return (
    <p className="text-xs text-red-600 mt-1">
      Please check your application code and try again.
    </p>
  );
}
