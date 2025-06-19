'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@appdotbuild/design/shadcn/card';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@appdotbuild/design/shadcn/hover-card';
import { Separator } from '@appdotbuild/design/shadcn/separator';
import { Button } from '@appdotbuild/design/shadcn/button';
import { useState } from 'react';
import { useUser } from '@appdotbuild/auth/stack';
import {
  GitHubLogoIcon,
  InfoCircledIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import './styles.css';

const AFTER_INSTALL_URL =
  process.env.NEXT_PUBLIC_AFTER_INSTALL_URL ||
  'http://localhost:3001/handler/app-installed';

const GITHUB_APP_INSTALL_URL = `https://github.com/apps/appdotbuild/installations/select_target?redirect_uri=${AFTER_INSTALL_URL}`;

export default function CliAuthConfirmPage() {
  const [authorizing, setAuthorizing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [canInstallApps, setCanInstallApps] = useState(false);
  const [hideGithubAppInstall, setHideGithubAppInstall] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const user = useUser({ or: 'redirect' });

  const account = user.useConnectedAccount('github', { or: 'redirect' });
  const { accessToken } = account.useAccessToken();

  const handleAuthorize = async () => {
    if (authorizing) return;
    setAuthorizing(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const loginCode = urlParams.get('login_code');

      if (!loginCode) {
        throw new Error('Missing login code in URL parameters');
      }

      const refreshToken = (await user.currentSession.getTokens()).refreshToken;

      if (!refreshToken) {
        throw new Error('You must be logged in to authorize CLI access');
      }

      // Send the CLI login request to our internal API route
      const response = await fetch('/api/auth/cli/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_code: loginCode,
          refresh_token: refreshToken,
          access_token: accessToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authorization failed');
      }

      const data = await response.json();

      setSuccess(true);
      setCanInstallApps(data.canInstallApps);
    } catch (err) {
      setError(err as Error);
    } finally {
      setAuthorizing(false);
    }
  };

  const openGithubAppInstall = () => {
    window.open(GITHUB_APP_INSTALL_URL);
  };

  const handleHideGithubAppInstall = () => {
    setHideGithubAppInstall(!hideGithubAppInstall);
  };

  if (success) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center h-screen max-w-md mx-auto">
        <Card
          className={`w-full shadow-md cli-confirm-card ${
            hideGithubAppInstall ? 'no-app' : ''
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-center">
            <CardTitle className="text-2xl font-semibold text-gray-800">
              <div className="text-center text-green-500 text-xl mb-4 bg-green-500/10 rounded-full p-2 w-16 h-16 mx-auto successful">
                <CheckIcon className=" w-12 h-12 text-green-500" />
              </div>
              CLI Authorization Successful
            </CardTitle>
          </CardHeader>
        </Card>

        {canInstallApps && (
          <div
            className={`flex flex-col gap-2 items-center justify-center cursor-pointer close-window ${
              hideGithubAppInstall ? 'showing' : 'hiding'
            }`}
            onClick={handleHideGithubAppInstall}
          >
            <ChevronDownIcon className="w-4 h-4" />
            <p className="text-gray-600">
              You can close this window now and start creating apps!
            </p>
          </div>
        )}

        {!hideGithubAppInstall && <Separator className="bg-gray-100 mb-4" />}

        {canInstallApps && (
          <div
            className={`shadow-md github-app-section ${
              hideGithubAppInstall ? 'hiding' : 'showing'
            }`}
          >
            <Card className="w-full shadow-md">
              <CardHeader className="flex flex-row items-center justify-center">
                <CardTitle className="text-2xl font-semibold text-gray-800">
                  Github App Installation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  You can now install the App.build Github App in your
                  organization / repositories of choice.
                </p>

                <HoverCard>
                  <HoverCardTrigger className="flex items-center justify-center text-gray-500 text-center text-sm mb-4">
                    <span className="flex items-center gap-2 cursor-pointer">
                      <InfoCircledIcon className="w-4 h-4" /> Why do I need
                      this?
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="flex flex-col gap-2">
                    <p>
                      The App.build Github App is used to create new
                      repositories in your account.
                    </p>
                    <p>
                      If you don't want that, you can still use the product and
                      the repositories will be created in our organization.
                    </p>
                  </HoverCardContent>
                </HoverCard>
                <Separator className="my-4 mx-auto w-1/2 bg-gray-100" />
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleHideGithubAppInstall}
                  >
                    Skip for now
                  </Button>
                  <Button onClick={openGithubAppInstall}>
                    <GitHubLogoIcon className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-screen max-w-md mx-auto">
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-5xl mb-4">×</div>
            <h1 className="text-2xl font-bold mb-2">Authorization Failed</h1>
            <p className="text-red-600 mb-2">
              Failed to authorize the CLI application:
            </p>
            <p className="text-red-600 mb-4">{error.message}</p>
            <div className="space-x-2">
              <Button onClick={() => setError(null)}>Try Again</Button>
              <Button variant="outline" onClick={() => window.close()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center h-screen max-w-md mx-auto">
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Authorize CLI Application</h1>
          <p className="text-gray-600 mb-4">
            A command line application is requesting access to your account.
            Click the button below to authorize it.
          </p>
          <p className="text-red-600 mb-4">
            WARNING: Make sure you trust the command line application, as it
            will gain access to your account. If you did not initiate this
            request, you can close this page and ignore it. We will never send
            you this link via email or any other means.
          </p>
          <div className="space-x-2">
            <Button onClick={handleAuthorize} disabled={authorizing}>
              {authorizing ? 'Authorizing...' : 'Authorize'}
            </Button>
            <Button variant="outline" onClick={() => window.close()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
