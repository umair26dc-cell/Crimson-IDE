/**
 * Core type definitions for CsCode Crimson Code
 */

export type LanguageId = 
  | 'typescript' 
  | 'javascript' 
  | 'python' 
  | 'rust' 
  | 'go' 
  | 'html' 
  | 'css' 
  | 'json' 
  | 'markdown' 
  | 'shell' 
  | 'cpp' 
  | 'sql' 
  | 'yaml'
  | 'plaintext';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  content?: string;
  originalContent?: string; // Baseline / committed content for Git diff comparison
  language?: LanguageId;
  children?: FileItem[];
  isOpen?: boolean;
  isRootFolder?: boolean; // True if this folder is a distinct root in a multi-root workspace
  rootFolderId?: string; // ID of the root folder this item belongs to
  lastModified?: number; // Timestamp of when the file was last modified/changed
}

export interface ExternalFileModification {
  fileId: string;
  filePath: string;
  fileName: string;
  timestamp: number;
  timeFormatted: string;
  origin?: string; // e.g. "External Compiler", "Build Tool", "Git Pull", "External Process"
  summary?: string;
  previousContent?: string;
  newContent?: string;
}

export interface EditorTab {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  language: LanguageId;
  isDirty?: boolean;
}

export interface NavigationHistoryEntry {
  fileId: string;
  fileName: string;
  filePath: string;
  line?: number;
  col?: number;
  timestamp?: number;
}

export type SplitDirection = 'none' | 'vertical' | 'horizontal';

export interface EditorPaneState {
  id: string;
  tabs: EditorTab[];
  activeTabId: string | null;
  cursorLine: number;
  cursorCol: number;
  scrollPosition: number;
  navigationHistory?: NavigationHistoryEntry[];
  navigationIndex?: number;
}

export type ActiveSidebarTab = 
  | 'explorer' 
  | 'search' 
  | 'git' 
  | 'github'
  | 'plugins' 
  | 'marketplace'
  | 'cloud-sync' 
  | 'settings';

export type BottomPanelTab = 
  | 'terminal' 
  | 'problems' 
  | 'output' 
  | 'testing'
  | 'cloud-logs';

export type TestCaseStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestCaseResult {
  id: string;
  name: string;
  suiteName: string;
  filePath: string;
  status: TestCaseStatus;
  durationMs?: number;
  errorMessage?: string;
  expected?: string;
  received?: string;
  line?: number;
}

export interface TestSuiteResult {
  id: string;
  name: string;
  filePath: string;
  fileId: string;
  tests: TestCaseResult[];
  status: TestCaseStatus;
  durationMs?: number;
}

export interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  lastRunTimestamp?: number;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success';
  text: string;
  timestamp: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  shell: string;
  lines: TerminalLine[];
  cwd: string;
}

export type TerminalSplitMode = 'none' | 'side-by-side' | 'stacked';

export interface TerminalBookmark {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: number;
}

export interface Diagnostic {
  id: string;
  filePath: string;
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
}

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon?: any;
  action: () => void;
}

export interface SearchMatch {
  fileId: string;
  filePath: string;
  fileName: string;
  line: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
  col?: number;
  matchText?: string;
  score?: number; // Relevance score from 0 to 100
}

export interface SearchOptions {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  preserveCase?: boolean;
  includePattern?: string;
  excludePattern?: string;
  fileType?: string; // Restrict search to specific file type e.g. '.ts', '.py', '.css', 'all'
  sortBy?: 'relevance' | 'date' | 'name' | 'count'; // Sort order for search results
}

export type SearchHistorySortMode = 'recent' | 'alphabetical' | 'frequency';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  matchCount?: number;
  options?: Partial<SearchOptions>;
  isPinned?: boolean;
  useCount?: number; // Frequency of use / search count
}

export interface PluginConfigField {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  value: any;
  options?: string[];
}

export type SymbolKind = 
  | 'function' 
  | 'class' 
  | 'interface' 
  | 'type' 
  | 'variable' 
  | 'method' 
  | 'enum' 
  | 'struct'
  | 'module';

export interface CodeSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  filePath: string;
  fileId: string;
  line: number;
  col: number;
  signature: string;
  preview: string;
  docstring?: string;
}

export interface CodeReference {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  line: number;
  col: number;
  lineText: string;
  preview?: string;
  isDefinition?: boolean;
}

export interface CodeLensItem {
  id: string;
  symbolId: string;
  symbolName: string;
  symbolKind: SymbolKind;
  line: number;
  col: number;
  fileId: string;
  referenceCount: number;
  references: CodeReference[];
}

export interface IndexStats {
  totalFiles: number;
  totalLines: number;
  totalSymbols: number;
  indexDurationMs: number;
  memoryEstimateMb: number;
  isIndexing: boolean;
  lastIndexedAt?: string;
}

export type PluginCategory = 
  | 'Language Support' 
  | 'Linters' 
  | 'Debuggers' 
  | 'UI Enhancements' 
  | 'AI Tools' 
  | 'Themes' 
  | 'Keymaps' 
  | 'Formatters' 
  | 'Tools' 
  | 'Productivity';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PluginCategory;
  icon: string; // FontAwesome icon identifier
  enabled: boolean;
  installed: boolean;
  downloads: string;
  rating: number;
  config?: PluginConfigField[];
  permissions?: string[];
  readme?: string;
  changelog?: string;
  installedVersion?: string;
  latestVersion?: string;
  isBuiltin?: boolean;
  hooks?: {
    onLanguageRegister?: string[];
    onLintRun?: string[];
    onDebuggerInit?: string[];
    onUITheme?: string;
  };
}

export interface PluginPackageDraft {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PluginCategory;
  permissions: string[];
  entryCode: string;
  icon: string;
}

export interface ThemeColors {
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentBorder: string;
  bgApp: string;
  bgSidebar: string;
  bgActivityBar: string;
  bgEditor: string;
  bgGutter: string;
  bgPanel: string;
  bgStatusBar: string;
  fgPrimary: string;
  fgMuted: string;
  border: string;
  cursor: string;
  selection: string;
  // Syntax highlighting tokens
  keyword: string;
  function: string;
  string: string;
  number: string;
  comment: string;
  type: string;
  variable: string;
}

export type ThemeCategory = 'Crimson' | 'Dark' | 'Neon' | 'Modern' | 'Custom';

export interface ThemeDefinition {
  id: string;
  name: string;
  category: ThemeCategory;
  author: string;
  description: string;
  downloads?: string;
  rating?: number;
  tags: string[];
  colors: ThemeColors;
  isCustom?: boolean;
}

export interface IdeLayoutConfig {
  activityBarPosition: 'left' | 'right' | 'hidden';
  sidebarPosition: 'left' | 'right';
  bottomPanelPosition: 'bottom' | 'right' | 'left';
  statusBarPosition: 'bottom' | 'top';
  minimapPosition: 'left' | 'right';
  isEditLayoutMode?: boolean;
  sidebarWidth?: number;
  bottomPanelHeight?: number;
}

export type LayoutConfig = IdeLayoutConfig;

export interface LayoutPreset {
  id: string;
  name: string;
  description?: string;
  isBuiltIn?: boolean;
  layout: IdeLayoutConfig;
}

export type CursorStyle = 'line' | 'block' | 'underline' | 'smooth';
export type CursorBlinking = 'blink' | 'smooth' | 'solid' | 'phase';
export type ActiveLineHighlight = 'background' | 'border' | 'line' | 'none';
export type RenderWhitespace = 'none' | 'boundary' | 'all' | 'trailing';
export type IndentGuides = 'none' | 'subtle' | 'accent' | 'rainbow';
export type UiDensity = 'compact' | 'standard' | 'spacious';
export type UiBorderRadius = 'sharp' | 'classic' | 'rounded';
export type UiContrastMode = 'obsidian' | 'pure-black' | 'deep-navy' | 'slate-dark' | 'crimson-obsidian';
export type GlassmorphismLevel = 'off' | 'subtle' | 'medium' | 'heavy';
export type TabSizing = 'auto' | 'fit' | 'fixed';
export type TabCloseButton = 'right' | 'left' | 'hover' | 'hidden';
export type TabDirtyStyle = 'dot' | 'asterisk' | 'bar' | 'badge';
export type TerminalCursorStyle = 'block' | 'line' | 'underline';
export type TypingSoundpack = 'none' | 'cherry-blue' | 'alpaca-thock' | 'typewriter' | 'hacker-beep' | 'bubble-pop';
export type EditorWallpaper = 'none' | 'matrix-rain' | 'cyber-grid' | 'dot-matrix' | 'starfield' | 'crimson-crest' | 'custom';
export type TabStyle = 'default' | 'pill' | 'underline' | 'trapezoid' | 'minimal';
export type StatusBarStyle = 'default' | 'translucent' | 'accent' | 'minimal';

export interface CustomCodeSnippet {
  id: string;
  name: string;
  prefix: string;
  body: string;
  language: LanguageId | 'all';
  description?: string;
}

export interface UserSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  minimapScale: number;
  lineNumbers: boolean;
  breadcrumbs?: boolean;
  breadcrumbSeparatorStyle?: 'chevron' | 'double-chevron' | 'slash' | 'arrow' | 'dot' | 'diamond';
  codeFolding: boolean;
  codeLens?: boolean;
  autoSave: boolean;
  autoSaveDelayMs: number;
  crimsonShade: 'classic' | 'ruby' | 'neon' | 'garnet';
  themeId?: string;
  activeThemeId?: string;
  customThemes?: ThemeDefinition[];
  layoutConfig?: IdeLayoutConfig;
  savedLayoutPresets?: LayoutPreset[];
  activeLayoutPresetId?: string;
  vimMode: boolean;
  formatOnSave: boolean;
  showGitBlame: boolean;
  syncEnabled: boolean;
  syncIntervalSec: number;
  deviceNickname: string;

  // Advanced Editor Customization
  cursorStyle?: CursorStyle;
  cursorBlinking?: CursorBlinking;
  fontLigatures?: boolean;
  lineHeight?: number; // 1.2 to 2.4, default 1.6
  letterSpacing?: number; // -1 to 2, default 0
  fontWeight?: '300' | '400' | '500' | '600' | '700';
  activeLineHighlight?: ActiveLineHighlight;
  bracketPairColorization?: boolean;
  renderWhitespace?: RenderWhitespace;
  indentGuides?: IndentGuides;
  relativeLineNumbers?: boolean;
  scrollBeyondLastLine?: boolean;
  smoothScrolling?: boolean;

  // Advanced UI & Theme Customization
  customAccentColor?: string; // Hex color code
  uiDensity?: UiDensity;
  uiBorderRadius?: UiBorderRadius;
  uiContrastMode?: UiContrastMode;
  glassmorphism?: GlassmorphismLevel;
  tabSizing?: TabSizing;
  tabCloseButton?: TabCloseButton;
  showTabIcons?: boolean;
  tabDirtyStyle?: TabDirtyStyle;
  showBreadcrumbIcons?: boolean;

  // Status Bar Customization
  statusBarShowBranch?: boolean;
  statusBarShowLineCol?: boolean;
  statusBarShowEncoding?: boolean;
  statusBarShowLanguage?: boolean;
  statusBarShowDiagnostics?: boolean;
  statusBarShowClock?: boolean;

  // Terminal Independent Color & Font Customization
  terminalTheme?: string; // Preset name like 'Crimson Night', 'Cyberpunk', 'Monokai'
  terminalThemeId?: string; // Preset id like 'crimson-night', 'cyberpunk', 'monokai'
  terminalBackground?: string;
  terminalForeground?: string;
  terminalCursorColor?: string;
  terminalPromptColor?: string;
  terminalFontSize?: number;
  terminalFontFamily?: string;
  terminalCursorStyle?: TerminalCursorStyle;
  terminalLineHeight?: number;
  terminalOpacity?: number;
  terminalPersistHistory?: boolean; // Enable or disable command persistence across sessions in local storage
  linkTerminalToCrimsonTheme?: boolean; // Link terminal color palette to active IDE crimson theme

  // Custom CSS Injection
  customCssEnabled?: boolean;
  customCssCode?: string;

  // Typing Audio / MechVibes Engine
  typingSoundpack?: TypingSoundpack;
  typingSoundVolume?: number; // 0 to 1
  typingSoundPitchVariation?: boolean;

  // Editor Wallpaper / Atmosphere
  editorWallpaper?: EditorWallpaper;
  editorWallpaperCustomUrl?: string;
  editorWallpaperOpacity?: number; // 0.01 to 0.4
  editorWallpaperBlur?: number; // 0 to 10
  editorWallpaperPosition?: 'center' | 'bottom-right' | 'stretch' | 'tile';

  // Column Rulers
  editorRulers?: number[]; // e.g. [80, 120]
  editorRulerStyle?: 'solid' | 'dashed' | 'dotted';
  editorRulerColor?: string;

  // Tab & Status Bar Extensions
  tabStyle?: TabStyle;
  tabHeightMode?: 'compact' | 'standard' | 'spacious';
  statusBarShowWordCount?: boolean;
  statusBarShowIndent?: boolean;
  statusBarStyle?: StatusBarStyle;

  // Custom User Snippets & Keybindings
  customSnippets?: CustomCodeSnippet[];
  customKeybindings?: Record<string, string>;

  // Dual Tone Gradient Accent
  secondaryAccentColor?: string;
  accentGradientEnabled?: boolean;

  // ESLint / Linter Workspace Configuration
  eslintEnabled?: boolean;
  eslintRules?: Record<string, EslintRuleSeverity>;
  eslintCustomRules?: CustomEslintRule[];
  eslintIgnorePatterns?: string[];
}

export type EslintRuleSeverity = 'off' | 'warn' | 'error';

export interface CustomEslintRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  message: string;
  severity: 'warning' | 'error';
  isRegex?: boolean;
  extensions?: string[];
  enabled?: boolean;
}

export interface StandardEslintRuleDef {
  name: string;
  category: 'Variables' | 'Best Practices' | 'Style' | 'TypeScript';
  description: string;
  defaultSeverity: EslintRuleSeverity;
}

export interface SyncDevice {
  id: string;
  name: string;
  platform: string;
  lastActive: string;
  ipMasked: string;
  isCurrent: boolean;
}

export interface CloudSnapshot {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  summary: string;
  settings: UserSettings;
  installedPluginIds: string[];
}

export interface CloudSyncState {
  isConfigured: boolean;
  pairingCode: string;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage: string | null;
  connectedDevices: SyncDevice[];
  history: CloudSnapshot[];
}
