import { stackServerApp } from "@appdotbuild/auth";
import { StackProvider, StackTheme } from "@appdotbuild/auth/stack";
import type * as React from "react";

export default function ProvidersServer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StackProvider app={stackServerApp}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  );
}
