import { stackServerApp } from "@repo/auth";
import { StackProvider, StackTheme } from "@repo/auth/stack";
import type * as React from "react";

export default function ProvidersServer({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider app={stackServerApp}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  );
}
