/**
 * Split-View Editor Area Component with AI Ghost-Text Completions & Go-to-Definition
 * Features independent multi-pane editing (Vertical & Horizontal split),
 * breadcrumb navigation, Prism syntax rendering, line numbers, diagnostics gutter,
 * GitLens annotations, minimap, Vim mode, and sub-millisecond symbol jump.
 * 100% FontAwesome iconography - Zero emojis!
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { 
  CodeLensItem,
  CodeReference,
  CodeSymbol,
  Diagnostic, 
  EditorPaneState, 
  EditorTab, 
  FileItem, 
  SearchMatch,
  SearchOptions,
  SplitDirection, 
  UserSettings,
  ExternalFileModification,
  ThemeDefinition,
} from '../types';
import { THEME_CHANGE_EVENT } from '../lib/themeEngine';
import { syntaxEngine } from '../lib/syntaxHighlighter';
import { symbolIndexer } from '../lib/symbolIndexer';
import { 
  computeFoldRanges, 
  computeVisibleLines, 
  findEnclosingFold, 
  collapseAllFolds, 
  collapseFoldsByLevel, 
  FoldRange, 
  VisibleLineInfo 
} from '../lib/codeFolding';
import { CodeMinimap } from './CodeMinimap';
import { FileBreadcrumbs } from './FileBreadcrumbs';
import { MarkdownPreview } from './MarkdownPreview';
import { ReferencesPeekWidget } from './ReferencesPeekWidget';
import { CsCodeLogo } from './CsCodeLogo';
import { GitDiffView } from './GitDiffView';
import { computeLineDiff } from '../lib/diffEngine';
import { injectSearchHighlightsIntoHtml } from '../lib/searchEngine';
import { audioEngine } from '../lib/audioEngine';

interface EditorAreaProps {
  splitDirection: SplitDirection;
  onToggleSplit: (direction: SplitDirection) => void;
  pane1: EditorPaneState;
  pane2: EditorPaneState;
  activePaneId: 'pane1' | 'pane2';
  onFocusPane: (paneId: 'pane1' | 'pane2') => void;
  files: FileItem[];
  onUpdateContent: (fileId: string, newContent: string) => void;
  onCloseTab: (paneId: 'pane1' | 'pane2', tabId: string) => void;
  onSelectTab: (paneId: 'pane1' | 'pane2', tabId: string) => void;
  userSettings: UserSettings;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
  diagnostics: Diagnostic[];
  isVimEnabled: boolean;
  isGitLensEnabled: boolean;
  onFormatDocument: (fileId: string) => void;
  onGoToDefinition?: (fileId: string, line: number, col: number) => void;
  searchQuery?: string;
  searchResults?: SearchMatch[];
  searchOptions?: SearchOptions;
  isEditLayoutMode?: boolean;
  onSwapSplitPanes?: () => void;
  minimapPosition?: 'left' | 'right';
  onToggleMinimapPosition?: () => void;
  onGoBack?: (paneId: 'pane1' | 'pane2') => void;
  onGoForward?: (paneId: 'pane1' | 'pane2') => void;
  onJumpToHistoryIndex?: (paneId: 'pane1' | 'pane2', index: number) => void;
  onOpenFile?: (fileId: string, line?: number, col?: number, paneId?: 'pane1' | 'pane2') => void;
  onRevealInExplorer?: (fileId: string) => void;
  onRunCode?: (file: FileItem) => void;
  isRunningCode?: boolean;
  onOpenStats?: (file: FileItem) => void;
  onCreateNewFile?: () => void;
  onCreateFileWithStructure?: (fileName: string) => void;
  onOpenTemplatePicker?: () => void;
  onQuickOpen?: () => void;
  onRevertFile?: (fileId: string) => void;
  showDiffFileId?: string | null;
  onClearDiffFileId?: () => void;
  onOpenDiffModal?: (fileId?: string) => void;
  // File System Watcher Simulation
  externallyModifiedFiles?: Record<string, ExternalFileModification>;
  onDismissExternalChange?: (fileId: string) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  splitDirection,
  onToggleSplit,
  pane1,
  pane2,
  activePaneId,
  onFocusPane,
  files,
  onUpdateContent,
  onCloseTab,
  onSelectTab,
  userSettings,
  onUpdateSettings,
  diagnostics,
  isVimEnabled,
  isGitLensEnabled,
  onFormatDocument,
  onGoToDefinition,
  searchQuery,
  searchResults,
  searchOptions,
  isEditLayoutMode,
  onSwapSplitPanes,
  minimapPosition,
  onToggleMinimapPosition,
  onGoBack,
  onGoForward,
  onJumpToHistoryIndex,
  onOpenFile,
  onRevealInExplorer,
  onRunCode,
  isRunningCode,
  onOpenStats,
  onCreateNewFile,
  onCreateFileWithStructure,
  onOpenTemplatePicker,
  onQuickOpen,
  onRevertFile,
  showDiffFileId,
  onClearDiffFileId,
  onOpenDiffModal,
  externallyModifiedFiles = {},
  onDismissExternalChange,
}) => {
  return (
    <div 
      id="crimson-editor-container"
      className={`flex-1 flex overflow-hidden ${
        splitDirection === 'horizontal' ? 'flex-col' : 'flex-row'
      } ${isEditLayoutMode ? 'ring-2 ring-rose-500/80 ring-inset' : ''}`}
      style={{ backgroundColor: 'var(--ide-bg-app, #0d0e14)' }}
    >
      {/* Pane 1 */}
      <div 
        className={`flex-1 flex flex-col h-full overflow-hidden ${
          splitDirection !== 'none' && splitDirection === 'vertical' ? 'border-r' : ''
        } ${
          splitDirection !== 'none' && splitDirection === 'horizontal' ? 'border-b' : ''
        }`}
        style={splitDirection !== 'none' ? { borderColor: 'var(--ide-border, #242636)' } : undefined}
        onClick={() => onFocusPane('pane1')}
      >
        <SingleEditorPane
          paneId="pane1"
          paneState={pane1}
          isActivePane={activePaneId === 'pane1'}
          files={files}
          onUpdateContent={onUpdateContent}
          onCloseTab={(tabId) => onCloseTab('pane1', tabId)}
          onSelectTab={(tabId) => onSelectTab('pane1', tabId)}
          splitDirection={splitDirection}
          onToggleSplit={onToggleSplit}
          userSettings={userSettings}
          onUpdateSettings={onUpdateSettings}
          diagnostics={diagnostics}
          isVimEnabled={isVimEnabled}
          isGitLensEnabled={isGitLensEnabled}
          onFormatDocument={onFormatDocument}
          onGoToDefinition={onGoToDefinition}
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchOptions={searchOptions}
          isEditLayoutMode={isEditLayoutMode}
          onSwapSplitPanes={onSwapSplitPanes}
          minimapPosition={minimapPosition}
          onToggleMinimapPosition={onToggleMinimapPosition}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          onJumpToHistoryIndex={onJumpToHistoryIndex}
          onOpenFile={onOpenFile}
          onRevealInExplorer={onRevealInExplorer}
          onRunCode={onRunCode}
          isRunningCode={isRunningCode}
          onOpenStats={onOpenStats}
          onCreateNewFile={onCreateNewFile}
          onCreateFileWithStructure={onCreateFileWithStructure}
          onOpenTemplatePicker={onOpenTemplatePicker}
          onQuickOpen={onQuickOpen}
          onRevertFile={onRevertFile}
          showDiffFileId={showDiffFileId}
          onClearDiffFileId={onClearDiffFileId}
          onOpenDiffModal={onOpenDiffModal}
          externallyModifiedFiles={externallyModifiedFiles}
          onDismissExternalChange={onDismissExternalChange}
        />
      </div>

      {/* Pane 2 (When Split) */}
      {splitDirection !== 'none' && (
        <div 
          className="flex-1 flex flex-col h-full overflow-hidden"
          onClick={() => onFocusPane('pane2')}
        >
          <SingleEditorPane
            paneId="pane2"
            paneState={pane2}
            isActivePane={activePaneId === 'pane2'}
            files={files}
            onUpdateContent={onUpdateContent}
            onCloseTab={(tabId) => onCloseTab('pane2', tabId)}
            onSelectTab={(tabId) => onSelectTab('pane2', tabId)}
            splitDirection={splitDirection}
            onToggleSplit={onToggleSplit}
            userSettings={userSettings}
            onUpdateSettings={onUpdateSettings}
            diagnostics={diagnostics}
            isVimEnabled={isVimEnabled}
            isGitLensEnabled={isGitLensEnabled}
            onFormatDocument={onFormatDocument}
            onGoToDefinition={onGoToDefinition}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchOptions={searchOptions}
            isEditLayoutMode={isEditLayoutMode}
            onSwapSplitPanes={onSwapSplitPanes}
            minimapPosition={minimapPosition}
            onToggleMinimapPosition={onToggleMinimapPosition}
            onGoBack={onGoBack}
            onGoForward={onGoForward}
            onJumpToHistoryIndex={onJumpToHistoryIndex}
            onOpenFile={onOpenFile}
            onRevealInExplorer={onRevealInExplorer}
            onRunCode={onRunCode}
            isRunningCode={isRunningCode}
            onOpenStats={onOpenStats}
            onCreateNewFile={onCreateNewFile}
            onCreateFileWithStructure={onCreateFileWithStructure}
            onOpenTemplatePicker={onOpenTemplatePicker}
            onQuickOpen={onQuickOpen}
            onRevertFile={onRevertFile}
            showDiffFileId={showDiffFileId}
            onClearDiffFileId={onClearDiffFileId}
            onOpenDiffModal={onOpenDiffModal}
            externallyModifiedFiles={externallyModifiedFiles}
            onDismissExternalChange={onDismissExternalChange}
          />
        </div>
      )}
    </div>
  );
};

interface SingleEditorPaneProps {
  paneId: 'pane1' | 'pane2';
  paneState: EditorPaneState;
  isActivePane: boolean;
  files: FileItem[];
  onUpdateContent: (fileId: string, newContent: string) => void;
  onCloseTab: (tabId: string) => void;
  onSelectTab: (tabId: string) => void;
  splitDirection: SplitDirection;
  onToggleSplit: (direction: SplitDirection) => void;
  userSettings: UserSettings;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
  diagnostics: Diagnostic[];
  isVimEnabled: boolean;
  isGitLensEnabled: boolean;
  onFormatDocument: (fileId: string) => void;
  onGoToDefinition?: (fileId: string, line: number, col: number) => void;
  searchQuery?: string;
  searchResults?: SearchMatch[];
  searchOptions?: SearchOptions;
  isEditLayoutMode?: boolean;
  onSwapSplitPanes?: () => void;
  minimapPosition?: 'left' | 'right';
  onToggleMinimapPosition?: () => void;
  onGoBack?: (paneId: 'pane1' | 'pane2') => void;
  onGoForward?: (paneId: 'pane1' | 'pane2') => void;
  onJumpToHistoryIndex?: (paneId: 'pane1' | 'pane2', index: number) => void;
  onOpenFile?: (fileId: string, line?: number, col?: number, paneId?: 'pane1' | 'pane2') => void;
  onRevealInExplorer?: (fileId: string) => void;
  onRunCode?: (file: FileItem) => void;
  isRunningCode?: boolean;
  onOpenStats?: (file: FileItem) => void;
  onCreateNewFile?: () => void;
  onCreateFileWithStructure?: (fileName: string) => void;
  onOpenTemplatePicker?: () => void;
  onQuickOpen?: () => void;
  onRevertFile?: (fileId: string) => void;
  showDiffFileId?: string | null;
  onClearDiffFileId?: () => void;
  onOpenDiffModal?: (fileId?: string) => void;
  externallyModifiedFiles?: Record<string, ExternalFileModification>;
  onDismissExternalChange?: (fileId: string) => void;
}

const SingleEditorPane: React.FC<SingleEditorPaneProps> = ({
  paneId,
  paneState,
  isActivePane,
  files,
  onUpdateContent,
  onCloseTab,
  onSelectTab,
  splitDirection,
  onToggleSplit,
  userSettings,
  onUpdateSettings,
  diagnostics,
  isVimEnabled,
  isGitLensEnabled,
  onFormatDocument,
  onGoToDefinition,
  searchQuery,
  searchResults,
  searchOptions,
  isEditLayoutMode = false,
  onSwapSplitPanes,
  minimapPosition = 'right',
  onToggleMinimapPosition,
  onGoBack,
  onGoForward,
  onJumpToHistoryIndex,
  onOpenFile,
  onRevealInExplorer,
  onRunCode,
  isRunningCode = false,
  onOpenStats,
  onCreateNewFile,
  onCreateFileWithStructure,
  onOpenTemplatePicker,
  onQuickOpen,
  onRevertFile,
  showDiffFileId,
  onClearDiffFileId,
  onOpenDiffModal,
  externallyModifiedFiles = {},
  onDismissExternalChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codePreRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [vimMode, setVimMode] = useState<'NORMAL' | 'INSERT' | 'VISUAL'>('NORMAL');
  const [currentLine, setCurrentLine] = useState(1);
  const [currentCol, setCurrentCol] = useState(1);
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);

  // Navigation history tracking
  const navigationHistory = paneState.navigationHistory || [];
  const navigationIndex = paneState.navigationIndex ?? -1;
  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex >= 0 && navigationIndex < navigationHistory.length - 1;
  const prevEntry = canGoBack ? navigationHistory[navigationIndex - 1] : null;
  const nextEntry = canGoForward ? navigationHistory[navigationIndex + 1] : null;

  // Editor scroll state for minimap synchronization
  const [editorScroll, setEditorScroll] = useState<{
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    clientHeight: number;
  }>({
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 1,
    clientHeight: 1,
  });

  // Markdown Preview Mode ('edit' | 'split' | 'preview')
  const [markdownMode, setMarkdownMode] = useState<'edit' | 'split' | 'preview'>('edit');

  // CodeLens References State
  const [codeLenses, setCodeLenses] = useState<CodeLensItem[]>([]);
  const [activePeekLens, setActivePeekLens] = useState<CodeLensItem | null>(null);

  // Go-To-Definition Hover Tooltip State
  const [hoveredSymbol, setHoveredSymbol] = useState<CodeSymbol | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ top: number; left: number } | null>(null);

  // Animated Color Theme Transition State & Toast
  const [themeTransition, setThemeTransition] = useState<{
    active: boolean;
    name: string;
    colors: {
      accent: string;
      keyword: string;
      function: string;
      string: string;
    };
  } | null>(null);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvt = e as CustomEvent<{ theme: ThemeDefinition }>;
      if (customEvt.detail?.theme) {
        const t = customEvt.detail.theme;
        setThemeTransition({
          active: true,
          name: t.name,
          colors: {
            accent: t.colors.accent,
            keyword: t.colors.keyword,
            function: t.colors.function,
            string: t.colors.string,
          },
        });
        const timer = setTimeout(() => {
          setThemeTransition((prev) => (prev ? { ...prev, active: false } : null));
        }, 950);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  // Active tab file
  const activeTab = useMemo(() => {
    return paneState.tabs.find((t) => t.id === paneState.activeTabId) || null;
  }, [paneState.tabs, paneState.activeTabId]);

  // Find file object
  const activeFile = useMemo(() => {
    if (!activeTab) return null;
    function find(items: FileItem[]): FileItem | null {
      for (const it of items) {
        if (it.id === activeTab?.fileId) return it;
        if (it.children) {
          const res = find(it.children);
          if (res) return res;
        }
      }
      return null;
    }
    return find(files);
  }, [files, activeTab]);

  // Git Diff View State
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  // Synchronize when external trigger requests diff view for a file
  useEffect(() => {
    if (showDiffFileId && activeFile?.id === showDiffFileId) {
      setIsDiffOpen(true);
      onClearDiffFileId?.();
    }
  }, [showDiffFileId, activeFile?.id, onClearDiffFileId]);

  // Real-time active file diff computation for line additions and deletions
  const activeFileDiff = useMemo(() => {
    if (!activeFile || activeFile.isFolder) return null;
    const original = activeFile.originalContent !== undefined ? activeFile.originalContent : (activeFile.content || '');
    const current = activeFile.content || '';
    return computeLineDiff(original, current);
  }, [activeFile?.originalContent, activeFile?.content, activeFile?.id, activeFile?.isFolder]);

  const fileContent = activeFile?.content || '';

  // Synchronize textarea scroll to highlighted code element, gutter, and minimap
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (codePreRef.current) {
      codePreRef.current.scrollTop = target.scrollTop;
      codePreRef.current.scrollLeft = target.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = target.scrollTop;
    }
    setEditorScroll({
      scrollTop: target.scrollTop,
      scrollLeft: target.scrollLeft,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
    });
    setHoveredSymbol(null);
  };

  // Sync scroll dimensions whenever active file or content changes
  useEffect(() => {
    if (textareaRef.current) {
      setEditorScroll({
        scrollTop: textareaRef.current.scrollTop,
        scrollLeft: textareaRef.current.scrollLeft,
        scrollHeight: textareaRef.current.scrollHeight,
        clientHeight: textareaRef.current.clientHeight,
      });
    }
  }, [fileContent, activeFile?.id]);

  // CodeLens update hook using symbolIndexer
  useEffect(() => {
    if (!activeFile || userSettings.codeLens === false) {
      setCodeLenses([]);
      return;
    }

    const refreshLenses = () => {
      const lenses = symbolIndexer.getCodeLensesForFile(activeFile.id);
      setCodeLenses(lenses);
    };

    refreshLenses();

    // Re-check when symbolIndexer completes a pass
    const unsub = symbolIndexer.onStatsChange(() => {
      refreshLenses();
    });

    return () => unsub();
  }, [activeFile?.id, fileContent, userSettings.codeLens]);

  // Code lines count
  const linesArray = useMemo(() => {
    return fileContent.split('\n');
  }, [fileContent]);

  // Code Folding State by file ID
  const [collapsedLinesByFile, setCollapsedLinesByFile] = useState<Record<string, Set<number>>>({});
  const [isFoldMenuOpen, setIsFoldMenuOpen] = useState(false);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);

  const currentFileId = activeFile?.id || '';
  const collapsedLines = useMemo(() => {
    return collapsedLinesByFile[currentFileId] || new Set<number>();
  }, [collapsedLinesByFile, currentFileId]);

  const setCollapsedLines = useCallback(
    (updater: Set<number> | ((prev: Set<number>) => Set<number>)) => {
      if (!currentFileId) return;
      setCollapsedLinesByFile((prev) => {
        const existing = prev[currentFileId] || new Set<number>();
        const updated = typeof updater === 'function' ? updater(existing) : updater;
        return {
          ...prev,
          [currentFileId]: updated,
        };
      });
    },
    [currentFileId]
  );

  // Compute all foldable indentation blocks
  const foldRanges = useMemo(() => {
    if (!userSettings.codeFolding) return new Map<number, FoldRange>();
    return computeFoldRanges(linesArray, userSettings.tabSize || 2);
  }, [linesArray, userSettings.tabSize, userSettings.codeFolding]);

  // Compute visible lines and mapping
  const foldResult = useMemo(() => {
    if (!userSettings.codeFolding || collapsedLines.size === 0) {
      return computeVisibleLines(linesArray, new Set(), foldRanges);
    }
    return computeVisibleLines(linesArray, collapsedLines, foldRanges);
  }, [linesArray, collapsedLines, foldRanges, userSettings.codeFolding]);

  const { visibleLines, hiddenLinesCount, visibleToRealIndex, visibleContent } = foldResult;

  // Folding actions
  const toggleFold = useCallback(
    (lineNum: number) => {
      setCollapsedLines((prev) => {
        const next = new Set(prev);
        if (next.has(lineNum)) {
          next.delete(lineNum);
        } else {
          next.add(lineNum);
        }
        return next;
      });
    },
    [setCollapsedLines]
  );

  const handleFoldAll = useCallback(() => {
    const all = collapseAllFolds(foldRanges);
    setCollapsedLines(all);
  }, [foldRanges, setCollapsedLines]);

  const handleUnfoldAll = useCallback(() => {
    setCollapsedLines(new Set());
  }, [setCollapsedLines]);

  const handleFoldLevel = useCallback(
    (level: number) => {
      const byLvl = collapseFoldsByLevel(foldRanges, level);
      setCollapsedLines(byLvl);
    },
    [foldRanges, setCollapsedLines]
  );

  const handleFoldCurrent = useCallback(() => {
    const enclosing = findEnclosingFold(foldRanges, currentLine);
    if (enclosing) {
      setCollapsedLines((prev) => new Set(prev).add(enclosing.startLine));
    }
  }, [foldRanges, currentLine, setCollapsedLines]);

  const handleUnfoldCurrent = useCallback(() => {
    const enclosing = findEnclosingFold(foldRanges, currentLine);
    if (enclosing) {
      setCollapsedLines((prev) => {
        const next = new Set(prev);
        next.delete(enclosing.startLine);
        return next;
      });
    }
  }, [foldRanges, currentLine, setCollapsedLines]);

  // Minimap navigation callbacks
  const handleMinimapScrollTo = useCallback((newScrollTop: number) => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = newScrollTop;
      if (codePreRef.current) {
        codePreRef.current.scrollTop = newScrollTop;
      }
      if (gutterRef.current) {
        gutterRef.current.scrollTop = newScrollTop;
      }
      setEditorScroll({
        scrollTop: newScrollTop,
        scrollLeft: textareaRef.current.scrollLeft,
        scrollHeight: textareaRef.current.scrollHeight,
        clientHeight: textareaRef.current.clientHeight,
      });
    }
  }, []);

  const handleMinimapScrollLine = useCallback(
    (lineNumber: number) => {
      if (textareaRef.current) {
        const lineHeight = 24;
        const totalLines = Math.max(linesArray.length, 1);
        const clampedLine = Math.min(totalLines, Math.max(1, lineNumber));

        const maxScroll = Math.max(
          0,
          textareaRef.current.scrollHeight - textareaRef.current.clientHeight
        );

        // Center requested line in editor viewport, clamped between 0 and maxScroll
        const lineTop = (clampedLine - 1) * lineHeight;
        const targetScroll = Math.max(
          0,
          Math.min(maxScroll, lineTop - textareaRef.current.clientHeight / 2 + lineHeight / 2)
        );

        handleMinimapScrollTo(targetScroll);
        setCurrentLine(clampedLine);

        // Place textarea cursor at the beginning of the corresponding line
        let charIndex = 0;
        for (let i = 0; i < clampedLine - 1 && i < linesArray.length; i++) {
          charIndex += linesArray[i].length + 1;
        }
        try {
          textareaRef.current.selectionStart = charIndex;
          textareaRef.current.selectionEnd = charIndex;
        } catch {
          // ignore if textarea is not active
        }
      }
    },
    [handleMinimapScrollTo, linesArray]
  );

  // Synchronize editor view and cursor position when paneState.cursorLine changes (e.g. search match or go-to-definition)
  useEffect(() => {
    if (paneState.cursorLine && paneState.cursorLine > 0) {
      handleMinimapScrollLine(paneState.cursorLine);
      if (paneState.cursorCol && textareaRef.current) {
        let charIndex = 0;
        for (let i = 0; i < paneState.cursorLine - 1 && i < linesArray.length; i++) {
          charIndex += linesArray[i].length + 1;
        }
        charIndex += Math.max(0, (paneState.cursorCol || 1) - 1);
        try {
          textareaRef.current.selectionStart = charIndex;
          textareaRef.current.selectionEnd = charIndex;
        } catch {
          // ignore
        }
      }
    }
  }, [paneState.cursorLine, paneState.cursorCol, paneState.activeTabId, handleMinimapScrollLine, linesArray]);

  // Cursor tracking
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const selStart = textareaRef.current.selectionStart;
    const displayedText = userSettings.codeFolding && hiddenLinesCount > 0 ? visibleContent : fileContent;
    const textBefore = displayedText.substring(0, selStart);
    const lines = textBefore.split('\n');
    const vLineNum = lines.length;
    if (userSettings.codeFolding && hiddenLinesCount > 0) {
      const realLineNum = visibleLines[vLineNum - 1]?.realLineNumber || vLineNum;
      setCurrentLine(realLineNum);
    } else {
      setCurrentLine(vLineNum);
    }
    setCurrentCol(lines[lines.length - 1].length + 1);
  };

  // File diagnostics for active file
  const activeDiagnostics = useMemo(() => {
    if (!activeFile) return [];
    return diagnostics.filter(
      (d) => d.filePath === activeFile.path || d.filePath === activeFile.id || (activeFile.path && d.filePath.endsWith(activeFile.name))
    );
  }, [diagnostics, activeFile]);

  // In-Editor Find Widget State (Ctrl+F)
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [currentFindIndex, setCurrentFindIndex] = useState(0);

  // Effective search query: in-editor find widget query takes precedence; falls back to global workspace search query
  const effectiveSearchQuery = useMemo(() => {
    return findQuery.trim() || searchQuery?.trim() || '';
  }, [findQuery, searchQuery]);

  // Effective case sensitivity option
  const effectiveCaseSensitive = findCaseSensitive || Boolean(searchOptions?.matchCase);

  // Compute all search matches for the active file
  const activeFileSearchMatches = useMemo(() => {
    if (!effectiveSearchQuery || !fileContent) return [];
    const isCase = effectiveCaseSensitive;
    const isWholeWord = Boolean(searchOptions?.matchWholeWord);
    const isRegex = Boolean(searchOptions?.useRegex);

    let regex: RegExp;
    try {
      let pattern = effectiveSearchQuery;
      if (!isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (isWholeWord) {
        pattern = `\\b(?:${pattern})\\b`;
      }
      regex = new RegExp(pattern, isCase ? 'g' : 'gi');
    } catch {
      return [];
    }

    const results: SearchMatch[] = [];
    const lines = fileContent.split('\n');

    lines.forEach((lineText, idx) => {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(lineText)) !== null) {
        const len = m[0].length;
        if (len === 0) {
          regex.lastIndex++;
          continue;
        }
        results.push({
          fileId: activeFile?.id || 'active',
          fileName: activeFile?.name || '',
          filePath: activeFile?.path || '',
          line: idx + 1,
          col: m.index + 1,
          lineText: lineText.trim(),
          matchStart: m.index,
          matchEnd: m.index + len,
          matchText: m[0],
        });
      }
    });
    return results;
  }, [effectiveSearchQuery, fileContent, effectiveCaseSensitive, searchOptions, activeFile]);

  // Map of line numbers containing search matches
  const searchMatchLines = useMemo(() => {
    const set = new Set<number>();
    activeFileSearchMatches.forEach((m) => set.add(m.line));
    return set;
  }, [activeFileSearchMatches]);

  // Synchronize currentFindIndex when cursorLine or active match changes
  useEffect(() => {
    if (paneState.cursorLine && activeFileSearchMatches.length > 0) {
      const matchIdx = activeFileSearchMatches.findIndex(
        (m) =>
          m.line === paneState.cursorLine &&
          (paneState.cursorCol && m.col !== undefined ? Math.abs(m.col - paneState.cursorCol) <= 2 : true)
      );
      if (matchIdx !== -1) {
        setCurrentFindIndex(matchIdx);
      } else {
        const lineMatchIdx = activeFileSearchMatches.findIndex((m) => m.line === paneState.cursorLine);
        if (lineMatchIdx !== -1) {
          setCurrentFindIndex(lineMatchIdx);
        }
      }
    }
  }, [paneState.cursorLine, paneState.cursorCol, activeFileSearchMatches]);

  // Syntax highlighted HTML with visual search occurrence highlights injected
  const highlightedCode = useMemo(() => {
    if (!activeFile) return '';
    const textToHighlight = userSettings.codeFolding && hiddenLinesCount > 0 ? visibleContent : fileContent;
    const baseHtml = syntaxEngine.highlightCode(textToHighlight, activeFile.language || 'typescript');

    if (!effectiveSearchQuery || !effectiveSearchQuery.trim()) {
      return baseHtml;
    }

    const { html } = injectSearchHighlightsIntoHtml(
      baseHtml,
      textToHighlight,
      effectiveSearchQuery,
      {
        matchCase: effectiveCaseSensitive,
        matchWholeWord: Boolean(searchOptions?.matchWholeWord),
        useRegex: Boolean(searchOptions?.useRegex),
      },
      currentFindIndex
    );

    return html;
  }, [
    fileContent,
    activeFile,
    userSettings.codeFolding,
    hiddenLinesCount,
    visibleContent,
    effectiveSearchQuery,
    effectiveCaseSensitive,
    searchOptions,
    currentFindIndex,
  ]);

  // Next / Previous Find Navigation
  const handleNextFindMatch = useCallback(() => {
    if (activeFileSearchMatches.length === 0) return;
    const nextIdx = (currentFindIndex + 1) % activeFileSearchMatches.length;
    setCurrentFindIndex(nextIdx);
    const match = activeFileSearchMatches[nextIdx];
    handleMinimapScrollLine(match.line);
    setCurrentLine(match.line);
    setCurrentCol(match.col || 1);
    if (textareaRef.current) {
      let charIndex = 0;
      for (let i = 0; i < match.line - 1 && i < linesArray.length; i++) {
        charIndex += linesArray[i].length + 1;
      }
      charIndex += Math.max(0, (match.col || 1) - 1);
      try {
        textareaRef.current.selectionStart = charIndex;
        textareaRef.current.selectionEnd = charIndex + (match.matchText?.length || 0);
      } catch {
        // ignore
      }
    }
  }, [activeFileSearchMatches, currentFindIndex, handleMinimapScrollLine, linesArray]);

  const handlePrevFindMatch = useCallback(() => {
    if (activeFileSearchMatches.length === 0) return;
    const prevIdx = (currentFindIndex - 1 + activeFileSearchMatches.length) % activeFileSearchMatches.length;
    setCurrentFindIndex(prevIdx);
    const match = activeFileSearchMatches[prevIdx];
    handleMinimapScrollLine(match.line);
    setCurrentLine(match.line);
    setCurrentCol(match.col || 1);
    if (textareaRef.current) {
      let charIndex = 0;
      for (let i = 0; i < match.line - 1 && i < linesArray.length; i++) {
        charIndex += linesArray[i].length + 1;
      }
      charIndex += Math.max(0, (match.col || 1) - 1);
      try {
        textareaRef.current.selectionStart = charIndex;
        textareaRef.current.selectionEnd = charIndex + (match.matchText?.length || 0);
      } catch {
        // ignore
      }
    }
  }, [activeFileSearchMatches, currentFindIndex, handleMinimapScrollLine, linesArray]);

  // Content change handler (with folding resilience)
  const handleContentChange = (newVal: string) => {
    if (!activeFile) return;
    if (!userSettings.codeFolding || hiddenLinesCount === 0) {
      onUpdateContent(activeFile.id, newVal);
    } else {
      const newVisibleLines = newVal.split('\n');
      if (newVisibleLines.length === visibleLines.length) {
        // Line count unchanged: map each visible line back to real line
        const newFullLines = [...linesArray];
        visibleToRealIndex.forEach((realIdx, vIdx) => {
          if (newVisibleLines[vIdx] !== undefined) {
            newFullLines[realIdx] = newVisibleLines[vIdx];
          }
        });
        const updatedFull = newFullLines.join('\n');
        onUpdateContent(activeFile.id, updatedFull);
      } else {
        // Structural changes (e.g. Enter / Backspace) safely expand folds to preserve lines
        setCollapsedLines(new Set());
        onUpdateContent(activeFile.id, newVal);
      }
    }
  };

  // Go to Definition resolver
  const executeGoToDefinition = () => {
    if (!textareaRef.current || !activeFile) return;
    const selStart = textareaRef.current.selectionStart;
    const textBefore = fileContent.substring(0, selStart);
    const textAfter = fileContent.substring(selStart);

    const tokenBefore = textBefore.match(/[A-Za-z0-9_$]+$/)?.[0] || '';
    const tokenAfter = textAfter.match(/^[A-Za-z0-9_$]+/)?.[0] || '';
    const fullToken = tokenBefore + tokenAfter;

    if (!fullToken) return;

    const target = symbolIndexer.findDefinition(fullToken, activeFile.id);
    if (target && onGoToDefinition) {
      onGoToDefinition(target.fileId, target.line, target.col);
      setHoveredSymbol(null);
    }
  };

  // Peek references resolver for token under cursor
  const executePeekReferences = () => {
    if (!textareaRef.current || !activeFile) return;
    const selStart = textareaRef.current.selectionStart;
    const textBefore = fileContent.substring(0, selStart);
    const textAfter = fileContent.substring(selStart);

    const tokenBefore = textBefore.match(/[A-Za-z0-9_$]+$/)?.[0] || '';
    const tokenAfter = textAfter.match(/^[A-Za-z0-9_$]+/)?.[0] || '';
    const fullToken = tokenBefore + tokenAfter;

    if (!fullToken) return;

    // Check if token matches a code lens
    const matchingLens = codeLenses.find((l) => l.symbolName === fullToken);
    if (matchingLens) {
      setActivePeekLens(matchingLens);
      return;
    }

    // Dynamic reference query using symbolIndexer
    const def = symbolIndexer.findDefinition(fullToken, activeFile.id);
    const refs = symbolIndexer.findReferences(fullToken, def || undefined);
    const syntheticLens: CodeLensItem = {
      id: `synthetic-${fullToken}`,
      symbolId: def?.id || `sym-${fullToken}`,
      symbolName: fullToken,
      symbolKind: def?.kind || 'function',
      line: def?.line || currentLine,
      col: def?.col || currentCol,
      fileId: def?.fileId || activeFile.id,
      referenceCount: refs.length,
      references: refs,
    };
    setActivePeekLens(syntheticLens);
  };

  // Keyboard navigation, shortcuts, and AI acceptance
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keystroke sound synthesizer
    audioEngine.playKey(e.key);

    // Dismiss active Peek References on Escape
    if (e.key === 'Escape' && activePeekLens) {
      e.preventDefault();
      setActivePeekLens(null);
      return;
    }

    // Shift+F12: Find / Peek References
    if (e.shiftKey && e.key === 'F12') {
      e.preventDefault();
      executePeekReferences();
      return;
    }
    // 0. Run Active Code with Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (activeFile && onRunCode) {
        onRunCode(activeFile);
      }
      return;
    }

    // F3 / Shift+F3: Next / Previous Search Match
    if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevFindMatch();
      } else {
        handleNextFindMatch();
      }
      return;
    }

    // 1. Go-to-Definition with F12
    if (e.key === 'F12') {
      e.preventDefault();
      executeGoToDefinition();
      return;
    }

    // 5. Code Folding Shortcuts: Ctrl+Shift+[ to fold, Ctrl+Shift+] to unfold
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '[' || e.key === '{')) {
      e.preventDefault();
      handleFoldCurrent();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === ']' || e.key === '}')) {
      e.preventDefault();
      handleUnfoldCurrent();
      return;
    }

    // Standard Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const spaces = ' '.repeat(userSettings.tabSize);
      const newContent = fileContent.substring(0, start) + spaces + fileContent.substring(end);
      if (activeFile) {
        onUpdateContent(activeFile.id, newContent);
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + userSettings.tabSize;
          updateCursorPosition();
        }
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (userSettings.formatOnSave && activeFile) {
        onFormatDocument(activeFile.id);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setIsFindOpen(true);
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (end > start) {
          const selected = fileContent.substring(start, end).trim();
          if (selected && selected.length < 60) {
            setFindQuery(selected);
          }
        }
      }
    } else if (e.key === 'Escape' && isFindOpen) {
      e.preventDefault();
      setIsFindOpen(false);
    } else if (isVimEnabled && vimMode === 'NORMAL') {
      if (e.key === 'i') {
        e.preventDefault();
        setVimMode('INSERT');
      } else if (e.key === 'v') {
        e.preventDefault();
        setVimMode('VISUAL');
      }
    } else if (isVimEnabled && vimMode !== 'NORMAL' && e.key === 'Escape') {
      e.preventDefault();
      setVimMode('NORMAL');
    }
  };

  // Mouse click handling (Ctrl+Click = Go to Definition)
  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    updateCursorPosition();
    if (e.ctrlKey || e.metaKey) {
      executeGoToDefinition();
    }
    setHoveredSymbol(null);
  };

  // Mouse move with Ctrl held down to show definition preview tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && activeFile && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const line = Math.floor(relY / 24) + 1;

      const lines = fileContent.split('\n');
      if (line > 0 && line <= lines.length) {
        const lineText = lines[line - 1];
        const words = lineText.match(/[A-Za-z0-9_$]+/g) || [];
        for (const word of words) {
          const sym = symbolIndexer.findDefinition(word, activeFile.id);
          if (sym) {
            setHoveredSymbol(sym);
            setHoverCoords({ top: e.clientY - rect.top + 28, left: Math.min(e.clientX - rect.left, 450) });
            return;
          }
        }
      }
    } else if (hoveredSymbol) {
      setHoveredSymbol(null);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
      style={{ backgroundColor: 'var(--ide-bg-editor, #0c0d12)' }}
    >
      {/* 1. Tab Header Bar */}
      <div 
        className="h-9 border-b flex items-center justify-between overflow-x-auto select-none shrink-0"
        style={{ 
          backgroundColor: 'var(--ide-bg-app, #0f1017)',
          borderColor: 'var(--ide-border, #222432)'
        }}
      >
        {/* Left: Navigation History Controls & Tab Items */}
        <div className="flex items-center h-full overflow-x-auto">
          {/* Go Back & Go Forward Navigation Buttons */}
          <div 
            className="flex items-center px-1.5 h-full border-r space-x-0.5 shrink-0"
            style={{ 
              backgroundColor: 'var(--ide-bg-app, #0d0e14)',
              borderColor: 'var(--ide-border, #202230)'
            }}
          >
            <button
              onClick={() => onGoBack?.(paneId)}
              disabled={!canGoBack}
              title={
                canGoBack && prevEntry
                  ? `Go Back to ${prevEntry.fileName} (Alt+Left)`
                  : 'Go Back (Alt+Left)'
              }
              className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center ${
                canGoBack
                  ? 'text-slate-300 hover:text-rose-400 hover:bg-[#1f2130] cursor-pointer'
                  : 'text-slate-600 opacity-40 cursor-not-allowed'
              }`}
              aria-label="Go Back"
            >
              <FontAwesomeIcon icon={ICONS.arrowLeft} className="w-3 h-3 text-[11px]" />
            </button>

            <button
              onClick={() => onGoForward?.(paneId)}
              disabled={!canGoForward}
              title={
                canGoForward && nextEntry
                  ? `Go Forward to ${nextEntry.fileName} (Alt+Right)`
                  : 'Go Forward (Alt+Right)'
              }
              className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center ${
                canGoForward
                  ? 'text-slate-300 hover:text-rose-400 hover:bg-[#1f2130] cursor-pointer'
                  : 'text-slate-600 opacity-40 cursor-not-allowed'
              }`}
              aria-label="Go Forward"
            >
              <FontAwesomeIcon icon={ICONS.arrowRight} className="w-3 h-3 text-[11px]" />
            </button>

            {navigationHistory.length > 1 && (
              <div className="relative flex items-center">
                <button
                  onClick={() => setIsHistoryMenuOpen((prev) => !prev)}
                  title="Recently Opened Files History"
                  className={`p-1 rounded text-[10px] transition-colors flex items-center justify-center ${
                    isHistoryMenuOpen
                      ? 'text-rose-400 bg-rose-950/70'
                      : 'text-slate-400 hover:text-rose-400 hover:bg-[#1f2130] cursor-pointer'
                  }`}
                  aria-label="Recent Navigation History"
                >
                  <FontAwesomeIcon icon={ICONS.history} />
                </button>

                {isHistoryMenuOpen && (
                  <div
                    className="absolute left-0 top-8 z-50 w-60 bg-[#12131d] border border-rose-800/80 shadow-2xl rounded-lg p-1 text-xs font-mono select-none"
                    onMouseLeave={() => setIsHistoryMenuOpen(false)}
                  >
                    <div className="px-2 py-1 text-[10px] text-rose-400 font-bold uppercase tracking-wider border-b border-[#202230] flex items-center justify-between">
                      <span>Navigation History</span>
                      <span className="text-[9px] text-slate-400 lowercase">{navigationHistory.length} files</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-[#191b26] py-0.5">
                      {navigationHistory.map((item, idx) => {
                        const isCurrent = idx === navigationIndex;
                        const isPast = idx < navigationIndex;
                        return (
                          <button
                            key={`${item.fileId}-${idx}`}
                            onClick={() => {
                              onJumpToHistoryIndex?.(paneId, idx);
                              setIsHistoryMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded hover:bg-[#1c1d2c] transition-colors cursor-pointer ${
                              isCurrent
                                ? 'text-rose-400 font-bold bg-[#181926]'
                                : isPast
                                ? 'text-slate-300'
                                : 'text-slate-400'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <FontAwesomeIcon
                                icon={isCurrent ? ICONS.target : isPast ? ICONS.arrowLeft : ICONS.arrowRight}
                                className={`text-[9px] ${isCurrent ? 'text-rose-400' : 'text-slate-500'}`}
                              />
                              <span className="truncate">{item.fileName}</span>
                            </div>
                            {item.line && item.line > 1 && (
                              <span className="text-[10px] text-slate-500 font-mono">:{item.line}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {paneState.tabs.map((tab) => {
            const isTabActive = tab.id === paneState.activeTabId;
            const iconConfig = getFileIconConfig(tab.fileName, tab.language);
            const tabStyle = userSettings.tabStyle || 'default';
            const dirtyStyle = userSettings.tabDirtyStyle || 'dot';
            const closeBtnStyle = userSettings.tabCloseButton || 'right';
            const showIcon = userSettings.showTabIcons !== false;

            const closeBtn = (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="Close Tab"
                className={`hover:bg-white/[0.1] text-slate-400 hover:text-white rounded p-0.5 text-[10px] transition-opacity cursor-pointer ${
                  closeBtnStyle === 'hover' ? 'opacity-0 group-hover:opacity-100' : ''
                }`}
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            );

            const dirtyIndicator = tab.isDirty ? (
              dirtyStyle === 'asterisk' ? (
                <span className="text-rose-400 font-bold shrink-0 text-xs leading-none">*</span>
              ) : dirtyStyle === 'bar' ? (
                <span className="w-1 h-3 rounded-xs bg-rose-500 shrink-0" />
              ) : dirtyStyle === 'badge' ? (
                <span className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-mono shrink-0">
                  MOD
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              )
            ) : null;

            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center space-x-2 px-3 cursor-pointer text-xs transition-all ${
                  tabStyle === 'pill'
                    ? `rounded-full my-1 mx-1 border ${
                        isTabActive
                          ? 'bg-rose-950/60 border-rose-500/80 text-rose-200 font-medium shadow-sm'
                          : 'bg-[#141520] border-[#242636] text-slate-400 hover:text-slate-200'
                      }`
                    : tabStyle === 'underline'
                    ? `h-full border-r ${
                        isTabActive
                          ? 'text-slate-100 font-medium border-b-2 border-b-rose-500 bg-white/[0.02]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`
                    : tabStyle === 'minimal'
                    ? `h-full px-2.5 ${
                        isTabActive
                          ? 'text-rose-300 font-semibold bg-white/[0.04]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`
                    : `h-full border-r ${
                        isTabActive
                          ? 'text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                      }`
                }`}
                style={
                  tabStyle === 'default'
                    ? {
                        borderColor: 'var(--ide-border, #1a1b24)',
                        backgroundColor: isTabActive ? 'var(--ide-bg-editor, #0e0f15)' : undefined,
                        borderTopWidth: isTabActive ? '2px' : undefined,
                        borderTopColor: isTabActive ? 'var(--ide-accent, #e11d48)' : undefined,
                      }
                    : undefined
                }
              >
                {closeBtnStyle === 'left' && !tab.isDirty && closeBtn}
                {showIcon && <FontAwesomeIcon icon={iconConfig.icon} className={`text-xs ${iconConfig.color}`} />}
                <span className="font-mono text-xs truncate max-w-[140px]">{tab.fileName}</span>

                {/* External Modification Indicator */}
                {externallyModifiedFiles?.[tab.fileId] && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"
                    title="Modified externally by File System Watcher"
                  />
                )}

                {/* Dirty Indicator */}
                {dirtyIndicator}

                {/* Close Button on Right */}
                {closeBtnStyle !== 'left' && closeBtnStyle !== 'hidden' && !tab.isDirty && closeBtn}
              </div>
            );
          })}

          {paneState.tabs.length === 0 && (
            <div className="px-3 text-xs text-slate-500 font-mono italic">
              No files open
            </div>
          )}
        </div>

        {/* Right: Pane Action Controls (Clean, uncluttered, focused) */}
        <div className="flex items-center space-x-1.5 px-2 text-slate-400 shrink-0">
          {/* Git Diff 'Show Changes' Action Button */}
          {activeFile && !activeFile.isFolder && (
            <button
              id={`show-changes-btn-${paneId}`}
              onClick={() => setIsDiffOpen((prev) => !prev)}
              title={
                isDiffOpen
                  ? 'Return to Code Editor (Escape)'
                  : `Show line-by-line additions and deletions for ${activeFile.name}`
              }
              className={`px-2.5 py-0.5 rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer select-none font-medium ${
                isDiffOpen
                  ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-sm ring-1 ring-rose-400/50'
                  : activeFileDiff?.hasChanges
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 shadow-xs'
                  : 'hover:text-rose-400 hover:bg-white/[0.05] text-slate-400'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.gitCompare} className="text-[10px]" />
              <span>{isDiffOpen ? 'Hide Changes' : 'Show Changes'}</span>
              {activeFileDiff && activeFileDiff.hasChanges && (
                <span className="flex items-center space-x-1 text-[10px] font-mono ml-0.5">
                  <span className="text-emerald-400 font-bold">+{activeFileDiff.stats.additions}</span>
                  <span className="text-rose-400 font-bold">-{activeFileDiff.stats.deletions}</span>
                </span>
              )}
            </button>
          )}

          {/* Quick Run Code (Ctrl+Enter) */}
          {onRunCode && activeFile && !activeFile.isFolder && (
            <button
              onClick={() => onRunCode(activeFile)}
              disabled={isRunningCode}
              title="Run Code in Sandbox (Ctrl+Enter)"
              className="px-2.5 py-0.5 rounded bg-rose-600/90 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FontAwesomeIcon icon={isRunningCode ? ICONS.syncSpin : ICONS.play} className={isRunningCode ? 'animate-spin text-[9px]' : 'text-[9px]'} />
              <span className="hidden md:inline">{isRunningCode ? 'Running...' : 'Run'}</span>
            </button>
          )}

          {/* Markdown View Mode Toggle */}
          {activeFile && (activeFile.language === 'markdown' || activeFile.name.endsWith('.md')) && (
            <button
              onClick={() => setMarkdownMode((prev) => prev === 'edit' ? 'split' : prev === 'split' ? 'preview' : 'edit')}
              title={`Markdown View Mode: ${markdownMode.toUpperCase()}`}
              className={`h-6 px-2 rounded text-[11px] flex items-center space-x-1.5 transition-colors cursor-pointer ${
                markdownMode !== 'edit'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700/80'
                  : 'hover:text-slate-100 hover:bg-white/[0.06] text-slate-400'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.bookOpen} className="text-[10px]" />
              <span className="hidden sm:inline capitalize">{markdownMode === 'edit' ? 'Preview' : markdownMode}</span>
            </button>
          )}

          {/* Find in File Button (Ctrl+F) */}
          {activeFile && (
            <button
              onClick={() => setIsFindOpen((prev) => !prev)}
              title="Find in File (Ctrl+F)"
              className={`w-6 h-6 flex items-center justify-center hover:text-slate-100 hover:bg-white/[0.06] rounded transition-colors text-xs cursor-pointer ${
                isFindOpen ? 'text-rose-400 bg-white/[0.08]' : 'text-slate-400'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.search} />
            </button>
          )}

          {/* Dedicated Git Diff View Modal (Alt+D) */}
          {activeFile && (
            <button
              onClick={() => {
                if (onOpenDiffModal) {
                  onOpenDiffModal(activeFile.id);
                } else {
                  setIsDiffOpen((prev) => !prev);
                }
              }}
              title="Open Dedicated Git Diff Modal: Side-by-Side additions & deletions vs last commit (Alt+D)"
              className="w-6 h-6 flex items-center justify-center hover:text-rose-400 hover:bg-white/[0.06] rounded transition-colors text-xs text-slate-400 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.gitCompare} />
            </button>
          )}

          {/* Code Folding shortcut badge if lines are hidden */}
          {userSettings.codeFolding && activeFile && hiddenLinesCount > 0 && (
            <button
              onClick={handleUnfoldAll}
              title="Click to unfold all code blocks"
              className="h-6 px-1.5 rounded bg-white/[0.05] hover:bg-white/[0.08] text-rose-400 text-[10px] font-mono flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.unfold} className="text-[8px]" />
              <span>{hiddenLinesCount}</span>
            </button>
          )}

          {/* Layout Mode controls in editor pane */}
          {isEditLayoutMode && splitDirection !== 'none' && onSwapSplitPanes && (
            <button
              onClick={onSwapSplitPanes}
              title="Swap Split Panes (Left <-> Right / Top <-> Bottom)"
              className="h-6 px-1.5 rounded bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 transition-colors text-[10px] font-mono flex items-center space-x-1 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.arrowsLeftRight} className="text-[9px]" />
              <span className="hidden sm:inline">Swap</span>
            </button>
          )}

          {isEditLayoutMode && onToggleMinimapPosition && (
            <button
              onClick={onToggleMinimapPosition}
              title={`Minimap position: ${minimapPosition}. Click to toggle Left / Right`}
              className="h-6 px-1.5 rounded bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900 transition-colors text-[10px] font-mono flex items-center space-x-1 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.layout} className="text-[9px]" />
              <span className="hidden sm:inline">Minimap: {minimapPosition}</span>
            </button>
          )}

          {/* Toggle Code Lens References Button */}
          <button
            onClick={() => onUpdateSettings?.({ codeLens: userSettings.codeLens === false ? true : false })}
            title={`Code Lens References (${userSettings.codeLens !== false ? 'Enabled' : 'Disabled'}). Click to toggle.`}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors text-xs cursor-pointer ${
              userSettings.codeLens !== false
                ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/60'
                : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.references} />
          </button>

          {/* Vertical Split Button */}
          <button
            onClick={() => onToggleSplit(splitDirection === 'vertical' ? 'none' : 'vertical')}
            title="Split Editor Right (Vertical)"
            className={`w-6 h-6 flex items-center justify-center hover:text-slate-100 hover:bg-white/[0.06] rounded transition-colors text-xs cursor-pointer ${
              splitDirection === 'vertical' ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.splitVertical} />
          </button>

          {/* Horizontal Split Button */}
          <button
            onClick={() => onToggleSplit(splitDirection === 'horizontal' ? 'none' : 'horizontal')}
            title="Split Editor Down (Horizontal)"
            className={`w-6 h-6 flex items-center justify-center hover:text-slate-100 hover:bg-white/[0.06] rounded transition-colors text-xs cursor-pointer ${
              splitDirection === 'horizontal' ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.splitHorizontal} />
          </button>

          {/* Close Pane (if in split) */}
          {splitDirection !== 'none' && (
            <button
              onClick={() => onToggleSplit('none')}
              title="Close Split View"
              className="w-6 h-6 flex items-center justify-center hover:text-rose-400 hover:bg-white/[0.06] text-slate-400 rounded transition-colors text-xs cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          )}
        </div>
      </div>

      {/* File System Watcher: External Modification Notification Banner */}
      {activeFile && externallyModifiedFiles?.[activeFile.id] && (
        <div className="bg-amber-950/80 border-b border-amber-600/70 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-amber-200 shrink-0 select-none animate-fadeIn">
          <div className="flex items-center space-x-2 truncate mr-2">
            <FontAwesomeIcon icon={ICONS.bolt} className="text-amber-400 animate-pulse text-xs shrink-0" />
            <span className="truncate">
              <strong className="text-amber-300">File System Watcher:</strong> &ldquo;{activeFile.name}&rdquo; was modified externally at {externallyModifiedFiles[activeFile.id].timeFormatted} ({externallyModifiedFiles[activeFile.id].origin || 'External Process'}).
            </span>
          </div>
          <button
            onClick={() => onDismissExternalChange?.(activeFile.id)}
            className="px-2.5 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/70 text-[11px] font-bold transition-colors shrink-0 cursor-pointer flex items-center space-x-1"
          >
            <FontAwesomeIcon icon={ICONS.circleCheck} className="text-[10px]" />
            <span>Acknowledge</span>
          </button>
        </div>
      )}

      {/* 2. File Breadcrumbs Navigation Bar (Active File Hierarchy & Quick Jump) */}
      {userSettings.breadcrumbs !== false && (
        <FileBreadcrumbs
          activeFile={activeFile}
          files={files}
          onOpenFile={(fileId) => onOpenFile?.(fileId, undefined, undefined, paneId)}
          onRevealInExplorer={onRevealInExplorer}
          workspaceName="crimson-app"
          onOpenStats={onOpenStats}
          onRunCode={onRunCode}
          isRunningCode={isRunningCode}
          separatorStyle={userSettings.breadcrumbSeparatorStyle}
          onSeparatorStyleChange={(style) => onUpdateSettings?.({ breadcrumbSeparatorStyle: style })}
        />
      )}

      {/* Editor Content Area with Line Numbers, Diagnostics, and Minimap */}
      {activeFile ? (
        isDiffOpen ? (
          <GitDiffView
            file={activeFile}
            onClose={() => setIsDiffOpen(false)}
            onOpenModal={() => {
              setIsDiffOpen(false);
              if (onOpenDiffModal) onOpenDiffModal(activeFile.id);
            }}
            onUpdateContent={onUpdateContent}
            onRevertFile={onRevertFile}
            userSettings={userSettings}
          />
        ) : (activeFile.language === 'markdown' || activeFile.name.endsWith('.md')) && markdownMode === 'preview' ? (
          <MarkdownPreview
            content={fileContent}
            fileName={activeFile.name}
            onClose={() => setMarkdownMode('edit')}
            className="flex-1 w-full"
          />
        ) : (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Line Numbers & Diagnostics Gutter */}
          {userSettings.lineNumbers && (
            <div 
              ref={gutterRef}
              className="w-14 border-r select-none py-2 text-right pr-2 text-slate-400 font-mono text-xs flex flex-col shrink-0 overflow-hidden"
              style={{ 
                backgroundColor: 'var(--ide-bg-gutter, #0b0c10)',
                borderColor: 'var(--ide-border, #1c1e28)',
                fontSize: `${userSettings.fontSize}px`, 
                lineHeight: '24px' 
              }}
            >
              {visibleLines.map((vLine) => {
                const lineNum = vLine.realLineNumber;
                const isCurrent = lineNum === currentLine;
                const diag = activeDiagnostics.find((d) => d.line === lineNum);
                const hasSearchMatch = searchMatchLines.has(lineNum);
                const isCurrentMatchLine = activeFileSearchMatches[currentFindIndex]?.line === lineNum;

                return (
                  <div 
                    key={lineNum} 
                    className={`group relative flex items-center justify-between pl-1 transition-colors ${
                      isCurrentMatchLine
                        ? 'bg-amber-500/25 border-l-2 border-amber-400'
                        : hasSearchMatch
                        ? 'bg-amber-500/10 border-l-2 border-amber-500/70'
                        : ''
                    }`}
                    style={{ height: '24px', lineHeight: '24px' }}
                  >
                    {/* Fold toggle chevron */}
                    <div className="w-3.5 flex items-center justify-center shrink-0">
                      {userSettings.codeFolding && vLine.isFoldHeader && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFold(lineNum);
                          }}
                          className={`w-3.5 h-3.5 flex items-center justify-center rounded transition-all cursor-pointer ${
                            vLine.isCollapsed
                              ? 'text-rose-400 bg-rose-950/90 border border-rose-800 hover:bg-rose-900'
                              : 'text-slate-500 hover:text-rose-400 hover:bg-[#1f2130] opacity-0 group-hover:opacity-100'
                          }`}
                          title={
                            vLine.isCollapsed
                              ? `Expand block (${vLine.foldRange?.childLinesCount} lines, ${vLine.foldRange?.startLine}-${vLine.foldRange?.endLine})`
                              : `Collapse block (${vLine.foldRange?.childLinesCount} lines, ${vLine.foldRange?.startLine}-${vLine.foldRange?.endLine})`
                          }
                        >
                          <FontAwesomeIcon
                            icon={vLine.isCollapsed ? ICONS.chevronRight : ICONS.chevronDown}
                            className="text-[8px]"
                          />
                        </button>
                      )}
                    </div>

                    {/* Diagnostic icon & Line number */}
                    <div className="flex items-center justify-end space-x-1 shrink-0">
                      {hasSearchMatch && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isCurrentMatchLine
                              ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)] ring-1 ring-amber-200'
                              : 'bg-amber-400/80 shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                          }`}
                          title={`Line ${lineNum} contains search match for "${effectiveSearchQuery}"`}
                        />
                      )}
                      {diag && (
                        <FontAwesomeIcon
                          icon={diag.severity === 'error' ? ICONS.error : ICONS.warning}
                          className={`text-[9px] ${diag.severity === 'error' ? 'text-rose-500' : 'text-amber-400'}`}
                          title={diag.message}
                        />
                      )}
                      <span 
                        className={`${isCurrent ? 'font-bold' : hasSearchMatch ? 'text-amber-300 font-semibold' : ''}`}
                        style={isCurrent ? { color: 'var(--ide-accent-hover, #f43f5e)' } : undefined}
                      >
                        {lineNum}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Code Minimap Render Helper */}
          {userSettings.minimap && minimapPosition === 'left' && (
            <CodeMinimap
              lines={userSettings.codeFolding && hiddenLinesCount > 0 ? visibleLines.map((v) => v.text) : linesArray}
              fileContent={userSettings.codeFolding && hiddenLinesCount > 0 ? visibleContent : fileContent}
              language={activeFile?.language || 'typescript'}
              currentLine={currentLine}
              diagnostics={activeDiagnostics}
              searchMatches={activeFileSearchMatches}
              searchQuery={effectiveSearchQuery}
              scaleFactor={userSettings.minimapScale || 1.0}
              onUpdateScale={(scale) => onUpdateSettings?.({ minimapScale: scale })}
              scrollTop={editorScroll.scrollTop}
              scrollHeight={editorScroll.scrollHeight}
              clientHeight={editorScroll.clientHeight}
              onScrollTo={handleMinimapScrollTo}
              onScrollLine={handleMinimapScrollLine}
              crimsonShade={userSettings.crimsonShade}
            />
          )}

          {/* Code Editing Stage */}
          <div 
            className="flex-1 relative overflow-hidden"
            style={{ backgroundColor: 'var(--ide-bg-editor, #0e0f16)' }}
          >
            {/* Smooth Animated Theme Transition Ripple & Bloom Overlay */}
            {themeTransition?.active && (
              <div 
                className="absolute inset-0 pointer-events-none z-30 theme-glow-bloom"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${themeTransition.colors.accent}24 0%, ${themeTransition.colors.keyword}10 45%, transparent 75%)`,
                }}
              />
            )}

            {/* Active Theme Transition Indicator Toast */}
            {themeTransition?.active && isActivePane && (
              <div 
                id="editor-theme-switch-indicator"
                className="absolute bottom-3 right-4 z-40 pointer-events-none flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-[#0d0f18]/90 border border-slate-700/60 shadow-2xl backdrop-blur-md font-mono text-[11px] animate-fadeIn select-none"
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20 animate-pulse shrink-0" 
                  style={{ backgroundColor: themeTransition.colors.accent }}
                />
                <span className="text-slate-200 font-semibold truncate max-w-[150px]">
                  {themeTransition.name}
                </span>
                <div className="flex items-center space-x-1 pl-1 border-l border-slate-700/80">
                  <span className="w-2 h-2 rounded-full" title="Keyword" style={{ backgroundColor: themeTransition.colors.keyword }} />
                  <span className="w-2 h-2 rounded-full" title="Function" style={{ backgroundColor: themeTransition.colors.function }} />
                  <span className="w-2 h-2 rounded-full" title="String" style={{ backgroundColor: themeTransition.colors.string }} />
                </div>
              </div>
            )}
            {/* Active Search Term Occurrences Floating Banner */}
            {!isFindOpen && effectiveSearchQuery && (
              <div
                id="editor-search-active-banner"
                className="absolute top-2 right-4 z-40 bg-[#12131e]/95 border border-amber-600/70 shadow-2xl rounded-lg px-2.5 py-1.5 flex items-center space-x-2 font-mono text-xs select-none backdrop-blur-md animate-fadeIn"
              >
                <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-[11px]">
                  <FontAwesomeIcon icon={ICONS.search} className="text-amber-400 text-[10px]" />
                  <span className="truncate max-w-[140px]" title={`Active search: ${effectiveSearchQuery}`}>
                    &ldquo;{effectiveSearchQuery}&rdquo;
                  </span>
                </div>

                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-700/80 font-mono font-bold">
                  {activeFileSearchMatches.length > 0
                    ? `${currentFindIndex + 1} of ${activeFileSearchMatches.length}`
                    : '0 matches'}
                </span>

                <div className="flex items-center space-x-1 text-slate-400">
                  <button
                    onClick={handlePrevFindMatch}
                    disabled={activeFileSearchMatches.length === 0}
                    title="Previous match in this file (Shift+F3)"
                    className="p-1 hover:text-amber-300 hover:bg-[#1f2132] disabled:opacity-30 rounded transition-colors cursor-pointer text-[10px]"
                  >
                    <FontAwesomeIcon icon={ICONS.chevronUp} />
                  </button>

                  <button
                    onClick={handleNextFindMatch}
                    disabled={activeFileSearchMatches.length === 0}
                    title="Next match in this file (F3 / Enter)"
                    className="p-1 hover:text-amber-300 hover:bg-[#1f2132] disabled:opacity-30 rounded transition-colors cursor-pointer text-[10px]"
                  >
                    <FontAwesomeIcon icon={ICONS.chevronDown} />
                  </button>

                  <button
                    onClick={() => {
                      setFindQuery(effectiveSearchQuery);
                      setIsFindOpen(true);
                    }}
                    title="Open Find in File box (Ctrl+F)"
                    className="p-1 hover:text-amber-300 hover:bg-[#1f2132] rounded transition-colors cursor-pointer text-[10px]"
                  >
                    <FontAwesomeIcon icon={ICONS.edit} />
                  </button>
                </div>
              </div>
            )}

            {/* In-Editor Find Widget */}
            {isFindOpen && (
              <div 
                id="editor-find-widget"
                className="absolute top-2 right-4 z-40 bg-[#12131d] border border-rose-800/80 shadow-2xl rounded-lg p-1.5 flex items-center space-x-1.5 font-mono text-xs select-none"
              >
                <div className="flex items-center bg-[#0a0b12] border border-[#232536] rounded px-2 py-1 text-slate-200 focus-within:border-rose-500">
                  <FontAwesomeIcon icon={ICONS.search} className="text-slate-400 mr-1.5 text-[10px]" />
                  <input
                    type="text"
                    placeholder="Find in file..."
                    value={findQuery}
                    onChange={(e) => {
                      setFindQuery(e.target.value);
                      setCurrentFindIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (e.shiftKey) handlePrevFindMatch();
                        else handleNextFindMatch();
                      } else if (e.key === 'Escape') {
                        setIsFindOpen(false);
                      }
                    }}
                    autoFocus
                    className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-36 font-mono"
                  />
                  {effectiveSearchQuery && (
                    <span className="text-[10px] text-slate-400 ml-1 whitespace-nowrap">
                      {activeFileSearchMatches.length > 0
                        ? `${currentFindIndex + 1}/${activeFileSearchMatches.length}`
                        : '0/0'}
                    </span>
                  )}
                </div>

                {/* Match Case Toggle */}
                <button
                  onClick={() => setFindCaseSensitive((prev) => !prev)}
                  title="Match Case (Alt+C)"
                  className={`px-1.5 py-1 rounded text-[10px] font-bold transition-colors ${
                    findCaseSensitive ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1b28]'
                  }`}
                >
                  Aa
                </button>

                {/* Previous Match */}
                <button
                  onClick={handlePrevFindMatch}
                  disabled={activeFileSearchMatches.length === 0}
                  title="Previous Match (Shift+Enter)"
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#1a1b28] rounded transition-colors"
                >
                  <FontAwesomeIcon icon={ICONS.chevronUp} />
                </button>

                {/* Next Match */}
                <button
                  onClick={handleNextFindMatch}
                  disabled={activeFileSearchMatches.length === 0}
                  title="Next Match (Enter)"
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#1a1b28] rounded transition-colors"
                >
                  <FontAwesomeIcon icon={ICONS.chevronDown} />
                </button>

                {/* Close Find */}
                <button
                  onClick={() => setIsFindOpen(false)}
                  title="Close (Escape)"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-[#1a1b28] rounded transition-colors"
                >
                  <FontAwesomeIcon icon={ICONS.close} />
                </button>
              </div>
            )}

            {/* Column Rulers & Alignment Guides */}
            {userSettings.editorRulers && userSettings.editorRulers.map((col) => {
              const charWidth = userSettings.fontSize * 0.605;
              const leftPx = col * charWidth + 8;
              return (
                <div
                  key={`ruler-${col}`}
                  className="absolute top-0 bottom-0 pointer-events-none z-0 border-r"
                  style={{
                    left: `${leftPx}px`,
                    borderRightStyle: (userSettings.editorRulerStyle as any) || 'dashed',
                    borderRightColor: userSettings.editorRulerColor || 'rgba(255, 255, 255, 0.08)',
                  }}
                />
              );
            })}

            {/* Ambient Background Wallpaper / Atmosphere Layer */}
            {userSettings.editorWallpaper && userSettings.editorWallpaper !== 'none' && (
              <div
                className={`absolute inset-0 pointer-events-none select-none z-0 overflow-hidden ${
                  userSettings.editorWallpaperPosition === 'bottom-right'
                    ? 'flex items-end justify-end p-8'
                    : userSettings.editorWallpaperPosition === 'center'
                    ? 'flex items-center justify-center'
                    : 'block'
                }`}
                style={{
                  opacity: userSettings.editorWallpaperOpacity !== undefined ? userSettings.editorWallpaperOpacity : 0.08,
                  filter: userSettings.editorWallpaperBlur ? `blur(${userSettings.editorWallpaperBlur}px)` : undefined,
                }}
              >
                {userSettings.editorWallpaper === 'matrix-rain' && (
                  <div className="font-mono text-emerald-400 text-[11px] leading-tight whitespace-pre select-none tracking-widest opacity-80 p-4">
                    {`01010100 01111001 01110000 01100101 01010011 01100011 01110010 01101001 01110000 01110100\n01010010 01100101 01100001 01100011 01110100 00100000 01000011 01101111 01100100 01100101\n01000011 01110011 01000011 01101111 01100100 01100101 00100000 01000011 01110010 01101001\n01101101 01110011 01101111 01101110 00100000 01010011 01110100 01110101 01100100 01101001\n01101111 00100000 01010111 01101111 01110010 01101011 01110011 01110000 01100001 01100011`}
                  </div>
                )}
                {userSettings.editorWallpaper === 'cyber-grid' && (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(244, 63, 94, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.25) 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />
                )}
                {userSettings.editorWallpaper === 'dot-matrix' && (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                )}
                {userSettings.editorWallpaper === 'crimson-crest' && (
                  <div className="w-56 h-56 text-rose-500 opacity-60">
                    <CsCodeLogo className="w-full h-full" />
                  </div>
                )}
                {userSettings.editorWallpaper === 'starfield' && (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: 'radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #f43f5e, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, #38bdf8, rgba(0,0,0,0)), radial-gradient(2px 2px at 160px 120px, #fbbf24, rgba(0,0,0,0))',
                      backgroundRepeat: 'repeat',
                      backgroundSize: '200px 200px',
                    }}
                  />
                )}
                {userSettings.editorWallpaper === 'custom' && userSettings.editorWallpaperCustomUrl && (
                  <img
                    src={userSettings.editorWallpaperCustomUrl}
                    alt="Custom Wallpaper"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            )}

            {/* Syntax Highlighted Render Layer */}
            <pre
              ref={codePreRef}
              className={`absolute inset-0 p-2 overflow-hidden pointer-events-none font-mono text-xs select-text ${
                userSettings.wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
              }`}
              style={{ 
                fontSize: `${userSettings.fontSize}px`, 
                lineHeight: '24px',
                fontFamily: userSettings.fontFamily,
                whiteSpace: userSettings.wordWrap ? 'pre-wrap' : 'pre',
                wordBreak: userSettings.wordWrap ? 'break-word' : 'normal',
                overflowWrap: userSettings.wordWrap ? 'break-word' : 'normal',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />

            {/* Transparent Textarea for User Input */}
            <textarea
              ref={textareaRef}
              value={userSettings.codeFolding && hiddenLinesCount > 0 ? visibleContent : fileContent}
              onChange={(e) => handleContentChange(e.target.value)}
              onScroll={handleScroll}
              onClick={handleClick}
              onKeyUp={updateCursorPosition}
              onKeyDown={handleKeyDown}
              onMouseMove={handleMouseMove}
              spellCheck={false}
              className={`absolute inset-0 p-2 w-full h-full bg-transparent text-transparent font-mono text-xs outline-none resize-none z-10 selection:bg-rose-900/40 ${
                userSettings.wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
              }`}
              style={{ 
                fontSize: `${userSettings.fontSize}px`, 
                lineHeight: '24px',
                fontFamily: userSettings.fontFamily,
                caretColor: 'var(--ide-cursor, #f43f5e)',
                whiteSpace: userSettings.wordWrap ? 'pre-wrap' : 'pre',
                wordBreak: userSettings.wordWrap ? 'break-word' : 'normal',
                overflowWrap: userSettings.wordWrap ? 'break-word' : 'normal',
              }}
            />

            {/* Interactive Fold Placeholder Badges for Collapsed Code Blocks */}
            {userSettings.codeFolding &&
              visibleLines.map((vLine, vIdx) => {
                if (!vLine.isCollapsed || !vLine.foldRange) return null;
                return (
                  <button
                    key={vLine.realLineNumber}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFold(vLine.realLineNumber);
                    }}
                    title={`Click to expand lines ${vLine.foldRange.startLine + 1} to ${vLine.foldRange.endLine} (${vLine.foldRange.childLinesCount} lines hidden)`}
                    className="absolute z-20 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-700/90 hover:border-rose-500 text-rose-300 hover:text-white text-[10px] font-mono shadow-md cursor-pointer transition-all duration-150 select-none animate-fadeIn"
                    style={{
                      top: `${vIdx * 24 + 10}px`,
                      left: `${Math.min(vLine.text.length * 8 + 36, 560)}px`,
                    }}
                  >
                    <FontAwesomeIcon icon={ICONS.chevronRight} className="text-[8px] text-rose-400" />
                    <span className="font-bold text-rose-300">⋯</span>
                    <span className="text-[10px] font-semibold text-rose-200">
                      {vLine.foldRange.childLinesCount} {vLine.foldRange.childLinesCount === 1 ? 'line' : 'lines'}
                    </span>
                    {vLine.foldRange.previewText && (
                      <span className="text-[9px] text-slate-400 font-normal truncate max-w-[150px] opacity-80 hidden sm:inline">
                        {vLine.foldRange.previewText}
                      </span>
                    )}
                  </button>
                );
              })}

            {/* Go-To-Definition Hover Tooltip */}
            {hoveredSymbol && hoverCoords && (
              <div
                className="absolute z-40 p-2.5 rounded-lg bg-[#11131c] border border-rose-700/80 shadow-2xl text-xs font-mono space-y-1 max-w-[340px]"
                style={{ top: `${hoverCoords.top}px`, left: `${hoverCoords.left}px` }}
              >
                <div className="flex items-center space-x-1.5 text-rose-300 font-bold">
                  <FontAwesomeIcon icon={ICONS.target} />
                  <span>{hoveredSymbol.kind} {hoveredSymbol.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {hoveredSymbol.filePath}:{hoveredSymbol.line}
                </div>
                <div className="text-[11px] text-slate-200 bg-[#090a10] p-1.5 rounded border border-[#23263a] whitespace-pre overflow-x-auto">
                  {hoveredSymbol.signature}
                </div>
                <div className="text-[10px] text-rose-400 font-semibold pt-0.5">
                  Click or press F12 to jump to definition
                </div>
              </div>
            )}

            {/* GitLens Active Line Blame Annotation */}
            {isGitLensEnabled && userSettings.showGitBlame && (
              <div 
                className="absolute right-4 pointer-events-none text-slate-400 font-mono text-[11px] italic flex items-center space-x-1.5 z-20"
                style={{ top: `${(currentLine - 1) * 24 + 10}px` }}
              >
                <FontAwesomeIcon icon={ICONS.gitAlt} className="text-rose-500/70" />
                <span className="truncate max-w-[280px]">
                  Khurram • 2h ago • feat: implement crimson high-contrast theme
                </span>
              </div>
            )}

            {/* Code Lens References Layer */}
            {userSettings.codeLens !== false && codeLenses.length > 0 && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden z-20"
                style={{
                  transform: `translate3d(-${editorScroll.scrollLeft || 0}px, -${editorScroll.scrollTop || 0}px, 0)`,
                }}
              >
                {codeLenses.map((lens) => {
                  const vIdx = visibleLines.findIndex((v) => v.realLineNumber === lens.line);
                  if (vIdx === -1) return null;

                  const lineText = visibleLines[vIdx]?.text || '';
                  const leadingSpaces = lineText.match(/^\s*/)?.[0]?.length || 0;
                  const indentPx = 8 + leadingSpaces * 7.5;
                  const lineTop = vIdx * 24 + 8;
                  const badgeTop = Math.max(2, lineTop - 18);

                  return (
                    <div
                      key={lens.id}
                      className="absolute pointer-events-auto flex items-center select-none"
                      style={{
                        top: `${badgeTop}px`,
                        left: `${Math.max(8, indentPx)}px`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePeekLens(lens);
                        }}
                        title={`${lens.referenceCount} ${
                          lens.referenceCount === 1 ? 'reference' : 'references'
                        } for ${lens.symbolName} across workspace. Click to peek references.`}
                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-[#121422]/95 hover:bg-rose-950/90 text-slate-400 hover:text-rose-200 border border-[#272a3e] hover:border-rose-600/80 shadow-sm cursor-pointer transition-all duration-150 group backdrop-blur-[2px]"
                      >
                        <FontAwesomeIcon
                          icon={ICONS.references}
                          className="text-[9px] text-rose-400/80 group-hover:text-rose-300"
                        />
                        <span className="font-semibold text-slate-300 group-hover:text-rose-200">
                          {lens.referenceCount}{' '}
                          {lens.referenceCount === 1 ? 'reference' : 'references'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* References Peek View Widget */}
            {activePeekLens && (
              <div
                className="absolute z-50 inset-x-4 top-8 flex justify-center pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <ReferencesPeekWidget
                  lens={activePeekLens}
                  activeFileId={activeFile?.id || ''}
                  onClose={() => setActivePeekLens(null)}
                  onNavigateToReference={(fileId, line, col) => {
                    if (fileId === activeFile?.id) {
                      handleMinimapScrollLine(line);
                      if (textareaRef.current) {
                        let charIdx = 0;
                        for (let i = 0; i < line - 1 && i < linesArray.length; i++) {
                          charIdx += linesArray[i].length + 1;
                        }
                        charIdx += Math.max(0, col - 1);
                        try {
                          textareaRef.current.selectionStart = charIdx;
                          textareaRef.current.selectionEnd = charIdx;
                          textareaRef.current.focus();
                        } catch {
                          // ignore
                        }
                      }
                    } else {
                      onOpenFile?.(fileId, line, col, paneId);
                    }
                    setActivePeekLens(null);
                  }}
                />
              </div>
            )}
          </div>

          {/* Code Minimap Rendered on Right */}
          {userSettings.minimap && minimapPosition === 'right' && (
            <CodeMinimap
              lines={userSettings.codeFolding && hiddenLinesCount > 0 ? visibleLines.map((v) => v.text) : linesArray}
              fileContent={userSettings.codeFolding && hiddenLinesCount > 0 ? visibleContent : fileContent}
              language={activeFile?.language || 'typescript'}
              currentLine={currentLine}
              diagnostics={activeDiagnostics}
              searchMatches={activeFileSearchMatches}
              searchQuery={effectiveSearchQuery}
              scaleFactor={userSettings.minimapScale || 1.0}
              onUpdateScale={(scale) => onUpdateSettings?.({ minimapScale: scale })}
              scrollTop={editorScroll.scrollTop}
              scrollHeight={editorScroll.scrollHeight}
              clientHeight={editorScroll.clientHeight}
              onScrollTo={handleMinimapScrollTo}
              onScrollLine={handleMinimapScrollLine}
              crimsonShade={userSettings.crimsonShade}
            />
          )}

          {/* Side-by-side Markdown Preview when split mode is active */}
          {(activeFile.language === 'markdown' || activeFile.name.endsWith('.md')) && markdownMode === 'split' && (
            <MarkdownPreview
              content={fileContent}
              fileName={activeFile.name}
              onClose={() => setMarkdownMode('edit')}
              className="w-1/2 border-l border-[#242636]"
            />
          )}
        </div>
        )
      ) : files.length === 0 ? (
        /* Empty Workspace Banner */
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#26131d] to-[#12131c] border border-rose-900/60 flex items-center justify-center text-rose-500 text-3xl shadow-xl">
            <FontAwesomeIcon icon={ICONS.folderOpen} />
          </div>
          <div className="text-center max-w-sm">
            <h3 className="text-base font-semibold text-slate-200">Empty Workspace</h3>
            <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed">
              Your workspace has no active files. Start clean by creating a new file or scaffolding from templates.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {onCreateNewFile && (
              <button
                onClick={onCreateNewFile}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1.5 cursor-pointer shadow-md transition-colors"
              >
                <FontAwesomeIcon icon={ICONS.plus} className="text-[10px]" />
                <span>New File</span>
              </button>
            )}
            {onOpenTemplatePicker && (
              <button
                onClick={onOpenTemplatePicker}
                className="px-3.5 py-1.5 rounded-lg bg-[#181a28] hover:bg-rose-950 border border-[#2b2d42] hover:border-rose-700 text-rose-300 font-medium text-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <FontAwesomeIcon icon={ICONS.cubes} className="text-[10px]" />
                <span>From Template...</span>
              </button>
            )}
          </div>

          {/* Quick Pre-made Structure Starters */}
          <div className="pt-3 border-t border-[#1c1e2e] text-center max-w-md w-full">
            <div className="text-[11px] font-mono text-slate-400 mb-2">
              Or start with a pre-made structure:
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { label: 'React Component (.tsx)', file: 'Component.tsx' },
                { label: 'TypeScript Module (.ts)', file: 'service.ts' },
                { label: 'Python Script (.py)', file: 'main.py' },
                { label: 'HTML5 Page (.html)', file: 'index.html' },
                { label: 'Modern CSS (.css)', file: 'styles.css' },
                { label: 'Markdown Doc (.md)', file: 'README.md' },
                { label: 'JSON Config (.json)', file: 'config.json' },
              ].map((item) => (
                <button
                  key={item.file}
                  type="button"
                  onClick={() => {
                    if (onCreateFileWithStructure) {
                      onCreateFileWithStructure(item.file);
                    } else if (onCreateNewFile) {
                      onCreateNewFile();
                    }
                  }}
                  className="px-2 py-1 rounded-md bg-[#141523] hover:bg-rose-950/80 border border-[#24273c] hover:border-rose-700 text-slate-300 hover:text-rose-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* No File Open Banner */
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1d2c]/80 to-[#12131c] border border-rose-950/60 flex items-center justify-center shadow-xl shadow-rose-950/20">
            <CsCodeLogo size={56} withGlow alt="CsCode Crimson Code" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-300">No File Open</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Select a file from Explorer, press Ctrl+P for Quick Open, or scaffold from a template
            </p>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            {onQuickOpen && (
              <button
                onClick={onQuickOpen}
                className="px-3 py-1.5 rounded-lg bg-[#171928] hover:bg-[#202236] border border-[#27293e] text-slate-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Quick Open <kbd className="ml-1 text-[10px] text-rose-400">Ctrl+P</kbd>
              </button>
            )}
            {onCreateNewFile && (
              <button
                onClick={onCreateNewFile}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                + New File
              </button>
            )}
            {onOpenTemplatePicker && (
              <button
                onClick={onOpenTemplatePicker}
                className="px-3 py-1.5 rounded-lg bg-[#181a28] hover:bg-rose-950 border border-[#27293e] text-rose-300 text-xs font-mono transition-colors cursor-pointer"
              >
                From Template...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
