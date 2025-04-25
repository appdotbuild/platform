import localFont from 'next/font/local';
import type { NextFontWithVariable } from '@next/font';

export const geistSans: NextFontWithVariable = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
});
export const geistMono: NextFontWithVariable = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});
