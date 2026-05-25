import { useSyncExternalStore } from 'react';

let currentSessionId: string | null = null;
let refreshTick = 0;
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

export const chatSessionStore = {
  get sessionId() { return currentSessionId; },
  get refreshKey() { return refreshTick; },
  setSession(id: string | null) {
    if (currentSessionId === id) return;
    currentSessionId = id;
    emit();
  },
  bumpRefresh() {
    refreshTick++;
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useChatSession() {
  const sessionId = useSyncExternalStore(
    chatSessionStore.subscribe,
    () => chatSessionStore.sessionId,
    () => null,
  );
  const refreshKey = useSyncExternalStore(
    chatSessionStore.subscribe,
    () => chatSessionStore.refreshKey,
    () => 0,
  );
  return { sessionId, refreshKey, setSession: chatSessionStore.setSession, bumpRefresh: chatSessionStore.bumpRefresh };
}
