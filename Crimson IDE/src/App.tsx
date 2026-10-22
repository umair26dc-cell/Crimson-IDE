/**
 * CsCode Crimson Code - Full-Featured Developer Environment
 * Crimson dark palette, FontAwesome iconography (Zero Emojis),
 * Split-view editor, Extension Studio, File Breadcrumbs,
 * Background Non-Blocking Symbol Indexing, Fuzzy Search,
 * and Built-in Terminal.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ActiveSidebarTab, 
  BottomPanelTab, 
  CloudSyncState, 
  CodeSymbol,
  CommandItem, 
  Diagnostic, 
  EditorPaneState, 
  EditorTab,
  FileItem, 
  IndexStats,
  LanguageId, 
  LayoutConfig,
  NavigationHistoryEntry,
  PluginDefinition, 
  SearchMatch, 
  SearchOptions,
  SplitDirection, 
  TerminalSplitMode,
  UserSettings,
  ExternalFileModification
} from './types';
import { 
  getAllFilesList, 
  findFileById 
} from './lib/defaultFiles';
import { 
  executeWorkspaceSearch, 
  replaceInWorkspace, 
  replaceSingleMatchInContent, 
  SearchResultsSummary 
} from './lib/searchEngine';
import { INITIAL_PLUGINS } from './lib/plugins';
import { cloudSync, DEFAULT_SETTINGS } from './lib/cloudSync';
import { getCrimsonTerminalPalette } from './lib/terminalThemes';
import { symbolIndexer } from './lib/symbolIndexer';
import { themeEngine } from './lib/themeEngine';
import { applyCustomizationToDOM } from './lib/customizationEngine';
import { applyCustomCssToDOM } from './lib/customCssEngine';
import { audioEngine } from './lib/audioEngine';
import { getEffectiveKeybinding, matchesKeybinding } from './lib/keybindingsEngine';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from './lib/fontawesome';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { BottomPanel } from './components/BottomPanel';
import { StatusBar } from './components/StatusBar';
import { QuickOpenModal } from './components/QuickOpenModal';
import { SettingsModal } from './components/SettingsModal';
import { EslintConfigModal } from './components/EslintConfigModal';
import { PluginMarketplaceModal } from './components/PluginMarketplaceModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ThemeStoreModal } from './components/ThemeStoreModal';
import { TemplatePickerModal } from './components/TemplatePickerModal';
import { CodeStatsModal } from './components/CodeStatsModal';
import { AddFolderModal, RootFolderPreset } from './components/AddFolderModal';
import { runCodeInSandbox, ExecutionLog } from './lib/codeRunner';
import { CodeTemplate } from './lib/templates';
import { getStarterStructureForFile } from './lib/fileStructures';
import {
  runEslintOnContent,
  generateEslintRcJson,
  generateEslintIgnore,
  DEFAULT_ESLINT_RULES,
  DEFAULT_CUSTOM_RULES,
  DEFAULT_ESLINT_IGNORE,
} from './lib/eslintEngine';
import { GitCommitNode, GitHistoryEngine } from './lib/gitHistory';
import { GitHubConnectModal } from './components/GitHubConnectModal';
import { GitDiffModal } from './components/GitDiffModal';
import { GitHubService, PushResult, PullResult } from './lib/githubService';
import { OfflineIndicator } from './components/OfflineIndicator';

const WORKSPACE_STORAGE_KEY = 'crimson_workspace_files';
const WORKSPACE_CLEARED_KEY = 'crimson_workspace_cleared';
const GIT_BRANCHES_KEY = 'crimson_git_branches';
const GIT_CURRENT_BRANCH_KEY = 'crimson_git_current_branch';
const GIT_BRANCH_FILES_PREFIX = 'crimson_git_branch_files_';

function loadInitialBranches(): string[] {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(GIT_BRANCHES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load git branches:', e);
  }
  return ['main'];
}

function loadInitialGitBranch(): string {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(GIT_CURRENT_BRANCH_KEY);
      if (saved && typeof saved === 'string' && saved.trim()) {
        return saved.trim();
      }
    }
  } catch (e) {
    console.error('Failed to load current git branch:', e);
  }
  return 'main';
}

// Identifies any items lingering from the old premade starter project
function isPremadeItem(item: FileItem): boolean {
  if (['file-main-ts', 'file-server-ts', 'file-utils-ts', 'file-readme-md', 'folder-src', 'file-package-json'].includes(item.id)) return true;
  if (item.name === 'README.md' && item.content?.includes('Crimson Code Studio')) return true;
  return false;
}

function sanitizeWorkspaceFiles(fileList: FileItem[]): FileItem[] {
  return fileList
    .filter(f => !isPremadeItem(f))
    .map(f => {
      if (f.children) {
        return {
          ...f,
          children: f.children.filter(c => !isPremadeItem(c)),
        };
      }
      return f;
    })
    .filter(f => !(f.isFolder && !f.isRootFolder && (!f.children || f.children.length === 0)));
}

function ensureBaselineContent(nodes: FileItem[]): FileItem[] {
  return nodes.map((node) => ({
    ...node,
    originalContent: node.originalContent !== undefined ? node.originalContent : (node.content ?? ''),
    lastModified: node.lastModified || Date.now() - 3600000,
    children: node.children ? ensureBaselineContent(node.children) : undefined,
  }));
}

function loadInitialFiles(branchName: string = 'main'): FileItem[] {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(WORKSPACE_CLEARED_KEY) === 'true') {
      return [];
    }
    const branchKey = `${GIT_BRANCH_FILES_PREFIX}${branchName}`;
    const branchSaved = typeof window !== 'undefined' ? localStorage.getItem(branchKey) : null;
    if (branchSaved) {
      const parsed = JSON.parse(branchSaved);
      if (Array.isArray(parsed)) {
        const cleaned = sanitizeWorkspaceFiles(parsed);
        return ensureBaselineContent(cleaned);
      }
    }

    const saved = typeof window !== 'undefined'
      ? (localStorage.getItem(WORKSPACE_STORAGE_KEY) || localStorage.getItem('ccode_workspace_snapshot'))
      : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Strip out any premade demo project files completely
        const cleaned = sanitizeWorkspaceFiles(parsed);
        const withBaseline = ensureBaselineContent(cleaned);
        if (typeof window !== 'undefined') {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(withBaseline));
          localStorage.setItem('ccode_workspace_snapshot', JSON.stringify(withBaseline));
          localStorage.setItem(branchKey, JSON.stringify(withBaseline));
        }
        return withBaseline;
      }
    }
  } catch (err) {
    console.error('Failed to load initial workspace files:', err);
  }
  // The user requested to remove the premade project so workspaces start clean and empty by default
  return [];
}

function getInitialStarterFile(filesList: FileItem[]): FileItem | null {
  for (const item of filesList) {
    if (!item.isFolder) return item;
    if (item.children) {
      for (const child of item.children) {
        if (!child.isFolder) return child;
      }
    }
  }
  return null;
}

export default function App() {
  // Git Branches State
  const [gitBranch, setGitBranch] = useState<string>(loadInitialGitBranch);
  const [branches, setBranches] = useState<string[]>(() => {
    const list = loadInitialBranches();
    const cur = loadInitialGitBranch();
    return list.includes(cur) ? list : [cur, ...list];
  });
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState<boolean>(false);
  const [gitCommits, setGitCommits] = useState<GitCommitNode[]>(() => GitHistoryEngine.loadCommits());

  // 1. Files and Workspace State
  const [files, setFiles] = useState<FileItem[]>(() => loadInitialFiles(loadInitialGitBranch()));
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());
  const [showDiffFileId, setShowDiffFileId] = useState<string | null>(null);

  // 2. Editor Panes State (Split View)
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('none');
  const [activePaneId, setActivePaneId] = useState<'pane1' | 'pane2'>('pane1');

  const [pane1, setPane1] = useState<EditorPaneState>(() => {
    const initialList = loadInitialFiles(loadInitialGitBranch());
    const starter = getInitialStarterFile(initialList);
    if (starter) {
      const initTab: EditorTab = {
        id: `tab-${starter.id}-init`,
        fileId: starter.id,
        fileName: starter.name,
        filePath: starter.path,
        language: starter.language || 'typescript',
        isDirty: false,
      };
      return {
        id: 'pane1',
        tabs: [initTab],
        activeTabId: initTab.id,
        cursorLine: 1,
        cursorCol: 1,
        scrollPosition: 0,
        navigationHistory: [
          {
            fileId: starter.id,
            fileName: starter.name,
            filePath: starter.path,
            line: 1,
            col: 1,
            timestamp: Date.now(),
          },
        ],
        navigationIndex: 0,
      };
    }
    return {
      id: 'pane1',
      tabs: [],
      activeTabId: '',
      cursorLine: 1,
      cursorCol: 1,
      scrollPosition: 0,
      navigationHistory: [],
      navigationIndex: -1,
    };
  });

  const [pane2, setPane2] = useState<EditorPaneState>({
    id: 'pane2',
    tabs: [],
    activeTabId: '',
    cursorLine: 1,
    cursorCol: 1,
    scrollPosition: 0,
    navigationHistory: [],
    navigationIndex: -1,
  });

  // 3. Navigation & Panels
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab | null>('explorer');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState<boolean>(true);
  const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTab>('terminal');
  const [terminalSplitMode, setTerminalSplitMode] = useState<TerminalSplitMode>('none');

  // 4. Modals & Palettes
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState<boolean>(false);
  const [quickOpenInitialMode, setQuickOpenInitialMode] = useState<'files' | 'commands' | 'symbols'>('files');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<
    | 'editor'
    | 'terminal'
    | 'syntax'
    | 'eslint'
    | 'theme'
    | 'layout'
    | 'sync'
    | 'audio'
    | 'customCss'
    | 'wallpaper'
    | 'keybindings'
    | 'snippets'
    | 'uiElements'
  >('editor');
  const [isEslintModalOpen, setIsEslintModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState<boolean>(false);
  const [activePluginToConfig, setActivePluginToConfig] = useState<PluginDefinition | null>(null);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [isPushingRemote, setIsPushingRemote] = useState<boolean>(false);
  const [isPullingRemote, setIsPullingRemote] = useState<boolean>(false);
  const [gitHubAuthStatus, setGitHubAuthStatus] = useState(() => GitHubService.getAuthStatus());

  // 4b. Code Runner & Statistics & Templates State
  const [outputLogs, setOutputLogs] = useState<ExecutionLog[]>([]);
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [statsTargetFile, setStatsTargetFile] = useState<FileItem | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState<boolean>(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState<boolean>(false);
  const [isGitDiffModalOpen, setIsGitDiffModalOpen] = useState<boolean>(false);
  const [gitDiffModalFileId, setGitDiffModalFileId] = useState<string | null>(null);

  // 4c. File System Watcher Simulation State
  const [externallyModifiedFiles, setExternallyModifiedFiles] = useState<Record<string, ExternalFileModification>>({});
  const [isWatcherAutoSimulateEnabled, setIsWatcherAutoSimulateEnabled] = useState<boolean>(false);

  // Existing folder names for conflict avoidance in AddFolderModal
  const existingRootFolderNames = useMemo(
    () => files.filter((f) => f.isFolder).map((f) => f.name),
    [files]
  );

  // Auto-persist workspace changes to localStorage so user work is never wiped
  useEffect(() => {
    try {
      if (files.length === 0) {
        localStorage.setItem(WORKSPACE_CLEARED_KEY, 'true');
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        localStorage.removeItem('ccode_workspace_snapshot');
        localStorage.removeItem(`${GIT_BRANCH_FILES_PREFIX}${gitBranch}`);
      } else {
        localStorage.removeItem(WORKSPACE_CLEARED_KEY);
        const serialized = JSON.stringify(files);
        localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized);
        localStorage.setItem('ccode_workspace_snapshot', serialized);
        localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${gitBranch}`, serialized);
      }
    } catch (e) {
      console.error('Failed to auto-save workspace files:', e);
    }
  }, [files, gitBranch]);

  // 5. Settings & Cloud Sync
  const [userSettings, setUserSettings] = useState<UserSettings>(() => cloudSync.loadLocalSettings());
  const [syncState, setSyncState] = useState<CloudSyncState>(cloudSync.getState());

  // 6. Modular Plugins Registry
  const [plugins, setPlugins] = useState<PluginDefinition[]>(INITIAL_PLUGINS);

  // 7. Search & Diagnostics
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [searchSummary, setSearchSummary] = useState<SearchResultsSummary | null>(null);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    matchCase: false,
    matchWholeWord: false,
    useRegex: false,
    preserveCase: false,
    includePattern: '',
    excludePattern: '',
    fileType: 'all',
    sortBy: 'relevance',
  });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  // 8. Large Codebase Background Indexer Stats
  const [indexStats, setIndexStats] = useState<IndexStats>(symbolIndexer.getStats());
  const indexDebounceRef = useRef<number | null>(null);

  // 9. Layout Mode & Themes Customization
  const [isEditLayoutMode, setIsEditLayoutMode] = useState<boolean>(false);
  const [isThemeStoreOpen, setIsThemeStoreOpen] = useState<boolean>(false);
  const [currentThemeName, setCurrentThemeName] = useState<string>(() => {
    return themeEngine.getActiveTheme()?.name || 'Crimson Ruby';
  });

  // Sync Theme Engine on Mount & when settings change
  useEffect(() => {
    themeEngine.init();
    if (userSettings.activeThemeId) {
      themeEngine.setActiveTheme(userSettings.activeThemeId);
    }
    setCurrentThemeName(themeEngine.getActiveTheme()?.name || 'Crimson Ruby');
  }, [userSettings.activeThemeId, userSettings.crimsonShade]);

  // Apply deep customization to DOM (accent color, typography, density, radii, blur, cursor, custom CSS, audio)
  useEffect(() => {
    applyCustomizationToDOM(userSettings);
    applyCustomCssToDOM(userSettings.customCssCode, userSettings.customCssEnabled !== false);
    audioEngine.setConfig(
      userSettings.typingSoundpack,
      userSettings.typingSoundVolume,
      userSettings.typingSoundPitchVariation
    );
  }, [userSettings]);

  // Active Layout Configuration
  const layoutConfig: LayoutConfig = useMemo(() => {
    return userSettings.layoutConfig || {
      sidebarPosition: 'left',
      activityBarPosition: 'left',
      bottomPanelPosition: 'bottom',
      minimapPosition: 'right',
      statusBarPosition: 'bottom',
    };
  }, [userSettings.layoutConfig]);

  const handleToggleEditLayoutMode = () => {
    setIsEditLayoutMode((prev) => !prev);
  };

  const handleUpdateLayoutConfig = useCallback((updates: Partial<LayoutConfig>) => {
    setUserSettings((prev) => {
      const current = prev.layoutConfig || {
        sidebarPosition: 'left',
        activityBarPosition: 'left',
        bottomPanelPosition: 'bottom',
        minimapPosition: 'right',
        statusBarPosition: 'bottom',
      };
      const merged: LayoutConfig = { ...current, ...updates };
      const nextSettings = { ...prev, layoutConfig: merged };
      cloudSync.saveLocalSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const handleToggleSidebarPosition = useCallback(() => {
    handleUpdateLayoutConfig({
      sidebarPosition: layoutConfig.sidebarPosition === 'left' ? 'right' : 'left',
    });
  }, [layoutConfig.sidebarPosition, handleUpdateLayoutConfig]);

  const handleToggleActivityBarPosition = useCallback(() => {
    const next = layoutConfig.activityBarPosition === 'left' 
      ? 'right' 
      : layoutConfig.activityBarPosition === 'right' 
      ? 'hidden' 
      : 'left';
    handleUpdateLayoutConfig({ activityBarPosition: next });
  }, [layoutConfig.activityBarPosition, handleUpdateLayoutConfig]);

  const handleCycleDockPosition = useCallback(() => {
    const next = layoutConfig.bottomPanelPosition === 'bottom' 
      ? 'right' 
      : layoutConfig.bottomPanelPosition === 'right' 
      ? 'left' 
      : 'bottom';
    handleUpdateLayoutConfig({ bottomPanelPosition: next });
  }, [layoutConfig.bottomPanelPosition, handleUpdateLayoutConfig]);

  const handleToggleMinimapPosition = useCallback(() => {
    handleUpdateLayoutConfig({
      minimapPosition: layoutConfig.minimapPosition === 'right' ? 'left' : 'right',
    });
  }, [layoutConfig.minimapPosition, handleUpdateLayoutConfig]);

  const handleToggleStatusBarPosition = useCallback(() => {
    handleUpdateLayoutConfig({
      statusBarPosition: layoutConfig.statusBarPosition === 'bottom' ? 'top' : 'bottom',
    });
  }, [layoutConfig.statusBarPosition, handleUpdateLayoutConfig]);

  const handleSwapSplitPanes = useCallback(() => {
    setPane1((prev1) => {
      setPane2(prev1);
      return pane2;
    });
  }, [pane2]);

  const handleResetLayout = useCallback(() => {
    handleUpdateLayoutConfig({
      sidebarPosition: 'left',
      activityBarPosition: 'left',
      bottomPanelPosition: 'bottom',
      minimapPosition: 'right',
      statusBarPosition: 'bottom',
    });
  }, [handleUpdateLayoutConfig]);

  // Background Indexing Lifecycle
  useEffect(() => {
    // Initial indexing
    symbolIndexer.indexWorkspace(files);

    const unsub = symbolIndexer.onStatsChange((stats) => {
      setIndexStats({ ...stats });
    });

    return () => unsub();
  }, []);

  // Debounced re-indexing when files content or structure changes
  useEffect(() => {
    if (indexDebounceRef.current) {
      clearTimeout(indexDebounceRef.current);
    }
    indexDebounceRef.current = window.setTimeout(() => {
      symbolIndexer.indexWorkspace(files);
    }, 400);

    return () => {
      if (indexDebounceRef.current) {
        clearTimeout(indexDebounceRef.current);
      }
    };
  }, [files]);

  // Subscribe to Cloud Sync Engine updates
  useEffect(() => {
    const unsubState = cloudSync.subscribeState((newState) => {
      setSyncState(newState);
    });
    const unsubSettings = cloudSync.subscribeRemoteSettings((remoteSettings) => {
      setUserSettings(remoteSettings);
    });
    return () => {
      unsubState();
      unsubSettings();
    };
  }, []);

  // Compute active file for the active pane
  const currentActiveTab = useMemo(() => {
    const pane = activePaneId === 'pane1' ? pane1 : pane2;
    return pane.tabs.find((t) => t.id === pane.activeTabId) || null;
  }, [activePaneId, pane1, pane2]);

  const currentActiveFile = useMemo(() => {
    if (!currentActiveTab) return null;
    return findFileById(files, currentActiveTab.fileId);
  }, [currentActiveTab, files]);

  // Compute diagnostics (Linter + TODO Scanner)
  useEffect(() => {
    const results: Diagnostic[] = [];
    const allFiles = getAllFilesList(files);

    allFiles.forEach((file) => {
      if (!file.content) return;
      const lines = file.content.split('\n');

      lines.forEach((line, idx) => {
        // TODO / FIXME Warnings
        if (line.includes('TODO') || line.includes('FIXME')) {
          results.push({
            id: `diag-todo-${file.id}-${idx}`,
            filePath: file.path,
            line: idx + 1,
            col: line.indexOf(line.includes('TODO') ? 'TODO' : 'FIXME') + 1,
            message: `Unresolved task: ${line.trim()}`,
            severity: 'info',
            source: 'Crimson Scanner',
          });
        }
      });

      // Run ESLint Workspace Engine on file (handles standard rules, custom rules, ignore patterns)
      const eslintDiags = runEslintOnContent(file, userSettings);
      results.push(...eslintDiags);
    });

    setDiagnostics(results);
  }, [files, userSettings]);

  // Update content of a file
  const handleUpdateContent = useCallback((fileId: string, newContent: string) => {
    // If the file had an external modification indicator, user is now editing it directly, so clear it
    if (externallyModifiedFiles[fileId]) {
      setExternallyModifiedFiles((prev) => {
        if (!prev[fileId]) return prev;
        const copy = { ...prev };
        delete copy[fileId];
        return copy;
      });
    }

    setFiles((prev) => {
      function updateInTree(nodes: FileItem[]): FileItem[] {
        return nodes.map((node) => {
          if (node.id === fileId) {
            return { ...node, content: newContent, lastModified: Date.now() };
          }
          if (node.children) {
            return { ...node, children: updateInTree(node.children) };
          }
          return node;
        });
      }
      return updateInTree(prev);
    });

    setDirtyFileIds((prev) => new Set(prev).add(fileId));

    // Update isDirty flag in tabs
    const markDirty = (pane: EditorPaneState) => ({
      ...pane,
      tabs: pane.tabs.map((tab) => (tab.fileId === fileId ? { ...tab, isDirty: true } : tab)),
    });
    setPane1(markDirty);
    setPane2(markDirty);
  }, [externallyModifiedFiles]);

  // Save dirty files to local state and clear dirty indicators
  const handleSaveDirtyFiles = useCallback(() => {
    setDirtyFileIds((prevDirty) => {
      if (prevDirty.size === 0) return prevDirty;
      try {
        localStorage.setItem('ccode_workspace_snapshot', JSON.stringify(files));
      } catch (err) {
        console.error('Failed to cache files to localStorage', err);
      }
      return new Set();
    });

    const clearDirty = (pane: EditorPaneState) => ({
      ...pane,
      tabs: pane.tabs.map((tab) => ({ ...tab, isDirty: false })),
    });
    setPane1(clearDirty);
    setPane2(clearDirty);
  }, [files]);

  // Periodic Auto-Save Engine (Default every 30 seconds)
  useEffect(() => {
    if (!userSettings.autoSave) return;
    const intervalMs = userSettings.autoSaveDelayMs || 30000;
    const timer = setInterval(() => {
      handleSaveDirtyFiles();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [userSettings.autoSave, userSettings.autoSaveDelayMs, handleSaveDirtyFiles]);

  // Move file or folder between folders, reorder, or move to workspace root (Drag-and-Drop)
  const handleMoveFile = useCallback(
    (
      sourceId: string,
      targetId: string | null,
      position: 'before' | 'after' | 'inside' = 'inside'
    ) => {
      if (sourceId === targetId) return;

      setFiles((prevFiles) => {
        // Find source item
        const findItem = (nodes: FileItem[]): FileItem | null => {
          for (const n of nodes) {
            if (n.id === sourceId) return n;
            if (n.children) {
              const found = findItem(n.children);
              if (found) return found;
            }
          }
          return null;
        };

        const movedItem = findItem(prevFiles);
        if (!movedItem) return prevFiles;

        // Cycle prevention: Cannot move a folder into itself or its descendants
        const isDescendant = (folder: FileItem, searchId: string): boolean => {
          if (!folder.children) return false;
          for (const child of folder.children) {
            if (child.id === searchId) return true;
            if (child.children && isDescendant(child, searchId)) return true;
          }
          return false;
        };

        if (movedItem.isFolder && targetId && (targetId === sourceId || isDescendant(movedItem, targetId))) {
          return prevFiles;
        }

        // 1. Remove source from tree
        const removeSource = (nodes: FileItem[]): FileItem[] => {
          const result: FileItem[] = [];
          for (const node of nodes) {
            if (node.id === sourceId) {
              continue;
            }
            if (node.children) {
              result.push({
                ...node,
                children: removeSource(node.children),
              });
            } else {
              result.push(node);
            }
          }
          return result;
        };

        const treeWithoutSource = removeSource(prevFiles);
        const validMovedItem: FileItem = movedItem;

        // Helper to update path of node and its descendants
        const updateNodePaths = (node: FileItem, parentFolderPath: string | null): FileItem => {
          const newPath = parentFolderPath ? `${parentFolderPath}/${node.name}` : node.name;
          return {
            ...node,
            path: newPath,
            children: node.children
              ? node.children.map((child) => updateNodePaths(child, newPath))
              : undefined,
          };
        };

        // 2. If targetId is null: move to workspace root
        if (!targetId) {
          const updatedItem = updateNodePaths(validMovedItem, null);
          if (position === 'before') {
            return [updatedItem, ...treeWithoutSource];
          }
          return [...treeWithoutSource, updatedItem];
        }

        // 3. If position is 'inside': insert into target folder
          if (position === 'inside') {
          let inserted = false;
          const insertInside = (nodes: FileItem[]): FileItem[] => {
            return nodes.map((node) => {
              if (node.id === targetId && node.isFolder) {
                inserted = true;
                const currentChildren = node.children || [];
                if (currentChildren.some((c) => c.id === validMovedItem.id)) return node;
                const updatedItem = updateNodePaths(validMovedItem, node.path);
                return {
                  ...node,
                  isOpen: true,
                  children: [...currentChildren, updatedItem],
                };
              }
              if (node.children && !inserted) {
                return {
                  ...node,
                  children: insertInside(node.children),
                };
              }
              return node;
            });
          };

          const resultTree = insertInside(treeWithoutSource);
          const finalTree = inserted ? resultTree : treeWithoutSource;

          // Sync tab paths in editor panes
          const fileMap = new Map<string, string>();
          const mapPaths = (nodes: FileItem[]) => {
            for (const n of nodes) {
              fileMap.set(n.id, n.path);
              if (n.children) mapPaths(n.children);
            }
          };
          mapPaths(finalTree);
          const updatePaneTabs = (prev: EditorPaneState): EditorPaneState => {
            let tabChanged = false;
            const newTabs = prev.tabs.map((tab) => {
              const newPath = fileMap.get(tab.fileId);
              if (newPath && newPath !== tab.filePath) {
                tabChanged = true;
                return { ...tab, filePath: newPath };
              }
              return tab;
            });
            return tabChanged ? { ...prev, tabs: newTabs } : prev;
          };
          setPane1(updatePaneTabs);
          setPane2(updatePaneTabs);

          return finalTree;
        }

        // 4. If position is 'before' or 'after': reorder relative to target node in the same parent directory
        const insertRelative = (
          nodes: FileItem[]
        ): { updatedNodes: FileItem[]; inserted: boolean } => {
          const targetIndex = nodes.findIndex((n) => n.id === targetId);
          if (targetIndex !== -1) {
            const targetNode = nodes[targetIndex];
            const lastSlash = targetNode.path.lastIndexOf('/');
            const parentFolderPath = lastSlash !== -1 ? targetNode.path.substring(0, lastSlash) : null;
            const updatedItem = updateNodePaths(validMovedItem, parentFolderPath);

            const newNodes = [...nodes];
            const insertIdx = position === 'before' ? targetIndex : targetIndex + 1;
            newNodes.splice(insertIdx, 0, updatedItem);
            return { updatedNodes: newNodes, inserted: true };
          }

          let inserted = false;
          const newNodes = nodes.map((node) => {
            if (!node.children || inserted) return node;
            const res = insertRelative(node.children);
            if (res.inserted) {
              inserted = true;
              return { ...node, children: res.updatedNodes };
            }
            return node;
          });

          return { updatedNodes: newNodes, inserted };
        };

        const relativeResult = insertRelative(treeWithoutSource);
        const finalTree = relativeResult.inserted ? relativeResult.updatedNodes : treeWithoutSource;

        // Sync tab paths in editor panes
        const fileMap = new Map<string, string>();
        const mapPaths = (nodes: FileItem[]) => {
          for (const n of nodes) {
            fileMap.set(n.id, n.path);
            if (n.children) mapPaths(n.children);
          }
        };
        mapPaths(finalTree);
        const updatePaneTabs = (prev: EditorPaneState): EditorPaneState => {
          let tabChanged = false;
          const newTabs = prev.tabs.map((tab) => {
            const newPath = fileMap.get(tab.fileId);
            if (newPath && newPath !== tab.filePath) {
              tabChanged = true;
              return { ...tab, filePath: newPath };
            }
            return tab;
          });
          return tabChanged ? { ...prev, tabs: newTabs } : prev;
        };
        setPane1(updatePaneTabs);
        setPane2(updatePaneTabs);

        return finalTree;
      });
    },
    []
  );

  // Helper to record file navigation into pane history
  const recordNavigationEntry = useCallback((
    pane: EditorPaneState,
    fileId: string,
    fileName: string,
    filePath: string,
    line?: number,
    col?: number
  ): { navigationHistory: NavigationHistoryEntry[]; navigationIndex: number } => {
    const history = pane.navigationHistory || [];
    const currentIndex = pane.navigationIndex ?? -1;

    // If already at this file, update its line and col
    if (currentIndex >= 0 && currentIndex < history.length) {
      const current = history[currentIndex];
      if (current.fileId === fileId) {
        if (line !== undefined || col !== undefined) {
          const updated = [...history];
          updated[currentIndex] = {
            ...current,
            line: line ?? current.line,
            col: col ?? current.col,
          };
          return { navigationHistory: updated, navigationIndex: currentIndex };
        }
        return { navigationHistory: history, navigationIndex: currentIndex };
      }
    }

    // Slice future entries if user was back in history
    const base = currentIndex >= 0 ? history.slice(0, currentIndex + 1) : history;
    const newEntry: NavigationHistoryEntry = {
      fileId,
      fileName,
      filePath,
      line: line || 1,
      col: col || 1,
      timestamp: Date.now(),
    };

    const nextHistory = [...base, newEntry].slice(-50);
    return {
      navigationHistory: nextHistory,
      navigationIndex: nextHistory.length - 1,
    };
  }, []);

  // Open a file into active pane (or specific pane)
  const handleOpenFile = useCallback(
    (fileId: string, line?: number, col?: number, specificPaneId?: 'pane1' | 'pane2') => {
      const file = findFileById(files, fileId);
      if (!file || file.isFolder) return;

      const destPaneId = specificPaneId || activePaneId;
      setActivePaneId(destPaneId);
      const targetPane = destPaneId === 'pane1' ? setPane1 : setPane2;

      targetPane((prev) => {
        const existingTab = prev.tabs.find((t) => t.fileId === fileId);
        const nav = recordNavigationEntry(prev, file.id, file.name, file.path, line, col);

        if (existingTab) {
          return {
            ...prev,
            activeTabId: existingTab.id,
            cursorLine: line ?? prev.cursorLine,
            cursorCol: col ?? prev.cursorCol,
            navigationHistory: nav.navigationHistory,
            navigationIndex: nav.navigationIndex,
          };
        }

        const newTab: EditorTab = {
          id: `tab-${file.id}-${Date.now()}`,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          language: file.language || 'typescript',
          isDirty: dirtyFileIds.has(file.id),
        };

        return {
          ...prev,
          tabs: [...prev.tabs, newTab],
          activeTabId: newTab.id,
          cursorLine: line ?? 1,
          cursorCol: col ?? 1,
          navigationHistory: nav.navigationHistory,
          navigationIndex: nav.navigationIndex,
        };
      });
    },
    [activePaneId, files, dirtyFileIds, recordNavigationEntry]
  );

  // Reveal file or folder in Explorer sidebar tree and expand parent folders
  const handleRevealInExplorer = useCallback((fileOrFolderId: string) => {
    setActiveSidebarTab('explorer');

    const normTarget = fileOrFolderId ? fileOrFolderId.replace(/^\/+|\/+$/g, '') : '';

    setFiles((prev) => {
      function expandParents(nodes: FileItem[]): { nodes: FileItem[]; found: boolean } {
        let foundInBranch = false;
        const updated = nodes.map((node) => {
          const normNodePath = (node.path || '').replace(/^\/+|\/+$/g, '');
          const isMatch =
            node.id === fileOrFolderId ||
            (Boolean(normTarget) && normNodePath === normTarget) ||
            (Boolean(normTarget) && node.name === normTarget);

          if (isMatch) {
            foundInBranch = true;
            return node.isFolder ? { ...node, isOpen: true } : node;
          }
          if (node.children) {
            const res = expandParents(node.children);
            if (res.found) {
              foundInBranch = true;
              return { ...node, isOpen: true, children: res.nodes };
            }
          }
          return node;
        });
        return { nodes: updated, found: foundInBranch };
      }
      return expandParents(prev).nodes;
    });
  }, []);

  // Go to Definition implementation
  const handleGoToDefinition = useCallback(
    (fileId: string, line: number, col: number) => {
      handleOpenFile(fileId, line, col);
    },
    [handleOpenFile]
  );

  // Close tab
  const handleCloseTab = useCallback((paneId: 'pane1' | 'pane2', tabId: string) => {
    const targetPane = paneId === 'pane1' ? setPane1 : setPane2;

    targetPane((prev) => {
      const tabIndex = prev.tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return prev;

      const remainingTabs = prev.tabs.filter((t) => t.id !== tabId);
      let nextActiveId = prev.activeTabId;

      if (prev.activeTabId === tabId) {
        if (remainingTabs.length > 0) {
          const nextIndex = Math.min(tabIndex, remainingTabs.length - 1);
          nextActiveId = remainingTabs[nextIndex].id;
        } else {
          nextActiveId = '';
        }
      }

      return {
        ...prev,
        tabs: remainingTabs,
        activeTabId: nextActiveId,
      };
    });
  }, []);

  // Select Tab
  const handleSelectTab = useCallback(
    (paneId: 'pane1' | 'pane2', tabId: string) => {
      const targetPane = paneId === 'pane1' ? setPane1 : setPane2;
      targetPane((prev) => {
        const tab = prev.tabs.find((t) => t.id === tabId);
        if (!tab) return { ...prev, activeTabId: tabId };

        const nav = recordNavigationEntry(prev, tab.fileId, tab.fileName, tab.filePath);
        return {
          ...prev,
          activeTabId: tabId,
          navigationHistory: nav.navigationHistory,
          navigationIndex: nav.navigationIndex,
        };
      });
      setActivePaneId(paneId);
    },
    [recordNavigationEntry]
  );

  // Go Back in editor navigation history
  const handleGoBack = useCallback(
    (targetPaneId?: 'pane1' | 'pane2') => {
      const paneId = targetPaneId || activePaneId;
      const targetSetter = paneId === 'pane1' ? setPane1 : setPane2;

      targetSetter((prev) => {
        const history = prev.navigationHistory || [];
        const currentIndex = prev.navigationIndex ?? -1;

        if (currentIndex <= 0 || history.length === 0) return prev;

        const targetIndex = currentIndex - 1;
        const targetEntry = history[targetIndex];
        const file = findFileById(files, targetEntry.fileId);
        if (!file) return { ...prev, navigationIndex: targetIndex };

        let tabs = prev.tabs;
        let activeTabId = '';
        const existingTab = tabs.find((t) => t.fileId === targetEntry.fileId);
        if (existingTab) {
          activeTabId = existingTab.id;
        } else {
          const newTab: EditorTab = {
            id: `tab-${file.id}-${Date.now()}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            language: file.language || 'typescript',
            isDirty: dirtyFileIds.has(file.id),
          };
          tabs = [...tabs, newTab];
          activeTabId = newTab.id;
        }

        return {
          ...prev,
          tabs,
          activeTabId,
          cursorLine: targetEntry.line || 1,
          cursorCol: targetEntry.col || 1,
          navigationIndex: targetIndex,
        };
      });
    },
    [activePaneId, files, dirtyFileIds]
  );

  // Go Forward in editor navigation history
  const handleGoForward = useCallback(
    (targetPaneId?: 'pane1' | 'pane2') => {
      const paneId = targetPaneId || activePaneId;
      const targetSetter = paneId === 'pane1' ? setPane1 : setPane2;

      targetSetter((prev) => {
        const history = prev.navigationHistory || [];
        const currentIndex = prev.navigationIndex ?? -1;

        if (currentIndex < 0 || currentIndex >= history.length - 1) return prev;

        const targetIndex = currentIndex + 1;
        const targetEntry = history[targetIndex];
        const file = findFileById(files, targetEntry.fileId);
        if (!file) return { ...prev, navigationIndex: targetIndex };

        let tabs = prev.tabs;
        let activeTabId = '';
        const existingTab = tabs.find((t) => t.fileId === targetEntry.fileId);
        if (existingTab) {
          activeTabId = existingTab.id;
        } else {
          const newTab: EditorTab = {
            id: `tab-${file.id}-${Date.now()}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            language: file.language || 'typescript',
            isDirty: dirtyFileIds.has(file.id),
          };
          tabs = [...tabs, newTab];
          activeTabId = newTab.id;
        }

        return {
          ...prev,
          tabs,
          activeTabId,
          cursorLine: targetEntry.line || 1,
          cursorCol: targetEntry.col || 1,
          navigationIndex: targetIndex,
        };
      });
    },
    [activePaneId, files, dirtyFileIds]
  );

  // Jump to specific index in navigation history dropdown
  const handleJumpToHistoryIndex = useCallback(
    (paneId: 'pane1' | 'pane2', index: number) => {
      const targetSetter = paneId === 'pane1' ? setPane1 : setPane2;

      targetSetter((prev) => {
        const history = prev.navigationHistory || [];
        if (index < 0 || index >= history.length) return prev;

        const targetEntry = history[index];
        const file = findFileById(files, targetEntry.fileId);
        if (!file) return { ...prev, navigationIndex: index };

        let tabs = prev.tabs;
        let activeTabId = '';
        const existingTab = tabs.find((t) => t.fileId === targetEntry.fileId);
        if (existingTab) {
          activeTabId = existingTab.id;
        } else {
          const newTab: EditorTab = {
            id: `tab-${file.id}-${Date.now()}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            language: file.language || 'typescript',
            isDirty: dirtyFileIds.has(file.id),
          };
          tabs = [...tabs, newTab];
          activeTabId = newTab.id;
        }

        return {
          ...prev,
          tabs,
          activeTabId,
          cursorLine: targetEntry.line || 1,
          cursorCol: targetEntry.col || 1,
          navigationIndex: index,
        };
      });
    },
    [files, dirtyFileIds]
  );

  // Perform Global Workspace Search
  const performSearch = useCallback(
    (query: string, options?: Partial<SearchOptions>) => {
      setSearchQuery(query);
      const effectiveOptions = options ? { ...searchOptions, ...options } : searchOptions;
      if (options) {
        setSearchOptions(effectiveOptions);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setSearchSummary(null);
        return;
      }

      const summary = executeWorkspaceSearch(files, query, effectiveOptions);
      setSearchResults(summary.matches);
      setSearchSummary(summary);
    },
    [files, searchOptions]
  );

  const handleUpdateSearchOptions = useCallback(
    (optionsUpdate: Partial<SearchOptions>) => {
      const nextOptions = { ...searchOptions, ...optionsUpdate };
      setSearchOptions(nextOptions);
      if (searchQuery.trim()) {
        const summary = executeWorkspaceSearch(files, searchQuery, nextOptions);
        setSearchResults(summary.matches);
        setSearchSummary(summary);
      }
    },
    [files, searchQuery, searchOptions]
  );

  // Global Workspace Replace All
  const handleReplaceAll = useCallback(
    (replaceText: string) => {
      if (!searchQuery.trim() || searchResults.length === 0) return;

      const { updatedFiles, affectedFileIds, replacedCount } = replaceInWorkspace(
        files,
        searchQuery,
        replaceText,
        searchOptions
      );

      if (replacedCount > 0) {
        setFiles(updatedFiles);
        setDirtyFileIds((prev) => {
          const next = new Set(prev);
          affectedFileIds.forEach((id) => next.add(id));
          return next;
        });

        // Mark tabs dirty in open editor panes
        setPane1((prev) => ({
          ...prev,
          tabs: prev.tabs.map((t) => (affectedFileIds.has(t.fileId) ? { ...t, isDirty: true } : t)),
        }));
        setPane2((prev) => ({
          ...prev,
          tabs: prev.tabs.map((t) => (affectedFileIds.has(t.fileId) ? { ...t, isDirty: true } : t)),
        }));

        // Re-execute search on updated files
        const summary = executeWorkspaceSearch(updatedFiles, searchQuery, searchOptions);
        setSearchResults(summary.matches);
        setSearchSummary(summary);
      }
    },
    [files, searchQuery, searchResults.length, searchOptions]
  );

  // Replace in a single specific file
  const handleReplaceInFile = useCallback(
    (fileId: string, replaceText: string) => {
      if (!searchQuery.trim()) return;

      const { updatedFiles, affectedFileIds, replacedCount } = replaceInWorkspace(
        files,
        searchQuery,
        replaceText,
        searchOptions,
        fileId
      );

      if (replacedCount > 0) {
        setFiles(updatedFiles);
        setDirtyFileIds((prev) => new Set(prev).add(fileId));
        setPane1((prev) => ({
          ...prev,
          tabs: prev.tabs.map((t) => (t.fileId === fileId ? { ...t, isDirty: true } : t)),
        }));
        setPane2((prev) => ({
          ...prev,
          tabs: prev.tabs.map((t) => (t.fileId === fileId ? { ...t, isDirty: true } : t)),
        }));

        const summary = executeWorkspaceSearch(updatedFiles, searchQuery, searchOptions);
        setSearchResults(summary.matches);
        setSearchSummary(summary);
      }
    },
    [files, searchQuery, searchOptions]
  );

  // Replace a single match occurrence
  const handleReplaceSingleMatch = useCallback(
    (match: SearchMatch, replaceText: string) => {
      const file = findFileById(files, match.fileId);
      if (!file || !file.content) return;

      const newContent = replaceSingleMatchInContent(
        file.content,
        match,
        replaceText,
        searchOptions.preserveCase
      );

      handleUpdateContent(match.fileId, newContent);

      setTimeout(() => {
        setFiles((current) => {
          const summary = executeWorkspaceSearch(current, searchQuery, searchOptions);
          setSearchResults(summary.matches);
          setSearchSummary(summary);
          return current;
        });
      }, 20);
    },
    [files, searchQuery, searchOptions, handleUpdateContent]
  );

  const handleDismissMatch = useCallback((match: SearchMatch) => {
    setSearchResults((prev) =>
      prev.filter((m) => !(m.fileId === match.fileId && m.line === match.line && m.col === match.col))
    );
  }, []);

  const handleDismissFile = useCallback((fileId: string) => {
    setSearchResults((prev) => prev.filter((m) => m.fileId !== fileId));
  }, []);

  const handleSelectSearchMatch = useCallback(
    (match: SearchMatch) => {
      handleOpenFile(match.fileId, match.line, match.col || 1);
    },
    [handleOpenFile]
  );

  // Format document
  const handleFormatDocument = (fileId: string) => {
    const file = findFileById(files, fileId);
    if (!file || !file.content) return;

    // Multi-language indentation beautifier
    const lines = file.content.split('\n');
    let indentLevel = 0;
    const formattedLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedLines.push('');
        return;
      }

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const spaces = ' '.repeat(indentLevel * userSettings.tabSize);
      formattedLines.push(spaces + trimmed);

      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(') || trimmed.endsWith(':')) {
        indentLevel++;
      }
    });

    handleUpdateContent(fileId, formattedLines.join('\n'));
  };

  // Create file or folder with pre-made structure
  const handleCreateFile = (name: string, isFolder: boolean) => {
    let content: string | undefined = undefined;
    let lang: LanguageId | undefined = undefined;

    if (!isFolder) {
      const structure = getStarterStructureForFile(name);
      content = structure.content;
      lang = structure.language;
    }

    const newId = `file-${Date.now()}`;
    const newItem: FileItem = {
      id: newId,
      name,
      path: `src/${name}`,
      isFolder,
      isOpen: true,
      content,
      originalContent: content ?? '',
      language: lang,
      children: isFolder ? [] : undefined,
      lastModified: Date.now(),
    };

    setFiles((prev) => [...prev, newItem]);
    if (!isFolder) {
      handleOpenFile(newId);
    }
  };

  // Delete file or folder
  const handleDeleteFile = (id: string) => {
    function removeFromTree(nodes: FileItem[]): FileItem[] {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.children ? { ...n, children: removeFromTree(n.children) } : n));
    }
    setFiles((prev) => removeFromTree(prev));
  };

  // Rename a file or folder
  const handleRenameFile = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setFiles((prev) => {
      function renameInTree(nodes: FileItem[]): FileItem[] {
        return nodes.map((n) => {
          if (n.id === id) {
            const pathParts = n.path.split('/');
            pathParts[pathParts.length - 1] = trimmed;
            const updatedPath = pathParts.join('/');
            const updated: FileItem = {
              ...n,
              name: trimmed,
              path: updatedPath,
            };
            if (!n.isFolder) {
              const ext = trimmed.split('.').pop()?.toLowerCase();
              if (ext === 'ts') updated.language = 'typescript';
              else if (ext === 'js') updated.language = 'javascript';
              else if (ext === 'py') updated.language = 'python';
              else if (ext === 'html') updated.language = 'html';
              else if (ext === 'css') updated.language = 'css';
              else if (ext === 'json') updated.language = 'json';
              else if (ext === 'md') updated.language = 'markdown';
              else if (ext === 'sql') updated.language = 'sql';
            }
            if (n.children) {
              updated.children = updateChildPaths(n.children, updatedPath);
            }
            return updated;
          }
          if (n.children) {
            return {
              ...n,
              children: renameInTree(n.children),
            };
          }
          return n;
        });
      }

      function updateChildPaths(children: FileItem[], parentPath: string): FileItem[] {
        return children.map((child) => {
          const childPath = `${parentPath}/${child.name}`;
          return {
            ...child,
            path: childPath,
            children: child.children ? updateChildPaths(child.children, childPath) : undefined,
          };
        });
      }

      const updatedTree = renameInTree(prev);
      symbolIndexer.indexWorkspace(updatedTree);
      return updatedTree;
    });

    // Update tab titles in panes
    const updatePaneTabs = (prev: EditorPaneState): EditorPaneState => {
      const newTabs = prev.tabs.map((tab) => {
        if (tab.fileId === id) {
          return { ...tab, fileName: trimmed };
        }
        return tab;
      });
      return { ...prev, tabs: newTabs };
    };
    setPane1(updatePaneTabs);
    setPane2(updatePaneTabs);
  };

  // Duplicate a file
  const handleDuplicateFile = (id: string) => {
    const file = findFileById(files, id);
    if (!file || file.isFolder) return;

    const parts = file.name.split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : '';
    const baseName = parts.join('.');
    const duplicateName = `${baseName}.copy${ext}`;

    const pathParts = file.path.split('/');
    pathParts[pathParts.length - 1] = duplicateName;
    const duplicatePath = pathParts.join('/');

    const newId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicateItem: FileItem = {
      id: newId,
      name: duplicateName,
      path: duplicatePath,
      isFolder: false,
      content: file.content || '',
      language: file.language,
    };

    setFiles((prev) => {
      function insertDuplicate(nodes: FileItem[]): FileItem[] {
        const index = nodes.findIndex((n) => n.id === id);
        if (index !== -1) {
          const copy = [...nodes];
          copy.splice(index + 1, 0, duplicateItem);
          return copy;
        }
        return nodes.map((n) =>
          n.children ? { ...n, children: insertDuplicate(n.children) } : n
        );
      }
      const updated = insertDuplicate(prev);
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    handleOpenFile(newId);
  };

  // Create file or folder inside a specific parent folder or root
  const handleCreateFileInFolder = (folderId: string | null, name: string, isFolder: boolean) => {
    let content: string | undefined = undefined;
    let lang: LanguageId | undefined = undefined;

    if (!isFolder) {
      const structure = getStarterStructureForFile(name);
      content = structure.content;
      lang = structure.language;
    }

    const newId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setFiles((prev) => {
      if (!folderId) {
        const newItem: FileItem = {
          id: newId,
          name,
          path: name,
          isFolder,
          isOpen: true,
          content,
          originalContent: content ?? '',
          language: lang,
          children: isFolder ? [] : undefined,
        };
        const updated = [...prev, newItem];
        symbolIndexer.indexWorkspace(updated);
        return updated;
      }

      function insertInFolder(nodes: FileItem[]): FileItem[] {
        return nodes.map((n) => {
          if (n.id === folderId && n.isFolder) {
            const newItem: FileItem = {
              id: newId,
              name,
              path: `${n.path}/${name}`,
              isFolder,
              isOpen: true,
              content,
              originalContent: content ?? '',
              language: lang,
              children: isFolder ? [] : undefined,
            };
            return {
              ...n,
              isOpen: true,
              children: [...(n.children || []), newItem],
            };
          }
          if (n.children) {
            return {
              ...n,
              children: insertInFolder(n.children),
            };
          }
          return n;
        });
      }

      const updated = insertInFolder(prev);
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    if (!isFolder) {
      handleOpenFile(newId);
    }
  };

  // Clear all workspace files cleanly
  const handleClearWorkspace = () => {
    localStorage.setItem(WORKSPACE_CLEARED_KEY, 'true');
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    localStorage.removeItem('ccode_workspace_snapshot');
    localStorage.removeItem(`${GIT_BRANCH_FILES_PREFIX}${gitBranch}`);
    setFiles([]);
    setPane1((prev) => ({ ...prev, tabs: [], activeTabId: '', navigationHistory: [], navigationIndex: -1 }));
    setPane2((prev) => ({ ...prev, tabs: [], activeTabId: '', navigationHistory: [], navigationIndex: -1 }));
    setDirtyFileIds(new Set());
    symbolIndexer.indexWorkspace([]);
  };

  // Multi-Root Workspace: Add independent top-level root folder
  const handleAddFolderToWorkspace = (folderName: string, preset: RootFolderPreset) => {
    const cleanName = folderName.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (!cleanName) return;

    const newFolderId = `folder-root-${Date.now()}-${cleanName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    let children: FileItem[] = [];

    if (preset === 'react') {
      children = [
        {
          id: `file-${Date.now()}-app`,
          name: 'App.tsx',
          path: `${cleanName}/App.tsx`,
          isFolder: false,
          language: 'typescript',
          content: `import React from 'react';\n\nexport function App() {\n  return (\n    <div>\n\n    </div>\n  );\n}\n`,
        },
        {
          id: `file-${Date.now()}-css`,
          name: 'index.css',
          path: `${cleanName}/index.css`,
          isFolder: false,
          language: 'css',
          content: `* {\n\n}\n`,
        },
        {
          id: `file-${Date.now()}-pkg`,
          name: 'package.json',
          path: `${cleanName}/package.json`,
          isFolder: false,
          language: 'json',
          content: JSON.stringify(
            {
              name: cleanName,
              version: '1.0.0',
              type: 'module',
              scripts: { dev: 'vite', build: 'tsc && vite build' },
              dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
            },
            null,
            2
          ),
        },
        {
          id: `file-${Date.now()}-readme`,
          name: 'README.md',
          path: `${cleanName}/README.md`,
          isFolder: false,
          language: 'markdown',
          content: `# \n`,
        },
      ];
    } else if (preset === 'node-api') {
      children = [
        {
          id: `file-${Date.now()}-server`,
          name: 'server.ts',
          path: `${cleanName}/server.ts`,
          isFolder: false,
          language: 'typescript',
          content: `import express, { Request, Response } from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 4000;\n\napp.use(express.json());\n\napp.get('/api/health', (_req: Request, res: Response) => {\n  res.json({ status: 'ok', service: '${cleanName}', timestamp: new Date().toISOString() });\n});\n\napp.listen(PORT, () => {\n  console.log(\`[${cleanName}] API service listening on http://localhost:\${PORT}\`);\n});\n`,
        },
        {
          id: `file-${Date.now()}-routes`,
          name: 'routes.ts',
          path: `${cleanName}/routes.ts`,
          isFolder: false,
          language: 'typescript',
          content: `import { Router, Request, Response } from 'express';\n\nexport const router = Router();\n\nrouter.get('/items', (_req: Request, res: Response) => {\n  res.json({ items: [{ id: '1', name: 'Item 1' }] });\n});\n`,
        },
        {
          id: `file-${Date.now()}-pkg`,
          name: 'package.json',
          path: `${cleanName}/package.json`,
          isFolder: false,
          language: 'json',
          content: JSON.stringify(
            {
              name: cleanName,
              version: '1.0.0',
              type: 'module',
              scripts: { dev: 'tsx watch server.ts', start: 'node dist/server.js' },
              dependencies: { express: '^4.19.2' },
              devDependencies: { '@types/express': '^4.17.21', tsx: '^4.19.0', typescript: '^5.5.0' },
            },
            null,
            2
          ),
        },
      ];
    } else if (preset === 'python') {
      children = [
        {
          id: `file-${Date.now()}-main`,
          name: 'main.py',
          path: `${cleanName}/main.py`,
          isFolder: false,
          language: 'python',
          content: `\"\"\"\n${cleanName} Python Microservice\n\"\"\"\n\ndef main():\n    print("Starting ${cleanName} microservice...")\n\nif __name__ == "__main__":\n    main()\n`,
        },
        {
          id: `file-${Date.now()}-req`,
          name: 'requirements.txt',
          path: `${cleanName}/requirements.txt`,
          isFolder: false,
          language: 'plaintext',
          content: `fastapi>=0.110.0\nuvicorn>=0.28.0\npydantic>=2.6.0\n`,
        },
        {
          id: `file-${Date.now()}-readme`,
          name: 'README.md',
          path: `${cleanName}/README.md`,
          isFolder: false,
          language: 'markdown',
          content: `# ${cleanName}\n\nPython service in this multi-root workspace.\n`,
        },
      ];
    } else if (preset === 'shared-lib') {
      children = [
        {
          id: `file-${Date.now()}-index`,
          name: 'index.ts',
          path: `${cleanName}/index.ts`,
          isFolder: false,
          language: 'typescript',
          content: `export * from './types';\nexport * from './utils';\n`,
        },
        {
          id: `file-${Date.now()}-types`,
          name: 'types.ts',
          path: `${cleanName}/types.ts`,
          isFolder: false,
          language: 'typescript',
          content: `export interface UserProfile {\n  id: string;\n  name: string;\n  email: string;\n  createdAt: string;\n}\n`,
        },
        {
          id: `file-${Date.now()}-utils`,
          name: 'utils.ts',
          path: `${cleanName}/utils.ts`,
          isFolder: false,
          language: 'typescript',
          content: `export function formatCurrency(amount: number): string {\n  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);\n}\n`,
        },
      ];
    }

    const newRootFolder: FileItem = {
      id: newFolderId,
      name: cleanName,
      path: cleanName,
      isFolder: true,
      isRootFolder: true,
      isOpen: true,
      children,
    };

    setFiles((prev) => {
      const updated = [...prev, newRootFolder];
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    // Auto-open primary starter file if available
    if (children.length > 0) {
      handleOpenFile(children[0].id);
    }
  };

  // Multi-Root Workspace: Remove independent top-level root folder
  const handleRemoveFolderFromWorkspace = (rootFolderId: string) => {
    const rootToRemove = files.find((f) => f.id === rootFolderId && f.isFolder);
    if (!rootToRemove) return;

    const filesInRoot = getAllFilesList([rootToRemove]);
    const fileIdsToRemove = new Set(filesInRoot.map((f) => f.id));

    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== rootFolderId);
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    const filterPaneTabs = (pane: EditorPaneState): EditorPaneState => {
      const remainingTabs = pane.tabs.filter((t) => !fileIdsToRemove.has(t.fileId));
      let nextActiveTabId = pane.activeTabId;
      if (pane.activeTabId && fileIdsToRemove.has(pane.activeTabId)) {
        nextActiveTabId = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : '';
      }
      return {
        ...pane,
        tabs: remainingTabs,
        activeTabId: nextActiveTabId,
      };
    };

    setPane1(filterPaneTabs);
    setPane2(filterPaneTabs);
  };

  // Create a new file with custom content (used by AI Chatbot to code for the user)
  const handleCreateFileWithContent = (name: string, content: string, language?: LanguageId) => {
    const fileExt = name.split('.').pop()?.toLowerCase();
    const inferredLang = language || (
      fileExt === 'py' ? 'python' :
      fileExt === 'html' ? 'html' :
      fileExt === 'css' ? 'css' :
      fileExt === 'json' ? 'json' :
      fileExt === 'md' ? 'markdown' :
      fileExt === 'js' ? 'javascript' :
      'typescript'
    );

    const newFile: FileItem = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      path: name,
      isFolder: false,
      content,
      originalContent: content ?? '',
      language: inferredLang,
    };

    setFiles((prev) => {
      const updated = [...prev, newFile];
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    handleOpenFile(newFile.id);
  };

  // Replace active file content (used by AI Chatbot to apply code)
  const handleReplaceActiveFileContent = (newContent: string) => {
    if (currentActiveFile) {
      handleUpdateContent(currentActiveFile.id, newContent);
    }
  };

  // Run custom generated code snippet in sandbox
  const handleRunGeneratedSnippet = async (code: string, language: LanguageId, name = 'ai-snippet') => {
    setIsRunningCode(true);
    setIsBottomPanelOpen(true);
    setBottomPanelTab('output');
    try {
      const logs = await runCodeInSandbox(code, language, name);
      setOutputLogs(logs);
    } catch (err: any) {
      setOutputLogs([
        {
          id: `log-err-${Date.now()}`,
          type: 'error',
          message: `Execution failed: ${err?.message || String(err)}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Run code in sandbox
  const handleRunCode = async (file?: FileItem) => {
    const target = file || currentActiveFile;
    if (!target) return;
    setIsRunningCode(true);
    setIsBottomPanelOpen(true);
    setBottomPanelTab('output');

    try {
      const logs = await runCodeInSandbox(target.content || '', target.language || 'typescript', target.name);
      setOutputLogs(logs);
    } catch (err: any) {
      setOutputLogs([
        {
          id: `log-err-${Date.now()}`,
          type: 'error',
          message: `Execution failed: ${err?.message || String(err)}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Open Code Statistics & Metrics modal
  const handleOpenStats = (file?: FileItem) => {
    setStatsTargetFile(file || currentActiveFile || null);
    setIsStatsModalOpen(true);
  };

  // Apply boilerplate template
  const handleApplyTemplate = (fileName: string, content: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, LanguageId> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      md: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
    };
    const newId = `tpl-${Date.now()}`;
    const newItem: FileItem = {
      id: newId,
      name: fileName,
      path: `src/${fileName}`,
      isFolder: false,
      content,
      language: langMap[ext] || 'typescript',
    };

    setFiles((prev) => [...prev, newItem]);
    handleOpenFile(newId);
  };

  // Toggle folder open/closed
  const handleToggleFolder = (folderId: string) => {
    function toggle(nodes: FileItem[]): FileItem[] {
      return nodes.map((n) => {
        if (n.id === folderId) {
          return { ...n, isOpen: !n.isOpen };
        }
        if (n.children) {
          return { ...n, children: toggle(n.children) };
        }
        return n;
      });
    }
    setFiles((prev) => toggle(prev));
  };

  // AI Assistant: Insert generated code into active file
  const handleInsertAICode = (code: string) => {
    if (!currentActiveFile) return;
    const existing = currentActiveFile.content || '';
    const updated = existing ? `${existing}\n\n${code}` : code;
    handleUpdateContent(currentActiveFile.id, updated);
  };

  // AI Assistant: Apply diagnostic fix
  const handleApplyDiagnosticFix = (line: number, replacement: string) => {
    if (!currentActiveFile || !currentActiveFile.content) return;
    const lines = currentActiveFile.content.split('\n');
    if (line >= 1 && line <= lines.length) {
      lines[line - 1] = replacement;
      handleUpdateContent(currentActiveFile.id, lines.join('\n'));
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prev) => {
      let updatedSettings = { ...newSettings };
      
      const willBeLinked = updatedSettings.linkTerminalToCrimsonTheme !== undefined
        ? updatedSettings.linkTerminalToCrimsonTheme
        : prev.linkTerminalToCrimsonTheme;

      // If linking was just toggled on or if linked and crimsonShade changed:
      if (willBeLinked) {
        const targetShade = updatedSettings.crimsonShade || prev.crimsonShade || 'ruby';
        const pal = getCrimsonTerminalPalette(targetShade);

        // If explicitly activating linking, or if changing crimson shade while linked,
        // or if no manual non-crimson theme ID override was set:
        if (
          updatedSettings.linkTerminalToCrimsonTheme === true ||
          (updatedSettings.crimsonShade && updatedSettings.terminalThemeId === undefined) ||
          !updatedSettings.terminalThemeId
        ) {
          updatedSettings = {
            ...updatedSettings,
            terminalTheme: pal.name,
            terminalThemeId: pal.id,
            terminalBackground: pal.background,
            terminalForeground: pal.foreground,
            terminalPromptColor: pal.promptColor,
            terminalCursorColor: pal.cursorColor,
            linkTerminalToCrimsonTheme: true,
          };
        } else if (
          updatedSettings.terminalThemeId &&
          !updatedSettings.terminalThemeId.endsWith('-linked') &&
          updatedSettings.linkTerminalToCrimsonTheme === undefined
        ) {
          // If the user picked a different standalone preset without specifying link, turn off linking
          updatedSettings.linkTerminalToCrimsonTheme = false;
        }
      }

      const merged = { ...prev, ...updatedSettings };
      cloudSync.saveLocalSettings(merged);
      return merged;
    });
  };

  // Open ESLint Configuration Settings
  const handleOpenEslintSettings = useCallback(() => {
    setSettingsDefaultTab('eslint');
    setIsSettingsOpen(true);
  }, []);

  // Export .eslintrc.json and .eslintignore directly into workspace files
  const handleExportEslintFiles = useCallback((rcJsonContent: string, ignoreContent: string) => {
    setFiles((prev) => {
      const updated = [...prev];
      const rcIdx = updated.findIndex((f) => f.name === '.eslintrc.json' && !f.isFolder);
      if (rcIdx >= 0) {
        updated[rcIdx] = {
          ...updated[rcIdx],
          content: rcJsonContent,
          originalContent: rcJsonContent,
        };
      } else {
        updated.push({
          id: `file-eslintrc-${Date.now()}`,
          name: '.eslintrc.json',
          path: '.eslintrc.json',
          isFolder: false,
          content: rcJsonContent,
          originalContent: rcJsonContent,
          language: 'json',
        });
      }

      const ignIdx = updated.findIndex((f) => f.name === '.eslintignore' && !f.isFolder);
      if (ignIdx >= 0) {
        updated[ignIdx] = {
          ...updated[ignIdx],
          content: ignoreContent,
          originalContent: ignoreContent,
        };
      } else {
        updated.push({
          id: `file-eslintignore-${Date.now()}`,
          name: '.eslintignore',
          path: '.eslintignore',
          isFolder: false,
          content: ignoreContent,
          originalContent: ignoreContent,
          language: 'plaintext',
        });
      }

      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `eslint-export-${Date.now()}`,
        type: 'success',
        message: 'Saved .eslintrc.json and .eslintignore to workspace root',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, []);

  // Plugin Lifecycle handlers
  const handleTogglePlugin = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId) {
          const updated = { ...p, enabled: !p.enabled };
          return updated;
        }
        return p;
      })
    );
  };

  const handleInstallPlugin = (plugin: PluginDefinition) => {
    setPlugins((prev) => {
      if (prev.some((p) => p.id === plugin.id)) return prev;
      return [...prev, { ...plugin, enabled: true }];
    });
    cloudSync.pushSync('Installed extension: ' + plugin.name);
  };

  const handleUninstallPlugin = (pluginId: string) => {
    setPlugins((prev) => prev.filter((p) => p.id !== pluginId));
    cloudSync.pushSync('Uninstalled extension: ' + pluginId);
  };

  const handleUpdatePlugin = (pluginId: string, targetVersion: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, version: targetVersion } : p))
    );
    cloudSync.pushSync(`Updated extension ${pluginId} to v${targetVersion}`);
  };

  const handleUpdatePluginConfig = (pluginId: string, key: string, value: any) => {
    setPlugins((prev) =>
      prev.map((p) => {
        if (p.id === pluginId && p.config) {
          return {
            ...p,
            config: p.config.map((field) => (field.key === key ? { ...field, value } : field)),
          };
        }
        return p;
      })
    );
  };

  // Manual Trigger Settings Save
  const handleTriggerSync = () => {
    cloudSync.pushSync('Settings saved');
  };

  // Git Commit (Save Revision)
  const handleGitCommit = (msg: string) => {
    const filesModifiedCount = dirtyFileIds.size || 1;
    setDirtyFileIds(new Set());
    setPane1((prev) => ({ ...prev, tabs: prev.tabs.map((t) => ({ ...t, isDirty: false })) }));
    setPane2((prev) => ({ ...prev, tabs: prev.tabs.map((t) => ({ ...t, isDirty: false })) }));

    // Create new commit in Git history graph
    const updatedCommits = GitHistoryEngine.createCommit(msg, gitBranch, filesModifiedCount, gitCommits);
    setGitCommits(updatedCommits);

    setFiles((prev) => {
      function commitInTree(nodes: FileItem[]): FileItem[] {
        return nodes.map((node) => {
          const updated = {
            ...node,
            originalContent: node.content !== undefined ? node.content : node.originalContent,
          };
          if (node.children) {
            updated.children = commitInTree(node.children);
          }
          return updated;
        });
      }
      const committed = commitInTree(prev);
      try {
        localStorage.setItem('cscode_workspace_snapshot', JSON.stringify(committed));
        localStorage.setItem('cscode_last_commit_msg', msg);
      } catch (e) {
        console.error(e);
      }
      return committed;
    });

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `git-commit-${Date.now()}`,
        type: 'success',
        message: `[${gitBranch} ${updatedCommits[0]?.shortHash || 'commit'}] ${msg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  };

  // Simulate Git Merge between branches
  const handleSimulateMerge = useCallback((sourceBranch: string, targetBranch: string) => {
    const updated = GitHistoryEngine.simulateMerge(sourceBranch, targetBranch, gitCommits);
    setGitCommits(updated);
    setOutputLogs((prev) => [
      ...prev,
      {
        id: `git-merge-${Date.now()}`,
        type: 'success',
        message: `Merged branch '${sourceBranch}' into '${targetBranch}' (Merge commit: ${updated[0]?.shortHash})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, [gitCommits]);

  // Revert File to HEAD (Discard working tree changes)
  const handleRevertFile = (fileId: string) => {
    setFiles((prev) => {
      function revertInTree(nodes: FileItem[]): FileItem[] {
        return nodes.map((node) => {
          if (node.id === fileId) {
            return {
              ...node,
              content: node.originalContent !== undefined ? node.originalContent : node.content,
            };
          }
          if (node.children) {
            return { ...node, children: revertInTree(node.children) };
          }
          return node;
        });
      }
      const reverted = revertInTree(prev);
      symbolIndexer.indexWorkspace(reverted);
      return reverted;
    });

    setDirtyFileIds((prev) => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });

    const clearDirtyInTabs = (pane: EditorPaneState) => ({
      ...pane,
      tabs: pane.tabs.map((t) => (t.fileId === fileId ? { ...t, isDirty: false } : t)),
    });
    setPane1(clearDirtyInTabs);
    setPane2(clearDirtyInTabs);
  };

  // Open Git Diff view for a specific file (inline)
  const handleOpenDiffForFile = (fileId: string) => {
    handleOpenFile(fileId);
    setShowDiffFileId(fileId);
  };

  // Open dedicated Git Diff modal for a specific file or active file
  const handleOpenGitDiffModal = useCallback((fileId?: string) => {
    if (fileId) {
      setGitDiffModalFileId(fileId);
    } else {
      const activeTabId = activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId;
      const activeTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === activeTabId);
      if (activeTab) {
        setGitDiffModalFileId(activeTab.fileId);
      }
    }
    setIsGitDiffModalOpen(true);
  }, [activePaneId, pane1, pane2]);

  // Target file for dedicated Git Diff modal
  const diffModalTargetFile = useMemo(() => {
    const targetId = gitDiffModalFileId || (activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId);
    const activeTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === targetId || t.fileId === targetId);
    const resolvedId = gitDiffModalFileId || (activeTab ? activeTab.fileId : null);
    if (resolvedId) {
      return findFileById(files, resolvedId);
    }
    return currentActiveFile;
  }, [gitDiffModalFileId, activePaneId, pane1, pane2, files, currentActiveFile]);

  // Git Branch Switcher Logic
  const handleSwitchBranch = useCallback((targetBranch: string) => {
    if (!targetBranch || targetBranch === gitBranch) return;

    // 1. Snapshot current files to current branch in localStorage
    try {
      localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${gitBranch}`, JSON.stringify(files));
    } catch (e) {
      console.error('Failed to snapshot branch files:', e);
    }

    // 2. Load target branch files
    let nextFiles: FileItem[] = [];
    try {
      const saved = localStorage.getItem(`${GIT_BRANCH_FILES_PREFIX}${targetBranch}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          nextFiles = ensureBaselineContent(sanitizeWorkspaceFiles(parsed));
        }
      } else {
        // Fallback: clone current files
        nextFiles = JSON.parse(JSON.stringify(files));
        localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${targetBranch}`, JSON.stringify(nextFiles));
      }
    } catch (e) {
      console.error('Failed to load branch files for ' + targetBranch, e);
      nextFiles = JSON.parse(JSON.stringify(files));
    }

    // 3. Update files state and symbol index
    setFiles(nextFiles);
    symbolIndexer.indexWorkspace(nextFiles);

    // 4. Update branch state and active branch in localStorage
    setGitBranch(targetBranch);
    try {
      localStorage.setItem(GIT_CURRENT_BRANCH_KEY, targetBranch);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(nextFiles));
      localStorage.setItem('ccode_workspace_snapshot', JSON.stringify(nextFiles));
    } catch (e) {
      console.error('Failed to update branch persistence:', e);
    }

    // 5. Clean up dirty files on branch switch
    setDirtyFileIds(new Set());

    // 6. Update open tabs: reconcile available files in the target branch
    const allAvailableFiles = getAllFilesList(nextFiles);
    const availableIds = new Set(allAvailableFiles.map((f) => f.id));

    setPane1((prev) => {
      const remainingTabs = prev.tabs
        .filter((t) => availableIds.has(t.fileId))
        .map((t) => ({ ...t, isDirty: false }));
      const newActiveId = remainingTabs.some((t) => t.id === prev.activeTabId)
        ? prev.activeTabId
        : remainingTabs[0]?.id || '';
      return {
        ...prev,
        tabs: remainingTabs,
        activeTabId: newActiveId,
      };
    });

    setPane2((prev) => {
      const remainingTabs = prev.tabs
        .filter((t) => availableIds.has(t.fileId))
        .map((t) => ({ ...t, isDirty: false }));
      const newActiveId = remainingTabs.some((t) => t.id === prev.activeTabId)
        ? prev.activeTabId
        : remainingTabs[0]?.id || '';
      return {
        ...prev,
        tabs: remainingTabs,
        activeTabId: newActiveId,
      };
    });

    // 7. Output log
    setOutputLogs((prev) => [
      ...prev,
      {
        id: `branch-switch-${Date.now()}`,
        type: 'info',
        message: `Switched to branch '${targetBranch}'`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, [gitBranch, files]);

  // Create and switch to new branch
  const handleCreateBranch = useCallback((newBranchName: string) => {
    const cleanName = newBranchName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
    if (!cleanName) return;

    if (branches.includes(cleanName)) {
      handleSwitchBranch(cleanName);
      return;
    }

    // Snapshot current branch files
    try {
      localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${gitBranch}`, JSON.stringify(files));
    } catch (e) {
      console.error('Failed to snapshot branch files:', e);
    }

    // Clone current file structure logic for the new branch
    const clonedFiles: FileItem[] = JSON.parse(JSON.stringify(files));
    try {
      localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${cleanName}`, JSON.stringify(clonedFiles));
    } catch (e) {
      console.error('Failed to store files for new branch:', e);
    }

    // Update branches
    const updatedBranches = [...branches, cleanName];
    setBranches(updatedBranches);
    try {
      localStorage.setItem(GIT_BRANCHES_KEY, JSON.stringify(updatedBranches));
    } catch (e) {
      console.error('Failed to persist branches:', e);
    }

    // Switch to new branch
    setGitBranch(cleanName);
    try {
      localStorage.setItem(GIT_CURRENT_BRANCH_KEY, cleanName);
    } catch (e) {
      console.error('Failed to persist current branch:', e);
    }

    // Clear dirty flags
    setDirtyFileIds(new Set());
    setPane1((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => ({ ...t, isDirty: false })),
    }));
    setPane2((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => ({ ...t, isDirty: false })),
    }));

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `branch-create-${Date.now()}`,
        type: 'success',
        message: `Created and switched to branch '${cleanName}' from '${gitBranch}'`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, [branches, gitBranch, files, handleSwitchBranch]);

  // Remote GitHub Sync Handlers
  const handleRemotePushSuccess = useCallback((result: PushResult) => {
    setOutputLogs((prev) => [
      ...prev,
      {
        id: `github-push-${Date.now()}`,
        type: 'success',
        message: `Successfully pushed branch '${result.branch}' (${result.shortSha}) to GitHub remote`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
    setGitHubAuthStatus(GitHubService.getAuthStatus());
  }, []);

  const handleRemotePullSuccess = useCallback((result: PullResult) => {
    setGitCommits((prev) => {
      const exists = prev.some((c) => c.shortHash === result.shortSha || c.hash.startsWith(result.shortSha));
      if (exists) return prev;
      const newCommit: GitCommitNode = {
        hash: result.commitSha,
        shortHash: result.shortSha,
        subject: result.commitMessage,
        author: { name: result.author || 'GitHub Remote', email: 'git@github.com' },
        date: 'Just now',
        timestamp: Date.now(),
        branch: result.branch,
        parents: prev.length > 0 ? [prev[0].shortHash] : [],
        isHead: true,
        tags: [`origin/${result.branch}`, 'HEAD'],
      };
      const updated = [newCommit, ...prev.map((c) => ({ ...c, isHead: false }))];
      GitHistoryEngine.saveCommits(updated);
      return updated;
    });

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `github-pull-${Date.now()}`,
        type: 'success',
        message: `Successfully pulled latest changes for branch '${result.branch}' from GitHub remote (${result.shortSha})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
    setGitHubAuthStatus(GitHubService.getAuthStatus());
  }, []);

  const handleQuickPush = useCallback(async () => {
    const status = GitHubService.getAuthStatus();
    if (!status.isAuthenticated) {
      setIsGitHubModalOpen(true);
      return;
    }
    setIsPushingRemote(true);
    try {
      const result = await GitHubService.pushBranch(
        status.connectedRepo,
        gitBranch,
        `Update ${gitBranch} from Crimson IDE`,
        files
      );
      handleRemotePushSuccess(result);
    } catch (err: any) {
      setOutputLogs((prev) => [
        ...prev,
        {
          id: `github-push-err-${Date.now()}`,
          type: 'error',
          message: `GitHub Push failed: ${err.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    } finally {
      setIsPushingRemote(false);
    }
  }, [gitBranch, files, handleRemotePushSuccess]);

  const handleQuickPull = useCallback(async () => {
    const status = GitHubService.getAuthStatus();
    if (!status.isAuthenticated) {
      setIsGitHubModalOpen(true);
      return;
    }
    setIsPullingRemote(true);
    try {
      const result = await GitHubService.pullBranch(status.connectedRepo, gitBranch);
      handleRemotePullSuccess(result);
    } catch (err: any) {
      setOutputLogs((prev) => [
        ...prev,
        {
          id: `github-pull-err-${Date.now()}`,
          type: 'error',
          message: `GitHub Pull failed: ${err.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    } finally {
      setIsPullingRemote(false);
    }
  }, [gitBranch, handleRemotePullSuccess]);

  // Remote Repository File Import & Clone Handler
  const handleImportRemoteFiles = useCallback(
    (importedFiles: FileItem[], mode: 'merge' | 'replace' = 'merge', targetFolder?: string) => {
      setFiles((prevFiles) => {
        let nextFiles: FileItem[];
        if (mode === 'replace' && !targetFolder) {
          nextFiles = importedFiles;
        } else {
          // Recursive merge function
          const mergeNodes = (existing: FileItem[], incoming: FileItem[]): FileItem[] => {
            const result = [...existing];
            for (const item of incoming) {
              const idx = result.findIndex((e) => e.path === item.path || (!e.isFolder && e.name === item.name && e.path === item.path));
              if (idx === -1) {
                result.push(item);
              } else if (item.isFolder && result[idx].isFolder) {
                result[idx] = {
                  ...result[idx],
                  isOpen: true,
                  children: mergeNodes(result[idx].children || [], item.children || []),
                };
              } else {
                result[idx] = item;
              }
            }
            return result;
          };

          nextFiles = mergeNodes(prevFiles, importedFiles);
        }

        try {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(nextFiles));
        } catch (e) {
          console.error('Failed to save imported workspace files:', e);
        }
        return nextFiles;
      });

      // Clear dirty flags
      setDirtyFileIds(new Set());

      // Open primary file if available
      const flat = getAllFilesList(importedFiles);
      if (flat.length > 0) {
        const candidate =
          flat.find((f) => f.name.includes('App') || f.name.includes('index') || f.name.includes('main') || f.name.includes('README')) ||
          flat[0];
        if (candidate) {
          handleOpenFile(candidate.id);
        }
      }

      setOutputLogs((prev) => [
        ...prev,
        {
          id: `github-import-${Date.now()}`,
          type: 'success',
          message: `Successfully imported ${flat.length} file(s) from remote GitHub repository into workspace${targetFolder ? ` (folder: ${targetFolder})` : ''}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    },
    [handleOpenFile]
  );

  // Delete branch
  const handleDeleteBranch = useCallback((branchToDelete: string) => {
    if (!branchToDelete || branchToDelete === 'main' || branchToDelete === gitBranch) return;

    const updatedBranches = branches.filter((b) => b !== branchToDelete);
    setBranches(updatedBranches);

    try {
      localStorage.setItem(GIT_BRANCHES_KEY, JSON.stringify(updatedBranches));
      localStorage.removeItem(`${GIT_BRANCH_FILES_PREFIX}${branchToDelete}`);
    } catch (e) {
      console.error('Failed to delete branch:', e);
    }

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `branch-delete-${Date.now()}`,
        type: 'info',
        message: `Deleted branch '${branchToDelete}'`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  }, [branches, gitBranch]);

  // Create branch from specific commit node
  const handleCreateBranchFromCommit = useCallback(
    (branchName: string, commitHash: string, checkout = true) => {
      const cleanName = branchName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
      if (!cleanName) return;

      // 1. Update git history commits via GitHistoryEngine
      const { updatedCommits, targetCommit } = GitHistoryEngine.createBranchFromCommit(
        cleanName,
        commitHash,
        checkout,
        gitCommits
      );
      setGitCommits(updatedCommits);

      // 2. Add to branches list if not present
      const updatedBranches = branches.includes(cleanName) ? branches : [...branches, cleanName];
      setBranches(updatedBranches);
      try {
        localStorage.setItem(GIT_BRANCHES_KEY, JSON.stringify(updatedBranches));
      } catch (e) {
        console.error('Failed to persist branches:', e);
      }

      // 3. Clone / snapshot current files for this branch
      try {
        localStorage.setItem(`${GIT_BRANCH_FILES_PREFIX}${cleanName}`, JSON.stringify(files));
      } catch (e) {
        console.error('Failed to snapshot branch files:', e);
      }

      // 4. If checking out, switch current active branch
      if (checkout) {
        setGitBranch(cleanName);
        try {
          localStorage.setItem(GIT_CURRENT_BRANCH_KEY, cleanName);
        } catch (e) {}
      }

      // 5. Output log
      setOutputLogs((prev) => [
        ...prev,
        {
          id: `branch-create-from-commit-${Date.now()}`,
          type: 'success',
          message: `Created ${checkout ? 'and checked out ' : ''}new branch '${cleanName}' from commit ${targetCommit?.shortHash || commitHash.slice(0, 7)} ("${targetCommit?.subject || ''}").`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    },
    [gitCommits, branches, files]
  );

  // File System Watcher Simulation Logic
  const handleSimulateExternalChange = useCallback((targetFileId?: string) => {
    const allFlat = getAllFilesList(files).filter((f) => !f.isFolder);
    if (allFlat.length === 0) return;

    let targetFile = targetFileId ? allFlat.find((f) => f.id === targetFileId) : null;
    if (!targetFile) {
      const currentActiveId = activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId;
      const currentTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === currentActiveId);
      targetFile = (currentTab && allFlat.find((f) => f.id === currentTab.fileId)) || allFlat[Math.floor(Math.random() * allFlat.length)];
    }
    if (!targetFile) return;

    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ext = targetFile.name.split('.').pop()?.toLowerCase();

    let modificationSnippet = `\n// [FS-Watcher: External Build Sync @ ${timeFormatted}]\nexport const FS_EXT_SYNC_${Date.now().toString().slice(-4)} = { timestamp: "${new Date().toISOString()}", status: "synced" };\n`;

    if (ext === 'json') {
      try {
        const parsed = JSON.parse(targetFile.content || '{}');
        parsed.__external_watcher_sync = { updatedAt: new Date().toISOString() };
        modificationSnippet = JSON.stringify(parsed, null, 2);
      } catch {
        modificationSnippet = `\n// [FS-Watcher: External Sync @ ${timeFormatted}]\n`;
      }
    } else if (ext === 'md' || ext === 'markdown') {
      modificationSnippet = `\n\n> ⚡ **[File System Watcher]**: External process modified this file on disk at \`${timeFormatted}\`.\n`;
    } else if (ext === 'css') {
      modificationSnippet = `\n/* [FS-Watcher: External Style Compilation @ ${timeFormatted}] */\n`;
    } else if (ext === 'html') {
      modificationSnippet = `\n<!-- [FS-Watcher: External Static Generation @ ${timeFormatted}] -->\n`;
    }

    const chosenFile = targetFile;
    const newContent = ext === 'json' && !modificationSnippet.startsWith('\n')
      ? modificationSnippet
      : (chosenFile.content || '') + modificationSnippet;

    setFiles((prev) => {
      function updateInTree(nodes: FileItem[]): FileItem[] {
        return nodes.map((node) => {
          if (node.id === chosenFile.id) {
            return {
              ...node,
              content: newContent,
              lastModified: Date.now(),
            };
          }
          if (node.children) {
            return { ...node, children: updateInTree(node.children) };
          }
          return node;
        });
      }
      const updated = updateInTree(prev);
      symbolIndexer.indexWorkspace(updated);
      return updated;
    });

    setExternallyModifiedFiles((prev) => ({
      ...prev,
      [chosenFile.id]: {
        fileId: chosenFile.id,
        filePath: chosenFile.path,
        fileName: chosenFile.name,
        timestamp: Date.now(),
        timeFormatted,
        origin: 'External Process (Build Tool)',
        summary: `Simulated external disk modification (+${modificationSnippet.length} bytes)`,
        previousContent: chosenFile.content,
        newContent,
      },
    }));

    setOutputLogs((prev) => [
      ...prev,
      {
        id: `watcher-log-${Date.now()}`,
        type: 'warn',
        message: `[File System Watcher] Detected external modification: "${chosenFile.name}" (${chosenFile.path}) at ${timeFormatted}`,
        timestamp: timeFormatted,
      },
    ]);
  }, [files, activePaneId, pane1, pane2]);

  const handleDismissExternalChange = useCallback((fileId: string) => {
    setExternallyModifiedFiles((prev) => {
      if (!prev[fileId]) return prev;
      const copy = { ...prev };
      delete copy[fileId];
      return copy;
    });
  }, []);

  const handleDismissAllExternalChanges = useCallback(() => {
    setExternallyModifiedFiles({});
  }, []);

  const handleToggleWatcherAutoSimulate = useCallback(() => {
    setIsWatcherAutoSimulateEnabled((prev) => !prev);
  }, []);

  // Periodic File System Watcher Auto-Simulation (when enabled)
  useEffect(() => {
    if (!isWatcherAutoSimulateEnabled) return;

    const timer = setInterval(() => {
      handleSimulateExternalChange();
    }, 20000);

    return () => clearInterval(timer);
  }, [isWatcherAutoSimulateEnabled, handleSimulateExternalChange]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        const activeTabId = activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId;
        const activeTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === activeTabId);
        if (activeTab) {
          handleOpenGitDiffModal(activeTab.fileId);
        } else {
          handleOpenGitDiffModal();
        }
      } else if (isMeta && e.altKey && e.key === '-') {
        e.preventDefault();
        handleGoBack();
      } else if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDirtyFiles();
      } else if (isMeta && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        setQuickOpenInitialMode('files');
        setIsQuickOpenOpen(true);
      } else if (isMeta && e.key.toLowerCase() === 'p' && e.shiftKey) {
        e.preventDefault();
        setQuickOpenInitialMode('commands');
        setIsQuickOpenOpen(true);
      } else if (isMeta && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setQuickOpenInitialMode('symbols');
        setIsQuickOpenOpen(true);
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveSidebarTab('search');
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveSidebarTab('search');
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMarketplaceModalOpen((prev) => !prev);
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGitHubModalOpen((prev) => !prev);
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsBranchSwitcherOpen((prev) => !prev);
      } else if (isMeta && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleOpenEslintSettings();
      } else if (isMeta && e.shiftKey && (e.key === ';' || e.key === ':')) {
        e.preventDefault();
        handleUpdateSettings({ breadcrumbs: userSettings.breadcrumbs !== false ? false : true });
      } else if (isMeta && e.key === '\\') {
        e.preventDefault();
        setSplitDirection((prev) => (prev === 'vertical' ? 'none' : 'vertical'));
      } else if (isMeta && e.key === '`') {
        e.preventDefault();
        setIsBottomPanelOpen((prev) => !prev);
      } else if (isMeta && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      } else if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUpdateSettings({ wordWrap: !userSettings.wordWrap });
      } else if (isMeta && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveDirtyFiles, handleGoBack, handleGoForward, userSettings.breadcrumbs, userSettings.wordWrap, handleUpdateSettings]);

  // Command Palette Items
  const commandsList: CommandItem[] = useMemo(
    () => [
      {
        id: 'cmd-custom-css',
        title: 'Preferences: Live Custom CSS Editor & Injector',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('customCss');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-typing-audio',
        title: 'Preferences: Typing Audio & Keystroke Haptics',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('audio');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-editor-wallpaper',
        title: 'Preferences: Editor Atmosphere, Wallpaper & Watermark',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('wallpaper');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-ui-elements',
        title: 'Preferences: Tab Styles, Column Rulers & Chrome',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('uiElements');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-keybindings',
        title: 'Preferences: Keyboard Shortcuts & Keymap Customizer',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('keybindings');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-code-snippets',
        title: 'Preferences: Code Snippets & Template Expander',
        category: 'Preferences',
        action: () => {
          setSettingsDefaultTab('snippets');
          setIsSettingsOpen(true);
        },
      },
      {
        id: 'cmd-shortcuts',
        title: 'Help: Keyboard Shortcuts Cheat-Sheet',
        category: 'Help',
        shortcut: 'Ctrl+K',
        action: () => setIsShortcutsModalOpen(true),
      },
      {
        id: 'cmd-toggle-word-wrap',
        title: 'View: Toggle Word Wrap (CSS white-space: pre-wrap)',
        category: 'View',
        shortcut: 'Alt+Z',
        action: () => handleUpdateSettings({ wordWrap: !userSettings.wordWrap }),
      },
      {
        id: 'cmd-layout-debugging-view',
        title: 'Layout: Switch to Debugging View Preset',
        category: 'View',
        action: () => {
          handleUpdateSettings({
            layoutConfig: {
              ...layoutConfig,
              activityBarPosition: 'left',
              sidebarPosition: 'left',
              bottomPanelPosition: 'right',
              statusBarPosition: 'top',
              minimapPosition: 'right',
            },
            activeLayoutPresetId: 'debugging-view',
          });
        },
      },
      {
        id: 'cmd-layout-minimalist-view',
        title: 'Layout: Switch to Minimalist View Preset',
        category: 'View',
        action: () => {
          handleUpdateSettings({
            layoutConfig: {
              ...layoutConfig,
              activityBarPosition: 'hidden',
              sidebarPosition: 'left',
              bottomPanelPosition: 'bottom',
              statusBarPosition: 'bottom',
              minimapPosition: 'left',
            },
            activeLayoutPresetId: 'minimalist-view',
          });
        },
      },
      {
        id: 'cmd-layout-default-view',
        title: 'Layout: Switch to Default IDE View Preset',
        category: 'View',
        action: () => {
          handleUpdateSettings({
            layoutConfig: {
              ...layoutConfig,
              activityBarPosition: 'left',
              sidebarPosition: 'left',
              bottomPanelPosition: 'bottom',
              statusBarPosition: 'bottom',
              minimapPosition: 'right',
            },
            activeLayoutPresetId: 'default-view',
          });
        },
      },
      {
        id: 'cmd-add-folder-to-workspace',
        title: 'Workspaces: Add Folder to Workspace... (Multi-Root)',
        category: 'Workspaces',
        action: () => setIsAddFolderModalOpen(true),
      },
      {
        id: 'cmd-go-back',
        title: 'Go: Back (Navigate to Previous File in History)',
        category: 'Navigation',
        shortcut: 'Alt+Left',
        action: () => handleGoBack(),
      },
      {
        id: 'cmd-go-forward',
        title: 'Go: Forward (Navigate to Next File in History)',
        category: 'Navigation',
        shortcut: 'Alt+Right',
        action: () => handleGoForward(),
      },
      {
        id: 'cmd-toggle-breadcrumbs',
        title: 'View: Toggle Breadcrumbs (Path Navigation Bar)',
        category: 'View',
        action: () => handleUpdateSettings({ breadcrumbs: userSettings.breadcrumbs !== false ? false : true }),
      },
      {
        id: 'cmd-search-files',
        title: 'View: Show Search (Global Search & Replace across Workspace)',
        category: 'Search',
        shortcut: 'Ctrl+Shift+F',
        action: () => setActiveSidebarTab('search'),
      },
      {
        id: 'cmd-replace-files',
        title: 'Search: Replace in Files',
        category: 'Search',
        shortcut: 'Ctrl+Shift+H',
        action: () => setActiveSidebarTab('search'),
      },
      {
        id: 'cmd-search-history',
        title: 'Search: View Search History',
        category: 'Search',
        shortcut: 'Alt+H',
        action: () => setActiveSidebarTab('search'),
      },
      {
        id: 'cmd-save-dirty',
        title: 'File: Save All Dirty Files',
        category: 'File',
        shortcut: 'Ctrl+S',
        action: handleSaveDirtyFiles,
      },
      {
        id: 'cmd-git-show-changes',
        title: 'Git: Open Dedicated Diff View Modal (Side-by-Side vs Last Commit)',
        category: 'Git',
        shortcut: 'Alt+D',
        action: () => {
          const activeTabId = activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId;
          const activeTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === activeTabId);
          if (activeTab) {
            handleOpenGitDiffModal(activeTab.fileId);
          } else {
            handleOpenGitDiffModal();
          }
        },
      },
      {
        id: 'cmd-git-revert-file',
        title: 'Git: Discard Changes / Revert Active File to HEAD',
        category: 'Git',
        action: () => {
          const activeTabId = activePaneId === 'pane1' ? pane1.activeTabId : pane2.activeTabId;
          const activeTab = (activePaneId === 'pane1' ? pane1.tabs : pane2.tabs).find((t) => t.id === activeTabId);
          if (activeTab) {
            handleRevertFile(activeTab.fileId);
          }
        },
      },
      {
        id: 'cmd-git-switch-branch',
        title: 'Git: Switch Branch / Checkout...',
        category: 'Git',
        shortcut: 'Ctrl+Shift+B',
        action: () => setIsBranchSwitcherOpen(true),
      },
      {
        id: 'cmd-git-create-branch',
        title: 'Git: Create New Branch...',
        category: 'Git',
        action: () => setIsBranchSwitcherOpen(true),
      },
      {
        id: 'cmd-git-history-graph',
        title: 'Git: View Git History Graph (D3.js)',
        category: 'Git',
        action: () => {
          setActiveSidebarTab('git');
        },
      },
      {
        id: 'cmd-github-connect',
        title: 'Git: Connect to GitHub via OAuth (Remote Provider)',
        category: 'Git',
        shortcut: 'Ctrl+Shift+G',
        action: () => setIsGitHubModalOpen(true),
      },
      {
        id: 'cmd-github-tree',
        title: 'GitHub: Browse Remote Repository File Tree',
        category: 'Git',
        action: () => setActiveSidebarTab('github'),
      },
      {
        id: 'cmd-github-push',
        title: 'Git: Push Active Branch to GitHub Remote',
        category: 'Git',
        action: handleQuickPush,
      },
      {
        id: 'cmd-github-pull',
        title: 'Git: Pull Active Branch from GitHub Remote',
        category: 'Git',
        action: handleQuickPull,
      },
      {
        id: 'cmd-watcher-simulate',
        title: 'File Watcher: Simulate External File Modification',
        category: 'Workspace',
        action: () => handleSimulateExternalChange(),
      },
      {
        id: 'cmd-watcher-toggle-auto',
        title: 'File Watcher: Toggle Periodic Auto-Simulation',
        category: 'Workspace',
        action: handleToggleWatcherAutoSimulate,
      },
      {
        id: 'cmd-watcher-clear',
        title: 'File Watcher: Clear All External Modification Indicators',
        category: 'Workspace',
        action: handleDismissAllExternalChanges,
      },
      {
        id: 'cmd-sym-search',
        title: 'Symbol Search: Find Symbols in Large Codebase',
        category: 'Navigation',
        shortcut: 'Ctrl+T',
        action: () => {
          setQuickOpenInitialMode('symbols');
          setIsQuickOpenOpen(true);
        },
      },
      {
        id: 'cmd-marketplace',
        title: 'Extensions: Open Plugin Marketplace & Packaging Studio',
        category: 'Marketplace',
        shortcut: 'Ctrl+Shift+M',
        action: () => setIsMarketplaceModalOpen(true),
      },
      {
        id: 'cmd-clear-workspace',
        title: 'Workspace: Clear All Files (Empty Workspace)',
        category: 'Workspace',
        action: handleClearWorkspace,
      },
      {
        id: 'cmd-split-vert',
        title: 'View: Split Editor Vertically (Side by Side)',
        category: 'View',
        shortcut: 'Ctrl+\\',
        action: () => setSplitDirection('vertical'),
      },
      {
        id: 'cmd-split-horiz',
        title: 'View: Split Editor Horizontally (Top and Bottom)',
        category: 'View',
        action: () => setSplitDirection('horizontal'),
      },
      {
        id: 'cmd-split-close',
        title: 'View: Single Editor View (Close Split)',
        category: 'View',
        action: () => setSplitDirection('none'),
      },
      {
        id: 'cmd-toggle-minimap',
        title: 'View: Toggle Code Minimap (Right of Gutter)',
        category: 'View',
        action: () => setUserSettings((prev) => ({ ...prev, minimap: !prev.minimap })),
      },
      {
        id: 'cmd-toggle-codelens',
        title: 'View: Toggle Code Lens References (Above Functions)',
        category: 'View',
        action: () => setUserSettings((prev) => ({ ...prev, codeLens: prev.codeLens === false ? true : false })),
      },
      {
        id: 'cmd-term-toggle',
        title: 'Terminal: Toggle Built-in Terminal',
        category: 'Terminal',
        shortcut: 'Ctrl+`',
        action: () => setIsBottomPanelOpen((prev) => !prev),
      },
      {
        id: 'cmd-cloud-sync-push',
        title: 'Cloud Sync: Push Local Settings to Cloud Registry',
        category: 'Cloud Sync',
        action: handleTriggerSync,
      },
      {
        id: 'cmd-format-doc',
        title: 'Format Document (Prettier)',
        category: 'Editor',
        shortcut: 'Shift+Alt+F',
        action: () => {
          if (currentActiveTab) handleFormatDocument(currentActiveTab.fileId);
        },
      },
      {
        id: 'cmd-eslint-config',
        title: 'ESLint: Configure Workspace Rules & Ignore Patterns',
        category: 'ESLint',
        action: handleOpenEslintSettings,
      },
      {
        id: 'cmd-eslint-modal',
        title: 'ESLint: Open Custom Rules Configuration Studio',
        category: 'ESLint',
        action: () => setIsEslintModalOpen(true),
      },
      {
        id: 'cmd-eslint-toggle',
        title: 'ESLint: Toggle Workspace Linting',
        category: 'ESLint',
        action: () => handleUpdateSettings({ eslintEnabled: userSettings.eslintEnabled === false ? true : false }),
      },
      {
        id: 'cmd-eslint-export',
        title: 'ESLint: Export .eslintrc.json and .eslintignore to Workspace',
        category: 'ESLint',
        action: () =>
          handleExportEslintFiles(
            generateEslintRcJson(userSettings.eslintRules || DEFAULT_ESLINT_RULES, userSettings.eslintCustomRules || DEFAULT_CUSTOM_RULES),
            generateEslintIgnore(userSettings.eslintIgnorePatterns || DEFAULT_ESLINT_IGNORE)
          ),
      },
      {
        id: 'cmd-open-settings',
        title: 'Preferences: Open Crimson Settings',
        category: 'Preferences',
        shortcut: 'Ctrl+,',
        action: () => setIsSettingsOpen(true),
      },
      {
        id: 'cmd-theme-store',
        title: 'Preferences: Open Theme Store & Custom Palette Studio',
        category: 'Preferences',
        action: () => setIsThemeStoreOpen(true),
      },
      {
        id: 'cmd-cycle-theme',
        title: 'Preferences: Cycle to Next Color Theme (Animated Transition)',
        category: 'Preferences',
        shortcut: 'Alt+T',
        action: () => {
          const allThemes = themeEngine.getAllThemes();
          const currentId = userSettings.activeThemeId || 'crimson-ruby';
          const currentIndex = allThemes.findIndex((t) => t.id === currentId);
          const nextIndex = (currentIndex + 1) % allThemes.length;
          const nextTheme = allThemes[nextIndex];
          if (nextTheme) {
            themeEngine.setActiveTheme(nextTheme.id, true);
            setCurrentThemeName(nextTheme.name);
            handleUpdateSettings({ activeThemeId: nextTheme.id });
          }
        },
      },
      {
        id: 'cmd-toggle-layout-mode',
        title: 'View: Toggle Interactive Edit Layout Mode',
        category: 'View',
        action: handleToggleEditLayoutMode,
      },
      {
        id: 'cmd-toggle-sidebar-pos',
        title: 'View: Toggle Sidebar Position (Left <-> Right)',
        category: 'View',
        action: handleToggleSidebarPosition,
      },
      {
        id: 'cmd-cycle-dock-pos',
        title: 'View: Cycle Terminal Dock Position (Bottom -> Right -> Left)',
        category: 'View',
        action: handleCycleDockPosition,
      },
      {
        id: 'cmd-terminal-split-side',
        title: 'View: Split Terminal Side-by-Side (2 Panes)',
        category: 'View',
        action: () => {
          setIsBottomPanelOpen(true);
          setBottomPanelTab('terminal');
          setTerminalSplitMode('side-by-side');
        },
      },
      {
        id: 'cmd-terminal-split-stacked',
        title: 'View: Split Terminal Stacked (2 Panes)',
        category: 'View',
        action: () => {
          setIsBottomPanelOpen(true);
          setBottomPanelTab('terminal');
          setTerminalSplitMode('stacked');
        },
      },
      {
        id: 'cmd-terminal-split-single',
        title: 'View: Restore Single Terminal Pane',
        category: 'View',
        action: () => {
          setIsBottomPanelOpen(true);
          setBottomPanelTab('terminal');
          setTerminalSplitMode('none');
        },
      },
      {
        id: 'cmd-swap-panes',
        title: 'View: Swap Split Editor Panes',
        category: 'View',
        action: handleSwapSplitPanes,
      },
      {
        id: 'cmd-toggle-minimap-pos',
        title: 'View: Toggle Minimap Position (Left <-> Right)',
        category: 'View',
        action: handleToggleMinimapPosition,
      },
      {
        id: 'cmd-toggle-statusbar-pos',
        title: 'View: Toggle Status Bar Position (Bottom <-> Top)',
        category: 'View',
        action: handleToggleStatusBarPosition,
      },
      {
        id: 'cmd-run-code',
        title: 'Run: Execute Active File in Sandbox',
        category: 'Run',
        shortcut: 'Ctrl+Enter',
        action: () => handleRunCode(),
      },
      {
        id: 'cmd-new-template',
        title: 'File: New File from Template Boilerplate...',
        category: 'File',
        action: () => setIsTemplatePickerOpen(true),
      },
      {
        id: 'cmd-code-stats',
        title: 'File: Inspect Code Statistics & Metrics',
        category: 'File',
        action: () => handleOpenStats(),
      },
      {
        id: 'cmd-clear-workspace',
        title: 'Workspace: Clear All Files from Workspace',
        category: 'Workspace',
        action: handleClearWorkspace,
      },
    ],
    [
      currentActiveTab, 
      handleToggleEditLayoutMode, 
      handleToggleSidebarPosition, 
      handleCycleDockPosition, 
      handleSwapSplitPanes, 
      handleToggleMinimapPosition, 
      handleToggleStatusBarPosition,
      handleRunCode,
      handleOpenStats,
      handleClearWorkspace,
      handleQuickPush,
      handleQuickPull,
    ]
  );

  // Render helper for ActivityBar
  const renderActivityBar = () => {
    if (layoutConfig.activityBarPosition === 'hidden') return null;
    return (
      <ActivityBar
        activeTab={activeSidebarTab}
        onSelectTab={(tab) => setActiveSidebarTab((prev) => (prev === tab ? null : tab))}
        gitChangesCount={dirtyFileIds.size}
        pluginsCount={plugins.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenThemeStore={() => setIsThemeStoreOpen(true)}
        onToggleLayoutMode={handleToggleEditLayoutMode}
        isEditLayoutMode={isEditLayoutMode}
      />
    );
  };

  // Render helper for Sidebar
  const renderSidebar = () => (
    <Sidebar
      activeTab={activeSidebarTab}
      files={files}
      activeFileId={currentActiveTab?.fileId || null}
      onOpenFile={handleOpenFile}
      onCreateFile={handleCreateFile}
      onDeleteFile={handleDeleteFile}
      onRenameFile={handleRenameFile}
      onDuplicateFile={handleDuplicateFile}
      onCreateFileInFolder={handleCreateFileInFolder}
      onAddFolderToWorkspace={() => setIsAddFolderModalOpen(true)}
      onRemoveFolderFromWorkspace={handleRemoveFolderFromWorkspace}
      onToggleFolder={handleToggleFolder}
      onMoveFile={handleMoveFile}
      searchQuery={searchQuery}
      onSearchChange={performSearch}
      searchResults={searchResults}
      searchSummary={searchSummary}
      searchOptions={searchOptions}
      onUpdateSearchOptions={handleUpdateSearchOptions}
      onSelectSearchMatch={handleSelectSearchMatch}
      onReplaceAll={handleReplaceAll}
      onReplaceInFile={handleReplaceInFile}
      onReplaceSingleMatch={handleReplaceSingleMatch}
      onDismissMatch={handleDismissMatch}
      onDismissFile={handleDismissFile}
      dirtyFilesCount={dirtyFileIds.size}
      dirtyFileIds={dirtyFileIds}
      gitBranch={gitBranch}
      branches={branches}
      onSwitchBranch={handleSwitchBranch}
      gitCommits={gitCommits}
      onSimulateMerge={handleSimulateMerge}
      onCreateBranchFromCommit={handleCreateBranchFromCommit}
      onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      onQuickPush={handleQuickPush}
      onQuickPull={handleQuickPull}
      isGitHubAuthenticated={gitHubAuthStatus.isAuthenticated}
      connectedGitHubRepo={gitHubAuthStatus.connectedRepo}
      isPushingRemote={isPushingRemote}
      isPullingRemote={isPullingRemote}
      onImportRemoteFiles={handleImportRemoteFiles}
      onGitCommit={handleGitCommit}
      onOpenDiff={handleOpenDiffForFile}
      onOpenDiffModal={handleOpenGitDiffModal}
      onRevertFile={handleRevertFile}
      plugins={plugins}
      onTogglePlugin={handleTogglePlugin}
      onInstallPlugin={handleInstallPlugin}
      onUninstallPlugin={handleUninstallPlugin}
      onUpdatePlugin={handleUpdatePlugin}
      onConfigurePlugin={(p) => {
        setActivePluginToConfig(p);
        setIsSettingsOpen(true);
      }}
      onOpenMarketplaceModal={() => setIsMarketplaceModalOpen(true)}
      indexStats={indexStats}
      onClearWorkspace={handleClearWorkspace}
      onOpenTemplatePicker={() => setIsTemplatePickerOpen(true)}
      isEditLayoutMode={isEditLayoutMode}
      sidebarPosition={layoutConfig.sidebarPosition}
      onToggleSidebarPosition={handleToggleSidebarPosition}
      externallyModifiedFiles={externallyModifiedFiles}
      onSimulateExternalChange={handleSimulateExternalChange}
      onDismissExternalChange={handleDismissExternalChange}
      onDismissAllExternalChanges={handleDismissAllExternalChanges}
      isWatcherAutoSimulateEnabled={isWatcherAutoSimulateEnabled}
      onToggleWatcherAutoSimulate={handleToggleWatcherAutoSimulate}
    />
  );

  // Render helper for EditorArea
  const renderEditorArea = () => (
    <EditorArea
      splitDirection={splitDirection}
      onToggleSplit={(dir) => setSplitDirection(dir)}
      pane1={pane1}
      pane2={pane2}
      activePaneId={activePaneId}
      onFocusPane={(pId) => setActivePaneId(pId)}
      files={files}
      onUpdateContent={handleUpdateContent}
      onCloseTab={handleCloseTab}
      onSelectTab={handleSelectTab}
      userSettings={userSettings}
      onUpdateSettings={handleUpdateSettings}
      diagnostics={diagnostics}
      isVimEnabled={userSettings.vimMode}
      isGitLensEnabled={Boolean(plugins.find((p) => p.id === 'git-lens')?.enabled)}
      onFormatDocument={handleFormatDocument}
      onGoToDefinition={handleGoToDefinition}
      searchQuery={searchQuery}
      searchResults={searchResults}
      searchOptions={searchOptions}
      isEditLayoutMode={isEditLayoutMode}
      minimapPosition={layoutConfig.minimapPosition}
      onToggleMinimapPosition={handleToggleMinimapPosition}
      onSwapSplitPanes={handleSwapSplitPanes}
      onGoBack={handleGoBack}
      onGoForward={handleGoForward}
      onJumpToHistoryIndex={handleJumpToHistoryIndex}
      onOpenFile={handleOpenFile}
      onRevealInExplorer={handleRevealInExplorer}
      onRunCode={handleRunCode}
      isRunningCode={isRunningCode}
      onOpenStats={handleOpenStats}
      onCreateNewFile={() => handleCreateFile(`untitled-${Date.now().toString().slice(-4)}.ts`, false)}
      onCreateFileWithStructure={(fileName) => handleCreateFile(fileName, false)}
      onOpenTemplatePicker={() => setIsTemplatePickerOpen(true)}
      onQuickOpen={() => {
        setQuickOpenInitialMode('files');
        setIsQuickOpenOpen(true);
      }}
      onRevertFile={handleRevertFile}
      showDiffFileId={showDiffFileId}
      onClearDiffFileId={() => setShowDiffFileId(null)}
      onOpenDiffModal={handleOpenGitDiffModal}
      externallyModifiedFiles={externallyModifiedFiles}
      onDismissExternalChange={handleDismissExternalChange}
    />
  );

  // Render helper for BottomPanel
  const renderBottomPanel = () => (
    <BottomPanel
      isOpen={isBottomPanelOpen}
      onToggleOpen={() => setIsBottomPanelOpen(false)}
      activeTab={bottomPanelTab}
      onSelectTab={(tab) => setBottomPanelTab(tab)}
      files={files}
      diagnostics={diagnostics}
      onSelectDiagnostic={(diag) => {
        const f = getAllFilesList(files).find((item) => item.path === diag.filePath);
        if (f) handleOpenFile(f.id);
      }}
      plugins={plugins}
      onTogglePlugin={handleTogglePlugin}
      onTriggerSync={handleTriggerSync}
      crimsonShade={userSettings.crimsonShade}
      userSettings={userSettings}
      onUpdateSettings={handleUpdateSettings}
      onSaveWorkspace={handleSaveDirtyFiles}
      position={layoutConfig.bottomPanelPosition}
      isEditLayoutMode={isEditLayoutMode}
      onCycleDockPosition={handleCycleDockPosition}
      outputLogs={outputLogs}
      onClearOutput={() => setOutputLogs([])}
      onRunCode={handleRunCode}
      isRunningCode={isRunningCode}
      onOpenStats={handleOpenStats}
      onClearWorkspace={handleClearWorkspace}
      onCreateFile={(name, isFolder) => {
        handleCreateFile(name, Boolean(isFolder));
      }}
      onDeleteFile={(id) => {
        handleDeleteFile(id);
      }}
      gitBranch={gitBranch}
      branches={branches}
      onSwitchBranch={handleSwitchBranch}
      onCreateBranch={handleCreateBranch}
      externallyModifiedFiles={externallyModifiedFiles}
      onSimulateExternalChange={handleSimulateExternalChange}
      onDismissAllExternalChanges={handleDismissAllExternalChanges}
      onConfigureEslint={handleOpenEslintSettings}
      onOpenFile={handleOpenFile}
      terminalSplitMode={terminalSplitMode}
      onToggleTerminalSplit={setTerminalSplitMode}
      onOpenSettings={(tab) => {
        setSettingsDefaultTab(tab || 'terminal');
        setIsSettingsOpen(true);
      }}
    />
  );

  // Render helper for StatusBar
  const renderStatusBar = () => (
    <StatusBar
      currentLanguage={currentActiveTab?.language || 'typescript'}
      cursorLine={activePaneId === 'pane1' ? pane1.cursorLine : pane2.cursorLine}
      cursorCol={activePaneId === 'pane1' ? pane1.cursorCol : pane2.cursorCol}
      tabSize={userSettings.tabSize}
      isVimEnabled={userSettings.vimMode}
      vimMode={userSettings.vimMode ? 'NORMAL' : undefined}
      errorCount={diagnostics.filter((d) => d.severity === 'error').length}
      warningCount={diagnostics.filter((d) => d.severity === 'warning').length}
      gitBranch={gitBranch}
      branches={branches}
      onSwitchBranch={handleSwitchBranch}
      onCreateBranch={handleCreateBranch}
      onDeleteBranch={handleDeleteBranch}
      isBranchSwitcherOpen={isBranchSwitcherOpen}
      onToggleBranchSwitcher={() => setIsBranchSwitcherOpen((prev) => !prev)}
      onCloseBranchSwitcher={() => setIsBranchSwitcherOpen(false)}
      onToggleTerminal={() => setIsBottomPanelOpen((prev) => !prev)}
      onToggleSettings={() => setIsSettingsOpen(true)}
      currentThemeName={currentThemeName}
      onOpenThemeStore={() => setIsThemeStoreOpen(true)}
      isEditLayoutMode={isEditLayoutMode}
      onToggleLayoutMode={handleToggleEditLayoutMode}
      onOpenStats={() => handleOpenStats()}
      onRunCode={() => handleRunCode()}
      isRunningCode={isRunningCode}
      onConfigureEslint={handleOpenEslintSettings}
      onOpenGitHub={() => setIsGitHubModalOpen(true)}
      isGitHubAuthenticated={gitHubAuthStatus.isAuthenticated}
      connectedGitHubRepo={gitHubAuthStatus.connectedRepo}
      userSettings={userSettings}
      activeFileContent={currentActiveFile?.content}
    />
  );

  return (
    <div
      id="crimson-ide-app"
      className="flex flex-col h-screen w-screen text-slate-200 select-none overflow-hidden font-sans text-xs"
      style={{ backgroundColor: 'var(--ide-bg-app, #090a0f)' }}
    >
      {/* Top Title Bar & Menus */}
      <TitleBar
        projectName="CsCode Crimson Code"
        activeFileName={currentActiveFile?.name}
        isSplit={splitDirection !== 'none'}
        onToggleSplit={() => setSplitDirection((prev) => (prev === 'vertical' ? 'none' : 'vertical'))}
        onOpenQuickOpen={() => {
          setQuickOpenInitialMode('files');
          setIsQuickOpenOpen(true);
        }}
        onOpenCommandPalette={() => {
          setQuickOpenInitialMode('commands');
          setIsQuickOpenOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGitHub={() => setIsGitHubModalOpen(true)}
      />

      {/* Optional Top Status Bar */}
      {layoutConfig.statusBarPosition === 'top' && renderStatusBar()}

      {/* Edit Layout Mode Interactive Controller Banner */}
      {isEditLayoutMode && (
        <div 
          id="crimson-edit-layout-banner"
          className="h-8.5 bg-[#0e0f16] border-b border-rose-900/40 px-3 flex items-center justify-between z-30 shrink-0 font-mono text-xs"
        >
          <div className="flex items-center space-x-2.5 truncate">
            <span className="flex items-center space-x-1.5 text-rose-400 font-semibold">
              <FontAwesomeIcon icon={ICONS.layout} className="text-rose-500 text-[11px]" />
              <span className="text-[11px] tracking-wide">LAYOUT MODE</span>
            </span>
            <span className="text-slate-400 hidden xl:inline text-[11px]">
              Click controls below or in panel headers to re-arrange panels
            </span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto">
            <button
              onClick={handleToggleSidebarPosition}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
              title="Toggle Sidebar position Left / Right"
            >
              Sidebar: <span className="text-rose-400 font-semibold uppercase">{layoutConfig.sidebarPosition}</span>
            </button>

            <button
              onClick={handleToggleActivityBarPosition}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
              title="Cycle Activity Bar position: Left / Right / Hidden"
            >
              Bar: <span className="text-rose-400 font-semibold uppercase">{layoutConfig.activityBarPosition}</span>
            </button>

            <button
              onClick={handleCycleDockPosition}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
              title="Cycle Terminal Dock position: Bottom / Right / Left"
            >
              Dock: <span className="text-rose-400 font-semibold uppercase">{layoutConfig.bottomPanelPosition}</span>
            </button>

            <button
              onClick={handleToggleMinimapPosition}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
              title="Toggle Minimap position Right / Left"
            >
              Minimap: <span className="text-rose-400 font-semibold uppercase">{layoutConfig.minimapPosition}</span>
            </button>

            <button
              onClick={handleToggleStatusBarPosition}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
              title="Toggle Status Bar position Bottom / Top"
            >
              Status: <span className="text-rose-400 font-semibold uppercase">{layoutConfig.statusBarPosition}</span>
            </button>

            {splitDirection !== 'none' && (
              <button
                onClick={handleSwapSplitPanes}
                className="px-2 py-0.5 rounded bg-[#161722] hover:bg-rose-950/50 border border-[#262838] hover:border-rose-700/60 text-slate-300 hover:text-rose-200 transition-colors text-[11px] whitespace-nowrap"
                title="Swap left/right or top/bottom editor panes"
              >
                Swap Panes
              </button>
            )}

            <button
              onClick={handleResetLayout}
              className="px-2 py-0.5 rounded bg-[#161722] hover:bg-[#202230] border border-[#262838] text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
              title="Reset all panels to default layout"
            >
              Reset
            </button>

            <button
              onClick={() => setIsEditLayoutMode(false)}
              className="px-2.5 py-0.5 rounded bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-[11px] shadow-sm transition-colors flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Main Workspace Body */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left Side Section */}
        {layoutConfig.activityBarPosition === 'left' && renderActivityBar()}
        {layoutConfig.sidebarPosition === 'left' && renderSidebar()}

        {/* Center Main Stage (Editor + Docked Terminal) */}
        {layoutConfig.bottomPanelPosition === 'bottom' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {renderEditorArea()}
            {renderBottomPanel()}
          </div>
        ) : layoutConfig.bottomPanelPosition === 'right' ? (
          <div className="flex-1 flex flex-row h-full overflow-hidden">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {renderEditorArea()}
            </div>
            {isBottomPanelOpen && (
              <div className="w-80 md:w-96 lg:w-[420px] h-full flex flex-col overflow-hidden border-l border-[#222432] shrink-0">
                {renderBottomPanel()}
              </div>
            )}
          </div>
        ) : (
          /* layoutConfig.bottomPanelPosition === 'left' */
          <div className="flex-1 flex flex-row h-full overflow-hidden">
            {isBottomPanelOpen && (
              <div className="w-80 md:w-96 lg:w-[420px] h-full flex flex-col overflow-hidden border-r border-[#222432] shrink-0">
                {renderBottomPanel()}
              </div>
            )}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {renderEditorArea()}
            </div>
          </div>
        )}

        {/* Right Side Section */}
        {layoutConfig.sidebarPosition === 'right' && renderSidebar()}
        {layoutConfig.activityBarPosition === 'right' && renderActivityBar()}
      </div>

      {/* 2. Optional Bottom Status Bar */}
      {layoutConfig.statusBarPosition === 'bottom' && renderStatusBar()}

      {/* 3. Quick Open & Command Palette Modal (with @ Symbol Search) */}
      <QuickOpenModal
        isOpen={isQuickOpenOpen}
        onClose={() => setIsQuickOpenOpen(false)}
        files={files}
        onOpenFile={handleOpenFile}
        commands={commandsList}
        initialMode={quickOpenInitialMode}
        onSelectSymbol={(sym: CodeSymbol) => {
          handleGoToDefinition(sym.fileId, sym.line, sym.col);
        }}
      />

      {/* 4. Settings Modal with AI Assistant, Themes, Layout, and Cloud Sync */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setActivePluginToConfig(null);
        }}
        settings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        activePluginToConfig={activePluginToConfig}
        onClosePluginConfig={() => setActivePluginToConfig(null)}
        onUpdatePluginConfig={handleUpdatePluginConfig}
        onTriggerSync={handleTriggerSync}
        onOpenThemeStore={() => setIsThemeStoreOpen(true)}
        onToggleEditLayoutMode={handleToggleEditLayoutMode}
        defaultTab={settingsDefaultTab}
        onExportEslintFiles={handleExportEslintFiles}
      />

      {/* 4b. Dedicated ESLint Workspace Configuration Modal */}
      <EslintConfigModal
        isOpen={isEslintModalOpen}
        onClose={() => setIsEslintModalOpen(false)}
        settings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        onExportEslintFiles={handleExportEslintFiles}
      />

      {/* 5. Theme Store & Custom Palette Studio Modal */}
      <ThemeStoreModal
        isOpen={isThemeStoreOpen}
        onClose={() => setIsThemeStoreOpen(false)}
        activeThemeId={userSettings.activeThemeId || 'crimson-ruby'}
        customThemes={userSettings.customThemes || []}
        userSettings={userSettings}
        onUpdateSettings={handleUpdateSettings}
        onUpdateCustomThemes={(updated) => {
          handleUpdateSettings({ customThemes: updated });
        }}
        onSelectTheme={(themeId: string) => {
          themeEngine.setActiveTheme(themeId);
          const t = themeEngine.getActiveTheme();
          if (t) {
            setCurrentThemeName(t.name);
          }
          handleUpdateSettings({ activeThemeId: themeId });
        }}
      />

      {/* 6. Plugin Marketplace & Developer Packaging Studio Modal */}
      <PluginMarketplaceModal
        isOpen={isMarketplaceModalOpen}
        onClose={() => setIsMarketplaceModalOpen(false)}
        installedPlugins={plugins}
        onInstall={handleInstallPlugin}
        onUninstall={handleUninstallPlugin}
        onUpdate={handleUpdatePlugin}
        onToggle={handleTogglePlugin}
      />

      {/* 7. Keyboard Shortcuts Cheat-Sheet Modal (Ctrl+K) */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        onTriggerAction={(actionId) => {
          setIsShortcutsModalOpen(false);
          switch (actionId) {
            case 'quick-open':
              setQuickOpenInitialMode('files');
              setIsQuickOpenOpen(true);
              break;
            case 'command-palette':
              setQuickOpenInitialMode('commands');
              setIsQuickOpenOpen(true);
              break;
            case 'symbol-search':
              setQuickOpenInitialMode('symbols');
              setIsQuickOpenOpen(true);
              break;
            case 'open-search':
              setActiveSidebarTab('search');
              break;
            case 'open-explorer':
              setActiveSidebarTab('explorer');
              break;
            case 'open-git':
              setActiveSidebarTab('git');
              break;
            case 'switch-branch':
              setIsBranchSwitcherOpen(true);
              break;
            case 'open-plugins':
              setActiveSidebarTab('plugins');
              break;
            case 'open-marketplace':
              setIsMarketplaceModalOpen(true);
              break;
            case 'toggle-split':
              setSplitDirection((prev) => (prev === 'vertical' ? 'none' : 'vertical'));
              break;
            case 'toggle-terminal':
              setIsBottomPanelOpen((prev) => !prev);
              break;
            case 'open-settings':
              setIsSettingsOpen(true);
              break;
            case 'configure-eslint':
              handleOpenEslintSettings();
              break;
            case 'save-file':
              handleSaveDirtyFiles();
              break;
            case 'open-github-modal':
              setIsGitHubModalOpen(true);
              break;
            case 'format-document':
              if (currentActiveTab) handleFormatDocument(currentActiveTab.fileId);
              break;
            case 'toggle-git-diff':
              handleOpenGitDiffModal();
              break;
            default:
              break;
          }
        }}
      />

      {/* 8. Code Template Boilerplate Scaffolder Modal */}
      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* 9. Code Statistics & Deep Complexity Metrics Modal */}
      <CodeStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        file={statsTargetFile || currentActiveFile}
        allFiles={files}
      />

      {/* 10. Multi-Root Workspace: Add Folder Modal */}
      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => setIsAddFolderModalOpen(false)}
        onAddFolder={handleAddFolderToWorkspace}
        existingFolderNames={existingRootFolderNames}
      />

      {/* 11. GitHub OAuth Integration & Remote Repository Sync Modal */}
      <GitHubConnectModal
        isOpen={isGitHubModalOpen}
        onClose={() => {
          setIsGitHubModalOpen(false);
          setGitHubAuthStatus(GitHubService.getAuthStatus());
        }}
        activeBranch={gitBranch}
        files={files}
        onRemotePushSuccess={handleRemotePushSuccess}
        onRemotePullSuccess={handleRemotePullSuccess}
        onImportFiles={handleImportRemoteFiles}
      />

      {/* 12. Dedicated Git Diff View Modal (Side-by-Side Additions & Deletions vs Last Commit) */}
      <GitDiffModal
        isOpen={isGitDiffModalOpen}
        onClose={() => {
          setIsGitDiffModalOpen(false);
          setGitDiffModalFileId(null);
        }}
        file={diffModalTargetFile}
        lastCommit={gitCommits.find((c) => c.branch === gitBranch && c.isHead) || gitCommits[0] || null}
        gitBranch={gitBranch}
        onUpdateContent={handleUpdateContent}
        onRevertFile={handleRevertFile}
        userSettings={userSettings}
      />

      {/* 13. PWA Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
