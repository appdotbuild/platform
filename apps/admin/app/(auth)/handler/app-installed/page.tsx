'use client';

import { useEffect } from 'react';
import { Card, CardContent } from '@appdotbuild/design/shadcn/card';
import { useUser } from '@appdotbuild/auth/stack';

export default function AppInstalledPage() {
  const user = useUser({ or: 'throw' });
  const account = user.useConnectedAccount('github');
  const data = account.useAccessToken();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const installationId = urlParams.get('installation_id');
    const code = urlParams.get('code');

    console.log({ installationId, code, user, data });
  }, []);

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="pt-6 text-center">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">App Installed</h1>
        <p className="text-gray-600 mb-4">You can now close this window.</p>
      </CardContent>
    </Card>
  );
}
