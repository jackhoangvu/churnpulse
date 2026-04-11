import { writable } from "svelte/store";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
};

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
};

const STACK_LIMIT = 3;

function createToastStore() {
  const { subscribe, update, set } = writable<ToastItem[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function dismiss(id: string): void {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }

    update((items) => items.filter((item) => item.id !== id));
  }

  function push(input: ToastInput): string {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const toast: ToastItem = {
      id,
      message: input.message,
      type: input.type ?? "info",
      duration: input.duration ?? 4000,
      createdAt: Date.now(),
      ...(input.title ? { title: input.title } : {}),
    };

    update((items) => {
      const next = [toast, ...items].slice(0, STACK_LIMIT);
      for (const stale of items.slice(STACK_LIMIT - 1)) {
        dismiss(stale.id);
      }

      return next;
    });

    const timer = setTimeout(() => {
      dismiss(id);
    }, toast.duration);
    timers.set(id, timer);

    return id;
  }

  function clear(): void {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }

    timers.clear();
    set([]);
  }

  return {
    subscribe,
    push,
    dismiss,
    clear,
  };
}

export const toastStore = createToastStore();

export const toast = {
  success(message: string, title?: string): string {
    return toastStore.push({
      type: "success",
      message,
      ...(title ? { title } : {}),
    });
  },
  error(message: string, title?: string): string {
    return toastStore.push({
      type: "error",
      message,
      ...(title ? { title } : {}),
    });
  },
  warning(message: string, title?: string): string {
    return toastStore.push({
      type: "warning",
      message,
      ...(title ? { title } : {}),
    });
  },
  info(message: string, title?: string): string {
    return toastStore.push({
      type: "info",
      message,
      ...(title ? { title } : {}),
    });
  },
};
