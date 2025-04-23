/* eslint-disable no-console */
export const logger = {
  info: (message: string) => {
    console.log(message);
  },
  error: (message: string, error?: string) => {
    console.error(message, error);
  },
};
