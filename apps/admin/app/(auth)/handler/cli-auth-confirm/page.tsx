"use client";

import { Card, CardContent } from "@appdotbuild/design/shadcn/card";
import { Button } from "@appdotbuild/design/shadcn/button";
import { useState } from "react";
import { useUser } from "@appdotbuild/auth/stack";

export default function CliAuthConfirmPage() {
  const [authorizing, setAuthorizing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const user = useUser({ or: "redirect" });

  const handleAuthorize = async () => {
    if (authorizing) return;
    setAuthorizing(true);

    try {
      // Get login code from URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const loginCode = urlParams.get("login_code");

      if (!loginCode) {
        throw new Error("Missing login code in URL parameters");
      }

      const refreshToken = (await user.currentSession.getTokens()).refreshToken;
      if (!refreshToken) {
        throw new Error("You must be logged in to authorize CLI access");
      }

      // Send the CLI login request to our internal API route
      const response = await fetch("/api/auth/cli/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_code: loginCode,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Authorization failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err as Error);
    } finally {
      setAuthorizing(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="pt-6 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">
            CLI Authorization Successful
          </h1>
          <p className="text-gray-600 mb-4">
            The CLI application has been authorized successfully. You can now
            close this window and return to the command line.
          </p>
          <Button onClick={() => window.close()}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="pt-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Authorize CLI Application</h1>
        <p className="text-gray-600 mb-4">
          A command line application is requesting access to your account. Click
          the button below to authorize it.
        </p>
        <p className="text-red-600 mb-4">
          WARNING: Make sure you trust the command line application, as it will
          gain access to your account. If you did not initiate this request, you
          can close this page and ignore it. We will never send you this link
          via email or any other means.
        </p>
        <div className="space-x-2">
          <Button onClick={handleAuthorize} disabled={authorizing}>
            {authorizing ? "Authorizing..." : "Authorize"}
          </Button>
          <Button variant="outline" onClick={() => window.close()}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
