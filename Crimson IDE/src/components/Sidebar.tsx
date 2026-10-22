/**
 * Sidebar Component with Explorer, Fuzzy Search, Git, AI Assistant,
 * Plugin Marketplace, and Cloud Sync panels.
 * Zero emojis - 100% FontAwesome iconography with crimson theme.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { 
  ActiveSidebarTab, 
  CloudSyncState, 
  FileItem, 
  IndexStats,
  LanguageId,
  PluginDefinition, 
  SearchMatch, 
  SearchOptions,
  UserSettings,
  ExternalFileModification
} from '../types';
import { getAllFilesList } from '../lib/defaultFiles';
import { getStarterStructureForFile } from '../lib/fileStructures';
import { SearchPanel } from './SearchPanel';
import { SearchResultsSummary } from '../lib/searchEngine';
import { MARKETPLACE_CATALOGUE } from '../lib/plugins';
import { GitHistoryGraph } from './GitHistoryGraph';
import { GitCommitNode, INITIAL_GIT_COMMITS } from '../lib/gitHistory';
import { GitHubRemoteTreeSection } from './GitHubRemoteTreeSection';

// Explorer File Filtering Configuration & Persistence
export interface ExplorerFilterSettings {
  hideNodeModules: boolean;
  hideDotFiles: boolean;
  hiddenExtensions: string[];
  hideEmptyFolders: boolean;
  searchFilter: string;
}

export const DEFAULT_EXPLORER_FILTERS: ExplorerFilterSettings = {
  hideNodeModules: false,
  hideDotFiles: false,
  hiddenExtensions: [],
  hideEmptyFolders: false,
  searchFilter: '',
};

export const EXPLORER_FILTERS_STORAGE_KEY = 'cscode_explorer_filters';

export function getNormalizedExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return fileName.substring(lastDot).toLowerCase();
}

export function loadStoredExplorerFilters(): ExplorerFilterSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_EXPLORER_FILTERS;
  try {
    const raw = localStorage.getItem(EXPLORER_FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_EXPLORER_FILTERS,
        ...parsed,
        hiddenExtensions: Array.isArray(parsed.hiddenExtensions) ? parsed.hiddenExtensions : [],
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_EXPLORER_FILTERS;
}

export function filterFileNodes(items: FileItem[], filters: ExplorerFilterSettings): FileItem[] {
  const { hideNodeModules, hideDotFiles, hiddenExtensions, hideEmptyFolders, searchFilter } = filters;
  const hiddenExtSet = new Set(hiddenExtensions.map((e) => e.toLowerCase()));
  const searchLower = searchFilter.trim().toLowerCase();

  function recurse(nodes: FileItem[]): FileItem[] {
    const result: FileItem[] = [];

    for (const node of nodes) {
      const name = node.name;

      // 1. Hide node_modules check
      if (hideNodeModules) {
        if (
          name === 'node_modules' ||
          node.path === 'node_modules' ||
          node.path.startsWith('node_modules/') ||
          node.path.includes('/node_modules/')
        ) {
          continue;
        }
      }

      // 2. Hide hidden dot-files check (starting with '.')
      if (hideDotFiles) {
        if (name.startsWith('.')) {
          continue;
        }
      }

      if (node.isFolder) {
        const filteredChildren = node.children ? recurse(node.children) : [];

        // If search filter is active and folder name doesn't match and has no children left:
        if (searchLower && !name.toLowerCase().includes(searchLower) && filteredChildren.length === 0) {
          continue;
        }

        // If hideEmptyFolders is enabled and folder has no children remaining:
        if (
          hideEmptyFolders &&
          !node.isRootFolder &&
          filteredChildren.length === 0 &&
          Boolean(node.children && node.children.length > 0)
        ) {
          continue;
        }

        result.push({
          ...node,
          children: filteredChildren,
        });
      } else {
        // Leaf file
        // 3. Extension check
        const ext = getNormalizedExtension(name);
        if (ext && hiddenExtSet.has(ext)) {
          continue;
        }
        if (!ext && name.startsWith('.') && hiddenExtSet.has('(dotfiles)')) {
          continue;
        }
        if (!ext && !name.startsWith('.') && hiddenExtSet.has('(no-ext)')) {
          continue;
        }

        // 4. Name search check
        if (searchLower && !name.toLowerCase().includes(searchLower)) {
          continue;
        }

        result.push(node);
      }
    }

    return result;
  }

  return recurse(items);
}

interface SidebarProps {
  activeTab: ActiveSidebarTab | null;
  files: FileItem[];
  activeFileId: string | null;
  onOpenFile: (fileId: string) => void;
  onCreateFile: (parentPath: string, isFolder: boolean) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDuplicateFile?: (fileId: string) => void;
  onCreateFileInFolder?: (folderId: string | null, name: string, isFolder: boolean) => void;
  onAddFolderToWorkspace?: () => void;
  onRemoveFolderFromWorkspace?: (rootFolderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onMoveFile?: (sourceId: string, targetId: string | null, position?: 'before' | 'after' | 'inside') => void;
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  // Git
  gitBranch?: string;
  branches?: string[];
  dirtyFilesCount: number;
  dirtyFileIds?: Set<string>;
  onGitCommit: (msg: string) => void;
  onOpenDiff?: (fileId: string) => void;
  onOpenDiffModal?: (fileId?: string) => void;
  onRevertFile?: (fileId: string) => void;
  onSwitchBranch?: (branch: string) => void;
  gitCommits?: GitCommitNode[];
  onSimulateMerge?: (sourceBranch: string, targetBranch: string) => void;
  onCreateBranchFromCommit?: (branchName: string, commitHash: string, checkout?: boolean) => void;
  // GitHub Integration
  onOpenGitHubModal?: () => void;
  onQuickPush?: () => void;
  onQuickPull?: () => void;
  isGitHubAuthenticated?: boolean;
  connectedGitHubRepo?: string;
  isPushingRemote?: boolean;
  isPullingRemote?: boolean;
  onImportRemoteFiles?: (files: FileItem[], mode?: 'merge' | 'replace', targetFolder?: string) => void;
  // Plugins & Marketplace
  plugins: PluginDefinition[];
  onTogglePlugin: (id: string) => void;
  onInstallPlugin: (plugin: PluginDefinition) => void;
  onUninstallPlugin: (id: string) => void;
  onUpdatePlugin: (id: string, targetVersion: string) => void;
  onConfigurePlugin: (plugin: PluginDefinition) => void;
  onOpenMarketplaceModal: () => void;
  // Cloud Sync (legacy stubs)
  syncState?: CloudSyncState;
  userSettings?: UserSettings;
  onSyncNow?: () => void;
  onPairDevice?: (code: string, name: string) => void;
  onRegenerateCode?: () => void;
  onRestoreSnapshot?: (snapshotId: string) => void;
  onToggleAutoSync?: () => void;
  onOpenSettings?: () => void;
  // AI Assistant (legacy stubs)
  activeFile?: FileItem | null;
  onInsertCode?: (code: string) => void;
  onReplaceFileContent?: (newContent: string) => void;
  onCreateNewFileWithContent?: (name: string, content: string, language?: LanguageId) => void;
  onRunCodeSnippet?: (code: string, language: LanguageId, name?: string) => void;
  onApplyDiagnosticFix?: (line: number, replacement: string) => void;
  // Large Codebase Indexing
  indexStats: IndexStats;
  onClearWorkspace?: () => void;
  onOpenTemplatePicker?: () => void;
  // Layout customization
  isEditLayoutMode?: boolean;
  sidebarPosition?: 'left' | 'right';
  onToggleSidebarPosition?: () => void;
  // File System Watcher Simulation
  externallyModifiedFiles?: Record<string, ExternalFileModification>;
  onSimulateExternalChange?: (fileId?: string) => void;
  onDismissExternalChange?: (fileId: string) => void;
  onDismissAllExternalChanges?: () => void;
  isWatcherAutoSimulateEnabled?: boolean;
  onToggleWatcherAutoSimulate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  files,
  activeFileId,
  onOpenFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onCreateFileInFolder,
  onAddFolderToWorkspace,
  onRemoveFolderFromWorkspace,
  onToggleFolder,
  onMoveFile,
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
  gitBranch = 'main',
  branches = ['main'],
  dirtyFilesCount,
  dirtyFileIds,
  onGitCommit,
  onOpenDiff,
  onOpenDiffModal,
  onRevertFile,
  onSwitchBranch,
  gitCommits = INITIAL_GIT_COMMITS,
  onSimulateMerge,
  onCreateBranchFromCommit,
  onOpenGitHubModal,
  onQuickPush,
  onQuickPull,
  isGitHubAuthenticated = false,
  connectedGitHubRepo = '',
  isPushingRemote = false,
  isPullingRemote = false,
  onImportRemoteFiles,
  plugins,
  onTogglePlugin,
  onInstallPlugin,
  onUninstallPlugin,
  onUpdatePlugin,
  onConfigurePlugin,
  onOpenMarketplaceModal,
  syncState,
  userSettings,
  onSyncNow,
  onPairDevice,
  onRegenerateCode,
  onRestoreSnapshot,
  onToggleAutoSync,
  onOpenSettings,
  activeFile,
  onInsertCode,
  onReplaceFileContent,
  onCreateNewFileWithContent,
  onRunCodeSnippet,
  onApplyDiagnosticFix,
  indexStats,
  onClearWorkspace,
  onOpenTemplatePicker,
  isEditLayoutMode,
  sidebarPosition,
  onToggleSidebarPosition,
  externallyModifiedFiles = {},
  onSimulateExternalChange,
  onDismissExternalChange,
  onDismissAllExternalChanges,
  isWatcherAutoSimulateEnabled = false,
  onToggleWatcherAutoSimulate,
}) => {
  // Drag and Drop state for Explorer (Reorder & Move into Folders)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    id: string;
    position: 'before' | 'after' | 'inside';
    isFolder: boolean;
  } | null>(null);
  const autoExpandTimerRef = useRef<any>(null);

  const handleDragStart = (e: React.DragEvent, node: FileItem) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(node.id);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragTarget(null);
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  };

  const handleDragOverFolderNode = (e: React.DragEvent, node: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId || draggedNodeId === node.id) return;

    // Calculate position: top 25% = before, bottom 25% = after, middle 50% = inside
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    let position: 'before' | 'inside' | 'after' = 'inside';
    if (y < h * 0.25) {
      position = 'before';
    } else if (y > h * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }

    setDragTarget({ id: node.id, position, isFolder: true });

    // Auto-expand folder after hovering in 'inside' drop zone for 550ms
    if (position === 'inside' && !node.isOpen) {
      if (!autoExpandTimerRef.current) {
        autoExpandTimerRef.current = setTimeout(() => {
          onToggleFolder(node.id);
          autoExpandTimerRef.current = null;
        }, 550);
      }
    } else if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  };

  const handleDragOverFileNode = (e: React.DragEvent, node: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId || draggedNodeId === node.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    const position: 'before' | 'after' = y < h * 0.5 ? 'before' : 'after';
    setDragTarget({ id: node.id, position, isFolder: false });

    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  };

  const handleDragLeaveNode = (e: React.DragEvent, nodeId: string) => {
    e.stopPropagation();
    if (dragTarget?.id === nodeId) {
      const currentTarget = e.currentTarget as HTMLElement;
      if (!currentTarget.contains(e.relatedTarget as Node)) {
        setDragTarget(null);
        if (autoExpandTimerRef.current) {
          clearTimeout(autoExpandTimerRef.current);
          autoExpandTimerRef.current = null;
        }
      }
    }
  };

  const handleDropOnNode = (e: React.DragEvent, targetNode: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNodeId && onMoveFile && draggedNodeId !== targetNode.id && dragTarget) {
      onMoveFile(draggedNodeId, targetNode.id, dragTarget.position);
    }
    handleDragEnd();
  };

  // Local state for sidebar tools
  const [gitCommitMsg, setGitCommitMsg] = useState('');
  const [gitSubTab, setGitSubTab] = useState<'graph' | 'changes' | 'remote'>('graph');

  // Modified files for Git Source Control view
  const modifiedFilesList = useMemo(() => {
    if (!dirtyFileIds || dirtyFileIds.size === 0) return [];
    const list: FileItem[] = [];
    function scan(nodes: FileItem[]) {
      for (const n of nodes) {
        if (!n.isFolder && dirtyFileIds?.has(n.id)) {
          list.push(n);
        }
        if (n.children) scan(n.children);
      }
    }
    scan(files);
    return list;
  }, [files, dirtyFileIds]);

  const [pluginCategoryFilter, setPluginCategoryFilter] = useState<'All' | 'Installed' | 'Marketplace'>('All');
  const [pluginSearch, setPluginSearch] = useState('');
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [pairDeviceNameInput, setPairDeviceNameInput] = useState('');
  const [isPairingDialogOpen, setIsPairingDialogOpen] = useState(false);
  const [newFilePrompt, setNewFilePrompt] = useState<{ isOpen: boolean; isFolder: boolean }>({ isOpen: false, isFolder: false });
  const [newFileName, setNewFileName] = useState('');

  // Context Menu State (right click in File Explorer)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileItem | null;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Inline Rename State
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Parent folder for creating items via context menu
  const [createTargetFolderId, setCreateTargetFolderId] = useState<string | null>(null);

  // Dismiss context menu on click outside or Escape
  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setRenamingNodeId(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClose);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClose);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [contextMenu]);

  // File System Watcher Simulation state
  const [isWatcherMenuOpen, setIsWatcherMenuOpen] = useState(false);
  const watcherMenuRef = useRef<HTMLDivElement>(null);

  const extModEntries = useMemo(() => {
    return Object.values(externallyModifiedFiles || {});
  }, [externallyModifiedFiles]);
  const extModCount = extModEntries.length;

  // Dismiss watcher popover on outside click or Escape
  useEffect(() => {
    if (!isWatcherMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (watcherMenuRef.current && !watcherMenuRef.current.contains(e.target as Node)) {
        setIsWatcherMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWatcherMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isWatcherMenuOpen]);

  // Explorer File Filtering State & Storage Sync
  const [explorerFilters, setExplorerFilters] = useState<ExplorerFilterSettings>(loadStoredExplorerFilters);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isFilterToolbarOpen, setIsFilterToolbarOpen] = useState(true);
  const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterSearchInputRef = useRef<HTMLInputElement>(null);

  // Sync explorer filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXPLORER_FILTERS_STORAGE_KEY, JSON.stringify(explorerFilters));
    } catch {
      // ignore
    }
  }, [explorerFilters]);

  // Dismiss filter menu on outside click or Escape
  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isFilterMenuOpen]);

  // Keyboard shortcut: Alt+F to toggle / focus explorer filter
  useEffect(() => {
    if (activeTab !== 'explorer') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFilterToolbarOpen(true);
        setTimeout(() => filterSearchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  // Dynamically analyze all unique file extensions present in workspace
  const workspaceExtensions = useMemo(() => {
    const allLeafFiles = getAllFilesList(files);
    const extCounts = new Map<string, number>();

    for (const f of allLeafFiles) {
      if (f.isFolder) continue;
      const ext = getNormalizedExtension(f.name);
      if (ext) {
        extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
      } else if (f.name.startsWith('.')) {
        extCounts.set('(dotfiles)', (extCounts.get('(dotfiles)') || 0) + 1);
      } else {
        extCounts.set('(no-ext)', (extCounts.get('(no-ext)') || 0) + 1);
      }
    }

    return Array.from(extCounts.entries())
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count);
  }, [files]);

  // Filtered files & item counts
  const totalFilesCount = useMemo(() => {
    return getAllFilesList(files).length;
  }, [files]);

  const filteredFiles = useMemo(() => {
    return filterFileNodes(files, explorerFilters);
  }, [files, explorerFilters]);

  const visibleFilesCount = useMemo(() => {
    return getAllFilesList(filteredFiles).length;
  }, [filteredFiles]);

  const hiddenFilesCount = Math.max(0, totalFilesCount - visibleFilesCount);

  const isFilterActive = useMemo(() => {
    return (
      explorerFilters.hideNodeModules ||
      explorerFilters.hideDotFiles ||
      explorerFilters.hiddenExtensions.length > 0 ||
      explorerFilters.hideEmptyFolders ||
      Boolean(explorerFilters.searchFilter.trim())
    );
  }, [explorerFilters]);

  const handleToggleExtension = (ext: string) => {
    const lower = ext.toLowerCase();
    setExplorerFilters((prev) => {
      const exists = prev.hiddenExtensions.some((e) => e.toLowerCase() === lower);
      const next = exists
        ? prev.hiddenExtensions.filter((e) => e.toLowerCase() !== lower)
        : [...prev.hiddenExtensions, lower];
      return { ...prev, hiddenExtensions: next };
    });
  };

  const handleShowAllExtensions = () => {
    setExplorerFilters((prev) => ({ ...prev, hiddenExtensions: [] }));
  };

  const handleInvertExtensions = () => {
    setExplorerFilters((prev) => {
      const allExts = workspaceExtensions.map((w) => w.ext.toLowerCase());
      const currentlyHidden = new Set(prev.hiddenExtensions.map((e) => e.toLowerCase()));
      const nextHidden = allExts.filter((e) => !currentlyHidden.has(e));
      return { ...prev, hiddenExtensions: nextHidden };
    });
  };

  const handleApplyExtensionPreset = (presetExts: string[]) => {
    setExplorerFilters((prev) => {
      const presetLower = new Set(presetExts.map((e) => e.toLowerCase()));
      const allExts = workspaceExtensions.map((w) => w.ext.toLowerCase());
      const nextHidden = allExts.filter((e) => !presetLower.has(e));
      return { ...prev, hiddenExtensions: nextHidden };
    });
  };

  const handleResetFilters = () => {
    setExplorerFilters(DEFAULT_EXPLORER_FILTERS);
  };

  // Context menu triggers
  const handleNodeContextMenu = (e: React.MouseEvent, node: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 260);
    setContextMenu({ x, y, node });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 260);
    setContextMenu({ x, y, node: null });
  };

  const handleStartRename = (node: FileItem) => {
    setRenamingNodeId(node.id);
    setRenameInputValue(node.name);
    setContextMenu(null);
  };

  const handleConfirmRename = (nodeId: string) => {
    const trimmed = renameInputValue.trim();
    if (trimmed && onRenameFile) {
      onRenameFile(nodeId, trimmed);
    }
    setRenamingNodeId(null);
  };

  const handleDuplicate = (node: FileItem) => {
    if (onDuplicateFile) {
      onDuplicateFile(node.id);
    }
    setContextMenu(null);
  };

  const handleDelete = (node: FileItem) => {
    onDeleteFile(node.id);
    setContextMenu(null);
  };

  const handleCopyPath = (node: FileItem) => {
    navigator.clipboard.writeText(node.path);
    setContextMenu(null);
  };

  const handleQuickNewFile = (parentFolderId: string | null = null) => {
    setCreateTargetFolderId(parentFolderId);
    setNewFilePrompt({ isOpen: true, isFolder: false });
    setNewFileName('');
    setContextMenu(null);
  };

  const handleQuickNewFolder = (parentFolderId: string | null = null) => {
    setCreateTargetFolderId(parentFolderId);
    setNewFilePrompt({ isOpen: true, isFolder: true });
    setNewFileName('');
    setContextMenu(null);
  };

  if (!activeTab) return null;

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    const catalogue = MARKETPLACE_CATALOGUE;
    const installedIds = new Set(plugins.map((p) => p.id));

    let list = catalogue.map((item) => {
      const installed = plugins.find((p) => p.id === item.id);
      return {
        ...item,
        installed: Boolean(installed),
        enabled: installed ? installed.enabled : false,
        installedVersion: installed ? installed.version : undefined,
      };
    });

    if (pluginCategoryFilter === 'Installed') {
      list = list.filter((p) => p.installed);
    } else if (pluginCategoryFilter === 'Marketplace') {
      list = list.filter((p) => !p.installed);
    }

    if (pluginSearch.trim()) {
      const q = pluginSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [plugins, pluginCategoryFilter, pluginSearch]);

  // Multi-root detection: true if any folder has isRootFolder, or if there are multiple top-level folders
  const isMultiRootWorkspace = useMemo(() => {
    const topFolders = files.filter((f) => f.isFolder);
    return topFolders.length > 1 || files.some((f) => f.isRootFolder);
  }, [files]);

  // Recursive Tree Node Renderer for File Explorer
  const renderTreeNode = (node: FileItem, depth = 0) => {
    if (node.isFolder) {
      const isBeingDragged = draggedNodeId === node.id;
      const isTargetNode = dragTarget?.id === node.id;
      const isDropBefore = isTargetNode && dragTarget.position === 'before';
      const isDropAfter = isTargetNode && dragTarget.position === 'after';
      const isDropInside = isTargetNode && dragTarget.position === 'inside';

      const isRootFolderNode = depth === 0 && (node.isRootFolder || isMultiRootWorkspace);

      if (isRootFolderNode) {
        return (
          <div key={node.id} className="select-none mb-1">
            {/* Top-Level Root Folder Banner Header */}
            <div
              draggable={true}
              onDragStart={(e) => handleDragStart(e, node)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOverFolderNode(e, node)}
              onDragLeave={(e) => handleDragLeaveNode(e, node.id)}
              onDrop={(e) => handleDropOnNode(e, node)}
              onClick={() => onToggleFolder(node.id)}
              onContextMenu={(e) => handleNodeContextMenu(e, node)}
              className={`group relative flex items-center justify-between px-2.5 py-1.5 cursor-pointer text-xs font-mono transition-all border-y ${
                isDropInside
                  ? 'bg-rose-950 border-rose-500 text-rose-100 ring-1 ring-rose-500 shadow-md'
                  : isBeingDragged
                  ? 'opacity-30 bg-[#161822] text-slate-500 ring-1 ring-dashed ring-rose-500/40 border-[#222436]'
                  : 'bg-gradient-to-r from-[#141624] to-[#0f1019] border-[#222538] hover:border-rose-900/60 text-slate-200'
              }`}
            >
              {/* Left: Expander, Root Folder Icon, Name & Root Tag */}
              <div className="flex items-center space-x-1.5 truncate flex-1 mr-1">
                <FontAwesomeIcon
                  icon={node.isOpen ? ICONS.chevronDown : ICONS.chevronRight}
                  className="text-[9px] text-slate-400 group-hover:text-rose-400 w-3 shrink-0"
                />
                <FontAwesomeIcon
                  icon={node.isOpen ? ICONS.folderOpen : ICONS.folder}
                  className={`text-xs shrink-0 ${isDropInside ? 'text-rose-300 font-bold' : 'text-rose-400'}`}
                />
                {renamingNodeId === node.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={renameInputValue}
                    onChange={(e) => setRenameInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleConfirmRename(node.id);
                      else if (e.key === 'Escape') setRenamingNodeId(null);
                    }}
                    onBlur={() => handleConfirmRename(node.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0b0c10] text-slate-100 px-1 py-0.5 rounded border border-rose-500 outline-none w-full text-xs font-mono"
                  />
                ) : (
                  <span className="font-bold text-xs uppercase tracking-wide truncate text-slate-100 font-mono">
                    {node.name}
                  </span>
                )}
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-semibold shrink-0">
                  ROOT
                </span>
              </div>

              {/* Right: Root Quick Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickNewFile(node.id);
                  }}
                  title={`New File in ${node.name}`}
                  className="p-1 hover:text-rose-300 hover:bg-[#202334] rounded text-slate-400 transition-colors text-[10px]"
                >
                  <FontAwesomeIcon icon={ICONS.file} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickNewFolder(node.id);
                  }}
                  title={`New Folder in ${node.name}`}
                  className="p-1 hover:text-rose-300 hover:bg-[#202334] rounded text-slate-400 transition-colors text-[10px]"
                >
                  <FontAwesomeIcon icon={ICONS.folder} />
                </button>
                {onRemoveFolderFromWorkspace && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFolderFromWorkspace(node.id);
                    }}
                    title={`Remove ${node.name} from Workspace`}
                    className="p-1 hover:text-rose-400 hover:bg-rose-950/50 rounded text-slate-500 transition-colors text-[10px]"
                  >
                    <FontAwesomeIcon icon={ICONS.close} />
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tree */}
            {node.isOpen && node.children && (
              <div className="border-l border-rose-900/20 ml-2">
                {node.children.length === 0 ? (
                  <div className="px-6 py-1.5 text-[10px] text-slate-500 italic font-mono">
                    Empty folder
                  </div>
                ) : (
                  node.children.map((child) => renderTreeNode(child, depth + 1))
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={node.id} className="select-none">
          <div
            draggable={true}
            onDragStart={(e) => handleDragStart(e, node)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOverFolderNode(e, node)}
            onDragLeave={(e) => handleDragLeaveNode(e, node.id)}
            onDrop={(e) => handleDropOnNode(e, node)}
            onClick={() => onToggleFolder(node.id)}
            onContextMenu={(e) => handleNodeContextMenu(e, node)}
            className={`group relative flex items-center justify-between px-2 py-1 cursor-pointer text-xs font-mono transition-all ${
              isDropInside
                ? 'bg-rose-950/80 border border-rose-500 text-rose-100 ring-1 ring-rose-500/80 shadow-md'
                : isBeingDragged
                ? 'opacity-30 bg-[#161822] text-slate-500 ring-1 ring-dashed ring-rose-500/40'
                : 'hover:bg-[#161822] text-slate-300'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {/* Reorder insertion indicator: Before */}
            {isDropBefore && (
              <div
                className="absolute top-0 right-0 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] z-30 pointer-events-none flex items-center"
                style={{ left: `${depth * 12 + 6}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-rose-400 -ml-1 ring-2 ring-rose-950 animate-pulse" />
              </div>
            )}

            {/* Reorder insertion indicator: After */}
            {isDropAfter && (
              <div
                className="absolute bottom-0 right-0 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] z-30 pointer-events-none flex items-center"
                style={{ left: `${depth * 12 + 6}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-rose-400 -ml-1 ring-2 ring-rose-950 animate-pulse" />
              </div>
            )}

            <div className="flex items-center space-x-1.5 truncate flex-1 mr-1">
              <FontAwesomeIcon
                icon={node.isOpen ? ICONS.chevronDown : ICONS.chevronRight}
                className="text-[9px] text-slate-400 group-hover:text-rose-400 w-3 shrink-0"
              />
              <FontAwesomeIcon
                icon={node.isOpen ? ICONS.folderOpen : ICONS.folder}
                className={`text-xs shrink-0 ${isDropInside ? 'text-rose-300 font-bold' : 'text-rose-500/80'}`}
              />
              {renamingNodeId === node.id ? (
                <input
                  type="text"
                  autoFocus
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleConfirmRename(node.id);
                    else if (e.key === 'Escape') setRenamingNodeId(null);
                  }}
                  onBlur={() => handleConfirmRename(node.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#0b0c10] text-slate-100 px-1 py-0.5 rounded border border-rose-500 outline-none w-full text-xs font-mono"
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}
            </div>
          </div>

          {node.isOpen && node.children && (
            <div>
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf File Node (Supports Reordering & Dragging)
    const isSelected = activeFileId === node.id;
    const isBeingDragged = draggedNodeId === node.id;
    const isTargetNode = dragTarget?.id === node.id;
    const isDropBefore = isTargetNode && dragTarget.position === 'before';
    const isDropAfter = isTargetNode && dragTarget.position === 'after';
    const iconConfig = getFileIconConfig(node.name, node.language);
    const extModInfo = externallyModifiedFiles?.[node.id];
    const isExternallyModified = Boolean(extModInfo);

    return (
      <div
        key={node.id}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, node)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOverFileNode(e, node)}
        onDragLeave={(e) => handleDragLeaveNode(e, node.id)}
        onDrop={(e) => handleDropOnNode(e, node)}
        onClick={() => onOpenFile(node.id)}
        onContextMenu={(e) => handleNodeContextMenu(e, node)}
        className={`group relative flex items-center justify-between px-2 py-1 cursor-pointer text-xs font-mono transition-all ${
          isBeingDragged
            ? 'opacity-30 bg-[#161822] text-slate-500 ring-1 ring-dashed ring-rose-500/40'
            : isExternallyModified
            ? 'bg-amber-950/40 text-amber-200 border-l-2 border-amber-400 font-semibold shadow-xs'
            : isSelected
            ? 'bg-rose-950/60 text-slate-100 border-l-2 border-rose-500 font-medium'
            : 'text-slate-400 hover:text-slate-200 hover:bg-[#14151e]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        {/* Reorder insertion indicator: Before */}
        {isDropBefore && (
          <div
            className="absolute top-0 right-0 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] z-30 pointer-events-none flex items-center"
            style={{ left: `${depth * 12 + 18}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-rose-400 -ml-1 ring-2 ring-rose-950 animate-pulse" />
          </div>
        )}

        {/* Reorder insertion indicator: After */}
        {isDropAfter && (
          <div
            className="absolute bottom-0 right-0 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] z-30 pointer-events-none flex items-center"
            style={{ left: `${depth * 12 + 18}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-rose-400 -ml-1 ring-2 ring-rose-950 animate-pulse" />
          </div>
        )}

        <div className="flex items-center space-x-2 truncate flex-1 mr-1 min-w-0">
          <FontAwesomeIcon
            icon={iconConfig.icon}
            className={`text-xs shrink-0 ${iconConfig.color}`}
          />
          {renamingNodeId === node.id ? (
            <input
              type="text"
              autoFocus
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleConfirmRename(node.id);
                else if (e.key === 'Escape') setRenamingNodeId(null);
              }}
              onBlur={() => handleConfirmRename(node.id)}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0b0c10] text-slate-100 px-1 py-0.5 rounded border border-rose-500 outline-none w-full text-xs font-mono"
            />
          ) : (
            <span className={`truncate ${isExternallyModified ? 'text-amber-200 font-bold' : ''}`}>{node.name}</span>
          )}

          {/* Specific Indicator: File Modified Externally */}
          {isExternallyModified && (
            <span
              id={`sidebar-ext-indicator-${node.id}`}
              title={`Modified externally at ${extModInfo?.timeFormatted || 'recently'} (${extModInfo?.origin || 'External Process'})\n${extModInfo?.summary || 'Content updated on disk'}`}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/80 shadow-xs flex items-center space-x-1 shrink-0 ml-1 animate-pulse select-none"
            >
              <FontAwesomeIcon icon={ICONS.bolt} className="text-[8px] text-amber-400" />
              <span>EXT MOD</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {/* Acknowledge External Change button */}
          {isExternallyModified && onDismissExternalChange && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismissExternalChange(node.id);
              }}
              title="Acknowledge external modification (clear indicator)"
              className="p-1 text-amber-400 hover:text-amber-200 hover:bg-amber-900/60 rounded text-[10px] transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.circleCheck} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(node.id);
            }}
            title="Delete file"
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 text-[10px] transition-opacity shrink-0 cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.trash} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="crimson-sidebar"
      className={`w-64 md:w-72 bg-[#0e0f16] ${
        sidebarPosition === 'right' ? 'border-l' : 'border-r'
      } border-[#1a1b24] flex flex-col h-full select-none overflow-hidden shrink-0 ${
        isEditLayoutMode ? 'ring-1 ring-rose-500/80 ring-inset' : ''
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-9 px-3 border-b border-[#1a1b24] flex items-center justify-between text-xs font-medium text-slate-300 bg-[#0e0f16]">
        <div className="flex items-center space-x-2 truncate">
          <span className="text-slate-200 text-xs font-medium flex items-center space-x-2 truncate">
            {activeTab === 'explorer' && <span>Explorer</span>}
            {activeTab === 'search' && <span>Search</span>}
            {activeTab === 'git' && <span>Source Control</span>}
            {activeTab === 'github' && <span>GitHub</span>}
            {activeTab === 'marketplace' && <span>Marketplace</span>}
            {activeTab === 'plugins' && <span>Extensions</span>}
            {activeTab === 'cloud-sync' && <span>Cloud Sync</span>}
          </span>

          {isEditLayoutMode && onToggleSidebarPosition && (
            <button
              onClick={onToggleSidebarPosition}
              title={`Move Sidebar to ${sidebarPosition === 'right' ? 'Left' : 'Right'}`}
              className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 text-[10px] font-mono transition-colors flex items-center space-x-1 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={sidebarPosition === 'right' ? ICONS.arrowLeft : ICONS.arrowRight} className="text-[9px]" />
              <span>Dock {sidebarPosition === 'right' ? 'Left' : 'Right'}</span>
            </button>
          )}
        </div>

        {/* Header Action Icons for Explorer */}
        {activeTab === 'explorer' && (
          <div className="flex items-center space-x-1 text-slate-400">
            {/* File System Watcher Simulation Button & Popover */}
            <div className="relative" ref={watcherMenuRef}>
              <button
                id="sidebar-file-watcher-btn"
                type="button"
                onClick={() => setIsWatcherMenuOpen((prev) => !prev)}
                title={`File System Watcher: ${
                  extModCount > 0
                    ? `${extModCount} external modification(s) detected`
                    : 'Active (Monitoring workspace for external changes)'
                }`}
                className={`p-1 rounded transition-colors text-[11px] cursor-pointer flex items-center space-x-1 ${
                  extModCount > 0
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/80 shadow-xs'
                    : isWatcherMenuOpen
                    ? 'bg-rose-950 text-rose-300'
                    : 'hover:text-amber-400 hover:bg-[#1c1d28] text-slate-400'
                }`}
              >
                <FontAwesomeIcon
                  icon={ICONS.bolt}
                  className={extModCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}
                />
                {extModCount > 0 && (
                  <span className="text-[9px] font-mono font-bold text-amber-300">
                    {extModCount}
                  </span>
                )}
              </button>

              {/* Popover */}
              {isWatcherMenuOpen && (
                <div
                  id="sidebar-file-watcher-popover"
                  className="absolute right-0 top-full mt-2 w-72 bg-[#10111a] border border-amber-600/70 shadow-2xl rounded-xl p-3 z-50 text-xs font-mono text-slate-200 select-none animate-fadeIn"
                  style={{
                    boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(245, 158, 11, 0.25)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#202230]">
                    <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-[11px]">
                      <FontAwesomeIcon icon={ICONS.bolt} className="text-amber-400 text-xs" />
                      <span>File System Watcher</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[9px] font-bold">
                      ● Active
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    Watches workspace files on disk. External file modifications trigger real-time indicators across the Sidebar tree.
                  </p>

                  {/* Actions */}
                  <div className="mt-3 space-y-2">
                    <button
                      id="simulate-external-change-btn"
                      type="button"
                      onClick={() => {
                        onSimulateExternalChange?.();
                      }}
                      className="w-full py-1.5 px-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.bolt} className="text-[11px]" />
                      <span>Simulate External Modification</span>
                    </button>

                    {onToggleWatcherAutoSimulate && (
                      <button
                        type="button"
                        onClick={onToggleWatcherAutoSimulate}
                        className={`w-full py-1.5 px-2.5 rounded border text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                          isWatcherAutoSimulateEnabled
                            ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                            : 'bg-[#151722] hover:bg-[#1c1e2c] border-[#2b2d3e] text-slate-300'
                        }`}
                      >
                        <span className="flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={ICONS.clock} className="text-amber-400 text-[10px]" />
                          <span>Auto-Simulation (20s)</span>
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isWatcherAutoSimulateEnabled ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {isWatcherAutoSimulateEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Pending External Modifications List */}
                  <div className="mt-3 pt-2 border-t border-[#1c1e2b]">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                      <span>External Changes ({extModCount})</span>
                      {extModCount > 0 && onDismissAllExternalChanges && (
                        <button
                          type="button"
                          onClick={onDismissAllExternalChanges}
                          className="text-amber-400 hover:text-amber-300 text-[10px] cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {extModCount === 0 ? (
                      <div className="text-[10px] text-slate-500 italic py-2 text-center">
                        No external modifications pending. Click &quot;Simulate External Modification&quot; to test.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                        {extModEntries.map((mod) => (
                          <div
                            key={mod.fileId}
                            className="p-1.5 rounded bg-[#161824] border border-amber-900/60 flex items-center justify-between text-[11px]"
                          >
                            <div className="truncate flex-1 mr-2">
                              <div className="font-semibold text-amber-200 truncate">{mod.fileName}</div>
                              <div className="text-[9px] text-slate-400 truncate">{mod.timeFormatted} • {mod.origin || 'External Process'}</div>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenFile(mod.fileId);
                                  setIsWatcherMenuOpen(false);
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#202334] hover:bg-[#2b2e44] text-slate-200 text-[10px] cursor-pointer"
                              >
                                View
                              </button>
                              {onDismissExternalChange && (
                                <button
                                  type="button"
                                  onClick={() => onDismissExternalChange(mod.fileId)}
                                  className="p-1 hover:text-amber-300 text-slate-400 cursor-pointer text-[10px]"
                                  title="Dismiss indicator"
                                >
                                  <FontAwesomeIcon icon={ICONS.close} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Explorer Filter Button & Popover */}
            <div className="relative" ref={filterMenuRef}>
              <button
                id="sidebar-explorer-filter-btn"
                type="button"
                onClick={() => {
                  setIsFilterToolbarOpen(true);
                  setIsFilterMenuOpen((prev) => !prev);
                  setTimeout(() => filterSearchInputRef.current?.focus(), 50);
                }}
                title={`Filter Explorer: ${
                  isFilterActive
                    ? `${hiddenFilesCount} file(s) hidden by active filters`
                    : 'Toggle file types, hide node_modules, dot-files'
                }`}
                className={`p-1 rounded transition-colors text-[11px] cursor-pointer flex items-center space-x-1 ${
                  isFilterActive
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-xs'
                    : isFilterMenuOpen
                    ? 'bg-rose-950 text-rose-300'
                    : 'hover:text-rose-400 hover:bg-[#1c1d28] text-slate-400'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.filter} className={isFilterActive ? 'text-rose-400' : 'text-slate-400'} />
                {hiddenFilesCount > 0 && (
                  <span className="text-[9px] font-mono font-bold text-rose-300 px-1 py-0.2 rounded-full bg-rose-900 border border-rose-700">
                    {hiddenFilesCount}
                  </span>
                )}
              </button>

              {/* Filter Popover Menu */}
              {isFilterMenuOpen && (
                <div
                  id="sidebar-explorer-filter-popover"
                  className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-[#0f1019] border border-rose-900/70 shadow-2xl rounded-xl p-3.5 z-50 text-xs font-mono text-slate-200 select-none animate-fadeIn max-h-[85vh] overflow-y-auto"
                  style={{
                    boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(244, 63, 94, 0.2)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#202230]">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                      <FontAwesomeIcon icon={ICONS.filter} className="text-rose-400 text-xs" />
                      <span>Explorer Filters</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {isFilterActive ? (
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                          {hiddenFilesCount} Hidden
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[9px] font-bold">
                          Showing All
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsFilterMenuOpen(false)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 ml-1 cursor-pointer transition-colors"
                        title="Close Filter Menu"
                      >
                        <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 my-2 leading-relaxed">
                    Filter files in the explorer tree. Toggle visibility of specific file types, hide node_modules, and hidden dot-files.
                  </p>

                  {/* 1. Core Exclusion Toggles */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                      Exclusions & Visibility
                    </span>

                    {/* Hide node_modules Toggle */}
                    <div className="p-2 rounded-lg bg-[#141624] border border-[#232638] flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <FontAwesomeIcon icon={ICONS.folder} className="text-amber-400 text-xs shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            Hide node_modules
                          </div>
                          <div className="text-[9px] text-slate-500 truncate">
                            Exclude dependencies and package folders
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="toggle-hide-node-modules-btn"
                        onClick={() =>
                          setExplorerFilters((prev) => ({
                            ...prev,
                            hideNodeModules: !prev.hideNodeModules,
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                          explorerFilters.hideNodeModules
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-xs'
                            : 'bg-[#1c1e2c] text-slate-400 hover:text-white border border-[#2b2e40]'
                        }`}
                      >
                        {explorerFilters.hideNodeModules ? 'HIDDEN' : 'VISIBLE'}
                      </button>
                    </div>

                    {/* Hide Dot-files Toggle */}
                    <div className="p-2 rounded-lg bg-[#141624] border border-[#232638] flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <FontAwesomeIcon icon={ICONS.file} className="text-slate-400 text-xs shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            Hide Hidden Dot-files (.*)
                          </div>
                          <div className="text-[9px] text-slate-500 truncate">
                            Exclude files starting with '.' (.env, .gitignore)
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="toggle-hide-dot-files-btn"
                        onClick={() =>
                          setExplorerFilters((prev) => ({
                            ...prev,
                            hideDotFiles: !prev.hideDotFiles,
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                          explorerFilters.hideDotFiles
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-xs'
                            : 'bg-[#1c1e2c] text-slate-400 hover:text-white border border-[#2b2e40]'
                        }`}
                      >
                        {explorerFilters.hideDotFiles ? 'HIDDEN' : 'VISIBLE'}
                      </button>
                    </div>

                    {/* Hide Empty Folders Toggle */}
                    <div className="p-2 rounded-lg bg-[#141624] border border-[#232638] flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <FontAwesomeIcon icon={ICONS.folderOpen} className="text-slate-400 text-xs shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            Hide Empty Folders
                          </div>
                          <div className="text-[9px] text-slate-500 truncate">
                            Omit directories with 0 matching files
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="toggle-hide-empty-folders-btn"
                        onClick={() =>
                          setExplorerFilters((prev) => ({
                            ...prev,
                            hideEmptyFolders: !prev.hideEmptyFolders,
                          }))
                        }
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                          explorerFilters.hideEmptyFolders
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-xs'
                            : 'bg-[#1c1e2c] text-slate-400 hover:text-white border border-[#2b2e40]'
                        }`}
                      >
                        {explorerFilters.hideEmptyFolders ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* 2. File Name Search / Pattern Input */}
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                        File Name Filter
                      </span>
                      {explorerFilters.searchFilter && (
                        <button
                          type="button"
                          onClick={() => setExplorerFilters((prev) => ({ ...prev, searchFilter: '' }))}
                          className="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <FontAwesomeIcon icon={ICONS.search} className="absolute left-2.5 text-slate-500 text-[10px]" />
                      <input
                        type="text"
                        placeholder="Filter by name (e.g. *.ts, App, test)..."
                        value={explorerFilters.searchFilter}
                        onChange={(e) =>
                          setExplorerFilters((prev) => ({ ...prev, searchFilter: e.target.value }))
                        }
                        className="w-full bg-[#131522] border border-[#24273c] focus:border-rose-500 text-xs text-slate-200 rounded-lg pl-7 pr-7 py-1.5 font-mono outline-none placeholder:text-slate-600 transition-colors"
                      />
                      {explorerFilters.searchFilter && (
                        <button
                          type="button"
                          onClick={() => setExplorerFilters((prev) => ({ ...prev, searchFilter: '' }))}
                          className="absolute right-2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={ICONS.close} className="text-[9px]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Specific File Types Visibility */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                        File Types Visibility
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={handleShowAllExtensions}
                          className="px-1.5 py-0.5 rounded bg-[#181a28] hover:bg-[#202334] text-slate-300 hover:text-white text-[9px] transition-colors cursor-pointer"
                        >
                          Show All
                        </button>
                        <button
                          type="button"
                          onClick={handleInvertExtensions}
                          className="px-1.5 py-0.5 rounded bg-[#181a28] hover:bg-[#202334] text-slate-300 hover:text-white text-[9px] transition-colors cursor-pointer"
                        >
                          Invert
                        </button>
                      </div>
                    </div>

                    {/* Detected Workspace Extensions Chips */}
                    {workspaceExtensions.length === 0 ? (
                      <div className="p-2 text-center text-slate-500 text-[10px] italic">
                        No files in workspace yet to detect extensions.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#131522] border border-[#222538] rounded-lg">
                        {workspaceExtensions.map(({ ext, count }) => {
                          const isHidden = explorerFilters.hiddenExtensions.some(
                            (e) => e.toLowerCase() === ext.toLowerCase()
                          );
                          return (
                            <button
                              key={ext}
                              type="button"
                              onClick={() => handleToggleExtension(ext)}
                              title={
                                isHidden
                                  ? `${ext} is currently HIDDEN. Click to show.`
                                  : `${ext} is currently VISIBLE. Click to hide.`
                              }
                              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center space-x-1.5 transition-all cursor-pointer ${
                                isHidden
                                  ? 'bg-[#0d0e14] text-slate-600 border border-slate-800 line-through opacity-60 hover:opacity-90 hover:text-slate-400'
                                  : 'bg-[#1b1d2e] text-slate-200 border border-[#2e3148] hover:border-rose-500/80 shadow-xs'
                              }`}
                            >
                              <FontAwesomeIcon
                                icon={isHidden ? ICONS.eyeSlash : ICONS.eye}
                                className={`text-[9px] ${isHidden ? 'text-slate-600' : 'text-rose-400'}`}
                              />
                              <span className="font-semibold">{ext}</span>
                              <span className="text-[9px] text-slate-500 font-normal">({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Category Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[9px] text-slate-500 py-0.5 mr-0.5">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyExtensionPreset(['.ts', '.tsx', '.js', '.jsx'])}
                        className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-rose-950/60 hover:text-rose-300 border border-[#26283c] text-slate-400 text-[9px] cursor-pointer transition-colors"
                      >
                        TS/JS Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExtensionPreset(['.css', '.scss', '.less'])}
                        className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-rose-950/60 hover:text-rose-300 border border-[#26283c] text-slate-400 text-[9px] cursor-pointer transition-colors"
                      >
                        Styles Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExtensionPreset(['.json', '.yaml', '.yml'])}
                        className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-rose-950/60 hover:text-rose-300 border border-[#26283c] text-slate-400 text-[9px] cursor-pointer transition-colors"
                      >
                        JSON/Config Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyExtensionPreset(['.md', '.txt'])}
                        className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-rose-950/60 hover:text-rose-300 border border-[#26283c] text-slate-400 text-[9px] cursor-pointer transition-colors"
                      >
                        Docs Only
                      </button>
                    </div>
                  </div>

                  {/* 4. Footer Summary & Reset Button */}
                  <div className="pt-2.5 border-t border-[#202230] flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 truncate mr-2">
                      {visibleFilesCount} of {totalFilesCount} files shown{' '}
                      {hiddenFilesCount > 0 && (
                        <span className="text-rose-400 font-bold">({hiddenFilesCount} hidden)</span>
                      )}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-2 py-1 rounded bg-[#181926] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#2a2c3d] text-[10px] font-mono transition-colors cursor-pointer"
                        >
                          Reset All
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsFilterMenuOpen(false)}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {onAddFolderToWorkspace && (
              <button
                onClick={onAddFolderToWorkspace}
                title="Add Folder to Workspace (Multi-Root Workspace)"
                className="w-6 h-6 flex items-center justify-center hover:text-slate-200 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[11px]" />
              </button>
            )}
            <button
              onClick={() => setNewFilePrompt({ isOpen: true, isFolder: false })}
              title="New File (Ctrl+N)"
              className="w-6 h-6 flex items-center justify-center hover:text-slate-200 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.file} className="text-[11px]" />
            </button>
            <button
              onClick={() => setNewFilePrompt({ isOpen: true, isFolder: true })}
              title="New Folder"
              className="w-6 h-6 flex items-center justify-center hover:text-slate-200 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.folder} className="text-[11px]" />
            </button>
            {onOpenTemplatePicker && (
              <button
                onClick={onOpenTemplatePicker}
                title="New from Template... (TypeScript, React, API, etc.)"
                className="w-6 h-6 flex items-center justify-center hover:text-slate-200 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.cubes} className="text-[11px]" />
              </button>
            )}
            {files.length > 0 && onClearWorkspace && (
              <button
                onClick={onClearWorkspace}
                title="Clear All Files (Start with Clean Empty Workspace)"
                className="w-6 h-6 flex items-center justify-center hover:text-rose-400 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.trash} className="text-[11px]" />
              </button>
            )}
          </div>
        )}

        {/* Header Action for Marketplace */}
        {(activeTab === 'marketplace' || activeTab === 'plugins') && (
          <button
            onClick={onOpenMarketplaceModal}
            title="Open Developer Packaging & Full Marketplace"
            className="p-1 hover:text-rose-400 hover:bg-[#1c1d28] rounded transition-colors text-[11px]"
          >
            <FontAwesomeIcon icon={ICONS.upload} />
          </button>
        )}
      </div>

      {/* New File / Folder Inline Input */}
      {newFilePrompt.isOpen && (
        <div className="p-2 border-b border-[#222432] bg-[#161722] space-y-1.5">
          <div className="flex items-center space-x-1 text-[11px] text-slate-400">
            <FontAwesomeIcon icon={newFilePrompt.isFolder ? ICONS.folder : ICONS.file} className="text-rose-400 text-xs" />
            <span>{newFilePrompt.isFolder ? 'Create Folder' : 'Create File'}</span>
          </div>
          <div className="flex space-x-1">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={newFilePrompt.isFolder ? 'folder-name' : 'filename.tsx / service.ts'}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFileName.trim()) {
                  if (createTargetFolderId && onCreateFileInFolder) {
                    onCreateFileInFolder(createTargetFolderId, newFileName.trim(), newFilePrompt.isFolder);
                  } else {
                    onCreateFile(newFileName.trim(), newFilePrompt.isFolder);
                  }
                  setNewFileName('');
                  setCreateTargetFolderId(null);
                  setNewFilePrompt({ isOpen: false, isFolder: false });
                } else if (e.key === 'Escape') {
                  setNewFilePrompt({ isOpen: false, isFolder: false });
                  setCreateTargetFolderId(null);
                }
              }}
              className="flex-1 bg-[#0b0c10] border border-rose-900/60 rounded px-2 py-0.5 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono"
            />
            <button
              onClick={() => {
                if (newFileName.trim()) {
                  if (createTargetFolderId && onCreateFileInFolder) {
                    onCreateFileInFolder(createTargetFolderId, newFileName.trim(), newFilePrompt.isFolder);
                  } else {
                    onCreateFile(newFileName.trim(), newFilePrompt.isFolder);
                  }
                  setNewFileName('');
                  setCreateTargetFolderId(null);
                }
                setNewFilePrompt({ isOpen: false, isFolder: false });
              }}
              className="px-2.5 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs cursor-pointer font-medium"
            >
              OK
            </button>
          </div>

          {/* Pre-made Structure Indicator and Quick Extension Badges */}
          {!newFilePrompt.isFolder && (
            <div className="pt-1 border-t border-[#202232] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="truncate">
                  Starter:{' '}
                  <span className="text-rose-400 font-semibold">
                    {getStarterStructureForFile(newFileName || 'file.ts').structureName}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  { label: '.tsx', sample: 'Component.tsx' },
                  { label: '.ts', sample: 'service.ts' },
                  { label: '.py', sample: 'script.py' },
                  { label: '.html', sample: 'index.html' },
                  { label: '.css', sample: 'styles.css' },
                  { label: '.json', sample: 'config.json' },
                  { label: '.md', sample: 'README.md' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNewFileName(preset.sample)}
                    className="px-1.5 py-0.5 rounded bg-[#1f2132] hover:bg-rose-950 hover:text-rose-300 text-[10px] font-mono text-slate-400 border border-[#2b2e46] transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* VIEW 1: FILE EXPLORER */}
        {activeTab === 'explorer' && (
          <div className="flex-1 flex flex-col justify-between" onContextMenu={handleCanvasContextMenu}>
            <div className="py-2">
              <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 tracking-wider font-mono select-none border-b border-[#1c1e2c]">
                {/* Header Row: Title, Counts, Quick Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 font-bold">FILES</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#161824] text-slate-400 border border-[#232638]">
                      {visibleFilesCount}{hiddenFilesCount > 0 ? ` / ${totalFilesCount}` : ''}
                    </span>
                    {hiddenFilesCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold">
                        {hiddenFilesCount} hidden
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Toggle inline filter bar */}
                    <button
                      type="button"
                      id="toggle-filter-bar-btn"
                      onClick={() => {
                        setIsFilterToolbarOpen((prev) => {
                          const next = !prev;
                          if (next) {
                            setTimeout(() => filterSearchInputRef.current?.focus(), 50);
                          }
                          return next;
                        });
                      }}
                      title={isFilterToolbarOpen ? 'Hide filter controls' : 'Show filter and search controls (Alt+F)'}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                        isFilterActive
                          ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold'
                          : isFilterToolbarOpen
                          ? 'bg-[#1e2030] text-rose-300'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1b26]'
                      }`}
                    >
                      <FontAwesomeIcon icon={ICONS.filter} className="text-[8px]" />
                      <span>Filter</span>
                      <FontAwesomeIcon
                        icon={isFilterToolbarOpen ? ICONS.chevronUp : ICONS.chevronDown}
                        className="text-[7px] text-slate-500 ml-0.5"
                      />
                    </button>

                    {/* Quick node_modules Toggle Pill */}
                    <button
                      type="button"
                      id="quick-filter-node-modules-btn"
                      onClick={() =>
                        setExplorerFilters((prev) => ({
                          ...prev,
                          hideNodeModules: !prev.hideNodeModules,
                        }))
                      }
                      title={
                        explorerFilters.hideNodeModules
                          ? 'node_modules is HIDDEN. Click to make visible.'
                          : 'node_modules is VISIBLE. Click to hide.'
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                        explorerFilters.hideNodeModules
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800 font-bold'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1b26]'
                      }`}
                    >
                      <span>nm</span>
                      <FontAwesomeIcon
                        icon={explorerFilters.hideNodeModules ? ICONS.eyeSlash : ICONS.eye}
                        className={`text-[8px] ${explorerFilters.hideNodeModules ? 'text-rose-400' : 'text-slate-500'}`}
                      />
                    </button>

                    {/* Quick dotfiles Toggle Pill */}
                    <button
                      type="button"
                      id="quick-filter-dotfiles-btn"
                      onClick={() =>
                        setExplorerFilters((prev) => ({
                          ...prev,
                          hideDotFiles: !prev.hideDotFiles,
                        }))
                      }
                      title={
                        explorerFilters.hideDotFiles
                          ? 'Dot-files (.*) are HIDDEN. Click to make visible.'
                          : 'Dot-files (.*) are VISIBLE. Click to hide.'
                      }
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                        explorerFilters.hideDotFiles
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800 font-bold'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1b26]'
                      }`}
                    >
                      <span>.*</span>
                      <FontAwesomeIcon
                        icon={explorerFilters.hideDotFiles ? ICONS.eyeSlash : ICONS.eye}
                        className={`text-[8px] ${explorerFilters.hideDotFiles ? 'text-rose-400' : 'text-slate-500'}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Inline Quick Filter Toolbar (when expanded) */}
                {isFilterToolbarOpen && (
                  <div className="mt-2 space-y-2 pt-1 font-normal select-none">
                    {/* Row 1: Search Input */}
                    <div className="relative flex items-center">
                      <FontAwesomeIcon
                        icon={ICONS.search}
                        className="absolute left-2.5 text-slate-500 text-[10px] pointer-events-none"
                      />
                      <input
                        ref={filterSearchInputRef}
                        type="text"
                        value={explorerFilters.searchFilter}
                        onChange={(e) =>
                          setExplorerFilters((prev) => ({ ...prev, searchFilter: e.target.value }))
                        }
                        placeholder="Filter by name (e.g. *.ts, App)..."
                        className="w-full bg-[#121420] border border-[#23263b] focus:border-rose-500/80 rounded-md pl-7 pr-12 py-1 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
                      />
                      <div className="absolute right-1.5 flex items-center space-x-1">
                        {explorerFilters.searchFilter && (
                          <button
                            type="button"
                            onClick={() => setExplorerFilters((prev) => ({ ...prev, searchFilter: '' }))}
                            className="text-slate-500 hover:text-white p-0.5 cursor-pointer"
                            title="Clear search"
                          >
                            <FontAwesomeIcon icon={ICONS.close} className="text-[9px]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsOptionsDrawerOpen((prev) => !prev)}
                          title="Filter options & toggles"
                          className={`p-0.5 text-[9px] rounded transition-colors cursor-pointer ${
                            isOptionsDrawerOpen
                              ? 'text-rose-400 bg-rose-950/60'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={ICONS.settings} className="text-[9px]" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: File Types Quick Presets & Detected Extensions Chips */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span className="font-semibold text-rose-400/90 uppercase tracking-wider">
                          File Types:
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={handleShowAllExtensions}
                            className={`px-1.5 py-0.2 rounded transition-colors cursor-pointer ${
                              explorerFilters.hiddenExtensions.length === 0
                                ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                                : 'bg-[#161824] hover:bg-[#202334] text-slate-400'
                            }`}
                            title="Show all file types"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyExtensionPreset(['.ts', '.tsx', '.js', '.jsx'])}
                            className="px-1.5 py-0.2 rounded bg-[#161824] hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                            title="Only show code files (.ts, .tsx, .js, .jsx)"
                          >
                            Code
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyExtensionPreset(['.css', '.scss', '.less'])}
                            className="px-1.5 py-0.2 rounded bg-[#161824] hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                            title="Only show style sheets (.css, .scss)"
                          >
                            Styles
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyExtensionPreset(['.json', '.yaml', '.yml'])}
                            className="px-1.5 py-0.2 rounded bg-[#161824] hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                            title="Only show configurations (.json, .yaml)"
                          >
                            Config
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyExtensionPreset(['.md', '.txt'])}
                            className="px-1.5 py-0.2 rounded bg-[#161824] hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                            title="Only show documentation (.md, .txt)"
                          >
                            Docs
                          </button>
                        </div>
                      </div>

                      {/* Detected Workspace Extensions Chips Strip */}
                      {workspaceExtensions.length > 0 && (
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-[#10121c] border border-[#202234] rounded-md">
                          {workspaceExtensions.map(({ ext, count }) => {
                            const isHidden = explorerFilters.hiddenExtensions.some(
                              (e) => e.toLowerCase() === ext.toLowerCase()
                            );
                            return (
                              <button
                                key={ext}
                                type="button"
                                onClick={() => handleToggleExtension(ext)}
                                title={
                                  isHidden
                                    ? `${ext} is HIDDEN (${count} files). Click to SHOW.`
                                    : `${ext} is VISIBLE (${count} files). Click to HIDE.`
                                }
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                                  isHidden
                                    ? 'bg-[#0d0e14] text-slate-600 border border-slate-800 line-through opacity-70 hover:opacity-100 hover:text-slate-400'
                                    : 'bg-[#1b1d2e] text-slate-200 border border-[#2b2e46] hover:border-rose-500/80 shadow-xs'
                                }`}
                              >
                                <FontAwesomeIcon
                                  icon={isHidden ? ICONS.eyeSlash : ICONS.eye}
                                  className={`text-[8px] ${isHidden ? 'text-slate-600' : 'text-rose-400'}`}
                                />
                                <span className="font-semibold">{ext}</span>
                                <span className="text-[8px] text-slate-500 font-normal">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Inline Advanced Options Drawer */}
                    {isOptionsDrawerOpen && (
                      <div className="p-2 bg-[#10111a] border border-[#222436] rounded-md space-y-1.5 text-[9px] animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Hide Empty Folders</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExplorerFilters((prev) => ({
                                ...prev,
                                hideEmptyFolders: !prev.hideEmptyFolders,
                              }))
                            }
                            className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                              explorerFilters.hideEmptyFolders
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-[#181a28] text-slate-400 hover:text-white border border-[#282a3d]'
                            }`}
                          >
                            {explorerFilters.hideEmptyFolders ? 'ON' : 'OFF'}
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#1d1f2e]">
                          <span className="text-slate-400 font-semibold">Invert Types Selection</span>
                          <button
                            type="button"
                            onClick={handleInvertExtensions}
                            className="px-1.5 py-0.5 rounded bg-[#181a28] hover:bg-[#222538] text-slate-300 hover:text-white border border-[#282a3d] cursor-pointer"
                          >
                            Invert
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Row 3: Removable Active Filter Badges Ribbon */}
                    {isFilterActive && (
                      <div className="p-1.5 bg-[#121422] border border-rose-900/60 rounded-md space-y-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center space-x-1 text-rose-400 font-semibold truncate">
                            <FontAwesomeIcon icon={ICONS.filter} className="text-[8px]" />
                            <span>
                              {hiddenFilesCount} file{hiddenFilesCount === 1 ? '' : 's'} hidden
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/80 px-1 py-0.2 rounded font-bold transition-colors cursor-pointer text-[9px]"
                            title="Reset all filters to default"
                          >
                            Reset All
                          </button>
                        </div>

                        {/* Removable criteria chips */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {explorerFilters.hideNodeModules && (
                            <button
                              type="button"
                              onClick={() =>
                                setExplorerFilters((prev) => ({ ...prev, hideNodeModules: false }))
                              }
                              className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[8px] font-mono flex items-center space-x-1 hover:bg-rose-900 cursor-pointer"
                              title="Click to show node_modules"
                            >
                              <span>no node_modules</span>
                              <FontAwesomeIcon icon={ICONS.close} className="text-[7px]" />
                            </button>
                          )}
                          {explorerFilters.hideDotFiles && (
                            <button
                              type="button"
                              onClick={() =>
                                setExplorerFilters((prev) => ({ ...prev, hideDotFiles: false }))
                              }
                              className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[8px] font-mono flex items-center space-x-1 hover:bg-rose-900 cursor-pointer"
                              title="Click to show dot-files"
                            >
                              <span>no dotfiles (.*)</span>
                              <FontAwesomeIcon icon={ICONS.close} className="text-[7px]" />
                            </button>
                          )}
                          {explorerFilters.searchFilter && (
                            <button
                              type="button"
                              onClick={() =>
                                setExplorerFilters((prev) => ({ ...prev, searchFilter: '' }))
                              }
                              className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[8px] font-mono flex items-center space-x-1 hover:bg-rose-900 cursor-pointer"
                              title="Click to clear name filter"
                            >
                              <span>&quot;{explorerFilters.searchFilter}&quot;</span>
                              <FontAwesomeIcon icon={ICONS.close} className="text-[7px]" />
                            </button>
                          )}
                          {explorerFilters.hiddenExtensions.map((ext) => (
                            <button
                              key={ext}
                              type="button"
                              onClick={() => handleToggleExtension(ext)}
                              className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[8px] font-mono flex items-center space-x-1 hover:bg-rose-900 cursor-pointer"
                              title={`Click to show ${ext}`}
                            >
                              <span>hide {ext}</span>
                              <FontAwesomeIcon icon={ICONS.close} className="text-[7px]" />
                            </button>
                          ))}
                          {explorerFilters.hideEmptyFolders && (
                            <button
                              type="button"
                              onClick={() =>
                                setExplorerFilters((prev) => ({ ...prev, hideEmptyFolders: false }))
                              }
                              className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[8px] font-mono flex items-center space-x-1 hover:bg-rose-900 cursor-pointer"
                              title="Click to show empty folders"
                            >
                              <span>no empty dirs</span>
                              <FontAwesomeIcon icon={ICONS.close} className="text-[7px]" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drag & Drop Reorder / Move Guidance Hint Banner */}
              {draggedNodeId && (
                <div className="mx-3 mb-2 px-2.5 py-1 bg-white/[0.04] border border-rose-500/30 rounded text-[10px] font-mono text-rose-300 flex items-center justify-between">
                  <span className="truncate">Drag to reorder or drop onto folder</span>
                  <button
                    onClick={handleDragEnd}
                    className="text-slate-400 hover:text-white px-1 text-[9px] cursor-pointer ml-1 shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {files.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400 space-y-3">
                  <div className="w-9 h-9 mx-auto rounded-lg bg-[#161824] border border-[#232638] flex items-center justify-center text-rose-400/80">
                    <FontAwesomeIcon icon={ICONS.folderOpen} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-300 text-xs">Clean Empty Workspace</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Start coding from scratch, scaffold from a template, or load starter files.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1.5 pt-1">
                    <button
                      onClick={() => setNewFilePrompt({ isOpen: true, isFolder: false })}
                      className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                      <span>New File</span>
                    </button>
                    {onOpenTemplatePicker && (
                      <button
                        onClick={onOpenTemplatePicker}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#171928] hover:bg-rose-950 border border-[#26283c] hover:border-rose-800 text-rose-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <FontAwesomeIcon icon={ICONS.cubes} className="text-[10px]" />
                        <span>From Template...</span>
                      </button>
                    )}
                    {onAddFolderToWorkspace && (
                      <button
                        onClick={onAddFolderToWorkspace}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#141524] hover:bg-rose-950/60 border border-rose-900/50 hover:border-rose-700 text-rose-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[10px]" />
                        <span>Add Folder to Workspace...</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400 space-y-2.5">
                  <div className="w-8 h-8 mx-auto rounded-lg bg-[#161824] border border-[#232638] flex items-center justify-center text-rose-400">
                    <FontAwesomeIcon icon={ICONS.filter} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-300">All files hidden by active filters</p>
                    <p className="text-[11px] text-slate-500">
                      {hiddenFilesCount} file{hiddenFilesCount === 1 ? '' : 's'} hidden. Adjust your filter settings or reset to view files.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium font-mono transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  {filteredFiles.map((file) => renderTreeNode(file, 0))}
                  {draggedNodeId && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragTarget({ id: '__root__', position: 'inside', isFolder: true });
                      }}
                      onDragLeave={(e) => {
                        e.stopPropagation();
                        if (dragTarget?.id === '__root__') setDragTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedNodeId && onMoveFile) {
                          onMoveFile(draggedNodeId, null, 'inside');
                        }
                        handleDragEnd();
                      }}
                      className={`mx-3 my-2.5 p-2 rounded-lg border-2 border-dashed text-center cursor-pointer transition-all ${
                        dragTarget?.id === '__root__'
                          ? 'border-rose-500 bg-rose-950/90 text-rose-200 ring-2 ring-rose-500/40 shadow-lg scale-[1.01]'
                          : 'border-[#292c3e] bg-[#12141f] text-slate-400 hover:border-rose-700/80 hover:text-slate-300'
                      }`}
                    >
                      <div className="text-[11px] font-mono flex items-center justify-center space-x-1.5">
                        <FontAwesomeIcon icon={ICONS.folderOpen} className="text-rose-400 text-xs" />
                        <span className="font-medium">Move to Workspace Root</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Drop here to place file or folder at top-level
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Workspace Stats Footer */}
            <div className="px-3 py-2 border-t border-[#1a1b24] bg-[#0b0c11] text-[10px] font-mono text-slate-500 flex items-center justify-between select-none">
              <span>
                {visibleFilesCount} of {totalFilesCount} {totalFilesCount === 1 ? 'file' : 'files'}
                {hiddenFilesCount > 0 ? ` (${hiddenFilesCount} hidden)` : ''}
              </span>
              <span className="text-slate-500 font-semibold text-rose-500/70">CsCode</span>
            </div>
          </div>
        )}

        {/* VIEW 2: GLOBAL SEARCH & REPLACE */}
        {activeTab === 'search' && (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <SearchPanel
              files={files}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              searchResults={searchResults}
              searchSummary={searchSummary}
              searchOptions={searchOptions}
              onUpdateSearchOptions={onUpdateSearchOptions}
              onSelectSearchMatch={onSelectSearchMatch}
              onReplaceAll={onReplaceAll}
              onReplaceInFile={onReplaceInFile}
              onReplaceSingleMatch={onReplaceSingleMatch}
              onDismissMatch={onDismissMatch}
              onDismissFile={onDismissFile}
              activeFileId={activeFileId}
            />
          </div>
        )}

        {/* VIEW 3: SOURCE CONTROL (GIT) */}
        {activeTab === 'git' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 font-mono text-rose-300 font-semibold" title={`Active branch: ${gitBranch}`}>
                <FontAwesomeIcon icon={ICONS.git} className="text-rose-500" />
                <span>{gitBranch}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">{dirtyFilesCount} modified</span>
            </div>

            {/* GitHub Provider Remote Bar */}
            <div className="p-2.5 rounded-lg border border-[#222434] bg-[#0d0e17] text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-6 h-6 rounded bg-[#151724] border border-[#27293d] flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={ICONS.github} className="text-slate-200 text-xs" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-slate-200 block text-[11px] truncate">
                      {isGitHubAuthenticated ? (
                        <span className="text-emerald-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                          <span className="truncate">{connectedGitHubRepo || 'Connected'}</span>
                        </span>
                      ) : (
                        'Local Workspace'
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {isGitHubAuthenticated ? `origin/${gitBranch}` : 'Offline / Local Git (OAuth optional)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isGitHubAuthenticated ? (
                    <>
                      <button
                        onClick={onQuickPull}
                        disabled={isPullingRemote}
                        className="px-2 py-1 rounded bg-[#171826] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#2b2d40] text-[10px] flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
                        title={`Pull latest changes from origin/${gitBranch}`}
                      >
                        <FontAwesomeIcon icon={ICONS.cloudDown} className={isPullingRemote ? 'animate-bounce text-rose-400' : 'text-slate-400'} />
                        <span>{isPullingRemote ? 'Pulling...' : 'Pull'}</span>
                      </button>
                      <button
                        onClick={onQuickPush}
                        disabled={isPushingRemote}
                        className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[10px] flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50 font-semibold"
                        title={`Push branch '${gitBranch}' to GitHub remote`}
                      >
                        <FontAwesomeIcon icon={ICONS.cloudUp} className={isPushingRemote ? 'animate-bounce text-rose-300' : 'text-rose-400'} />
                        <span>{isPushingRemote ? 'Pushing...' : 'Push'}</span>
                      </button>
                      <button
                        onClick={() => setGitSubTab('remote')}
                        className={`px-2 py-1 rounded border text-[10px] flex items-center space-x-1 cursor-pointer transition-colors ${
                          gitSubTab === 'remote'
                            ? 'bg-rose-950 text-rose-300 border-rose-800 font-semibold'
                            : 'bg-[#171826] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border-[#2b2d40]'
                        }`}
                        title="Browse remote repository file tree"
                      >
                        <FontAwesomeIcon icon={ICONS.folder} className="text-[10px] text-amber-400" />
                        <span>Tree</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onOpenGitHubModal}
                      className="px-2 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700 text-[10px] flex items-center space-x-1 cursor-pointer font-semibold transition-colors"
                      title="Connect GitHub repository via OAuth"
                    >
                      <FontAwesomeIcon icon={ICONS.github} className="text-[10px]" />
                      <span>Connect</span>
                    </button>
                  )}
                  <button
                    onClick={onOpenGitHubModal}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] cursor-pointer transition-colors"
                    title="Configure GitHub OAuth & Remote Repositories"
                  >
                    <FontAwesomeIcon icon={ICONS.settings} className="text-[10px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Segmented View Switcher: Graph vs Changes vs Remote Tree */}
            <div className="flex rounded-lg bg-[#10111a] p-0.5 border border-[#222434] text-xs font-mono">
              <button
                id="git-subtab-graph-btn"
                onClick={() => setGitSubTab('graph')}
                className={`flex-1 py-1 rounded text-center transition-colors flex items-center justify-center space-x-1 cursor-pointer text-[11px] ${
                  gitSubTab === 'graph'
                    ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Git Commits History Graph"
              >
                <FontAwesomeIcon icon={ICONS.git} className="text-[10px]" />
                <span>Graph</span>
              </button>
              <button
                id="git-subtab-changes-btn"
                onClick={() => setGitSubTab('changes')}
                className={`flex-1 py-1 rounded text-center transition-colors flex items-center justify-center space-x-1 cursor-pointer text-[11px] ${
                  gitSubTab === 'changes'
                    ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Local Uncommitted Changes"
              >
                <span>Changes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-900/60 text-[9px] text-rose-300 font-bold">
                  {dirtyFilesCount}
                </span>
              </button>
              <button
                id="git-subtab-remote-btn"
                onClick={() => setGitSubTab('remote')}
                className={`flex-1 py-1 rounded text-center transition-colors flex items-center justify-center space-x-1 cursor-pointer text-[11px] ${
                  gitSubTab === 'remote'
                    ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Browse Remote GitHub Repository File Tree"
              >
                <FontAwesomeIcon icon={ICONS.github} className="text-[10px]" />
                <span>Remote Tree</span>
              </button>
            </div>

            {/* SUBTAB 1: D3.JS GIT HISTORY GRAPH */}
            {gitSubTab === 'graph' && (
              <div className="space-y-3">
                <GitHistoryGraph
                  commits={gitCommits}
                  activeBranch={gitBranch}
                  branches={branches}
                  onSwitchBranch={onSwitchBranch}
                  onSimulateMerge={onSimulateMerge}
                  onCreateBranchFromCommit={onCreateBranchFromCommit}
                />

                {/* Quick Uncommitted Changes Notice */}
                {dirtyFilesCount > 0 && (
                  <div className="p-2.5 rounded-lg border border-amber-900/60 bg-amber-950/20 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="flex items-center space-x-1">
                        <FontAwesomeIcon icon={ICONS.warning} className="text-[10px]" />
                        <span>{dirtyFilesCount} uncommitted changes</span>
                      </span>
                      <button
                        onClick={() => setGitSubTab('changes')}
                        className="text-amber-400 hover:text-amber-200 underline text-[10px] cursor-pointer"
                      >
                        Commit Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: COMMIT BOX & CHANGES LIST */}
            {gitSubTab === 'changes' && (
              <div className="space-y-3">
                {/* Commit Message Box */}
                <div className="space-y-2">
                  <textarea
                    value={gitCommitMsg}
                    onChange={(e) => setGitCommitMsg(e.target.value)}
                    placeholder="Commit message (Ctrl+Enter to commit)"
                    rows={2}
                    className="w-full bg-[#14151e] border border-[#2b2d3d] rounded p-2 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono resize-none"
                  />
                  <button
                    onClick={() => {
                      if (gitCommitMsg.trim()) {
                        onGitCommit(gitCommitMsg.trim());
                        setGitCommitMsg('');
                      }
                    }}
                    disabled={!gitCommitMsg.trim() || dirtyFilesCount === 0}
                    className="w-full py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.check} className="text-xs" />
                    <span>Commit Changes</span>
                  </button>
                </div>

                {/* Changed Files List */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider px-0.5">
                    <span>Changes</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-rose-400">{dirtyFilesCount}</span>
                      {onOpenDiffModal && modifiedFilesList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenDiffModal(modifiedFilesList[0].id)}
                          title="Open Dedicated Git Diff Modal (Side-by-Side vs Last Commit)"
                          className="px-1.5 py-0.5 rounded bg-[#161824] hover:bg-rose-950/70 border border-[#272a3d] hover:border-rose-700/80 text-[10px] text-slate-300 hover:text-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <FontAwesomeIcon icon={ICONS.gitCompare} className="text-rose-400 text-[9px]" />
                          <span>Diff Modal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {modifiedFilesList.length > 0 ? (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {modifiedFilesList.map((mFile) => {
                        const iconConfig = getFileIconConfig(mFile.name, mFile.language);
                        return (
                          <div
                            key={mFile.id}
                            className="group flex items-center justify-between px-2 py-1.5 rounded bg-[#13141d] hover:bg-[#1a1c29] border border-[#202230] text-xs font-mono transition-colors"
                          >
                            <button
                              onClick={() => {
                                if (onOpenDiffModal) onOpenDiffModal(mFile.id);
                                else if (onOpenDiff) onOpenDiff(mFile.id);
                                else onOpenFile(mFile.id);
                              }}
                              className="flex items-center space-x-2 truncate flex-1 text-left cursor-pointer hover:text-rose-300"
                              title={`Click to open Git Diff Modal for ${mFile.name}`}
                            >
                              <FontAwesomeIcon icon={iconConfig.icon} className={`text-xs ${iconConfig.color}`} />
                              <span className="truncate text-slate-200 font-medium">{mFile.name}</span>
                            </button>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className="px-1 py-0.2 rounded bg-amber-950/70 border border-amber-800 text-amber-400 text-[10px] font-bold">
                                M
                              </span>
                              <button
                                onClick={() => {
                                  if (onOpenDiffModal) onOpenDiffModal(mFile.id);
                                  else onOpenDiff?.(mFile.id);
                                }}
                                title="Open Dedicated Git Diff Modal (Side-by-Side additions & deletions vs last commit)"
                                className="p-1 hover:bg-rose-950 hover:text-rose-300 text-slate-400 rounded transition-colors cursor-pointer"
                              >
                                <FontAwesomeIcon icon={ICONS.gitCompare} className="text-[10px]" />
                              </button>
                              {onRevertFile && (
                                <button
                                  onClick={() => onRevertFile(mFile.id)}
                                  title="Discard Changes (Revert to HEAD)"
                                  className="p-1 hover:bg-rose-950 hover:text-rose-300 text-slate-400 rounded transition-colors cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={ICONS.rotateLeft} className="text-[10px]" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500 font-mono italic bg-[#11121a] rounded border border-[#1d1f2b]">
                      Working tree clean. No modified files.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 3: GITHUB REMOTE REPOSITORY FILE TREE */}
            {gitSubTab === 'remote' && (
              <GitHubRemoteTreeSection
                isGitHubAuthenticated={isGitHubAuthenticated}
                connectedGitHubRepo={connectedGitHubRepo}
                gitBranch={gitBranch}
                onOpenGitHubModal={onOpenGitHubModal}
                onOpenFileContent={(name, content) => {
                  if (onCreateNewFileWithContent) {
                    onCreateNewFileWithContent(name, content);
                  }
                }}
                onImportRemoteFiles={onImportRemoteFiles}
                onQuickPush={onQuickPush}
                onQuickPull={onQuickPull}
                isPushingRemote={isPushingRemote}
                isPullingRemote={isPullingRemote}
              />
            )}
          </div>
        )}

        {/* VIEW: GITHUB TAB (REMOTE REPOSITORIES & REPO FILE TREE) */}
        {activeTab === 'github' && (
          <div className="flex-1 overflow-y-auto">
            <GitHubRemoteTreeSection
              isGitHubAuthenticated={isGitHubAuthenticated}
              connectedGitHubRepo={connectedGitHubRepo}
              gitBranch={gitBranch}
              onOpenGitHubModal={onOpenGitHubModal}
              onOpenFileContent={(name, content) => {
                if (onCreateNewFileWithContent) {
                  onCreateNewFileWithContent(name, content);
                }
              }}
              onImportRemoteFiles={onImportRemoteFiles}
              onQuickPush={onQuickPush}
              onQuickPull={onQuickPull}
              isPushingRemote={isPushingRemote}
              isPullingRemote={isPullingRemote}
            />
          </div>
        )}

        {/* VIEW 4: MARKETPLACE & PLUGINS */}
        {(activeTab === 'marketplace' || activeTab === 'plugins') && (
          <div className="p-3 space-y-3">
            {/* Header Hub Action */}
            <button
              onClick={onOpenMarketplaceModal}
              className="w-full py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white rounded text-xs font-mono font-semibold flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.store} />
              <span>Open Extension Studio</span>
            </button>

            {/* Search Extensions */}
            <div className="relative">
              <input
                type="text"
                value={pluginSearch}
                onChange={(e) => setPluginSearch(e.target.value)}
                placeholder="Search extensions..."
                className="w-full bg-[#14151e] border border-[#2b2d3d] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex space-x-1 text-xs">
              {(['All', 'Installed', 'Marketplace'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPluginCategoryFilter(tab)}
                  className={`flex-1 py-1 rounded text-center font-mono text-[11px] transition-colors ${
                    pluginCategoryFilter === tab 
                      ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                      : 'bg-[#151620] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Plugins List */}
            <div className="space-y-2">
              {filteredPlugins.map((plugin) => {
                const hasUpdate = plugin.installed && plugin.latestVersion && plugin.installedVersion && plugin.latestVersion !== plugin.installedVersion;

                return (
                  <div
                    key={plugin.id}
                    className="p-2.5 rounded border border-[#222432] bg-[#13141c] hover:border-rose-900/60 transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded bg-[#1d1f2b] flex items-center justify-center text-rose-400 text-xs border border-rose-950">
                          <FontAwesomeIcon icon={(ICONS as any)[plugin.icon] || ICONS.plugins} />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-200 leading-tight">
                            {plugin.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            v{plugin.latestVersion || plugin.version} • {plugin.author}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center space-x-1">
                        {hasUpdate && (
                          <button
                            onClick={() => onUpdatePlugin(plugin.id, plugin.latestVersion!)}
                            className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[9px] font-mono"
                          >
                            Update
                          </button>
                        )}

                        {plugin.installed ? (
                          <>
                            <button
                              onClick={() => onTogglePlugin(plugin.id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                plugin.enabled 
                                  ? 'bg-rose-950 text-rose-300 border-rose-800' 
                                  : 'bg-[#181a24] text-slate-400 border-[#2a2c3a]'
                              }`}
                            >
                              {plugin.enabled ? 'ON' : 'OFF'}
                            </button>
                            <button
                              onClick={() => onUninstallPlugin(plugin.id)}
                              title="Uninstall"
                              className="p-1 text-slate-400 hover:text-rose-400 text-xs"
                            >
                              <FontAwesomeIcon icon={ICONS.trash} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onInstallPlugin(plugin)}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-semibold"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {plugin.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-[#1d1f2b]">
                      <span className="text-slate-400">{plugin.category}</span>
                      <span className="text-amber-400 font-semibold">{plugin.rating} ★</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Explorer Context Menu (Right Click) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
          }}
          className="w-52 bg-[#12131b] border border-rose-900/80 rounded-lg shadow-2xl shadow-rose-950/70 py-1.5 text-xs font-mono text-slate-200 select-none backdrop-blur-md animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.node ? (
            <>
              {/* Target File/Folder Header */}
              <div className="px-3 py-1 text-[10px] text-slate-400 font-sans truncate border-b border-[#242636] flex items-center space-x-1.5 mb-1">
                <FontAwesomeIcon
                  icon={contextMenu.node.isFolder ? ICONS.folder : ICONS.file}
                  className="text-rose-400 text-[10px]"
                />
                <span className="truncate font-semibold text-slate-300">{contextMenu.node.name}</span>
              </div>

              {/* Folder specific actions */}
              {contextMenu.node.isFolder ? (
                <>
                  <button
                    onClick={() => handleQuickNewFile(contextMenu.node?.id || null)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.plus} className="text-rose-400 text-[10px]" />
                      <span>New File...</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleQuickNewFolder(contextMenu.node?.id || null)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.folder} className="text-rose-400 text-[10px]" />
                      <span>New Folder...</span>
                    </span>
                  </button>
                  <div className="my-1 border-t border-[#242636]" />
                </>
              ) : (
                /* File specific actions */
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.node) onOpenFile(contextMenu.node.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.file} className="text-rose-400 text-[10px]" />
                      <span>Open</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Enter</span>
                  </button>
                  <button
                    onClick={() => handleDuplicate(contextMenu.node!)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.copy} className="text-rose-400 text-[10px]" />
                      <span>Duplicate</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Ctrl+D</span>
                  </button>

                  {/* Simulate External Modification on this File */}
                  {onSimulateExternalChange && (
                    <button
                      onClick={() => {
                        if (contextMenu.node) onSimulateExternalChange(contextMenu.node.id);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-amber-950/70 hover:text-amber-200 text-amber-300 text-left transition-colors cursor-pointer font-medium"
                    >
                      <span className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.bolt} className="text-amber-400 text-[10px]" />
                        <span>Simulate External Edit</span>
                      </span>
                    </button>
                  )}

                  {/* Acknowledge External Change if active */}
                  {contextMenu.node && externallyModifiedFiles?.[contextMenu.node.id] && onDismissExternalChange && (
                    <button
                      onClick={() => {
                        if (contextMenu.node) onDismissExternalChange(contextMenu.node.id);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-emerald-950/70 hover:text-emerald-200 text-emerald-300 text-left transition-colors cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.circleCheck} className="text-emerald-400 text-[10px]" />
                        <span>Acknowledge External Change</span>
                      </span>
                    </button>
                  )}
                  <div className="my-1 border-t border-[#242636]" />
                </>
              )}

              {/* Common Node Actions */}
              <button
                onClick={() => handleStartRename(contextMenu.node!)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.edit} className="text-rose-400 text-[10px]" />
                  <span>Rename</span>
                </span>
                <span className="text-[10px] text-slate-400">F2</span>
              </button>

              <button
                onClick={() => handleCopyPath(contextMenu.node!)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.copy} className="text-rose-400 text-[10px]" />
                  <span>Copy Path</span>
                </span>
              </button>

              <div className="my-1 border-t border-[#242636]" />

              <button
                onClick={() => handleDelete(contextMenu.node!)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/90 text-rose-400 hover:text-rose-200 text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.trash} className="text-[10px]" />
                  <span>Delete</span>
                </span>
                <span className="text-[10px] text-rose-400/80">Del</span>
              </button>
            </>
          ) : (
            /* Canvas Root Actions */
            <>
              <div className="px-3 py-1 text-[10px] text-slate-400 font-sans truncate border-b border-[#242636] mb-1">
                <span className="font-semibold text-slate-300">Explorer</span>
              </div>
              <button
                onClick={() => handleQuickNewFile(null)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.plus} className="text-rose-400 text-[10px]" />
                  <span>New File...</span>
                </span>
                <span className="text-[10px] text-slate-400">Ctrl+N</span>
              </button>
              <button
                onClick={() => handleQuickNewFolder(null)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={ICONS.folder} className="text-rose-400 text-[10px]" />
                  <span>New Folder...</span>
                </span>
              </button>
              {onOpenTemplatePicker && (
                <button
                  onClick={() => {
                    setContextMenu(null);
                    onOpenTemplatePicker();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/70 hover:text-rose-200 text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={ICONS.cubes} className="text-rose-400 text-[10px]" />
                    <span>From Template...</span>
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
