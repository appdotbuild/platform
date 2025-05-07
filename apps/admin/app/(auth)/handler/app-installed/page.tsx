'use client';
import { Card, CardContent } from '@appdotbuild/design/shadcn/card';

export default function AppInstalledPage() {
  const urlParams = new URLSearchParams(window?.location?.search);
  const installationId = urlParams.get('installation_id');
  const code = urlParams.get('code');

  const error =
    !installationId || !code
      ? 'Something went wrong while installing the app. Please try again.'
      : null;

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <div className="text-red-500 text-5xl mb-4">✗</div>
          <h1 className="text-2xl font-bold mb-2">App Installation Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

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
