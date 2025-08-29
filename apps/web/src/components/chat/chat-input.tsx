import { Button } from '~/components/shared/button';
import { StackPicker } from '~/components/chat/stack/stack-picker';
import { Textarea } from '~/components/shared/text-area';
import { useUser } from '@stackframe/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useState, useEffect } from 'react';
import { useChat } from '~/hooks/useChat';
import { useFetchMessageLimit } from '~/hooks/userMessageLimit';
import { isAppPage, isHomePage } from '~/utils/router-checker';
import type { TemplateId } from '@appdotbuild/core';
import type {
  DeploymentTarget,
  DeploymentTargetSelectorHandle,
  DeploymentConfig,
} from '~/components/chat/deployment/deployment-target-selector';
import { useCurrentApp } from '~/hooks/useCurrentApp';
import { cn } from '@design/lib';

interface ChatInputProps {
  deploymentTarget?: DeploymentTarget;
  validateBeforeSubmit?: DeploymentTargetSelectorHandle['validateConfiguration'];
}

export function ChatInput({
  deploymentTarget,
  validateBeforeSubmit,
}: ChatInputProps) {
  const user = useUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { createNewApp, sendMessage, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const { userLimit, isLoading: isLoadingMessageLimit } =
    useFetchMessageLimit();
  const { currentAppTemplateId, currentAppDeploymentConfig } = useCurrentApp();
  const [selectedStack, setSelectedStack] =
    useState<TemplateId>(currentAppTemplateId);

  const isUserLimitReached = userLimit?.isUserLimitReached;
  const buttonDisabled =
    isUserLimitReached || isLoadingMessageLimit || isLoading;

  // Auto-select NiceGUI when Databricks is selected
  useEffect(() => {
    if (deploymentTarget === 'databricks') {
      setSelectedStack('nicegui_agent');
    } else {
      setSelectedStack(currentAppTemplateId);
    }
  }, [deploymentTarget, currentAppTemplateId]);

  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() && !isLoading) {
      let deploymentConfig: DeploymentConfig | undefined;
      // Validate before submit if validation function is provided
      if (validateBeforeSubmit) {
        const validationResult = await validateBeforeSubmit();
        if (!validationResult.success) {
          return;
        }
        deploymentConfig = validationResult.config;
      }

      // if not logged, store the message and use it later to continue
      if (isHomePage(pathname) && !user) {
        localStorage.setItem('pendingMessage', inputValue);
        localStorage.setItem('pendingTemplateId', selectedStack);
        localStorage.setItem(
          'pendingDeploymentConfig',
          JSON.stringify(deploymentConfig ?? {}),
        );
        navigate({ to: '/handler/sign-in' });
        return;
      }

      if (isHomePage(pathname)) {
        createNewApp({
          firstInput: inputValue,
          templateId: selectedStack,
          deploymentConfig,
        });
      } else {
        await sendMessage({
          message: inputValue,
          templateId: selectedStack,
          deploymentConfig: currentAppDeploymentConfig || deploymentConfig,
        });
      }

      setInputValue('');
    }
  }, [
    inputValue,
    pathname,
    user,
    navigate,
    createNewApp,
    sendMessage,
    isLoading,
    selectedStack,
    currentAppDeploymentConfig,
    validateBeforeSubmit,
  ]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.currentTarget.value);
    },
    [],
  );

  const showStackPicker = isHomePage(pathname);

  const getPlaceholderText = () => {
    if (isAppPage(pathname)) {
      return 'Type your message...';
    }
    return 'Describe the app you want to build...';
  };

  return (
    <div className="flex-col py-4.5 w-full border border-dashed border-input bg-background text-black flex items-center relative px-4 lg:px-6 gap-2 md:gap-4">
      <div className="flex justify-between w-full">
        <Textarea
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-sm md:placeholder:text-base resize-none"
          placeholder={getPlaceholderText()}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={buttonDisabled}
          autoFocus
          minHeight={isHomePage(pathname) ? 50 : 30}
          maxHeight={120}
        />
        <div
          className={cn(
            'transition-all duration-300 ease-out flex items-center',
            inputValue.length > 0
              ? 'w-auto opacity-100'
              : 'w-0 opacity-0 overflow-hidden',
          )}
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="relative before:content-['↵'] before:md:content-none before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-base md:before:hidden text-[0px] md:text-base shrink-0"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || buttonDisabled}
          >
            {isAppPage(pathname) ? 'Send' : "Let's start!"}
          </Button>
        </div>
      </div>

      {/* Stack Picker - Bottom Left Corner */}
      {showStackPicker && (
        <div className="flex justify-start w-full">
          <StackPicker
            selectedStack={selectedStack}
            onStackChange={setSelectedStack}
            disabled={isLoading}
            deploymentTarget={deploymentTarget}
          />
        </div>
      )}
    </div>
  );
}
