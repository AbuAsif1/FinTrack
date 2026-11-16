'use client';

import { createContext, useContext } from 'react';

interface GlobalModalsCtx {
  openAdd: () => void;
  openAddIncome: () => void;
}

export const GlobalModalsContext = createContext<GlobalModalsCtx>({
  openAdd: () => {},
  openAddIncome: () => {},
});

export function useGlobalModals() {
  return useContext(GlobalModalsContext);
}
