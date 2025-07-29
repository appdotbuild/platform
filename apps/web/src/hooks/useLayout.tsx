import { createContext, useContext, useState } from 'react';

const LayoutContext = createContext<{
  mxAuto: boolean;
  setMxAuto: (mxAuto: boolean) => void;
}>({
  mxAuto: true,
  setMxAuto: () => {},
});

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [mxAuto, setMxAuto] = useState(true);

  return (
    <LayoutContext.Provider value={{ mxAuto, setMxAuto }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
