import { geistMono, geistSans } from '@appdotbuild/design/base/fonts';
import type { Metadata } from 'next';
import ProvidersServer from './providers.server';
import ProvidersClient from './providers.client';
import '@appdotbuild/design/globals.css';
import './global.css';

export const metadata: Metadata = {
  title: 'Apps',
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
