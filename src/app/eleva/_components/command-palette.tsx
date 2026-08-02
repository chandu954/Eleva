'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

interface Ctx { open: () => void; close: () => void }
const CommandPaletteCtx = createContext<Ctx>({ open: () => {}, close: () => {} });
export const useCommandPalette = () => useContext(CommandPaletteCtx);

const CommandPaletteDialog = dynamic(() => import('./command-palette-dialog').then((m) => m.CommandPaletteDialog), {
  ssr: false,
  loading: () => null,
});

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      } else if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CommandPaletteCtx.Provider value={{ open, close }}>
      {children}
      {isOpen && <CommandPaletteDialog isOpen={isOpen} onClose={close} />}
    </CommandPaletteCtx.Provider>
  );
}
