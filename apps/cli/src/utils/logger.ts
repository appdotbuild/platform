import chalk from 'chalk';

/* eslint-disable no-console */
export const logger = {
  info: (...args: Parameters<typeof console.log>) => {
    console.log(...args);
  },
  warn: (...args: Parameters<typeof console.warn>) => {
    console.warn(...args);
  },
  error: (...args: Parameters<typeof console.error>) => {
    console.error(...args);
  },
  link: (message: string, url: string) => {
    console.log('');
    console.log(chalk.bold(message));
    console.log(chalk.blueBright(url));
    console.log('');
  },
};
