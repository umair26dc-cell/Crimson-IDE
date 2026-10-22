/**
 * Terminal Command History Persistence Engine
 * Manages loading, appending, deduplicating, and persisting CLI command history
 * in localStorage across browser page reloads and multiple tabs.
 */

export const TERMINAL_HISTORY_STORAGE_KEY = 'cscode_terminal_command_history';
export const TERMINAL_HISTORY_LEGACY_KEYS = ['ccode_terminal_command_history', 'cscode_terminal_history'];
export const MAX_TERMINAL_HISTORY = 100;
export const TERMINAL_HISTORY_CLEARED_EVENT = 'cscode-terminal-history-cleared';

/**
 * Loads persisted terminal command history from localStorage.
 * Safely handles parsing, validation, and legacy storage keys.
 */
export function loadTerminalHistoryFromStorage(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    // 1. Try primary storage key
    let raw = localStorage.getItem(TERMINAL_HISTORY_STORAGE_KEY);

    // 2. Fallback to legacy keys if primary not found
    if (!raw) {
      for (const legacyKey of TERMINAL_HISTORY_LEGACY_KEYS) {
        const legacyVal = localStorage.getItem(legacyKey);
        if (legacyVal) {
          raw = legacyVal;
          // Migrate to primary key
          try {
            localStorage.setItem(TERMINAL_HISTORY_STORAGE_KEY, legacyVal);
          } catch {}
          break;
        }
      }
    }

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out non-strings and empty values, trim and slice to MAX_TERMINAL_HISTORY
    const cleaned = parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
      .slice(0, MAX_TERMINAL_HISTORY);

    return cleaned;
  } catch (err) {
    console.warn('[Terminal] Failed to load command history from localStorage:', err);
    return [];
  }
}

/**
 * Persists an array of command history strings to localStorage.
 */
export function saveTerminalHistoryToStorage(history: string[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    if (!history || history.length === 0) {
      localStorage.removeItem(TERMINAL_HISTORY_STORAGE_KEY);
      for (const legacyKey of TERMINAL_HISTORY_LEGACY_KEYS) {
        localStorage.removeItem(legacyKey);
      }
      return true;
    }

    const payload = JSON.stringify(history.slice(0, MAX_TERMINAL_HISTORY));
    localStorage.setItem(TERMINAL_HISTORY_STORAGE_KEY, payload);
    return true;
  } catch (err) {
    console.warn('[Terminal] Failed to save command history to localStorage:', err);
    return false;
  }
}

/**
 * Appends a new command to history.
 * Places the newest command at index 0 (bash-style recall where ArrowUp gets index 0),
 * deduplicates if identical to the immediate previous command, and enforces max cap.
 */
export function appendCommandToHistory(existingHistory: string[], rawCommand: string): string[] {
  const trimmed = rawCommand.trim();
  if (!trimmed) return existingHistory;

  // Don't duplicate if identical to the most recent command (index 0)
  if (existingHistory.length > 0 && existingHistory[0] === trimmed) {
    return existingHistory;
  }

  // Remove any immediate duplicate and prepend
  const filtered = existingHistory.filter((c, i) => i !== 0 || c !== trimmed);
  return [trimmed, ...filtered].slice(0, MAX_TERMINAL_HISTORY);
}

/**
 * Purges command history from localStorage and dispatches a cross-tab/cross-component event.
 */
export function clearTerminalHistoryFromStorage(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.removeItem(TERMINAL_HISTORY_STORAGE_KEY);
    for (const legacyKey of TERMINAL_HISTORY_LEGACY_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    window.dispatchEvent(new CustomEvent(TERMINAL_HISTORY_CLEARED_EVENT));
    return true;
  } catch (err) {
    console.warn('[Terminal] Failed to purge command history from localStorage:', err);
    return false;
  }
}
