import { geistMono, geistSans } from "@repo/design/base/fonts";
import "@repo/design/globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import "./global.css";

export const metadata: Metadata = {
  title: "Chatbots",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
