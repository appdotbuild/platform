import {
  createLazyRoute,
  useParams,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatContainer } from '~/components/chat/chat-container';
import { ChatPageLoading } from '~/components/chat/chat-page-loading';
import { AnalyticsEvents, sendPageView } from '~/external/segment';
import { useApp } from '~/hooks/useApp';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { useLayout } from '~/hooks/useLayout';
import { useWindowSize } from '~/hooks/useWindowSize';
import { DesktopChat } from '~/components/chat/desktop-chat';
import { MobileChat } from '~/components/chat/mobile-chat';
import { useDeploymentStatusState } from '~/hooks/useDeploymentStatus';

export const AppPageRoute = createLazyRoute('/apps/$appId')({
  component: AppPage,
});

const X_LARGE_SCREEN_WIDTH = 1279;

export function AppPage() {
  const { currentAppState } = useCurrentApp();
  const { width } = useWindowSize();
  const { appId } = useParams({ from: '/apps/$appId' });
  const { setMxAuto } = useLayout();
  const { isLoading, app, isError } = useApp(appId);
  const navigate = useNavigate();

  const { deploymentStatus } = useDeploymentStatusState();

  useEffect(() => {
    sendPageView(AnalyticsEvents.PAGE_VIEW_APP);
  }, []);

  useEffect(() => {
    if (app?.appUrl && width > X_LARGE_SCREEN_WIDTH) {
      setMxAuto(false);
    }

    return () => setMxAuto(true);
  }, [app?.appUrl, setMxAuto, width]);

  useEffect(() => {
    if (isError) {
      navigate({ to: '/', replace: true });
    }
  }, [isError, navigate]);

  const renderContent = () => {
    if (isLoading && currentAppState === 'idle') {
      return <ChatPageLoading />;
    }
    return (
      <div className="flex flex-col h-full w-full items-center overflow-y-auto">
        <ChatContainer chatId={appId} isLoadingApp={isLoading} />
      </div>
    );
  };

  return (
    <>
      <MobileChat
        appUrl={app?.appUrl}
        renderContent={renderContent}
        deployStatus={deploymentStatus || app?.deployStatus}
      />
      <DesktopChat
        appUrl={app?.appUrl}
        renderContent={renderContent}
        deployStatus={deploymentStatus || app?.deployStatus}
      />
    </>
  );
}
