import { useParams } from '@tanstack/react-router';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '~/hooks/useApp';
import { ToggleButton } from '~/components/shared/toggle-button';

export function ChatInfo() {
  const { chatId } = useParams({ from: '/chat/$chatId' });
  const { app, isLoading } = useApp(chatId);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  };

  if (isLoading && isOpen) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-2">
        <ToggleButton
          isOpen={isOpen}
          onClick={handleToggle}
          icon={Info}
          title="App Info"
        />
        <div className="mt-2 rounded-lg bg-white shadow-sm overflow-hidden border border-gray-300">
          <div className="p-6 text-center text-gray-500">
            Loading app status...
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div
        key="status"
        className={hasLoadedOnce ? 'animate-slide-fade-in' : ''}
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">App Name</p>
              <p className="font-medium text-gray-900">{app?.appName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Production URL</p>
              {app?.appUrl ? (
                <a
                  href={app?.appUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-500 hover:text-blue-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
                >
                  {app?.appUrl || 'Not available'}
                </a>
              ) : (
                <p className="font-medium text-gray-900">Not available</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Repository</p>
              <a
                href={app?.repositoryUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-500 hover:text-blue-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis block"
              >
                {app?.repositoryUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-2">
      <ToggleButton
        isOpen={isOpen}
        onClick={handleToggle}
        icon={Info}
        title="App Info"
      />

      <div
        className={`mt-2 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-300 ease-in-out border ${
          isOpen
            ? 'max-h-96 opacity-100 border-gray-300'
            : 'max-h-0 opacity-0 border-transparent'
        }`}
      >
        {renderContent()}
      </div>
    </div>
  );
}
