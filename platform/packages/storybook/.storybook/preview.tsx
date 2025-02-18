import type { Preview, ReactRenderer } from "@storybook/react";

import { withThemeByClassName } from "@storybook/addon-themes";
import React from "react";
import "@repo/design/globals.css";
// TODO: for stories css: https://github.com/storybookjs/storybook/discussions/17062
//import '../../../apps/saas/app/global.css';

import localFont from "next/font/local";
// Not yet supported by Storybook:
//import { geistSans, geistMono } from '@repo/design/base/fonts';
const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <main className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Story />
      </main>
    ),
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
