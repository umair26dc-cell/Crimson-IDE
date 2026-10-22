/**
 * GitHub Integration & Remote Repository Synchronization Modal
 * Allows connecting via OAuth, selecting remote repos, browsing repository file structures,
 * previewing code, cloning repositories, and pushing/pulling branches.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import {
  GitHubService,
  GitHubUser,
  GitHubRepo,
  GitHubOrg,
  RemoteSyncLog,
  RemoteTreeItem,
  RemoteTreeNode,
  PushResult,
  PullResult,
} from '../lib/githubService';
import { FileItem, LanguageId } from '../types';

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBranch: string;
  files: FileItem[];
  onRemotePushSuccess?: (result: PushResult) => void;
  onRemotePullSuccess?: (result: PullResult) => void;
  onImportFiles?: (importedFiles: FileItem[], mode: 'merge' | 'replace', targetFolder?: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({
  isOpen,
  onClose,
  activeBranch,
  files,
  onRemotePushSuccess,
  onRemotePullSuccess,
  onImportFiles,
}) => {
  const [authStatus, setAuthStatus] = useState(() => GitHubService.getAuthStatus());
  const [activeModalTab, setActiveModalTab] = useState<'files' | 'sync' | 'repos'>('files');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [orgs, setOrgs] = useState<GitHubOrg[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [patTokenInput, setPatTokenInput] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // New Repo Creation form
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  // Push commit message
  const [pushCommitMessage, setPushCommitMessage] = useState(`Update ${activeBranch} from Crimson IDE`);
  const [syncLogs, setSyncLogs] = useState<RemoteSyncLog[]>([]);

  // Remote Repository File Browser State
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranch || 'main');
  const [branchesList, setBranchesList] = useState<string[]>(['main']);
  const [rawTreeItems, setRawTreeItems] = useState<RemoteTreeItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeFilterQuery, setTreeFilterQuery] = useState('');
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Set<string>>(new Set());

  // File Preview Inspector State
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    content?: string;
    size: number;
    sha?: string;
    isLoading: boolean;
  } | null>(null);

  // Clone & Import State
  const [importDestination, setImportDestination] = useState<'root' | 'folder'>('root');
  const [customFolderName, setCustomFolderName] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  const DEV_CALLBACK_URL =
    'https://ais-dev-f3swznpkapis6d6n3w6lc4-231866656446.asia-southeast1.run.app/auth/github/callback';
  const SHARED_CALLBACK_URL =
    'https://ais-pre-f3swznpkapis6d6n3w6lc4-231866656446.asia-southeast1.run.app/auth/github/callback';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Remote Repository File Tree
  const loadRemoteTree = useCallback(
    async (repoFullName: string, branchName: string) => {
      if (!repoFullName) return;
      setIsLoadingTree(true);
      setErrorMessage(null);
      try {
        const tree = await GitHubService.fetchRepoTree(repoFullName, branchName);
        setRawTreeItems(tree);

        // Pre-select all blob (file) paths by default for quick 1-click clone
        const allFilePaths = new Set(tree.filter((t) => t.type === 'blob').map((t) => t.path));
        setSelectedFilePaths(allFilePaths);

        // Pre-expand top-level folders
        const topFolders = new Set<string>();
        for (const item of tree) {
          if (item.type === 'tree') {
            const parts = item.path.split('/');
            if (parts.length <= 2) {
              topFolders.add(item.path);
            }
          }
        }
        setExpandedFolderPaths(topFolders);

        // Pre-select first interesting file for preview (README or index/App)
        const candidate =
          tree.find((t) => t.type === 'blob' && (t.name.includes('App') || t.name.includes('README'))) ||
          tree.find((t) => t.type === 'blob');

        if (candidate) {
          handleSelectPreview(candidate.path, candidate.name, candidate.size, candidate.sha);
        }
      } catch (err: any) {
        console.error('Failed loading remote repository tree:', err);
        setErrorMessage(err.message || 'Failed to fetch remote repository file structure.');
      } finally {
        setIsLoadingTree(false);
      }
    },
    []
  );

  // Load Branches for Repository
  const loadBranches = useCallback(
    async (repoFullName: string) => {
      if (!repoFullName) return;
      try {
        const branches = await GitHubService.fetchBranches(repoFullName);
        setBranchesList(branches);
        const bestBranch = branches.includes(activeBranch) ? activeBranch : branches[0] || 'main';
        setSelectedBranch(bestBranch);
        loadRemoteTree(repoFullName, bestBranch);
      } catch (err) {
        console.warn('Failed loading branches:', err);
        loadRemoteTree(repoFullName, 'main');
      }
    },
    [activeBranch, loadRemoteTree]
  );

  // Load Repositories, Organizations, and current tree on modal open
  const loadOrgs = useCallback(async () => {
    setIsLoadingOrgs(true);
    try {
      const orgList = await GitHubService.fetchOrgs();
      setOrgs(orgList);
      return orgList;
    } catch (err: any) {
      console.warn('Failed to fetch GitHub organizations:', err);
      return [];
    } finally {
      setIsLoadingOrgs(false);
    }
  }, []);

  const loadRepos = useCallback(async (targetOrg?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const orgToFetch = targetOrg !== undefined ? targetOrg : selectedOrg;
      const repoList = await GitHubService.fetchRepos(orgToFetch || undefined);
      setRepos(repoList);
      return repoList;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch repositories from GitHub');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrg]);

  const handleSelectOrg = async (orgLogin: string) => {
    setSelectedOrg(orgLogin);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const repoList = await GitHubService.fetchRepos(orgLogin || undefined);
      setRepos(repoList);
      const orgMeta = orgs.find((o) => o.login === orgLogin);
      const label = orgLogin ? (orgMeta?.name ? `${orgMeta.name} (@${orgLogin})` : `@${orgLogin}`) : 'Personal Repositories';
      showToast(`Switched to organization ${label} (${repoList.length} ${repoList.length === 1 ? 'repository' : 'repositories'})`);

      if (repoList.length > 0) {
        const matchingCurrent = repoList.find((r) => r.full_name === authStatus.connectedRepo);
        if (!matchingCurrent) {
          handleSelectRepo(repoList[0].full_name);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to fetch repositories for organization ${orgLogin}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const status = GitHubService.getAuthStatus();
      setAuthStatus(status);
      setSyncLogs(GitHubService.getSyncLogs());
      setPushCommitMessage(`Update ${activeBranch} from Crimson IDE`);

      if (status.isAuthenticated) {
        loadOrgs();
        loadRepos();
        if (status.connectedRepo) {
          const parts = status.connectedRepo.split('/');
          if (parts.length > 1 && parts[0] !== status.user?.login) {
            setSelectedOrg(parts[0]);
          }
          const repoShortName = status.connectedRepo.split('/')[1] || status.connectedRepo;
          setCustomFolderName(repoShortName);
          loadBranches(status.connectedRepo);
        }
      }
    }
  }, [isOpen, activeBranch, loadBranches, loadOrgs, loadRepos]);

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await GitHubService.connectViaOAuth();
      const newStatus = GitHubService.getAuthStatus();
      setAuthStatus(newStatus);
      showToast(`Connected as @${result.user.login}!`);
      loadOrgs();
      loadRepos();
      if (newStatus.connectedRepo) {
        loadBranches(newStatus.connectedRepo);
      }
      setActiveModalTab('files');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed connecting to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patTokenInput.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await GitHubService.connectViaToken(patTokenInput.trim());
      const newStatus = GitHubService.getAuthStatus();
      setAuthStatus(newStatus);
      showToast(`Connected as @${result.user.login}!`);
      setPatTokenInput('');
      setShowPatInput(false);
      loadOrgs();
      loadRepos();
      if (newStatus.connectedRepo) {
        loadBranches(newStatus.connectedRepo);
      }
      setActiveModalTab('files');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify token with GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatedConnect = async () => {
    setIsLoading(true);
    try {
      const result = await GitHubService.connectSimulated();
      const newStatus = GitHubService.getAuthStatus();
      setAuthStatus(newStatus);
      showToast(`Connected sandbox as @${result.user.login}!`);
      loadOrgs();
      loadRepos();
      if (newStatus.connectedRepo) {
        loadBranches(newStatus.connectedRepo);
      }
      setActiveModalTab('files');
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    GitHubService.disconnect();
    setAuthStatus(GitHubService.getAuthStatus());
    setRepos([]);
    setRawTreeItems([]);
    setPreviewFile(null);
    showToast('Disconnected from GitHub.');
  };

  const handleSelectRepo = (repoFullName: string) => {
    GitHubService.setConnectedRepo(repoFullName);
    const updated = GitHubService.getAuthStatus();
    setAuthStatus(updated);
    const repoShortName = repoFullName.split('/')[1] || repoFullName;
    setCustomFolderName(repoShortName);
    loadBranches(repoFullName);
    showToast(`Switched remote to ${repoFullName}`);
  };

  const handleSelectBranch = (branch: string) => {
    setSelectedBranch(branch);
    if (authStatus.connectedRepo) {
      loadRemoteTree(authStatus.connectedRepo, branch);
    }
  };

  const handleCreateNewRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const created = await GitHubService.createRepo(
        newRepoName.trim(),
        'Created from Crimson IDE',
        newRepoPrivate
      );
      setRepos((prev) => [created, ...prev]);
      handleSelectRepo(created.full_name);
      setIsCreatingRepo(false);
      setNewRepoName('');
      showToast(`Repository '${created.full_name}' created and connected!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed creating new repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    if (!authStatus.connectedRepo) return;
    setIsPushing(true);
    setErrorMessage(null);
    try {
      const result = await GitHubService.pushBranch(
        authStatus.connectedRepo,
        activeBranch,
        pushCommitMessage,
        files
      );
      setSyncLogs(GitHubService.getSyncLogs());
      showToast(`Pushed to origin/${activeBranch} (${result.shortSha})!`);
      onRemotePushSuccess?.(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (!authStatus.connectedRepo) return;
    setIsPulling(true);
    setErrorMessage(null);
    try {
      const result = await GitHubService.pullBranch(authStatus.connectedRepo, activeBranch);
      setSyncLogs(GitHubService.getSyncLogs());
      showToast(`Pulled latest updates from origin/${activeBranch}!`);
      onRemotePullSuccess?.(result);
      // Reload remote tree to show pulled updates
      loadRemoteTree(authStatus.connectedRepo, selectedBranch);
    } catch (err: any) {
      setErrorMessage(err.message || 'Pull failed');
    } finally {
      setIsPulling(false);
    }
  };

  // Preview File Content Inspector
  const handleSelectPreview = async (
    path: string,
    name: string,
    size: number,
    sha?: string
  ) => {
    setPreviewFile({
      path,
      name,
      size,
      sha,
      isLoading: true,
    });

    try {
      const content = await GitHubService.fetchFileContent(
        authStatus.connectedRepo,
        path,
        selectedBranch
      );
      setPreviewFile({
        path,
        name,
        content,
        size: content.length,
        sha,
        isLoading: false,
      });
    } catch (err: any) {
      setPreviewFile((prev) =>
        prev ? { ...prev, content: `// Error loading file: ${err.message}`, isLoading: false } : null
      );
    }
  };

  // Folder Expansion Toggle
  const toggleFolder = (folderPath: string) => {
    setExpandedFolderPaths((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const toggleExpandAll = (expand: boolean) => {
    if (expand) {
      const allFolders = new Set<string>();
      for (const item of rawTreeItems) {
        if (item.type === 'tree') allFolders.add(item.path);
      }
      setExpandedFolderPaths(allFolders);
    } else {
      setExpandedFolderPaths(new Set());
    }
  };

  // File & Folder Checkbox Selection
  const toggleSelectPath = (path: string, isFolder: boolean) => {
    setSelectedFilePaths((prev) => {
      const next = new Set(prev);
      if (!isFolder) {
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
      } else {
        // Find all blob descendants under this folder
        const prefix = `${path}/`;
        const descendantBlobs = rawTreeItems.filter(
          (t) => t.type === 'blob' && (t.path === path || t.path.startsWith(prefix))
        );
        const allSelected = descendantBlobs.every((b) => next.has(b.path));
        for (const b of descendantBlobs) {
          if (allSelected) {
            next.delete(b.path);
          } else {
            next.add(b.path);
          }
        }
      }
      return next;
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (select) {
      const allBlobs = new Set(rawTreeItems.filter((t) => t.type === 'blob').map((t) => t.path));
      setSelectedFilePaths(allBlobs);
    } else {
      setSelectedFilePaths(new Set());
    }
  };

  // Execute Import of Selected Files
  const handleImportSelected = async () => {
    if (selectedFilePaths.size === 0) {
      showToast('Please select at least one file to import.');
      return;
    }

    setIsCloning(true);
    setErrorMessage(null);
    try {
      const targetPaths = Array.from(selectedFilePaths);
      const clonedFiles = await GitHubService.cloneRepository(
        authStatus.connectedRepo,
        selectedBranch,
        targetPaths
      );

      const targetPrefix = importDestination === 'folder' ? customFolderName || 'imported-repo' : '';
      const fileItems = GitHubService.convertRemoteFilesToFileItems(clonedFiles, targetPrefix);

      onImportFiles?.(fileItems, 'merge', targetPrefix);
      showToast(`Successfully imported ${clonedFiles.length} file(s) into workspace!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import selected files.');
    } finally {
      setIsCloning(false);
    }
  };

  // Execute Clone of Entire Repository
  const handleCloneAll = async () => {
    setIsCloning(true);
    setErrorMessage(null);
    try {
      const clonedFiles = await GitHubService.cloneRepository(
        authStatus.connectedRepo,
        selectedBranch
      );

      const targetPrefix = importDestination === 'folder' ? customFolderName || 'imported-repo' : '';
      const fileItems = GitHubService.convertRemoteFilesToFileItems(clonedFiles, targetPrefix);

      onImportFiles?.(fileItems, importDestination === 'root' ? 'replace' : 'merge', targetPrefix);
      showToast(`Successfully cloned entire repository (${clonedFiles.length} files)!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clone repository.');
    } finally {
      setIsCloning(false);
    }
  };

  // Quick import previewed file only
  const handleImportSingleFile = async () => {
    if (!previewFile || !previewFile.content) return;
    setIsCloning(true);
    try {
      const targetPrefix = importDestination === 'folder' ? customFolderName || 'imported-repo' : '';
      const fileItems = GitHubService.convertRemoteFilesToFileItems(
        [{ path: previewFile.path, name: previewFile.name, content: previewFile.content }],
        targetPrefix
      );
      onImportFiles?.(fileItems, 'merge', targetPrefix);
      showToast(`Imported '${previewFile.name}' into workspace!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import file.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Filtered and Hierarchical Tree Computation
  const filteredTreeHierarchy = useMemo(() => {
    let items = rawTreeItems;
    if (treeFilterQuery.trim()) {
      const q = treeFilterQuery.toLowerCase();
      // Keep items matching query, and their ancestor folders
      const matchingPaths = new Set<string>();
      for (const item of items) {
        if (item.path.toLowerCase().includes(q)) {
          matchingPaths.add(item.path);
          const parts = item.path.split('/');
          let acc = '';
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? `${acc}/${parts[i]}` : parts[i];
            matchingPaths.add(acc);
          }
        }
      }
      items = items.filter((item) => matchingPaths.has(item.path));
    }
    return GitHubService.buildRemoteTreeHierarchy(items);
  }, [rawTreeItems, treeFilterQuery]);

  // Statistics for selected files
  const totalFilesCount = useMemo(
    () => rawTreeItems.filter((t) => t.type === 'blob').length,
    [rawTreeItems]
  );

  const selectedBytes = useMemo(() => {
    return rawTreeItems
      .filter((t) => t.type === 'blob' && selectedFilePaths.has(t.path))
      .reduce((sum, t) => sum + (t.size || 0), 0);
  }, [rawTreeItems, selectedFilePaths]);

  // Recursive tree node renderer
  const renderTreeNode = (node: RemoteTreeNode, depth = 0) => {
    const isFolder = node.isFolder;
    const isExpanded = expandedFolderPaths.has(node.path);
    const isSelected = !isFolder ? selectedFilePaths.has(node.path) : false;
    const isPreviewActive = previewFile?.path === node.path;

    // For folder: compute if all, some, or none of its descendant blobs are selected
    let folderAllSelected = false;
    let folderSomeSelected = false;
    let descendantCount = 0;

    if (isFolder) {
      const prefix = `${node.path}/`;
      const descendantBlobs = rawTreeItems.filter(
        (t) => t.type === 'blob' && t.path.startsWith(prefix)
      );
      descendantCount = descendantBlobs.length;
      if (descendantCount > 0) {
        const selectedCount = descendantBlobs.filter((b) => selectedFilePaths.has(b.path)).length;
        folderAllSelected = selectedCount === descendantCount;
        folderSomeSelected = selectedCount > 0 && selectedCount < descendantCount;
      }
    }

    const iconConfig = getFileIconConfig(node.name);

    return (
      <div key={node.id} className="select-none font-mono text-xs">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              handleSelectPreview(node.path, node.name, node.size || 0, node.sha);
            }
          }}
          className={`flex items-center space-x-1.5 py-1 px-1.5 rounded transition-colors group cursor-pointer ${
            isPreviewActive
              ? 'bg-rose-950/70 border border-rose-800/80 text-rose-200'
              : 'hover:bg-white/[0.04] text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {/* Checkbox for selective import */}
          <input
            type="checkbox"
            checked={isFolder ? folderAllSelected : isSelected}
            ref={(input) => {
              if (input && isFolder) {
                input.indeterminate = folderSomeSelected;
              }
            }}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelectPath(node.path, isFolder);
            }}
            className="accent-rose-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
            title={isFolder ? 'Select all files in folder' : 'Select file to import'}
          />

          {/* Folder Caret */}
          {isFolder ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="w-3 text-center text-slate-400 hover:text-slate-200 text-[10px]"
            >
              <FontAwesomeIcon icon={isExpanded ? ICONS.chevronDown : ICONS.chevronRight} />
            </span>
          ) : (
            <span className="w-3" />
          )}

          {/* Icon */}
          <span className="shrink-0 text-xs">
            {isFolder ? (
              <FontAwesomeIcon
                icon={isExpanded ? ICONS.folderOpen : ICONS.folder}
                className={isExpanded ? 'text-amber-400' : 'text-amber-500/80'}
              />
            ) : (
              <FontAwesomeIcon icon={iconConfig.icon} className={iconConfig.color} />
            )}
          </span>

          {/* Label & Size */}
          <span className="truncate flex-1 text-[11px] font-mono leading-none">
            {node.name}
          </span>

          {isFolder ? (
            <span className="text-[10px] text-slate-500 font-sans px-1 shrink-0">
              {descendantCount}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              {formatBytes(node.size)}
            </span>
          )}
        </div>

        {/* Children Render */}
        {isFolder && isExpanded && node.children && (
          <div className="border-l border-white/[0.04] ml-2">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn font-mono">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-rose-900/60 bg-[#0d0e17] text-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f2132] bg-[#11121d] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
              <FontAwesomeIcon icon={ICONS.github} className="text-base" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100 text-sm">GitHub Remote & Clone Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-300">
                  Remote Git Provider
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Browse remote repositories, clone files into your workspace, and push/pull branches.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Navigation Tabs (when connected) */}
        {authStatus.isAuthenticated && (
          <div className="flex items-center border-b border-[#1b1c2b] bg-[#0f101a] px-4 shrink-0 text-xs">
            <button
              onClick={() => setActiveModalTab('files')}
              className={`py-2.5 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                activeModalTab === 'files'
                  ? 'border-rose-500 text-rose-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[11px]" />
              <span>Browse & Clone / Import</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300">
                {rawTreeItems.filter((t) => t.type === 'blob').length}
              </span>
            </button>

            <button
              onClick={() => setActiveModalTab('sync')}
              className={`py-2.5 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                activeModalTab === 'sync'
                  ? 'border-rose-500 text-rose-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.sync} className="text-[11px]" />
              <span>Push / Pull Sync</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1c1e2e] text-slate-300">
                {activeBranch}
              </span>
            </button>

            <button
              onClick={() => setActiveModalTab('repos')}
              className={`py-2.5 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                activeModalTab === 'repos'
                  ? 'border-rose-500 text-rose-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={ICONS.github} className="text-[11px]" />
              <span>Repositories & Account</span>
            </button>

            <div className="ml-auto flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>@{authStatus.user?.login}</span>
              </span>
            </div>
          </div>
        )}

        {/* Toast / Error alerts */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between animate-fadeIn shrink-0">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 ml-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>
        )}

        {toastMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={ICONS.check} />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 ml-2 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB: NOT AUTHENTICATED */}
          {!authStatus.isAuthenticated ? (
            <div className="p-6 rounded-xl border border-[#222436] bg-[#10111d] space-y-5">
              <div className="text-center max-w-md mx-auto space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto text-2xl">
                  <FontAwesomeIcon icon={ICONS.github} />
                </div>
                <h3 className="text-base font-bold text-slate-100">Connect to GitHub</h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Authenticate your GitHub account to browse repository files, clone projects directly into your local workspace, and synchronize commits.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="max-w-sm mx-auto space-y-2.5 pt-2">
                <button
                  onClick={handleOAuthConnect}
                  disabled={isLoading}
                  id="btn-oauth-popup-connect"
                  className="w-full py-2.5 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  <FontAwesomeIcon icon={isLoading ? ICONS.syncSpin : ICONS.github} className={isLoading ? 'animate-spin' : ''} />
                  <span>Connect with GitHub (OAuth)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowPatInput((prev) => !prev)}
                    className="py-2 px-3 rounded-lg bg-[#161826] hover:bg-[#1f2236] text-slate-300 border border-[#272a3e] font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.key} className="text-slate-400 text-[10px]" />
                    <span>Personal Token</span>
                  </button>

                  <button
                    onClick={handleSimulatedConnect}
                    disabled={isLoading}
                    className="py-2 px-3 rounded-lg bg-[#161826] hover:bg-emerald-950 text-emerald-300 border border-emerald-900/60 font-mono text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={ICONS.check} className="text-[10px]" />
                    <span>Test Sandbox</span>
                  </button>
                </div>
              </div>

              {/* PAT Token Form */}
              {showPatInput && (
                <form
                  onSubmit={handleConnectToken}
                  className="max-w-md mx-auto p-3.5 rounded-lg border border-[#282a40] bg-[#0c0d16] space-y-2.5 animate-fadeIn"
                >
                  <div className="text-xs font-semibold text-slate-200">Personal Access Token (PAT)</div>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx..."
                    value={patTokenInput}
                    onChange={(e) => setPatTokenInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#141524] border border-[#272a40] rounded text-slate-200 text-xs font-mono outline-none focus:border-rose-500"
                    required
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPatInput(false)}
                      className="px-2.5 py-1 rounded bg-[#1c1d2e] text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !patTokenInput.trim()}
                      className="px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
                    >
                      Verify Token
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : activeModalTab === 'files' ? (
            /* TAB 1: BROWSE REMOTE REPOSITORY FILES & CLONE/IMPORT (THE STAR FEATURE) */
            <div className="space-y-3">
              {/* Remote Repo & Branch Control Bar */}
              <div className="p-3 rounded-xl border border-[#232538] bg-[#11121e] flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Organization Selector */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-slate-400 shrink-0 font-semibold text-[11px]">Org / Account:</span>
                  <select
                    id="github-org-select-files-tab"
                    value={selectedOrg}
                    onChange={(e) => handleSelectOrg(e.target.value)}
                    className="bg-[#090a10] border border-[#282b40] rounded px-2 py-1.5 text-xs text-rose-300 font-semibold outline-none focus:border-rose-500 max-w-[200px] cursor-pointer"
                    title="Switch between authorized GitHub organizations"
                  >
                    <option value="">Personal (@{authStatus.user?.login || 'developer'})</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.login}>
                        {o.name || o.login} (@{o.login})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Repo Dropdown */}
                <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
                  <span className="text-slate-400 shrink-0 font-semibold">Repository:</span>
                  <select
                    value={authStatus.connectedRepo}
                    onChange={(e) => handleSelectRepo(e.target.value)}
                    className="flex-1 bg-[#090a10] border border-[#282b40] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.full_name}>
                        {r.full_name} {r.private ? '(private)' : ''}
                      </option>
                    ))}
                    {repos.length === 0 && (
                      <option value={authStatus.connectedRepo}>{authStatus.connectedRepo}</option>
                    )}
                  </select>

                  <a
                    href={`https://github.com/${authStatus.connectedRepo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-[#181926] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#27293d] transition-colors cursor-pointer"
                    title="Open on GitHub"
                  >
                    <FontAwesomeIcon icon={ICONS.external} className="text-xs" />
                  </a>
                </div>

                {/* Branch Dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 shrink-0 font-semibold">Branch:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => handleSelectBranch(e.target.value)}
                    className="bg-[#090a10] border border-[#282b40] rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500"
                  >
                    {branchesList.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => loadRemoteTree(authStatus.connectedRepo, selectedBranch)}
                    disabled={isLoadingTree}
                    className="p-1.5 rounded bg-[#181926] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#27293d] transition-colors cursor-pointer"
                    title="Reload Remote File Structure"
                  >
                    <FontAwesomeIcon icon={ICONS.sync} className={isLoadingTree ? 'animate-spin text-rose-400' : ''} />
                  </button>
                </div>
              </div>

              {/* Toolbar: Filter Search & Selection Actions */}
              <div className="flex items-center justify-between gap-3 bg-[#0c0d16] p-2.5 rounded-lg border border-[#1e2030] text-xs">
                {/* Search Box */}
                <div className="relative flex-1 max-w-xs">
                  <FontAwesomeIcon
                    icon={ICONS.search}
                    className="absolute left-2.5 top-2.5 text-slate-500 text-[10px]"
                  />
                  <input
                    type="text"
                    placeholder="Filter files (e.g. .tsx, App, components)..."
                    value={treeFilterQuery}
                    onChange={(e) => setTreeFilterQuery(e.target.value)}
                    className="w-full pl-7 pr-7 py-1 bg-[#131422] border border-[#222538] rounded text-slate-200 text-xs outline-none focus:border-rose-500 font-mono"
                  />
                  {treeFilterQuery && (
                    <button
                      onClick={() => setTreeFilterQuery('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 text-[10px]"
                    >
                      <FontAwesomeIcon icon={ICONS.close} />
                    </button>
                  )}
                </div>

                {/* Selection Badges & Actions */}
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">
                    <strong className="text-rose-400">{selectedFilePaths.size}</strong> of{' '}
                    {totalFilesCount} files ({formatBytes(selectedBytes)})
                  </span>

                  <button
                    onClick={() => toggleSelectAll(selectedFilePaths.size !== totalFilesCount)}
                    className="px-2 py-0.8 rounded bg-[#181926] hover:bg-[#222436] border border-[#27293d] text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    {selectedFilePaths.size === totalFilesCount ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    onClick={() => toggleExpandAll(true)}
                    className="px-2 py-0.8 rounded bg-[#181926] hover:bg-[#222436] border border-[#27293d] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Expand all folders"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={() => toggleExpandAll(false)}
                    className="px-2 py-0.8 rounded bg-[#181926] hover:bg-[#222436] border border-[#27293d] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Collapse all folders"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Dual-Pane View: Interactive Tree on Left, File Inspector on Right */}
              <div className="grid grid-cols-12 gap-3 h-[380px]">
                {/* Left Pane: Interactive Tree View */}
                <div className="col-span-6 rounded-xl border border-[#222538] bg-[#0c0d16] p-2 overflow-y-auto">
                  {isLoadingTree ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-500">
                      <FontAwesomeIcon icon={ICONS.sync} className="text-lg animate-spin text-rose-500" />
                      <span className="text-xs">Fetching repository file tree...</span>
                    </div>
                  ) : filteredTreeHierarchy.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-500">
                      <FontAwesomeIcon icon={ICONS.folder} className="text-2xl text-slate-600" />
                      <span className="text-xs">
                        {treeFilterQuery ? 'No files match your search filter.' : 'Repository appears empty.'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredTreeHierarchy.map((node) => renderTreeNode(node))}
                    </div>
                  )}
                </div>

                {/* Right Pane: File Preview & Inspector */}
                <div className="col-span-6 rounded-xl border border-[#222538] bg-[#0b0c14] flex flex-col overflow-hidden">
                  {previewFile ? (
                    <>
                      {/* Preview Header */}
                      <div className="p-2.5 border-b border-[#1b1c2b] bg-[#11121d] flex items-center justify-between gap-2 shrink-0">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-bold text-slate-100 text-xs truncate">
                              {previewFile.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-900/60 text-rose-300 uppercase">
                              {previewFile.name.split('.').pop() || 'file'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {previewFile.path} &bull; {formatBytes(previewFile.size)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          {previewFile.content && (
                            <button
                              onClick={() => handleCopy(previewFile.content || '', previewFile.name)}
                              className="p-1 px-2 rounded bg-[#181926] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#27293d] text-[10px] transition-colors cursor-pointer"
                              title="Copy code to clipboard"
                            >
                              <FontAwesomeIcon icon={ICONS.copy} className="mr-1" />
                              Copy
                            </button>
                          )}

                          <button
                            onClick={handleImportSingleFile}
                            disabled={isCloning || !previewFile.content}
                            className="p-1 px-2.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                            title="Import this single file into workspace"
                          >
                            <FontAwesomeIcon icon={ICONS.download} className="mr-1" />
                            Import File
                          </button>
                        </div>
                      </div>

                      {/* Preview Code Viewport */}
                      <div className="flex-1 p-3 overflow-auto font-mono text-[11px] leading-relaxed bg-[#06070a] text-slate-300">
                        {previewFile.isLoading ? (
                          <div className="h-full flex items-center justify-center space-x-2 text-slate-500">
                            <FontAwesomeIcon icon={ICONS.sync} className="animate-spin text-rose-500" />
                            <span>Loading file preview...</span>
                          </div>
                        ) : (
                          <pre className="whitespace-pre overflow-x-auto selection:bg-rose-900 selection:text-white">
                            {previewFile.content || '// Empty file'}
                          </pre>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
                      <div className="w-12 h-12 rounded-xl bg-[#141522] border border-[#232538] flex items-center justify-center text-slate-400 text-xl">
                        <FontAwesomeIcon icon={ICONS.fileCode} />
                      </div>
                      <div className="text-xs font-semibold text-slate-300">File Preview Inspector</div>
                      <p className="text-[11px] text-slate-500 font-sans max-w-xs">
                        Click on any file in the repository tree to inspect its contents, examine code structure, or import it individually.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Footer for Import & Clone */}
              <div className="p-3.5 rounded-xl border border-rose-950/80 bg-gradient-to-r from-rose-950/30 to-[#121320] flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Destination configuration */}
                <div className="flex items-center space-x-3 text-slate-300">
                  <span className="font-semibold text-rose-300 text-xs">Target Destination:</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importDest"
                      checked={importDestination === 'root'}
                      onChange={() => setImportDestination('root')}
                      className="accent-rose-500"
                    />
                    <span>Workspace Root (<code className="text-slate-300">/</code>)</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importDest"
                      checked={importDestination === 'folder'}
                      onChange={() => setImportDestination('folder')}
                      className="accent-rose-500"
                    />
                    <span>Subfolder (<code className="text-slate-300">/{customFolderName || 'repo'}</code>)</span>
                  </label>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={handleCloneAll}
                    disabled={isCloning || rawTreeItems.length === 0}
                    className="py-2 px-3.5 rounded-lg bg-[#181a28] hover:bg-[#25283c] text-slate-200 border border-[#30334c] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={isCloning ? ICONS.syncSpin : ICONS.cloudDown} className={isCloning ? 'animate-spin' : ''} />
                    <span>Clone Entire Repo ({totalFilesCount} files)</span>
                  </button>

                  <button
                    onClick={handleImportSelected}
                    disabled={isCloning || selectedFilePaths.size === 0}
                    id="btn-import-selected-remote-files"
                    className="py-2 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-950/50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={isCloning ? ICONS.syncSpin : ICONS.download} className={isCloning ? 'animate-spin' : ''} />
                    <span>Import Selected ({selectedFilePaths.size} files)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeModalTab === 'sync' ? (
            /* TAB 2: PUSH & PULL REMOTE BRANCH ACTIONS */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#232538] bg-[#121320] space-y-3 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-[#202234]">
                  <div>
                    <span className="font-semibold text-slate-200 text-xs">
                      Remote Branch Sync (Push & Pull)
                    </span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Sync active local branch <strong className="text-rose-400">{activeBranch}</strong> with{' '}
                      <code className="text-slate-300">origin/{activeBranch}</code> on GitHub.
                    </p>
                  </div>
                </div>

                {/* Commit message for push */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Push Commit Message / Note:</label>
                  <input
                    type="text"
                    value={pushCommitMessage}
                    onChange={(e) => setPushCommitMessage(e.target.value)}
                    placeholder="Commit message for remote push..."
                    className="w-full px-2.5 py-1.5 bg-[#090a10] border border-[#282b40] rounded text-xs text-slate-200 outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                {/* Push & Pull Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handlePush}
                    disabled={isPushing || isPulling}
                    id="btn-github-push-branch"
                    className="py-2.5 px-4 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-rose-950/40"
                  >
                    <FontAwesomeIcon icon={isPushing ? ICONS.syncSpin : ICONS.cloudUp} className={isPushing ? 'animate-spin' : ''} />
                    <span>{isPushing ? `Pushing to origin/${activeBranch}...` : `Push to origin/${activeBranch}`}</span>
                  </button>

                  <button
                    onClick={handlePull}
                    disabled={isPushing || isPulling}
                    id="btn-github-pull-branch"
                    className="py-2.5 px-4 rounded-lg bg-[#1a1c2b] hover:bg-[#25283c] disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold border border-[#30334c] flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <FontAwesomeIcon icon={isPulling ? ICONS.syncSpin : ICONS.cloudDown} className={isPulling ? 'animate-spin' : ''} />
                    <span>{isPulling ? `Pulling from origin/${activeBranch}...` : `Pull from origin/${activeBranch}`}</span>
                  </button>
                </div>
              </div>

              {/* Sync History Logs */}
              {syncLogs.length > 0 && (
                <div className="space-y-1.5 font-mono text-xs">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    Recent Remote Operations
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {syncLogs.map((log) => (
                      <div
                        key={log.id}
                        className="px-2.5 py-1.5 rounded bg-[#10111a] border border-[#1e202e] flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              log.type === 'push'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {log.type}
                          </span>
                          <span className="text-slate-300 truncate max-w-[240px]">
                            {log.branch} &bull; {log.message}
                          </span>
                          {log.sha && (
                            <span className="text-slate-500 font-mono text-[10px]">({log.sha})</span>
                          )}
                        </div>
                        <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 3: REPOSITORIES & ACCOUNT SETTINGS */
            <div className="space-y-4">
              {/* Account Profile Card */}
              <div className="p-3.5 rounded-xl border border-[#25283c] bg-[#121320] flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  {authStatus.user?.avatar_url ? (
                    <img
                      src={authStatus.user.avatar_url}
                      alt={authStatus.user?.login || 'User'}
                      className="w-10 h-10 rounded-full border-2 border-rose-500/80 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-rose-500/80 bg-[#1e2030] flex items-center justify-center text-rose-400">
                      <FontAwesomeIcon icon={ICONS.github} className="text-xl" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        {authStatus.user?.name || authStatus.user?.login}
                      </span>
                      <span className="text-slate-400 font-mono text-xs">
                        @{authStatus.user?.login}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                        Connected
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                      Authenticated with repo and user permissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      loadOrgs();
                      loadRepos();
                    }}
                    className="p-1.5 rounded hover:bg-[#1f2134] text-slate-400 hover:text-slate-200 transition-colors"
                    title="Refresh Repositories"
                  >
                    <FontAwesomeIcon icon={ICONS.sync} className={isLoading || isLoadingOrgs ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 font-mono text-[11px] transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Authorized Organizations & Repositories Browser */}
              <div id="github-organizations-section" className="p-4 rounded-xl border border-[#232538] bg-[#121320] space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#202234]">
                  <div>
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={ICONS.server} className="text-rose-400 text-xs" />
                      <span className="font-semibold text-slate-100 text-xs">
                        Authorized Organizations ({orgs.length})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Fetch and switch between all remote repositories across your authorized GitHub organizations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      loadOrgs();
                      loadRepos();
                      showToast('Refreshed organizations and repositories!');
                    }}
                    disabled={isLoadingOrgs || isLoading}
                    className="p-1.5 px-2.5 rounded bg-[#181a28] hover:bg-[#23253a] border border-[#2a2d42] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center space-x-1.5 self-start sm:self-auto"
                    title="Refresh Organizations"
                  >
                    <FontAwesomeIcon icon={ICONS.sync} className={isLoadingOrgs ? 'animate-spin text-rose-400' : ''} />
                    <span className="text-[10px]">Refresh</span>
                  </button>
                </div>

                {/* Organization Selection Tabs / Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-select-org-personal"
                    onClick={() => handleSelectOrg('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center space-x-2 ${
                      selectedOrg === ''
                        ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold shadow-sm ring-1 ring-rose-500/30'
                        : 'bg-[#181a28] text-slate-400 hover:text-slate-200 border border-[#282b40]'
                    }`}
                  >
                    <FontAwesomeIcon icon={ICONS.github} className="text-xs" />
                    <span>Personal (@{authStatus.user?.login || 'developer'})</span>
                  </button>

                  {orgs.map((org) => {
                    const isSelected = selectedOrg === org.login;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        id={`btn-select-org-${org.login}`}
                        onClick={() => handleSelectOrg(org.login)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center space-x-2 ${
                          isSelected
                            ? 'bg-rose-950 text-rose-300 border border-rose-700 font-bold shadow-sm ring-1 ring-rose-500/30'
                            : 'bg-[#181a28] text-slate-400 hover:text-slate-200 border border-[#282b40]'
                        }`}
                      >
                        {org.avatar_url ? (
                          <img src={org.avatar_url} alt={org.login} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={ICONS.server} className="text-xs text-rose-400" />
                        )}
                        <span>{org.name || org.login}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b0c14] text-slate-400 font-bold">
                          {org.reposCount !== undefined ? org.reposCount : 'org'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Organization Info Banner */}
                {selectedOrg ? (
                  (() => {
                    const activeOrgData = orgs.find((o) => o.login === selectedOrg);
                    return (
                      <div className="p-3 rounded-lg bg-[#0a0b12] border border-[#222538] flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-3">
                          {activeOrgData?.avatar_url && (
                            <img
                              src={activeOrgData.avatar_url}
                              alt={activeOrgData.login}
                              className="w-8 h-8 rounded-full border border-rose-600/70 object-cover"
                            />
                          )}
                          <div>
                            <div className="font-bold text-slate-100 flex items-center space-x-2">
                              <span>{activeOrgData?.name || activeOrgData?.login}</span>
                              <span className="text-[10px] text-rose-400">@{activeOrgData?.login}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                Organization
                              </span>
                            </div>
                            {activeOrgData?.description && (
                              <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">
                                {activeOrgData.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <a
                          href={`https://github.com/${selectedOrg}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-[#161726] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#26283c] text-[10px] flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          <FontAwesomeIcon icon={ICONS.external} />
                          <span>View on GitHub</span>
                        </a>
                      </div>
                    );
                  })()
                ) : null}

                {/* Repositories in this Organization */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>
                      {selectedOrg ? `Repositories in @${selectedOrg}` : 'Personal Repositories'} ({repos.length})
                    </span>
                    {isLoading && (
                      <span className="flex items-center space-x-1 text-rose-400">
                        <FontAwesomeIcon icon={ICONS.sync} className="animate-spin text-[10px]" />
                        <span>Fetching repositories...</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {repos.map((r) => {
                      const isConnected = authStatus.connectedRepo === r.full_name;
                      return (
                        <div
                          key={r.id}
                          className={`p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between gap-3 ${
                            isConnected
                              ? 'bg-rose-950/30 border-rose-700/80 ring-1 ring-rose-500/30'
                              : 'bg-[#0d0e17] border-[#1f2132] hover:border-[#32364c]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <FontAwesomeIcon icon={ICONS.git} className="text-rose-400 text-xs shrink-0" />
                              <span className="font-bold text-slate-100 truncate">{r.full_name}</span>
                              {r.private ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold shrink-0">
                                  Private
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold shrink-0">
                                  Public
                                </span>
                              )}
                              {isConnected && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold shrink-0">
                                  Active Remote
                                </span>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                                {r.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-1">
                              <span>Default: <code className="text-slate-400">{r.default_branch || 'main'}</code></span>
                              {r.updated_at && (
                                <span>Updated {new Date(r.updated_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectRepo(r.full_name);
                                setActiveModalTab('files');
                              }}
                              className="px-2.5 py-1 rounded bg-[#181a28] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#2c2f44] hover:border-rose-800 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[10px]" />
                              <span>Browse Files</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectRepo(r.full_name)}
                              disabled={isConnected}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                isConnected
                                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60 cursor-default'
                                  : 'bg-rose-700 hover:bg-rose-600 text-white'
                              }`}
                            >
                              {isConnected ? 'Connected' : 'Switch Remote'}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {repos.length === 0 && !isLoading && (
                      <div className="p-4 rounded-lg bg-[#0b0c14] border border-[#1e2030] text-center text-xs text-slate-500">
                        No repositories found in this organization.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Create new repo form */}
              <div className="p-4 rounded-xl border border-[#232538] bg-[#121320] space-y-3 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-[#202234]">
                  <div>
                    <span className="font-semibold text-slate-200 text-xs">Create New GitHub Repository</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Provision a new remote repo directly from Crimson IDE.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateNewRepo} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Repository name (e.g. crimson-app)"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#090a10] border border-[#282b40] rounded text-slate-200 text-xs outline-none focus:border-rose-500 font-mono"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-1.5 text-slate-400 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newRepoPrivate}
                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                        className="accent-rose-500"
                      />
                      <span>Private Repository</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isLoading || !newRepoName.trim()}
                      className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold"
                    >
                      Create & Connect
                    </button>
                  </div>
                </form>
              </div>

              {/* OAuth Setup Guide Accordion */}
              <div className="border border-[#1e2030] rounded-xl p-3 bg-[#0d0e17]">
                <button
                  onClick={() => setShowSetupGuide((prev) => !prev)}
                  className="w-full text-left text-xs font-mono text-slate-300 hover:text-rose-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-semibold">OAuth App Configuration & Callback URLs</span>
                  <FontAwesomeIcon icon={showSetupGuide ? ICONS.chevronDown : ICONS.chevronRight} />
                </button>

                {showSetupGuide && (
                  <div className="mt-3 p-3 rounded-lg bg-[#07080d] border border-[#1b1d2c] space-y-2 text-[11px] font-mono text-slate-300 animate-fadeIn">
                    <div>
                      <div className="text-slate-500 mb-0.5">Development Callback URL:</div>
                      <div className="flex items-center justify-between p-1.5 bg-[#11121d] rounded border border-[#222436] text-[10px] text-rose-300">
                        <span className="truncate">{DEV_CALLBACK_URL}</span>
                        <button
                          onClick={() => handleCopy(DEV_CALLBACK_URL, 'Development Callback URL')}
                          className="ml-2 px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 shrink-0 cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 mb-0.5">Shared App Callback URL:</div>
                      <div className="flex items-center justify-between p-1.5 bg-[#11121d] rounded border border-[#222436] text-[10px] text-rose-300">
                        <span className="truncate">{SHARED_CALLBACK_URL}</span>
                        <button
                          onClick={() => handleCopy(SHARED_CALLBACK_URL, 'Shared Callback URL')}
                          className="ml-2 px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 shrink-0 cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
