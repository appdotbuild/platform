export const useTerminalState = () => {
  const clearTerminal = () => {
    process.stdout.write('\x1b[2J');
    process.stdout.write('\x1b[H');
  };

  return {
    clearTerminal,
  };
};
