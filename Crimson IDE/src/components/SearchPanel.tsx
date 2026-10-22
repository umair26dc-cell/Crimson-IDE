/**
 * SearchPanel Component
 * Comprehensive global search and replace interface across the entire workspace.
 * Features:
 * - Real-time reactive and debounced search
 * - Match Case (Aa), Match Whole Word (\b), Regular Expressions (.*)
 * - Preserve Case during replace (AB)
 * - File filtering: files to include / files to exclude with glob pattern support
 * - Grouped results tree with file icons, match count badges, and highlighted snippets
 * - Interactive navigation: jumping directly to line & column in editor
 * - Replace individual occurrence, replace in file, or replace all across workspace
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { FileItem, SearchMatch, SearchOptions, SearchHistoryItem, SearchHistorySortMode } from '../types';
import { SearchResultsSummary, calculateMatchRelevance } from '../lib/searchEngine';

const SEARCH_HISTORY_STORAGE_KEY = 'cscode_search_history';
const SEARCH_HISTORY_SORT_STORAGE_KEY = 'cscode_search_history_sort';

function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getRelevanceTier(score: number): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (score >= 80) {
    return {
      label: 'High Match',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 shadow-xs',
      dotClass: 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]',
    };
  }
  if (score >= 60) {
    return {
      label: 'Good Match',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/80 shadow-xs',
      dotClass: 'bg-amber-400',
    };
  }
  return {
    label: 'Partial Match',
    badgeClass: 'bg-[#151724] text-slate-400 border-[#2b2d42]',
    dotClass: 'bg-slate-400',
  };
}

// Helper to sort history items so pinned items always remain at the top, and within groups they are sorted by chosen mode
const sortHistoryItems = (
  items: SearchHistoryItem[],
  mode: SearchHistorySortMode = 'recent'
): SearchHistoryItem[] => {
  return [...items].sort((a, b) => {
    // 1. Pinned items always come first
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1;
    }
    // 2. Sort within each category by selected mode
    if (mode === 'alphabetical') {
      const cmp = a.query.localeCompare(b.query, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
    if (mode === 'frequency') {
      const freqA = a.useCount ?? 1;
      const freqB = b.useCount ?? 1;
      if (freqB !== freqA) {
        return freqB - freqA;
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    }
    // Default: 'recent' (timestamp descending, newest first)
    return (b.timestamp || 0) - (a.timestamp || 0);
  });
};

interface SearchPanelProps {
  files: FileItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchMatch[];
  searchSummary?: SearchResultsSummary | null;
  searchOptions: SearchOptions;
  onUpdateSearchOptions: (options: Partial<SearchOptions>) => void;
  onSelectSearchMatch: (match: SearchMatch) => void;
  onReplaceAll: (replaceText: string) => void;
  onReplaceInFile?: (fileId: string, replaceText: string) => void;
  onReplaceSingleMatch?: (match: SearchMatch, replaceText: string) => void;
  onDismissMatch?: (match: SearchMatch) => void;
  onDismissFile?: (fileId: string) => void;
  activeFileId?: string | null;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  files,
  searchQuery,
  onSearchChange,
  searchResults,
  searchSummary,
  searchOptions,
  onUpdateSearchOptions,
  onSelectSearchMatch,
  onReplaceAll,
  onReplaceInFile,
  onReplaceSingleMatch,
  onDismissMatch,
  onDismissFile,
  activeFileId,
}) => {
  // Replace inputs
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(true);
  const [showFilterDetails, setShowFilterDetails] = useState(false);
  const [collapsedFileIds, setCollapsedFileIds] = useState<Set<string>>(new Set());
  const [replaceNotification, setReplaceNotification] = useState<string | null>(null);

  // Search History State
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned: SearchHistoryItem[] = parsed
          .map((item, idx) => {
            if (typeof item === 'string') {
              return {
                id: `hist-${idx}-${item}`,
                query: item,
                timestamp: Date.now() - idx * 60000,
                isPinned: false,
                useCount: 1,
              };
            }
            return {
              ...item,
              isPinned: Boolean(item.isPinned),
              useCount: typeof item.useCount === 'number' ? item.useCount : 1,
            };
          })
          .filter((item): item is SearchHistoryItem => Boolean(item && item.query && item.query.trim()));
        return cleaned;
      }
    } catch (err) {
      console.warn('Failed to parse search history from localStorage', err);
    }
    return [];
  });

  // Search History Sort Mode ('recent' | 'alphabetical' | 'frequency')
  const [sortMode, setSortMode] = useState<SearchHistorySortMode>(() => {
    if (typeof window === 'undefined') return 'recent';
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_SORT_STORAGE_KEY);
      if (saved === 'alphabetical' || saved === 'frequency' || saved === 'recent') {
        return saved;
      }
    } catch (err) {
      console.warn('Failed to load search history sort mode from localStorage', err);
    }
    return 'recent';
  });

  const handleSortChange = (newMode: SearchHistorySortMode) => {
    setSortMode(newMode);
    try {
      localStorage.setItem(SEARCH_HISTORY_SORT_STORAGE_KEY, newMode);
    } catch (err) {
      console.warn('Failed to save search history sort mode to localStorage', err);
    }
  };

  // Memoized sorted history based on active sortMode
  const sortedSearchHistory = useMemo(() => {
    return sortHistoryItems(searchHistory, sortMode);
  }, [searchHistory, sortMode]);

  // Supported and dynamically discovered file types for filter dropdown
  const availableFileTypes = useMemo(() => {
    const predefined: { ext: string; label: string }[] = [
      { ext: 'all', label: 'All File Types (*.*)' },
      { ext: '.ts', label: 'TypeScript (.ts)' },
      { ext: '.py', label: 'Python (.py)' },
      { ext: '.css', label: 'CSS (.css)' },
      { ext: '.tsx', label: 'React TSX (.tsx)' },
      { ext: '.js', label: 'JavaScript (.js)' },
      { ext: '.jsx', label: 'React JSX (.jsx)' },
      { ext: '.json', label: 'JSON (.json)' },
      { ext: '.html', label: 'HTML (.html)' },
      { ext: '.md', label: 'Markdown (.md)' },
      { ext: '.sql', label: 'SQL (.sql)' },
      { ext: '.rs', label: 'Rust (.rs)' },
      { ext: '.go', label: 'Go (.go)' },
      { ext: '.scss', label: 'SCSS (.scss)' },
      { ext: '.yaml', label: 'YAML (.yaml)' },
      { ext: '.sh', label: 'Shell (.sh)' },
    ];

    const workspaceExts = new Set<string>();
    const scan = (nodes: FileItem[]) => {
      for (const node of nodes) {
        if (!node.isFolder && node.name.includes('.')) {
          const ext = node.name.slice(node.name.lastIndexOf('.')).toLowerCase();
          if (ext.length > 1) {
            workspaceExts.add(ext);
          }
        }
        if (node.children) scan(node.children);
      }
    };
    scan(files);

    const predefinedExts = new Set(predefined.map((p) => p.ext));
    const extra: { ext: string; label: string }[] = [];
    for (const ext of Array.from(workspaceExts).sort()) {
      if (!predefinedExts.has(ext)) {
        extra.push({
          ext,
          label: `${ext.slice(1).toUpperCase()} (${ext})`,
        });
      }
    }

    return [...predefined, ...extra];
  }, [files]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [historyNavIndex, setHistoryNavIndex] = useState<number>(-1);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Total count of pinned search queries
  const pinnedCount = useMemo(() => {
    return searchHistory.filter((item) => item.isPinned).length;
  }, [searchHistory]);

  // Persist search history to localStorage
  const persistHistory = (items: SearchHistoryItem[]) => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
      } else {
        localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(items));
      }
    } catch (err) {
      console.warn('Failed to save search history to localStorage', err);
    }
  };

  // Toggle pinned status of a search history item
  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return { ...item, isPinned: !item.isPinned };
        }
        return item;
      });
      persistHistory(updated);
      return updated;
    });
  };

  // Add / bump query in search history (preserves isPinned status if already pinned, increments useCount)
  const recordQuery = useCallback(
    (queryToRecord: string, matchCount?: number, customOptions?: Partial<SearchOptions>) => {
      const trimmed = queryToRecord.trim();
      if (!trimmed) return;

      setSearchHistory((prev) => {
        const existing = prev.find((item) => item.query.toLowerCase() === trimmed.toLowerCase());
        const filtered = prev.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase());
        const newItem: SearchHistoryItem = {
          id: existing ? existing.id : `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          query: trimmed,
          timestamp: Date.now(),
          matchCount:
            matchCount !== undefined
              ? matchCount
              : trimmed === searchQuery
              ? searchResults.length
              : undefined,
          options: customOptions || { ...searchOptions },
          isPinned: existing?.isPinned ?? false,
          useCount: (existing?.useCount ?? 0) + 1,
        };
        const updated = [newItem, ...filtered].slice(0, 50);
        persistHistory(updated);
        return updated;
      });
    },
    [searchQuery, searchResults.length, searchOptions]
  );

  // Auto-record query when user completes typing a search
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timer = setTimeout(() => {
      recordQuery(searchQuery, searchResults.length);
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchQuery, searchResults.length, recordQuery]);

  // Click outside to dismiss history dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        historyDropdownRef.current &&
        !historyDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsHistoryOpen(false);
      }
    };
    if (isHistoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryOpen]);

  // Delete a single item from search history
  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      persistHistory(updated);
      return updated;
    });
  };

  // Clear unpinned search history only (keeping pinned queries)
  const handleClearUnpinnedHistory = () => {
    setSearchHistory((prev) => {
      const pinnedOnly = prev.filter((item) => item.isPinned);
      persistHistory(pinnedOnly);
      return pinnedOnly;
    });
    setIsConfirmClearOpen(false);
  };

  // Clear all search history
  const handleClearAllHistory = () => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove search history from localStorage', err);
    }
    setSearchHistory([]);
    setHistoryNavIndex(-1);
    setIsConfirmClearOpen(false);
  };

  // Re-run search from history
  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
    onSearchChange(item.query);
    if (item.options) {
      onUpdateSearchOptions(item.options);
    }
    recordQuery(item.query, item.matchCount, item.options);
    setIsHistoryOpen(false);
    setHistoryNavIndex(-1);
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!historyFilter.trim()) return sortedSearchHistory;
    const q = historyFilter.toLowerCase();
    return sortedSearchHistory.filter((item) => item.query.toLowerCase().includes(q));
  }, [sortedSearchHistory, historyFilter]);

  // Group search results by file and compute relevance metrics
  const searchResultsByFile = useMemo(() => {
    const map = new Map<
      string,
      {
        fileId: string;
        fileName: string;
        filePath: string;
        matches: SearchMatch[];
        maxScore: number;
        avgScore: number;
      }
    >();

    for (const match of searchResults) {
      const matchScore =
        match.score !== undefined
          ? match.score
          : calculateMatchRelevance(match, searchQuery);

      const enrichedMatch: SearchMatch = {
        ...match,
        score: matchScore,
      };

      if (!map.has(match.fileId)) {
        map.set(match.fileId, {
          fileId: match.fileId,
          fileName: match.fileName,
          filePath: match.filePath,
          matches: [],
          maxScore: matchScore,
          avgScore: matchScore,
        });
      }
      const entry = map.get(match.fileId)!;
      entry.matches.push(enrichedMatch);
      if (matchScore > entry.maxScore) {
        entry.maxScore = matchScore;
      }
    }

    // Flatten files to map fileId -> FileItem for timestamp & dirty state detection
    const fileItemMap = new Map<string, FileItem>();
    const scanItems = (nodes: FileItem[]) => {
      for (const node of nodes) {
        if (!node.isFolder) {
          fileItemMap.set(node.id, node);
        }
        if (node.children) scanItems(node.children);
      }
    };
    scanItems(files);

    const groups = Array.from(map.values()).map((g) => {
      const sum = g.matches.reduce((acc, m) => acc + (m.score ?? 50), 0);
      const fileItem = fileItemMap.get(g.fileId);
      const isDirty = Boolean(
        fileItem &&
        fileItem.originalContent !== undefined &&
        fileItem.content !== fileItem.originalContent
      );
      const lastModified = fileItem?.lastModified || (isDirty ? Date.now() : 0);

      return {
        ...g,
        avgScore: Math.round(sum / (g.matches.length || 1)),
        lastModified,
        isDirty,
      };
    });

    const activeSort = searchOptions.sortBy || 'relevance';

    if (activeSort === 'date') {
      // Sort by Date: recent file changes appear first!
      groups.sort((a, b) => {
        const timeA = a.lastModified || 0;
        const timeB = b.lastModified || 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return b.maxScore - a.maxScore || b.avgScore - a.avgScore;
      });
    } else if (activeSort === 'name') {
      groups.sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else if (activeSort === 'count') {
      groups.sort((a, b) => b.matches.length - a.matches.length || b.maxScore - a.maxScore);
    } else {
      // Default: Rank file groups with highest relevance at the top
      groups.sort((a, b) => b.maxScore - a.maxScore || b.avgScore - a.avgScore);
    }

    return groups;
  }, [searchResults, searchQuery, files, searchOptions.sortBy]);

  // Collapse / Expand all file groups
  const handleToggleCollapseAll = () => {
    if (collapsedFileIds.size === searchResultsByFile.length) {
      // Unfold all
      setCollapsedFileIds(new Set());
    } else {
      // Collapse all
      setCollapsedFileIds(new Set(searchResultsByFile.map((f) => f.fileId)));
    }
  };

  const handleToggleFileCollapse = (fileId: string) => {
    setCollapsedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  // Perform workspace Replace All with visual feedback
  const handleExecuteReplaceAll = () => {
    if (!searchQuery.trim() || searchResults.length === 0) return;
    const count = searchResults.length;
    const fileCount = searchResultsByFile.length;
    onReplaceAll(replaceText);
    setReplaceNotification(`Replaced ${count} occurrences across ${fileCount} files`);
    setTimeout(() => setReplaceNotification(null), 4000);
  };

  // Perform single file Replace All
  const handleExecuteReplaceInFile = (fileId: string, fileName: string, matchCount: number) => {
    if (!onReplaceInFile) return;
    onReplaceInFile(fileId, replaceText);
    setReplaceNotification(`Replaced ${matchCount} in ${fileName}`);
    setTimeout(() => setReplaceNotification(null), 3000);
  };

  // Replace single match
  const handleExecuteReplaceSingle = (e: React.MouseEvent, match: SearchMatch) => {
    e.stopPropagation();
    if (!onReplaceSingleMatch) return;
    onReplaceSingleMatch(match, replaceText);
  };

  // Render a snippet highlighting the matched substring
  const renderHighlightedSnippet = (match: SearchMatch) => {
    const text = match.lineText;
    const start = match.matchStart;
    const end = match.matchEnd;

    if (start < 0 || end > text.length || start >= end) {
      return <span>{text}</span>;
    }

    // Limit long lines
    const prefixOffset = Math.max(0, start - 30);
    const suffixLimit = Math.min(text.length, end + 50);

    const prefix = text.substring(prefixOffset, start);
    const matched = text.substring(start, end);
    const suffix = text.substring(end, suffixLimit);

    return (
      <span className="font-mono truncate">
        {prefixOffset > 0 && <span className="text-slate-400">…</span>}
        <span className="text-slate-300">{prefix}</span>
        <mark className="bg-rose-900/90 text-rose-100 font-bold px-1 py-0.5 rounded shadow-sm border border-rose-600/60 not-italic">
          {matched}
        </mark>
        <span className="text-slate-300">{suffix}</span>
        {suffixLimit < text.length && <span className="text-slate-400">…</span>}
      </span>
    );
  };

  const isAllCollapsed = searchResultsByFile.length > 0 && collapsedFileIds.size === searchResultsByFile.length;

  return (
    <div id="crimson-search-panel" className="flex flex-col h-full bg-[#0e0f16] select-none text-xs">
      {/* Top Header / Actions */}
      <div className="p-3 pb-2 border-b border-[#1f212f] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-[11px] font-bold uppercase tracking-wider">
            <FontAwesomeIcon icon={ICONS.search} className="text-rose-400" />
            <span>Search & Replace</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-400">
            {/* Search History Toggle Button */}
            <button
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              title={
                isHistoryOpen
                  ? 'Close Search History (Alt+H)'
                  : `Search History (${searchHistory.length} saved). Alt+H`
              }
              className={`p-1 rounded transition-colors text-[11px] flex items-center space-x-1 cursor-pointer ${
                isHistoryOpen
                  ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                  : 'hover:text-rose-400 hover:bg-[#1a1c28] text-slate-400'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.history} />
              {searchHistory.length > 0 && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  {searchHistory.length}
                </span>
              )}
            </button>

            {searchResults.length > 0 && (
              <button
                onClick={handleToggleCollapseAll}
                title={isAllCollapsed ? 'Expand All Results' : 'Collapse All Results'}
                className="p-1 hover:text-rose-400 hover:bg-[#1a1c28] rounded transition-colors text-[11px]"
              >
                <FontAwesomeIcon icon={isAllCollapsed ? ICONS.unfoldAll : ICONS.foldAll} />
              </button>
            )}

            {/* Sort by Date Toggle Button */}
            <button
              onClick={() =>
                onUpdateSearchOptions({
                  sortBy: searchOptions.sortBy === 'date' ? 'relevance' : 'date',
                })
              }
              title={
                searchOptions.sortBy === 'date'
                  ? 'Sorted by Date (Recent file changes first). Click to switch to Relevance.'
                  : 'Sort search results by Date (Recent file changes first)'
              }
              className={`p-1 rounded transition-colors text-[11px] flex items-center space-x-1 cursor-pointer ${
                searchOptions.sortBy === 'date'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm'
                  : 'hover:text-rose-400 hover:bg-[#1a1c28] text-slate-400'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.clock} />
            </button>
            <button
              onClick={() => onSearchChange(searchQuery)}
              title="Refresh Search"
              className="p-1 hover:text-rose-400 hover:bg-[#1a1c28] rounded transition-colors text-[11px]"
            >
              <FontAwesomeIcon icon={ICONS.sync} />
            </button>
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                title="Clear Search"
                className="p-1 hover:text-rose-400 hover:bg-[#1a1c28] rounded transition-colors text-[11px]"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <button
              onClick={() => setShowReplace((prev) => !prev)}
              title={showReplace ? 'Hide Replace Bar' : 'Show Replace Bar'}
              className="absolute left-2 text-slate-400 hover:text-rose-400 transition-colors z-10 text-[10px]"
            >
              <FontAwesomeIcon icon={showReplace ? ICONS.chevronDown : ICONS.chevronRight} />
            </button>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchQuery.trim()) {
                    recordQuery(searchQuery, searchResults.length);
                  }
                } else if (e.altKey && (e.key === 'h' || e.key === 'H')) {
                  e.preventDefault();
                  setIsHistoryOpen((prev) => !prev);
                } else if (e.key === 'ArrowUp' && (e.altKey || !searchQuery)) {
                  // Navigate previous in history
                  if (searchHistory.length > 0) {
                    e.preventDefault();
                    const nextIdx = Math.min(searchHistory.length - 1, historyNavIndex + 1);
                    setHistoryNavIndex(nextIdx);
                    if (searchHistory[nextIdx]) {
                      onSearchChange(searchHistory[nextIdx].query);
                      if (searchHistory[nextIdx].options) {
                        onUpdateSearchOptions(searchHistory[nextIdx].options!);
                      }
                    }
                  }
                } else if (e.key === 'ArrowDown' && (e.altKey || !searchQuery)) {
                  // Navigate forward in history
                  if (historyNavIndex > 0) {
                    e.preventDefault();
                    const nextIdx = historyNavIndex - 1;
                    setHistoryNavIndex(nextIdx);
                    if (searchHistory[nextIdx]) {
                      onSearchChange(searchHistory[nextIdx].query);
                      if (searchHistory[nextIdx].options) {
                        onUpdateSearchOptions(searchHistory[nextIdx].options!);
                      }
                    }
                  } else if (historyNavIndex === 0) {
                    e.preventDefault();
                    setHistoryNavIndex(-1);
                    onSearchChange('');
                  }
                } else if (e.key === 'Escape' && isHistoryOpen) {
                  e.preventDefault();
                  setIsHistoryOpen(false);
                }
              }}
              placeholder="Search in files... (Alt+H for history)"
              className="w-full bg-[#13141f] border border-[#27293a] rounded pl-6 pr-32 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono transition-colors"
            />

            {/* In-Input Search Option Toggles */}
            <div className="absolute right-1.5 flex items-center space-x-1">
              {/* Match Case */}
              <button
                type="button"
                onClick={() => onUpdateSearchOptions({ matchCase: !searchOptions.matchCase })}
                title="Match Case (Alt+C)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  searchOptions.matchCase
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2130]'
                }`}
              >
                Aa
              </button>

              {/* Match Whole Word */}
              <button
                type="button"
                onClick={() => onUpdateSearchOptions({ matchWholeWord: !searchOptions.matchWholeWord })}
                title="Match Whole Word (Alt+W)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  searchOptions.matchWholeWord
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2130]'
                }`}
              >
                \b
              </button>

              {/* Use Regular Expression */}
              <button
                type="button"
                onClick={() => onUpdateSearchOptions({ useRegex: !searchOptions.useRegex })}
                title="Use Regular Expression (Alt+R)"
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  searchOptions.useRegex
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2130]'
                }`}
              >
                .*
              </button>

              {/* Search History In-Input Button */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                title={`Search History (${searchHistory.length} previous searches). Alt+H`}
                className={`p-1 rounded text-[10px] transition-colors cursor-pointer ${
                  isHistoryOpen
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2130]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.history} />
              </button>
            </div>
          </div>

          {/* Search History Dropdown Popover */}
          {isHistoryOpen && (
            <div
              id="search-history-dropdown"
              ref={historyDropdownRef}
              className="bg-[#10121d] border border-rose-800/80 rounded-lg p-2 shadow-2xl space-y-2 font-mono text-xs z-30 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-[#222538] text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-rose-300">
                  <FontAwesomeIcon icon={ICONS.history} className="text-rose-400 text-[10px]" />
                  <span>Search History ({searchHistory.length})</span>
                  {pinnedCount > 0 && (
                    <span className="flex items-center space-x-1 text-[9px] font-mono text-amber-300 bg-amber-950/70 border border-amber-800/80 px-1.5 py-0.2 rounded font-normal normal-case">
                      <FontAwesomeIcon icon={ICONS.pin} className="text-[8px] rotate-[-45deg]" />
                      <span>{pinnedCount} pinned</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {searchHistory.length > 0 &&
                    (isConfirmClearOpen ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-rose-300">Clear:</span>
                        {pinnedCount > 0 && (
                          <button
                            type="button"
                            onClick={handleClearUnpinnedHistory}
                            title="Clear only unpinned queries, keeping pinned ones"
                            className="px-1.5 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Unpinned
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleClearAllHistory}
                          title="Clear all search history including pinned"
                          className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmClearOpen(false)}
                          className="px-1.5 py-0.5 rounded bg-[#202232] text-slate-300 text-[10px] cursor-pointer hover:bg-[#2a2d42]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id="dropdown-clear-all-btn"
                        onClick={handleClearAllHistory}
                        title="Clear all stored search queries from localStorage"
                        className="px-1.5 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white transition-colors text-[10px] flex items-center space-x-1 cursor-pointer font-medium"
                      >
                        <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                        <span>Clear All</span>
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(false)}
                    title="Close (Escape)"
                    className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
                  </button>
                </div>
              </div>

              {/* Filter and Sorting Toolbar */}
              {searchHistory.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      placeholder="Filter history..."
                      className="w-full bg-[#090a10] border border-[#23263a] rounded px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div className="shrink-0 flex items-center space-x-1">
                    <select
                      id="dropdown-history-sort-select"
                      value={sortMode}
                      onChange={(e) => handleSortChange(e.target.value as SearchHistorySortMode)}
                      title="Sort Search History by Most Recent, Alphabetical, or Frequency of Use"
                      className="bg-[#090a10] border border-[#23263a] text-slate-200 text-[10px] rounded px-1.5 py-1 outline-none focus:border-rose-500 font-mono cursor-pointer hover:border-rose-600/50"
                    >
                      <option value="recent">Most Recent</option>
                      <option value="alphabetical">Alphabetical</option>
                      <option value="frequency">Frequency of Use</option>
                    </select>
                  </div>
                </div>
              )}

              {/* History List */}
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filteredHistory.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-[11px] italic">
                    {searchHistory.length === 0
                      ? 'No search history saved in localStorage yet'
                      : 'No matching history entries'}
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded border cursor-pointer transition-all text-xs ${
                        item.isPinned
                          ? 'bg-[#171828] hover:bg-rose-950/70 border-amber-800/60 shadow-xs'
                          : 'bg-[#151724] hover:bg-rose-950/70 border-[#222436] hover:border-rose-700/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate flex-1 min-w-0 mr-2">
                        <FontAwesomeIcon
                          icon={item.isPinned ? ICONS.pin : ICONS.history}
                          className={`text-[10px] shrink-0 ${
                            item.isPinned ? 'text-amber-400 rotate-[-45deg]' : 'text-rose-400/80'
                          }`}
                        />
                        <span className={`font-mono font-medium truncate group-hover:text-white ${
                          item.isPinned ? 'text-amber-100 font-semibold' : 'text-slate-200'
                        }`}>
                          {item.query}
                        </span>

                        {/* Option Badges */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {item.options?.fileType && item.options.fileType !== 'all' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-semibold">
                              {item.options.fileType}
                            </span>
                          )}
                          {item.options?.matchCase && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              Aa
                            </span>
                          )}
                          {item.options?.matchWholeWord && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              \b
                            </span>
                          )}
                          {item.options?.useRegex && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              .*
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {item.useCount !== undefined && item.useCount > 0 && (
                          <span
                            title={`Used ${item.useCount} times`}
                            className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${
                              sortMode === 'frequency'
                                ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                                : 'bg-[#181a26] text-slate-400 border-[#282a3c]'
                            }`}
                          >
                            {item.useCount}x
                          </span>
                        )}
                        {item.matchCount !== undefined && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0e0f17] text-slate-400 font-mono">
                            {item.matchCount} {item.matchCount === 1 ? 'match' : 'matches'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                          {formatRelativeTime(item.timestamp)}
                        </span>

                        {/* Pin / Unpin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(item.id, e)}
                          title={item.isPinned ? 'Unpin query (keep at top)' : 'Pin query to top of search history'}
                          className={`p-1 rounded transition-all text-[10px] cursor-pointer ${
                            item.isPinned
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/70 opacity-100'
                              : 'text-slate-500 hover:text-amber-300 hover:bg-[#252838] opacity-60 group-hover:opacity-100'
                          }`}
                        >
                          <FontAwesomeIcon icon={ICONS.pin} className={item.isPinned ? 'rotate-[-45deg]' : ''} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          title="Remove from history"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 hover:bg-[#252838] rounded transition-all text-[10px] text-slate-400 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={ICONS.close} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Replace Input Box */}
          {showReplace && (
            <div className="flex items-center space-x-1">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace with..."
                  className="w-full bg-[#13141f] border border-[#27293a] rounded pl-2 pr-12 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono transition-colors"
                />

                {/* Preserve Case Toggle */}
                <button
                  type="button"
                  onClick={() => onUpdateSearchOptions({ preserveCase: !searchOptions.preserveCase })}
                  title="Preserve Case (matches uppercase / titlecase)"
                  className={`absolute right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    searchOptions.preserveCase
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2130]'
                  }`}
                >
                  AB
                </button>
              </div>

              {/* Replace All Button */}
              <button
                onClick={handleExecuteReplaceAll}
                disabled={searchResults.length === 0 || !searchQuery.trim()}
                title="Replace All Occurrences Across Entire Workspace"
                className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium transition-colors flex items-center space-x-1 shrink-0 ${
                  searchResults.length > 0 && searchQuery.trim()
                    ? 'bg-rose-700 hover:bg-rose-600 text-white cursor-pointer shadow-sm'
                    : 'bg-[#181a24] text-slate-400 cursor-not-allowed border border-[#262838]'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.swap} className="text-[10px]" />
                <span>Replace All</span>
              </button>
            </div>
          )}

          {/* File Type Filter Bar */}
          <div className="pt-0.5 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                <label
                  htmlFor="search-file-type-filter"
                  className="text-[11px] font-mono text-slate-400 flex items-center space-x-1 shrink-0 select-none"
                >
                  <FontAwesomeIcon icon={ICONS.filter} className="text-[10px] text-rose-400" />
                  <span>File Type:</span>
                </label>

                <select
                  id="search-file-type-filter"
                  aria-label="Filter search results by file type"
                  value={searchOptions.fileType || 'all'}
                  onChange={(e) => onUpdateSearchOptions({ fileType: e.target.value })}
                  title="Filter search results to specific file types (.ts, .py, .css, etc.)"
                  className={`bg-[#13141f] border rounded px-2 py-1 text-xs outline-none focus:border-rose-500 font-mono cursor-pointer transition-all flex-1 min-w-0 ${
                    searchOptions.fileType && searchOptions.fileType !== 'all'
                      ? 'border-rose-500 text-rose-200 bg-rose-950/40 font-semibold shadow-xs'
                      : 'border-[#27293a] text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {availableFileTypes.map((type) => (
                    <option key={type.ext} value={type.ext} className="bg-[#12131d] text-slate-200">
                      {type.label}
                    </option>
                  ))}
                </select>

                {searchOptions.fileType && searchOptions.fileType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => onUpdateSearchOptions({ fileType: 'all' })}
                    title="Reset file type filter to all files"
                    className="px-1.5 py-1 text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded text-[10px] transition-colors cursor-pointer shrink-0 font-mono flex items-center space-x-1"
                  >
                    <FontAwesomeIcon icon={ICONS.close} className="text-[9px]" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Filter Details Toggle (Path Globs) */}
              <button
                type="button"
                onClick={() => setShowFilterDetails((prev) => !prev)}
                title={showFilterDetails ? 'Hide path globs (include / exclude)' : 'More filters (include / exclude path globs)'}
                className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors flex items-center space-x-1 font-mono shrink-0 cursor-pointer py-1 px-1.5 rounded hover:bg-[#1a1c28] border border-transparent hover:border-[#2b2e40]"
              >
                <span>{showFilterDetails ? 'Less' : 'Path Globs'}</span>
                <FontAwesomeIcon icon={showFilterDetails ? ICONS.chevronUp : ICONS.chevronDown} className="text-[8px]" />
                {(searchOptions.includePattern || searchOptions.excludePattern) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            </div>

            {/* Quick Filter Badges (.ts, .py, .css) */}
            <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 overflow-x-auto no-scrollbar">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0 mr-0.5">Quick:</span>
              {[
                { id: 'all', label: 'All' },
                { id: '.ts', label: '.ts' },
                { id: '.py', label: '.py' },
                { id: '.css', label: '.css' },
                { id: '.tsx', label: '.tsx' },
                { id: '.json', label: '.json' },
              ].map((chip) => {
                const active = (searchOptions.fileType || 'all') === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => onUpdateSearchOptions({ fileType: chip.id })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      active
                        ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold shadow-xs'
                        : 'bg-[#141622] hover:bg-[#1f2233] text-slate-400 hover:text-slate-200 border border-[#232538]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Files to Include & Exclude Panel */}
          {showFilterDetails && (
            <div className="p-2 rounded bg-[#11121b] border border-[#212332] space-y-2 mt-1 font-mono text-[11px]">
              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5">
                  restrict file type (e.g. .ts, .py, .css):
                </label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={searchOptions.fileType || 'all'}
                    onChange={(e) => onUpdateSearchOptions({ fileType: e.target.value })}
                    className="flex-1 bg-[#161724] border border-[#27293a] rounded px-2 py-1 text-slate-200 outline-none focus:border-rose-500 text-[11px]"
                  >
                    {availableFileTypes.map((t) => (
                      <option key={t.ext} value={t.ext}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={searchOptions.fileType && searchOptions.fileType !== 'all' ? searchOptions.fileType : ''}
                    onChange={(e) => onUpdateSearchOptions({ fileType: e.target.value || 'all' })}
                    placeholder="or custom e.g. .py"
                    className="w-28 bg-[#161724] border border-[#27293a] rounded px-2 py-1 text-slate-200 outline-none focus:border-rose-500 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5">
                  sort search results by:
                </label>
                <select
                  value={searchOptions.sortBy || 'relevance'}
                  onChange={(e) => onUpdateSearchOptions({ sortBy: e.target.value as any })}
                  className="w-full bg-[#161724] border border-[#27293a] rounded px-2 py-1 text-slate-200 outline-none focus:border-rose-500 text-[11px]"
                >
                  <option value="relevance">Relevance (Match quality)</option>
                  <option value="date">Sort by Date (Recent file changes first)</option>
                  <option value="name">File Name (Alphabetical A-Z)</option>
                  <option value="count">Match Count (Highest first)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5">
                  files to include (glob pattern e.g. *.ts, src/**):
                </label>
                <input
                  type="text"
                  value={searchOptions.includePattern || ''}
                  onChange={(e) => onUpdateSearchOptions({ includePattern: e.target.value })}
                  placeholder="e.g. *.ts, *.tsx"
                  className="w-full bg-[#161724] border border-[#27293a] rounded px-2 py-1 text-slate-200 outline-none focus:border-rose-500 text-[11px]"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-0.5">
                  files to exclude (glob pattern e.g. *.test.ts, dist/**):
                </label>
                <input
                  type="text"
                  value={searchOptions.excludePattern || ''}
                  onChange={(e) => onUpdateSearchOptions({ excludePattern: e.target.value })}
                  placeholder="e.g. *.spec.ts, dist/**"
                  className="w-full bg-[#161724] border border-[#27293a] rounded px-2 py-1 text-slate-200 outline-none focus:border-rose-500 text-[11px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Replace Notification Banner */}
        {replaceNotification && (
          <div className="p-2 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-[11px] font-mono flex items-center justify-between animate-fadeIn">
            <span className="flex items-center space-x-1.5">
              <FontAwesomeIcon icon={ICONS.check} className="text-emerald-400 text-xs" />
              <span>{replaceNotification}</span>
            </span>
            <button onClick={() => setReplaceNotification(null)} className="text-emerald-400 hover:text-white">
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>
        )}

        {/* Regex Error Banner */}
        {searchSummary?.error && (
          <div className="p-2 rounded bg-rose-950/80 border border-rose-700/80 text-rose-200 text-[11px] font-mono flex items-center space-x-1.5">
            <FontAwesomeIcon icon={ICONS.warning} className="text-rose-400 text-xs shrink-0" />
            <span className="truncate">{searchSummary.error}</span>
          </div>
        )}

        {/* Results Count & Metrics Bar */}
        {searchQuery.trim() && !searchSummary?.error && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center space-x-1.5 flex-wrap">
                {searchResults.length === 0 ? (
                  <span>No results found</span>
                ) : (
                  <span>
                    <strong className="text-rose-400 font-bold">{searchResults.length}</strong> results in{' '}
                    <strong className="text-slate-200">{searchResultsByFile.length}</strong>{' '}
                    {searchResultsByFile.length === 1 ? 'file' : 'files'}
                  </span>
                )}
                {searchOptions.fileType && searchOptions.fileType !== 'all' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono font-semibold">
                    filter: {searchOptions.fileType}
                  </span>
                )}
                {searchOptions.sortBy === 'date' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-mono font-semibold flex items-center space-x-1">
                    <FontAwesomeIcon icon={ICONS.clock} className="text-[8px]" />
                    <span>sorted by date</span>
                  </span>
                )}
              </span>

              {searchSummary && searchSummary.durationMs >= 0 && (
                <span className="text-[10px] text-slate-400">
                  {searchSummary.durationMs}ms
                </span>
              )}
            </div>

            {/* Results Sorting Toolbar */}
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#1c1e2b] text-[10px] font-mono">
                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                  <label htmlFor="search-results-sort-select" className="text-slate-400 flex items-center space-x-1 shrink-0">
                    <FontAwesomeIcon icon={ICONS.clock} className="text-[9px] text-amber-400" />
                    <span>Sort:</span>
                  </label>
                  <select
                    id="search-results-sort-select"
                    aria-label="Sort search results"
                    value={searchOptions.sortBy || 'relevance'}
                    onChange={(e) => onUpdateSearchOptions({ sortBy: e.target.value as any })}
                    title="Sort search results: by Date (recent file changes first), Relevance, Name, or Count"
                    className={`text-[10px] font-mono rounded px-1.5 py-0.5 outline-none cursor-pointer border transition-colors flex-1 min-w-0 ${
                      searchOptions.sortBy === 'date'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 font-semibold'
                        : 'bg-[#141522] text-slate-300 border-[#292c3e] hover:border-slate-500'
                    }`}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Sort by Date (Recent First)</option>
                    <option value="name">File Name (A-Z)</option>
                    <option value="count">Match Count</option>
                  </select>
                </div>

                {/* 1-click Quick 'Sort by Date' Button */}
                <button
                  type="button"
                  id="sort-by-date-quick-btn"
                  onClick={() =>
                    onUpdateSearchOptions({
                      sortBy: searchOptions.sortBy === 'date' ? 'relevance' : 'date',
                    })
                  }
                  title={
                    searchOptions.sortBy === 'date'
                      ? 'Sorted by Date (Recent file changes first). Click to switch to Relevance.'
                      : 'Sort by Date: show recent file changes first'
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all flex items-center space-x-1 cursor-pointer border shrink-0 ${
                    searchOptions.sortBy === 'date'
                      ? 'bg-amber-950 text-amber-200 border-amber-600 font-bold shadow-xs'
                      : 'bg-[#151724] text-slate-400 hover:text-amber-300 hover:bg-[#1f2233] border-[#292c3e]'
                  }`}
                >
                  <FontAwesomeIcon icon={ICONS.clock} className="text-[9px]" />
                  <span>Sort by Date</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Results Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Empty Search Prompt / Recent Searches List */}
        {!searchQuery.trim() && (
          <div className="py-2 px-1 space-y-3">
            {searchHistory.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center space-x-1.5 text-rose-300">
                    <FontAwesomeIcon icon={ICONS.history} className="text-rose-400" />
                    <span>Search History ({searchHistory.length})</span>
                    {pinnedCount > 0 && (
                      <span className="flex items-center space-x-1 text-[9px] font-mono text-amber-300 bg-amber-950/70 border border-amber-800/80 px-1.5 py-0.2 rounded font-normal normal-case">
                        <FontAwesomeIcon icon={ICONS.pin} className="text-[8px] rotate-[-45deg]" />
                        <span>{pinnedCount} pinned</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 font-normal normal-case">
                    {/* Sorting Dropdown */}
                    <select
                      id="search-history-sort-select"
                      value={sortMode}
                      onChange={(e) => handleSortChange(e.target.value as SearchHistorySortMode)}
                      title="Sort Search History by Most Recent, Alphabetical, or Frequency of Use"
                      className="bg-[#12141f] border border-[#27293a] text-slate-200 text-[10px] rounded px-1.5 py-0.5 outline-none focus:border-rose-500 font-mono cursor-pointer hover:border-rose-600/50"
                    >
                      <option value="recent">Most Recent</option>
                      <option value="alphabetical">Alphabetical</option>
                      <option value="frequency">Frequency of Use</option>
                    </select>

                    <button
                      type="button"
                      id="clear-all-search-history-btn"
                      onClick={handleClearAllHistory}
                      title="Clear all stored search queries from localStorage"
                      className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white transition-colors text-[10px] flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                      <span>Clear All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(true)}
                      className="text-[10px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer px-1 py-0.5"
                    >
                      Manage
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  {sortedSearchHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistoryItem(item)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg border cursor-pointer transition-all shadow-xs ${
                        item.isPinned
                          ? 'bg-[#171828] hover:bg-rose-950/60 border-amber-800/70'
                          : 'bg-[#131521] hover:bg-rose-950/60 border-[#212334] hover:border-rose-700/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 mr-2">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0 border ${
                          item.isPinned
                            ? 'bg-amber-950/80 text-amber-400 border-amber-700/70'
                            : 'bg-[#1c1e2d] group-hover:bg-rose-900/60 text-rose-400 border-[#2d3046]'
                        }`}>
                          <FontAwesomeIcon icon={item.isPinned ? ICONS.pin : ICONS.history} className={item.isPinned ? 'rotate-[-45deg]' : ''} />
                        </div>
                        <span className={`font-mono text-xs font-semibold truncate group-hover:text-rose-100 ${
                          item.isPinned ? 'text-amber-100' : 'text-slate-200'
                        }`}>
                          {item.query}
                        </span>

                        {/* Options Badges */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {item.options?.fileType && item.options.fileType !== 'all' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-semibold">
                              {item.options.fileType}
                            </span>
                          )}
                          {item.options?.matchCase && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              Aa
                            </span>
                          )}
                          {item.options?.matchWholeWord && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              \b
                            </span>
                          )}
                          {item.options?.useRegex && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-rose-300 border border-rose-900/60 font-bold">
                              .*
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {item.useCount !== undefined && item.useCount > 0 && (
                          <span
                            title={`Used ${item.useCount} times`}
                            className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${
                              sortMode === 'frequency'
                                ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                                : 'bg-[#181a26] text-slate-400 border-[#282a3c]'
                            }`}
                          >
                            {item.useCount}x
                          </span>
                        )}
                        {item.matchCount !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold">
                            {item.matchCount} {item.matchCount === 1 ? 'match' : 'matches'}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                          {formatRelativeTime(item.timestamp)}
                        </span>

                        {/* Pin / Unpin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(item.id, e)}
                          title={item.isPinned ? 'Unpin query (keep at top)' : 'Pin query to top of search history'}
                          className={`p-1 rounded transition-all text-[10px] cursor-pointer ${
                            item.isPinned
                              ? 'text-amber-400 hover:text-amber-300 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/70 opacity-100'
                              : 'text-slate-500 hover:text-amber-300 hover:bg-[#252838] opacity-60 group-hover:opacity-100'
                          }`}
                        >
                          <FontAwesomeIcon icon={ICONS.pin} className={item.isPinned ? 'rotate-[-45deg]' : ''} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          title="Remove from history"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 hover:bg-[#252838] rounded transition-all text-[10px] text-slate-400 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={ICONS.close} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                  <span>Click any query to instantly re-run search.</span>
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    title="Wipe all stored search queries from localStorage"
                    className="text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.trash} className="text-[9px]" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-10 h-10 mx-auto rounded-lg bg-[#141622] border border-[#242738] flex items-center justify-center text-rose-400">
                  <FontAwesomeIcon icon={ICONS.search} className="text-base" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-300 text-xs">Search Across Workspace</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Type above to perform an instant global search across all files. Press{' '}
                    <kbd className="px-1 py-0.5 bg-[#191b26] border border-[#2b2d3d] rounded text-[10px] text-slate-300 font-mono">
                      Ctrl+Shift+F
                    </kbd>{' '}
                    anytime. Previous searches will be saved in localStorage automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results Prompt */}
        {searchQuery.trim() && searchResults.length === 0 && !searchSummary?.error && (
          <div className="py-8 px-4 text-center space-y-2 text-slate-400">
            <p className="text-xs font-semibold text-slate-300">No matching text found</p>
            <p className="text-[11px] text-slate-400">
              No files in the workspace match &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}

        {/* File Groups List */}
        {searchResultsByFile.map((fileGroup) => {
          const isCollapsed = collapsedFileIds.has(fileGroup.fileId);
          const iconConfig = getFileIconConfig(fileGroup.fileName);
          const isCurrentActive = activeFileId === fileGroup.fileId;

          return (
            <div
              key={fileGroup.fileId}
              className={`border rounded overflow-hidden transition-colors ${
                isCurrentActive
                  ? 'border-rose-900/80 bg-[#13141e]'
                  : 'border-[#1f212f] bg-[#12131b]'
              }`}
            >
              {/* File Group Header */}
              <div
                onClick={() => handleToggleFileCollapse(fileGroup.fileId)}
                className="group px-2.5 py-1.5 bg-[#171924] hover:bg-[#1c1e2b] flex items-center justify-between cursor-pointer select-none border-b border-[#212332]"
              >
                <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0">
                  <FontAwesomeIcon
                    icon={isCollapsed ? ICONS.chevronRight : ICONS.chevronDown}
                    className="text-[9px] text-slate-400 group-hover:text-rose-400 w-2.5 shrink-0"
                  />
                  <FontAwesomeIcon
                    icon={iconConfig.icon}
                    className={`text-xs ${iconConfig.color} shrink-0`}
                  />
                  <span className="font-mono font-semibold text-slate-200 truncate">
                    {fileGroup.fileName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                    {fileGroup.filePath}
                  </span>
                </div>

                {/* File-level Action Buttons */}
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {/* File Date / Last Modified Badge */}
                  {fileGroup.lastModified > 0 && (
                    <span
                      title={`Last modified: ${new Date(fileGroup.lastModified).toLocaleString()}`}
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono border flex items-center space-x-1 select-none transition-colors ${
                        fileGroup.isDirty
                          ? 'bg-amber-950/90 text-amber-300 border-amber-600 font-bold'
                          : searchOptions.sortBy === 'date'
                          ? 'bg-amber-950/60 text-amber-200 border-amber-800/80 font-medium'
                          : 'bg-[#151724] text-slate-400 border-[#2b2d42]'
                      }`}
                    >
                      <FontAwesomeIcon icon={ICONS.clock} className="text-[8px] text-amber-400" />
                      <span>{formatRelativeTime(fileGroup.lastModified)}</span>
                    </span>
                  )}

                  {/* File Relevance Badge */}
                  {fileGroup.maxScore !== undefined && (
                    (() => {
                      const tier = getRelevanceTier(fileGroup.maxScore);
                      return (
                        <span
                          title={`Peak match relevance in ${fileGroup.fileName}: ${fileGroup.maxScore}% (Average: ${fileGroup.avgScore}%)`}
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium border flex items-center space-x-1 select-none ${tier.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${tier.dotClass}`} />
                          <span>{fileGroup.maxScore}% match</span>
                        </span>
                      );
                    })()
                  )}

                  {/* Match Count Badge */}
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-mono font-bold">
                    {fileGroup.matches.length}
                  </span>

                  {/* Replace All In File button */}
                  {showReplace && onReplaceInFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteReplaceInFile(
                          fileGroup.fileId,
                          fileGroup.fileName,
                          fileGroup.matches.length
                        );
                      }}
                      title={`Replace All in ${fileGroup.fileName}`}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 hover:bg-[#252838] rounded text-[10px] transition-all"
                    >
                      <FontAwesomeIcon icon={ICONS.swap} />
                    </button>
                  )}

                  {/* Dismiss File From Results */}
                  {onDismissFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissFile(fileGroup.fileId);
                      }}
                      title="Dismiss from results"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 hover:bg-[#252838] rounded text-[10px] transition-all"
                    >
                      <FontAwesomeIcon icon={ICONS.close} />
                    </button>
                  )}
                </div>
              </div>

              {/* Match Occurrences Rows */}
              {!isCollapsed && (
                <div className="divide-y divide-[#1b1c28]">
                  {fileGroup.matches.map((match, j) => (
                    <div
                      key={j}
                      onClick={() => onSelectSearchMatch(match)}
                      className="group/match px-2.5 py-1.5 hover:bg-[#1a1c27] cursor-pointer text-xs font-mono text-slate-400 flex items-center justify-between transition-colors space-x-2"
                    >
                      <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
                        <span className="text-rose-400 font-bold font-mono shrink-0 text-[11px] min-w-[28px]">
                          {match.line}:
                        </span>
                        <div className="truncate flex-1 min-w-0">
                          {renderHighlightedSnippet(match)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Relevance Score Badge */}
                        {match.score !== undefined && (
                          (() => {
                            const tier = getRelevanceTier(match.score);
                            return (
                              <span
                                title={`Relevance score: ${match.score}% (${tier.label})`}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold flex items-center space-x-1 border select-none transition-colors ${tier.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tier.dotClass}`} />
                                <span>{match.score}%</span>
                              </span>
                            );
                          })()
                        )}

                        {/* Match Row Quick Actions */}
                        <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover/match:opacity-100 transition-opacity">
                          {showReplace && onReplaceSingleMatch && (
                            <button
                              onClick={(e) => handleExecuteReplaceSingle(e, match)}
                              title="Replace this occurrence"
                              className="p-1 hover:text-rose-400 hover:bg-[#242636] rounded text-[10px] transition-colors"
                            >
                              <FontAwesomeIcon icon={ICONS.swap} />
                            </button>
                          )}
                          {onDismissMatch && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDismissMatch(match);
                              }}
                              title="Dismiss match"
                              className="p-1 hover:text-rose-400 hover:bg-[#242636] rounded text-[10px] transition-colors"
                            >
                              <FontAwesomeIcon icon={ICONS.close} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
