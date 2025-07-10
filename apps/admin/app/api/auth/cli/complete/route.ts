import { NextResponse } from 'next/server';

const ENDPOINTS = [
  'https://api.github.com/user',
  'https://api.github.com/user/installations',
] as const;

export async function POST(request: Request) {
  try {
    const { login_code, refresh_token, access_token } = await request.json();

    if (!login_code || !refresh_token || !access_token) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }
    const response = await fetch(
      'https://api.stack-auth.com/api/v1/auth/cli/complete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          'x-stack-access-type': 'server',
          'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
        },
        body: JSON.stringify({
          login_code,
          refresh_token,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Stack Auth Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error,
        headers: Object.fromEntries(response.headers.entries()),
      });

      return NextResponse.json(
        { error: `Stack Auth Error: ${error}` },
        { status: response.status },
      );
    }

    const [user, appInstallations] = await Promise.all(
      ENDPOINTS.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        return await response.json();
      }),
    );

    /**
     * EMU users can't install github apps, so we check if there's any app installed for them.
     */
    const isDataUser = user.login.includes('_');
    const canInstallApps = !isDataUser;

    const data = await response.json();

    return NextResponse.json({ ...data, canInstallApps });
  } catch (error) {
    console.error('CLI auth completion error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
