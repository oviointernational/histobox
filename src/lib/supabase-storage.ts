import { supabase } from '@/integrations/supabase/client';
import type { StateStorage } from 'zustand/middleware';

let writeTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingWrites: Record<string, string> = {};
let lastLoadedValues: Record<string, string> = {};
let inFlightFlush: Promise<void> | null = null;
const activeSubscriptions: Record<string, ReturnType<typeof supabase.channel>> = {};
let hydrationOk = false;
let applyingRemoteState = false;

/** Called by the store after a successful rehydrate. Until this is true,
 *  writes are buffered but NOT flushed — preventing default state from
 *  overwriting real cloud data when the network is flaky. */
export function markHydrationSucceeded() {
  hydrationOk = true;
  // Drain anything queued during the hydration window.
  if (Object.keys(pendingWrites).length > 0) scheduleFlush();
}

export function applyRemoteStateWithoutEcho(apply: () => void) {
  applyingRemoteState = true;
  try {
    apply();
  } finally {
    setTimeout(() => { applyingRemoteState = false; }, 0);
  }
}

export function subscribeToCloudState(name: string, onValue: (value: any) => void) {
  if (activeSubscriptions[name]) return activeSubscriptions[name];
  activeSubscriptions[name] = supabase
    .channel(`app-state-${name}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state', filter: `key=eq.${name}` },
      (payload: any) => {
        if (!payload.new?.value) return;
        const next = JSON.stringify(payload.new.value);
        if (lastLoadedValues[name] === next || pendingWrites[name] === next) return;
        lastLoadedValues[name] = next;
        onValue(payload.new.value);
      }
    )
    .subscribe();
  return activeSubscriptions[name];
}

async function flushNow(): Promise<void> {
  if (writeTimeout) {
    clearTimeout(writeTimeout);
    writeTimeout = null;
  }
  const writes = { ...pendingWrites };
  pendingWrites = {};
  if (Object.keys(writes).length === 0) return;
  for (const [key, val] of Object.entries(writes)) {
    try {
      const { error } = await supabase
        .from('app_state')
        .upsert({
          key,
          value: JSON.parse(val),
          updated_at: new Date().toISOString(),
        });
      if (error) {
        console.error('[supabaseStorage] upsert failed, requeuing', key, error);
        // Re-queue so we don't lose the write silently
        pendingWrites[key] = val;
      }
    } catch (err) {
      console.error('[supabaseStorage] write threw, requeuing', key, err);
      pendingWrites[key] = val;
    }
  }
}

function scheduleFlush() {
  if (writeTimeout) clearTimeout(writeTimeout);
  writeTimeout = setTimeout(() => {
    if (!hydrationOk) return; // refuse to write defaults over real data
    inFlightFlush = flushNow().finally(() => { inFlightFlush = null; });
  }, 500);
}

// Flush pending writes when the tab is hidden or unloaded so nothing is lost.
if (typeof window !== 'undefined') {
  const flushSync = () => {
    if (Object.keys(pendingWrites).length === 0) return;
    // Best-effort synchronous-ish flush
    flushNow();
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSync();
  });
  window.addEventListener('pagehide', flushSync);
  window.addEventListener('beforeunload', flushSync);
}

export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // Retry to avoid transient nulls that would cause persist to use defaults
    // and then overwrite cloud data with empty state.
    let lastError: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const { data, error } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', name)
          .maybeSingle();
        if (error) {
          lastError = error;
        } else {
          if (!data) {
            // Truly absent row — only treat as null on the FIRST attempt's confirmed absence.
            // Confirm with a second attempt to avoid race with cold cache.
            if (attempt === 0) { await new Promise(r => setTimeout(r, 400)); continue; }
            return null;
          }
          const json = JSON.stringify(data.value);
          lastLoadedValues[name] = json;
          return json;
        }
      } catch (err) {
        lastError = err;
      }
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
    // Could not reach the cloud. Throwing makes Zustand keep its current
    // (defaults) state but it WILL still call setItem later. To avoid clobbering
    // cloud data with defaults, refuse to declare hydration complete by throwing.
    console.error('[supabaseStorage] getItem failed after retries; refusing to hydrate', name, lastError);
    throw new Error('Cloud storage unreachable; refusing to overwrite with defaults.');
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (applyingRemoteState) {
      lastLoadedValues[name] = value;
      return;
    }
    // Guard: never persist if the new value is "obviously empty" while we previously
    // had a non-empty value loaded. This prevents accidental wipes from a failed hydration.
    try {
      const prev = lastLoadedValues[name];
      if (prev && prev.length > 200 && value.length < prev.length / 4) {
        // Heuristic: shrunk by >75% — log a warning but still allow (user may have deleted things)
        console.warn('[supabaseStorage] state size shrunk significantly', { prev: prev.length, next: value.length });
      }
    } catch { /* ignore */ }
    pendingWrites[name] = value;
    lastLoadedValues[name] = value;
    scheduleFlush();
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await supabase.from('app_state').delete().eq('key', name);
      delete lastLoadedValues[name];
      delete pendingWrites[name];
    } catch {
      // ignore
    }
  },
};
