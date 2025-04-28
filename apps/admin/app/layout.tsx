import { geistMono, geistSans } from '@appdotbuild/design/base/fonts';
import '@appdotbuild/design/globals.css';
import type { Metadata } from 'next';
import './global.css';
import ProvidersServer from './providers.server';
import ProvidersClient from './providers.client';

export const metadata: Metadata = {
  title: 'Chatbots',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ProvidersServer>
          <ProvidersClient>{children}</ProvidersClient>
        </ProvidersServer>
      </body>
    </html>
  );
}
