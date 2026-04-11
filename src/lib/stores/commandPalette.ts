import { writable } from "svelte/store";

type CommandPaletteState = {
  open: boolean;
  query: string;
};

function createCommandPaletteStore() {
  const { subscribe, update, set } = writable<CommandPaletteState>({
    open: false,
    query: "",
  });

  return {
    subscribe,
    open(query = ""): void {
      set({ open: true, query });
    },
    close(): void {
      update((state) => ({ ...state, open: false, query: "" }));
    },
    toggle(): void {
      update((state) => ({
        open: !state.open,
        query: state.open ? "" : state.query,
      }));
    },
    setQuery(query: string): void {
      update((state) => ({ ...state, query }));
    },
  };
}

export const commandPaletteStore = createCommandPaletteStore();
