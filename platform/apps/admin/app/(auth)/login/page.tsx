import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@repo/auth";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github");
      }}
    >
      <button type="submit">Signin with GitHub</button>
    </form>
  );
}
