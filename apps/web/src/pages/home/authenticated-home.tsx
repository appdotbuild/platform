import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatInput } from '~/components/chat/chat-input';
import { ChatMessageLimit } from '~/components/chat/chat-message-limit';
import { ChatList } from '~/components/chat/list/chat-list';
import {
  DeploymentTargetSelector,
  type DeploymentTargetSelectorHandle,
  type DeploymentTarget,
} from '~/components/chat/deployment/deployment-target-selector';
import { DecoratedInputContainer } from '~/components/shared/decorations';
import { HeroTitle } from '~/components/shared/title';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { messagesStore } from '~/stores/messages-store';
import { useStaffMode } from '~/hooks/use-staff-mode';

export function AuthenticatedHome() {
  const clearCurrentApp = useCurrentApp((state) => state.clearCurrentApp);
  const deploymentSelectorRef = useRef<DeploymentTargetSelectorHandle>(null);
  const { isStaffMode } = useStaffMode();

  // We don't need to store the deployment target, we just need to trigger the re-render
  const [deploymentTarget, setDeploymentTarget] =
    useState<DeploymentTarget>('koyeb');

  const validateDeploymentConfig = useCallback(async () => {
    return (
      (await deploymentSelectorRef.current?.validateConfiguration()) ?? {
        success: true,
        config: { selectedTarget: 'koyeb' },
      }
    );
  }, []);

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_HOME);
  }, []);

  // clean up the current app state
  useEffect(() => {
    clearCurrentApp();
    messagesStore.clearMessages('new');
  }, [clearCurrentApp]);

  return (
    <section className="hero relative grow overflow-x-hidden overflow-y-auto">
      <div
        data-testid="authenticated-home"
        className="w-full h-full flex flex-col gap-8 lg:gap-12 pt-20 md:pt-24 lg:pt-48 xl:pt-56 items-center"
      >
        <HeroTitle>
          An open-source <br className="block md:hidden xl:block" />
          AI agent that builds <br className="block md:hidden xl:block" />
          full-stack apps
        </HeroTitle>

        <div className="w-full max-w-3xl px-4 lg:px-6 space-y-8">
          {isStaffMode && (
            <DeploymentTargetSelector
              ref={deploymentSelectorRef}
              onChange={setDeploymentTarget}
            />
          )}

          <DecoratedInputContainer>
            <ChatInput
              deploymentTarget={deploymentTarget}
              validateBeforeSubmit={validateDeploymentConfig}
            />
            <div className="absolute left-0 right-0 top-full mt-2">
              <ChatMessageLimit />
            </div>
          </DecoratedInputContainer>
        </div>
        <ChatList />
      </div>
    </section>
  );
}
