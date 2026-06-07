import { create } from 'zustand';
import type { Command } from './commands';

interface CommandPaletteState {
  open: boolean;
  contextCommands: Record<string, Command[]>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  registerCommands: (key: string, commands: Command[]) => void;
  unregisterCommands: (key: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  contextCommands: {},
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
  registerCommands: (key, commands) =>
    set((state) => ({
      contextCommands: { ...state.contextCommands, [key]: commands },
    })),
  unregisterCommands: (key) =>
    set((state) => {
      const next = { ...state.contextCommands };
      delete next[key];
      return { contextCommands: next };
    }),
}));
