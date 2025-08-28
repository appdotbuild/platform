import { useNavigate, useParams } from '@tanstack/react-router';
import { AnalyticsEvents, sendEvent } from '~/external/segment';
import {
  MESSAGE_ROLES,
  messagesStore,
  SYSTEM_MESSAGE_TYPES,
} from '~/stores/messages-store';
import { useAppsList } from './useAppsList';
import { useCurrentApp } from './useCurrentApp';
import { useSSEMessageHandler, useSSEQuery } from './useSSE';
import type { MessageSSERequest, TemplateId, TraceId } from '@appdotbuild/core';
import type { DeploymentConfig } from '~/components/chat/deployment/deployment-target-selector';

// main chat logic
export function useChat() {
  const {
    setMessageBeforeCreation,
    setCurrentAppTemplateId,
    setCurrentAppDeploymentConfig,
    currentAppDeploymentConfig,
  } = useCurrentApp();
  const navigate = useNavigate();
  const params = useParams({ from: '/apps/$appId', shouldThrow: false });
  const appId = params?.appId || undefined;
  const { apps } = useAppsList();

  const { handleSSEMessage, handleSSEError, handleSSEDone } =
    useSSEMessageHandler(appId);

  const { sendMessage: sendMessageAsync, isLoading } = useSSEQuery({
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onDone: handleSSEDone,
  });

  const createNewApp = ({
    firstInput,
    templateId,
    deploymentConfig,
  }: {
    firstInput: string;
    templateId: TemplateId;
    deploymentConfig?: DeploymentConfig;
  }) => {
    const message = firstInput.trim();
    if (!message) return;

    sendEvent(AnalyticsEvents.NEW_APP_SELECTED);

    messagesStore.addMessage('new', {
      id: crypto.randomUUID(),
      message: message,
      role: MESSAGE_ROLES.USER,
      createdAt: new Date().toISOString(),
    });

    setMessageBeforeCreation(message);
    setCurrentAppTemplateId(templateId);
    if (deploymentConfig) {
      setCurrentAppDeploymentConfig(deploymentConfig);
    }

    navigate({
      to: '/apps/$appId',
      params: { appId: 'new' },
      replace: true,
    });

    sendMessage({
      message: message,
      isNewApp: true,
      templateId,
      deploymentConfig,
    });
  };

  const sendMessage = async ({
    message,
    isNewApp,
    templateId,
    deploymentConfig,
  }: {
    message: string;
    isNewApp?: boolean;
    templateId?: TemplateId;
    deploymentConfig?: DeploymentConfig;
  }) => {
    const sendChatId = isNewApp ? 'new' : appId;
    if (!sendChatId || !message.trim()) return;

    const messageId = crypto.randomUUID();

    sendEvent(AnalyticsEvents.MESSAGE_SENT);

    // if is a new app, avoid duplicate user message
    if (!isNewApp) {
      messagesStore.addMessage(sendChatId, {
        id: messageId,
        message: message.trim(),
        role: MESSAGE_ROLES.USER,
        createdAt: new Date().toISOString(),
      });
    }

    messagesStore.addLoadingMessage(sendChatId, {
      id: 'loading-message',
      message: 'Thinking...',
      role: MESSAGE_ROLES.SYSTEM,
      systemType: SYSTEM_MESSAGE_TYPES.LOADING,
      createdAt: new Date().toISOString(),
    });

    const app = apps.find((a) => a.id === sendChatId);
    const traceId = app?.traceId || `app-${sendChatId}.req-${Date.now()}`;

    // Use provided deploymentConfig or fall back to stored one
    const effectiveDeploymentConfig =
      deploymentConfig || currentAppDeploymentConfig;

    let databricksApiKey: string | undefined;
    let databricksHost: string | undefined;
    if (effectiveDeploymentConfig?.selectedTarget === 'databricks') {
      databricksApiKey =
        effectiveDeploymentConfig?.databricksConfig?.personalAccessToken;
      databricksHost = effectiveDeploymentConfig?.databricksConfig?.hostUrl;
    }

    // Add deployment context to the payload
    const payload: MessageSSERequest = {
      applicationId: isNewApp ? null : appId,
      message: message.trim(),
      clientSource: 'web',
      traceId: isNewApp ? undefined : (traceId as TraceId),
      templateId: app?.techStack ?? templateId,
      databricksApiKey,
      databricksHost,
    };

    sendMessageAsync(payload);
  };

  return {
    createNewApp,
    sendMessage,
    appId,
    isLoading,
  };
}
