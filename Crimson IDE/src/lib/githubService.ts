/**
 * GitHub Provider & Remote Git Sync Service for CsCode Crimson IDE
 * Implements popup-based OAuth authentication, personal access tokens,
 * repository management, and remote branch push & pull.
 */

import { FileItem, LanguageId } from '../types';

export function getLanguageFromFileName(filename: string): LanguageId {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'cpp':
    case 'cc':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export interface RemoteTreeItem {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  size: number;
  sha: string;
}

export interface RemoteTreeNode {
  id: string;
  path: string;
  name: string;
  isFolder: boolean;
  size?: number;
  sha?: string;
  children?: RemoteTreeNode[];
}

export interface GitHubUser {
  login: string;
  name: string;
  email?: string;
  avatar_url: string;
  html_url: string;
  public_repos?: number;
}

export interface GitHubOrg {
  id: number;
  login: string;
  name?: string;
  avatar_url?: string;
  description?: string;
  reposCount?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  updated_at?: string;
  private?: boolean;
  html_url: string;
  description?: string;
  owner?: {
    login: string;
    type?: string;
    avatar_url?: string;
  };
}

export interface PushResult {
  success: boolean;
  branch: string;
  commitSha: string;
  shortSha: string;
  commitMessage: string;
  filesPushed: number;
  htmlUrl?: string;
  timestamp: string;
}

export interface PullResult {
  success: boolean;
  branch: string;
  commitSha: string;
  shortSha: string;
  commitMessage: string;
  author?: string;
  filesUpdated: number;
  timestamp: string;
}

const GITHUB_TOKEN_KEY = 'crimson_github_token';
const GITHUB_USER_KEY = 'crimson_github_user';
const GITHUB_REPO_KEY = 'crimson_github_connected_repo';
const GITHUB_SYNC_HISTORY_KEY = 'crimson_github_sync_history';

export interface RemoteSyncLog {
  id: string;
  type: 'push' | 'pull' | 'auth';
  branch: string;
  repo: string;
  message: string;
  timestamp: string;
  sha?: string;
}

export class GitHubService {
  private static token: string | null = null;
  private static user: GitHubUser | null = null;
  private static connectedRepo: string | null = null;

  public static init(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      this.token = localStorage.getItem(GITHUB_TOKEN_KEY);
      const rawUser = localStorage.getItem(GITHUB_USER_KEY);
      if (rawUser) {
        this.user = JSON.parse(rawUser);
      }
      this.connectedRepo = localStorage.getItem(GITHUB_REPO_KEY) || '';
    } catch (e) {
      console.error('Failed to load GitHub auth from storage:', e);
    }
  }

  public static getAuthStatus(): {
    isAuthenticated: boolean;
    token: string | null;
    user: GitHubUser | null;
    connectedRepo: string;
  } {
    if (!this.token) {
      this.init();
    }
    return {
      isAuthenticated: Boolean(this.token && this.user),
      token: this.token,
      user: this.user,
      connectedRepo: this.connectedRepo || '',
    };
  }

  public static saveAuth(token: string, user: GitHubUser, repo?: string): void {
    this.token = token;
    this.user = user;
    if (repo) this.connectedRepo = repo;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      localStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
      if (repo) localStorage.setItem(GITHUB_REPO_KEY, repo);
    }
  }

  public static setConnectedRepo(repoFullName: string): void {
    this.connectedRepo = repoFullName;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GITHUB_REPO_KEY, repoFullName);
    }
  }

  public static disconnect(): void {
    this.token = null;
    this.user = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      localStorage.removeItem(GITHUB_USER_KEY);
    }
  }

  /**
   * Fetches OAuth authorization URL and opens popup directly to GitHub
   */
  public static async connectViaOAuth(): Promise<{ token: string; user: GitHubUser }> {
    // 1. Fetch OAuth URL from server
    const res = await fetch('/api/auth/github/url');
    if (!res.ok) {
      throw new Error('Failed to retrieve GitHub OAuth authorization URL from server.');
    }
    const data = await res.json();

    // If OAuth app client ID is configured on server, open provider URL directly
    if (data.isConfigured && data.url) {
      return new Promise((resolve, reject) => {
        const width = 600;
        const height = 720;
        const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

        const authWindow = window.open(
          data.url,
          'github_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
        );

        if (!authWindow) {
          reject(new Error('Popup blocked! Please allow popups for this site to complete GitHub OAuth sign-in.'));
          return;
        }

        let isResolved = false;

        const messageHandler = (event: MessageEvent) => {
          // Verify message is from OAuth callback
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
            isResolved = true;
            window.removeEventListener('message', messageHandler);
            const token = event.data.token;
            const user = event.data.user || {
              login: 'developer',
              name: 'Developer',
              avatar_url: '',
              html_url: '',
            };
            GitHubService.saveAuth(token, user);
            resolve({ token, user });
          } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
            isResolved = true;
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error || 'GitHub authorization failed'));
          }
        };

        window.addEventListener('message', messageHandler);

        // Check if user manually closed popup without finishing
        const checkClosedInterval = setInterval(() => {
          if (authWindow.closed && !isResolved) {
            clearInterval(checkClosedInterval);
            window.removeEventListener('message', messageHandler);
            reject(new Error('GitHub authorization window was closed before completing.'));
          }
        }, 1000);
      });
    }

    // If no client ID configured in env yet, use simulated developer OAuth session
    return this.connectSimulated();
  }

  /**
   * Connect with a Personal Access Token (PAT)
   */
  public static async connectViaToken(token: string): Promise<{ token: string; user: GitHubUser }> {
    const res = await fetch('/api/github/connect-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || 'Failed to authenticate token with GitHub.');
    }

    const data = await res.json();
    this.saveAuth(data.token, data.user);
    return data;
  }

  /**
   * 1-Click Simulated OAuth for immediate sandbox testing
   */
  public static async connectSimulated(): Promise<{ token: string; user: GitHubUser }> {
    const res = await fetch('/api/github/simulate-oauth', { method: 'POST' });
    const data = await res.json();
    this.saveAuth(data.token, data.user);
    return data;
  }

  /**
   * Fetch repositories (for user or specific organization)
   */
  public static async fetchRepos(org?: string): Promise<GitHubRepo[]> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const url = org ? `/api/github/repos?org=${encodeURIComponent(org)}` : '/api/github/repos';
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.repos || [];
  }

  /**
   * Fetch authorized organizations for the authenticated user
   */
  public static async fetchOrgs(): Promise<GitHubOrg[]> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch('/api/github/orgs', { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.orgs || [];
  }

  /**
   * Create a new remote repository
   */
  public static async createRepo(name: string, description?: string, isPrivate = false): Promise<GitHubRepo> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch('/api/github/create-repo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description, isPrivate }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create repository on GitHub');
    }
    return data.repo;
  }

  /**
   * Fetch remote branches for repository
   */
  public static async fetchBranches(repoFullName: string): Promise<string[]> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const url = `/api/github/branches?owner=${encodeURIComponent(owner || 'workspace')}&repo=${encodeURIComponent(repo || 'project')}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return ['main'];
    const data = await res.json();
    return data.branches || ['main'];
  }

  /**
   * Push active branch to GitHub remote
   */
  public static async pushBranch(
    repoFullName: string,
    branch: string,
    commitMessage: string,
    files: FileItem[]
  ): Promise<PushResult> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // Flatten files to send to remote
    const flatFiles: Array<{ path: string; content: string }> = [];
    function extract(nodes: FileItem[]) {
      for (const n of nodes) {
        if (!n.isFolder && n.content !== undefined) {
          flatFiles.push({ path: n.path, content: n.content });
        }
        if (n.children) extract(n.children);
      }
    }
    extract(files);

    const res = await fetch('/api/github/push', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner: owner || 'workspace',
        repo: repo || 'project',
        branch,
        commitMessage,
        files: flatFiles.slice(0, 30),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Push failed' }));
      throw new Error(err.error || 'Failed to push branch to GitHub.');
    }

    const data: PushResult = await res.json();
    this.appendSyncLog({
      id: `push-${Date.now()}`,
      type: 'push',
      branch,
      repo: repoFullName,
      message: commitMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sha: data.shortSha,
    });
    return data;
  }

  /**
   * Pull active branch from GitHub remote
   */
  public static async pullBranch(repoFullName: string, branch: string): Promise<PullResult> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch('/api/github/pull', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner: owner || 'workspace',
        repo: repo || 'project',
        branch,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Pull failed' }));
      throw new Error(err.error || 'Failed to pull branch from GitHub.');
    }

    const data: PullResult = await res.json();
    this.appendSyncLog({
      id: `pull-${Date.now()}`,
      type: 'pull',
      branch,
      repo: repoFullName,
      message: data.commitMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sha: data.shortSha,
    });
    return data;
  }

  /**
   * Fetch recursive file tree for remote repository and branch
   */
  public static async fetchRepoTree(repoFullName: string, branch = 'main'): Promise<RemoteTreeItem[]> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const url = `/api/github/tree?owner=${encodeURIComponent(owner || 'developer')}&repo=${encodeURIComponent(repo || 'workspace')}&branch=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load file tree' }));
      throw new Error(err.error || 'Failed to fetch repository tree.');
    }
    const data = await res.json();
    return data.tree || [];
  }

  /**
   * Fetch specific file content from remote repository
   */
  public static async fetchFileContent(
    repoFullName: string,
    filePath: string,
    branch = 'main'
  ): Promise<string> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const url = `/api/github/file-content?owner=${encodeURIComponent(owner || 'developer')}&repo=${encodeURIComponent(repo || 'workspace')}&path=${encodeURIComponent(filePath)}&ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch file content' }));
      throw new Error(err.error || `Failed to fetch content for ${filePath}.`);
    }
    const data = await res.json();
    return data.content || '';
  }

  /**
   * Clone/download repository files (all or selected paths)
   */
  public static async cloneRepository(
    repoFullName: string,
    branch = 'main',
    selectedPaths?: string[]
  ): Promise<Array<{ path: string; name: string; content: string; size: number }>> {
    const [owner, repo] = repoFullName.split('/');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch('/api/github/clone-repo', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner: owner || 'developer',
        repo: repo || 'workspace',
        branch,
        selectedPaths,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to clone repository' }));
      throw new Error(err.error || 'Failed to clone repository files.');
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Converts a flat array of RemoteTreeItems into a nested tree structure
   */
  public static buildRemoteTreeHierarchy(items: RemoteTreeItem[]): RemoteTreeNode[] {
    const rootNodes: RemoteTreeNode[] = [];
    const nodeMap = new Map<string, RemoteTreeNode>();

    // First pass: create node objects
    for (const item of items) {
      const isFolder = item.type === 'tree';
      const node: RemoteTreeNode = {
        id: `remote-${item.path}`,
        path: item.path,
        name: item.name || item.path.split('/').pop() || item.path,
        isFolder,
        size: item.size,
        sha: item.sha,
        children: isFolder ? [] : undefined,
      };
      nodeMap.set(item.path, node);
    }

    // Second pass: attach children to parents
    for (const item of items) {
      const node = nodeMap.get(item.path)!;
      const lastSlash = item.path.lastIndexOf('/');
      if (lastSlash === -1) {
        rootNodes.push(node);
      } else {
        const parentPath = item.path.substring(0, lastSlash);
        const parentNode = nodeMap.get(parentPath);
        if (parentNode && parentNode.children) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    }

    // Sort folders first, then alphabetically
    function sortNodes(nodes: RemoteTreeNode[]) {
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const n of nodes) {
        if (n.children) sortNodes(n.children);
      }
    }
    sortNodes(rootNodes);

    return rootNodes;
  }

  /**
   * Converts remote files with content into workspace FileItem[] structure
   */
  public static convertRemoteFilesToFileItems(
    remoteFiles: Array<{ path: string; name: string; content: string }>,
    folderPrefix = ''
  ): FileItem[] {
    const rootItems: FileItem[] = [];
    const folderMap = new Map<string, FileItem>();

    const cleanPrefix = folderPrefix.replace(/^\/+|\/+$/g, '');

    for (const file of remoteFiles) {
      const fullPath = cleanPrefix ? `${cleanPrefix}/${file.path}` : file.path;
      const parts = fullPath.split('/');

      // Create intermediate folders if needed
      let currentFolder = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i];
        const nextFolder = currentFolder ? `${currentFolder}/${segment}` : segment;

        if (!folderMap.has(nextFolder)) {
          const folderItem: FileItem = {
            id: `folder-${nextFolder.replace(/[^a-zA-Z0-9_\-]/g, '_')}`,
            name: segment,
            path: nextFolder,
            isFolder: true,
            isOpen: true,
            children: [],
          };
          folderMap.set(nextFolder, folderItem);

          if (currentFolder) {
            const parent = folderMap.get(currentFolder);
            if (parent && parent.children) {
              parent.children.push(folderItem);
            }
          } else {
            rootItems.push(folderItem);
          }
        }
        currentFolder = nextFolder;
      }

      // Create file item
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const language = getLanguageFromFileName(file.name);

      const fileItem: FileItem = {
        id: `file-${fullPath.replace(/[^a-zA-Z0-9_\-]/g, '_')}-${Date.now()}`,
        name: parts[parts.length - 1],
        path: fullPath,
        isFolder: false,
        content: file.content,
        originalContent: file.content,
        language,
        lastModified: Date.now(),
      };

      if (currentFolder) {
        const parent = folderMap.get(currentFolder);
        if (parent && parent.children) {
          parent.children.push(fileItem);
        } else {
          rootItems.push(fileItem);
        }
      } else {
        rootItems.push(fileItem);
      }
    }

    return rootItems;
  }

  public static getSyncLogs(): RemoteSyncLog[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(GITHUB_SYNC_HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private static appendSyncLog(log: RemoteSyncLog): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const current = this.getSyncLogs();
      const updated = [log, ...current].slice(0, 20);
      localStorage.setItem(GITHUB_SYNC_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  }
}
