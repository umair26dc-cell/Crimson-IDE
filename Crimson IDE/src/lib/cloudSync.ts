/**
 * Settings Persistence & Cross-Tab Sync Engine
 * Real, clean local settings synchronization backed by localStorage
 * and real-time BroadcastChannel across browser tabs.
 */

import { CloudSnapshot, CloudSyncState, SyncDevice, UserSettings } from '../types';
import { DEFAULT_ESLINT_RULES, DEFAULT_CUSTOM_RULES, DEFAULT_ESLINT_IGNORE } from './eslintEngine';

const SETTINGS_STORAGE_KEY = 'cscode_ide_user_settings';
const BROADCAST_CHANNEL_NAME = 'cscode_settings_sync_channel';

export const DEFAULT_SETTINGS: UserSettings = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  minimapScale: 1.0,
  lineNumbers: true,
  breadcrumbs: true,
  codeFolding: true,
  codeLens: true,
  autoSave: true,
  autoSaveDelayMs: 30000,
  crimsonShade: 'ruby',
  activeThemeId: 'crimson-ruby',
  layoutConfig: {
    sidebarPosition: 'left',
    activityBarPosition: 'left',
    bottomPanelPosition: 'bottom',
    minimapPosition: 'right',
    statusBarPosition: 'bottom',
    isEditLayoutMode: false,
    sidebarWidth: 260,
    bottomPanelHeight: 220,
  },
  savedLayoutPresets: [],
  activeLayoutPresetId: 'default-view',
  vimMode: false,
  formatOnSave: true,
  showGitBlame: true,
  syncEnabled: true,
  syncIntervalSec: 30,
  deviceNickname: 'CsCode Local',

  // Advanced Editor Customization Defaults
  cursorStyle: 'line',
  cursorBlinking: 'smooth',
  fontLigatures: true,
  lineHeight: 1.6,
  letterSpacing: 0,
  fontWeight: '400',
  activeLineHighlight: 'background',
  bracketPairColorization: true,
  renderWhitespace: 'none',
  indentGuides: 'subtle',
  relativeLineNumbers: false,
  scrollBeyondLastLine: true,
  smoothScrolling: true,

  // Advanced UI & Theme Customization Defaults
  customAccentColor: '#e11d48',
  uiDensity: 'standard',
  uiBorderRadius: 'classic',
  uiContrastMode: 'obsidian',
  glassmorphism: 'subtle',
  tabSizing: 'auto',
  tabCloseButton: 'right',
  showTabIcons: true,
  tabDirtyStyle: 'dot',
  showBreadcrumbIcons: true,

  // Status Bar Customization Defaults
  statusBarShowBranch: true,
  statusBarShowLineCol: true,
  statusBarShowEncoding: true,
  statusBarShowLanguage: true,
  statusBarShowDiagnostics: true,
  statusBarShowClock: true,

  // Terminal Defaults
  terminalTheme: 'Crimson Night',
  terminalThemeId: 'crimson-night',
  terminalBackground: '#090a0f',
  terminalForeground: '#cbd5e1',
  terminalCursorColor: '#f43f5e',
  terminalPromptColor: '#fb7185',
  terminalFontSize: 12,
  terminalFontFamily: "'JetBrains Mono', monospace",
  terminalCursorStyle: 'block',
  terminalLineHeight: 1.4,
  terminalOpacity: 0.95,
  terminalPersistHistory: true,
  linkTerminalToCrimsonTheme: false,
  eslintEnabled: true,
  eslintRules: DEFAULT_ESLINT_RULES,
  eslintCustomRules: DEFAULT_CUSTOM_RULES,
  eslintIgnorePatterns: DEFAULT_ESLINT_IGNORE,
};

export class CloudSyncEngine {
  private channel: BroadcastChannel | null = null;
  private syncState: CloudSyncState;
  private currentDeviceId: string;
  private onStateChangeCallbacks: Set<(state: CloudSyncState) => void> = new Set();
  private onSettingsRemoteUpdate: Set<(settings: UserSettings) => void> = new Set();

  constructor() {
    this.currentDeviceId = this.getOrCreateDeviceId();
    this.syncState = {
      isConfigured: true,
      pairingCode: 'LOCAL',
      lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'synced',
      errorMessage: null,
      connectedDevices: [
        {
          id: this.currentDeviceId,
          name: 'Current Session',
          platform: typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Web',
          lastActive: 'Active',
          ipMasked: 'Local',
          isCurrent: true,
        },
      ],
      history: [],
    };

    this.initBroadcastChannel();
  }

  private getOrCreateDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'cscode_local';
    let id = localStorage.getItem('cscode_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('cscode_device_id', id);
    }
    return id;
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_SYNC_PUSH') {
            const { settings, senderId } = event.data;
            if (senderId !== this.currentDeviceId && settings) {
              this.onSettingsRemoteUpdate.forEach((cb) => cb(settings));
            }
          }
        };
      } catch {
        // Fallback for restricted sandboxes
      }
    }
  }

  public getState(): CloudSyncState {
    return { ...this.syncState };
  }

  public loadLocalSettings(): UserSettings {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem('crimson_ide_user_settings');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  }

  public saveLocalSettings(settings: UserSettings): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'SETTINGS_SYNC_PUSH',
          settings,
          senderId: this.currentDeviceId,
          timestamp: Date.now(),
        });
      } catch {
        // Ignore broadcast errors
      }
    }
    this.syncState.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.notifyState();
  }

  public pushSync(summary: string): void {
    const currentSettings = this.loadLocalSettings();
    this.saveLocalSettings(currentSettings);
  }

  public pairWithDevice(_code: string, _name: string): boolean {
    return true;
  }

  public regeneratePairingCode(): string {
    return 'LOCAL';
  }

  public restoreSnapshot(_id: string): UserSettings | null {
    return this.loadLocalSettings();
  }

  public subscribeState(cb: (state: CloudSyncState) => void): () => void {
    this.onStateChangeCallbacks.add(cb);
    cb(this.getState());
    return () => this.onStateChangeCallbacks.delete(cb);
  }

  public subscribeRemoteSettings(cb: (settings: UserSettings) => void): () => void {
    this.onSettingsRemoteUpdate.add(cb);
    return () => this.onSettingsRemoteUpdate.delete(cb);
  }

  private notifyState(): void {
    const s = this.getState();
    this.onStateChangeCallbacks.forEach((cb) => cb(s));
  }
}

export const cloudSync = new CloudSyncEngine();
