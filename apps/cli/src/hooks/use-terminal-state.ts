export const useTerminalState = () => {
  const clearTerminal = () => {
    console.clear();
  };

  return {
    clearTerminal,
  };
};
