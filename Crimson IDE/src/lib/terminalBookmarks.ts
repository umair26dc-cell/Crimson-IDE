import { TerminalBookmark, FileItem } from '../types';

export const TERMINAL_BOOKMARKS_STORAGE_KEY = 'cscode_terminal_bookmarks';
export const TERMINAL_BOOKMARKS_CHANGED_EVENT = 'cscode_terminal_bookmarks_changed';

export const DEFAULT_TERMINAL_BOOKMARKS: TerminalBookmark[] = [
  {
    id: 'bm-root',
    name: 'Root Workspace',
    path: '~/workspace',
    description: 'Root workspace directory',
    createdAt: 1700000000000,
  },
  {
    id: 'bm-src',
    name: 'src',
    path: '~/workspace/src',
    description: 'Application source code',
    createdAt: 1700000001000,
  },
  {
    id: 'bm-components',
    name: 'components',
    path: '~/workspace/src/components',
    description: 'React components and modules',
    createdAt: 1700000002000,
  },
  {
    id: 'bm-lib',
    name: 'lib',
    path: '~/workspace/src/lib',
    description: 'Core utilities, engines, and helpers',
    createdAt: 1700000003000,
  },
];

/**
 * Normalizes user input or folder path into standard terminal CWD format (~/workspace/...)
 */
export function normalizeDirectoryPath(rawPath: string): string {
  if (!rawPath) return '~/workspace';
  let cleaned = rawPath.trim();

  // If already starts with ~/
  if (cleaned.startsWith('~/')) {
    // If just ~ or ~/
    if (cleaned === '~' || cleaned === '~/') return '~/workspace';
    return cleaned.replace(/\/+$/, '');
  }

  // If starts with ~
  if (cleaned === '~') return '~/workspace';

  // If starts with /
  cleaned = cleaned.replace(/^\/+/, '');

  // If starts with workspace/
  if (cleaned.startsWith('workspace/')) {
    return `~/${cleaned}`.replace(/\/+$/, '');
  }
  if (cleaned === 'workspace') {
    return '~/workspace';
  }

  // Remove relative prefix ./
  cleaned = cleaned.replace(/^\.\//, '');

  if (!cleaned) return '~/workspace';

  return `~/workspace/${cleaned}`.replace(/\/+$/, '');
}

/**
 * Load bookmarks from localStorage or return defaults
 */
export function loadTerminalBookmarks(): TerminalBookmark[] {
  if (typeof localStorage === 'undefined') return [...DEFAULT_TERMINAL_BOOKMARKS];

  try {
    const raw = localStorage.getItem(TERMINAL_BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      saveTerminalBookmarks(DEFAULT_TERMINAL_BOOKMARKS);
      return [...DEFAULT_TERMINAL_BOOKMARKS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...DEFAULT_TERMINAL_BOOKMARKS];
  } catch (err) {
    console.error('Failed to load terminal bookmarks:', err);
    return [...DEFAULT_TERMINAL_BOOKMARKS];
  }
}

/**
 * Persist bookmarks to localStorage and dispatch event
 */
export function saveTerminalBookmarks(bookmarks: TerminalBookmark[]): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(TERMINAL_BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    window.dispatchEvent(
      new CustomEvent(TERMINAL_BOOKMARKS_CHANGED_EVENT, { detail: bookmarks })
    );
  } catch (err) {
    console.error('Failed to save terminal bookmarks:', err);
  }
}

/**
 * Add a new terminal directory bookmark
 */
export function addTerminalBookmark(
  name: string,
  path: string,
  description?: string
): { bookmarks: TerminalBookmark[]; added: TerminalBookmark } {
  const current = loadTerminalBookmarks();
  const normalizedPath = normalizeDirectoryPath(path);
  const cleanName = (name && name.trim()) || normalizedPath.split('/').pop() || 'workspace';

  // Check if a bookmark with the exact path already exists
  const existingIdx = current.findIndex(
    (b) => b.path.toLowerCase() === normalizedPath.toLowerCase()
  );

  if (existingIdx !== -1) {
    // Update existing bookmark name
    const updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      name: cleanName,
      description: description || updated[existingIdx].description,
    };
    saveTerminalBookmarks(updated);
    return { bookmarks: updated, added: updated[existingIdx] };
  }

  const newBookmark: TerminalBookmark = {
    id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    path: normalizedPath,
    description: description || `Jump to ${normalizedPath}`,
    createdAt: Date.now(),
  };

  const updated = [...current, newBookmark];
  saveTerminalBookmarks(updated);
  return { bookmarks: updated, added: newBookmark };
}

/**
 * Remove bookmark by ID or exact name
 */
export function removeTerminalBookmark(idOrName: string): TerminalBookmark[] {
  const current = loadTerminalBookmarks();
  const lower = idOrName.toLowerCase().trim();
  const filtered = current.filter(
    (b) => b.id !== idOrName && b.name.toLowerCase() !== lower && b.path.toLowerCase() !== lower
  );
  saveTerminalBookmarks(filtered);
  return filtered;
}

/**
 * Search or find bookmark by index (1-based), name, or partial path
 */
export function findBookmarkByQuery(
  query: string,
  bookmarks: TerminalBookmark[]
): TerminalBookmark | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();

  // Check 1-based index (e.g. "1", "2")
  const num = parseInt(q, 10);
  if (!isNaN(num) && num >= 1 && num <= bookmarks.length) {
    return bookmarks[num - 1];
  }

  // Exact ID match
  const byId = bookmarks.find((b) => b.id.toLowerCase() === q);
  if (byId) return byId;

  // Exact name match
  const byName = bookmarks.find((b) => b.name.toLowerCase() === q);
  if (byName) return byName;

  // Exact path match
  const byPath = bookmarks.find(
    (b) => b.path.toLowerCase() === q || normalizeDirectoryPath(b.path).toLowerCase() === q
  );
  if (byPath) return byPath;

  // Partial name match
  const byPartialName = bookmarks.find((b) => b.name.toLowerCase().includes(q));
  if (byPartialName) return byPartialName;

  // Partial path match
  return bookmarks.find((b) => b.path.toLowerCase().includes(q));
}

/**
 * Extracts all folder directory paths from the workspace files tree
 */
export function extractWorkspaceDirectories(
  files: FileItem[]
): { path: string; name: string }[] {
  const directories: { path: string; name: string }[] = [
    { path: '~/workspace', name: 'Root (workspace)' },
  ];
  const seen = new Set<string>(['~/workspace']);

  function traverse(items: FileItem[], currentParent: string) {
    for (const item of items) {
      if (item.isFolder) {
        const fullRel = currentParent ? `${currentParent}/${item.name}` : item.name;
        const norm = normalizeDirectoryPath(fullRel);
        if (!seen.has(norm)) {
          seen.add(norm);
          directories.push({ path: norm, name: item.name });
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children, fullRel);
        }
      }
    }
  }

  traverse(files, '');

  // Add default recognized directories if not already discovered
  const common = ['src', 'src/components', 'src/lib', 'public'];
  for (const c of common) {
    const norm = normalizeDirectoryPath(c);
    if (!seen.has(norm)) {
      seen.add(norm);
      directories.push({ path: norm, name: c.split('/').pop() || c });
    }
  }

  return directories;
}
