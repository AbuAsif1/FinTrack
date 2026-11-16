'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface PageDescCtx {
  description: string;
  setDescription: (d: string) => void;
}

export const PageDescriptionContext = createContext<PageDescCtx>({
  description: '',
  setDescription: () => {},
});

export function PageDescriptionProvider({ children }: { children: React.ReactNode }) {
  const [description, setDescription] = useState('');
  return (
    <PageDescriptionContext.Provider value={{ description, setDescription }}>
      {children}
    </PageDescriptionContext.Provider>
  );
}

/** Call inside a page to register its description with the topbar. */
export function usePageDescription(text: string) {
  const { setDescription } = useContext(PageDescriptionContext);
  useEffect(() => {
    setDescription(text);
    return () => setDescription('');
  }, [text, setDescription]);
}
