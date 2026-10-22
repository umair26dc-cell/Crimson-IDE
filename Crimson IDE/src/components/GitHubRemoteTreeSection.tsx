/**
 * GitHub Remote Repository File Tree Section
 * Displays and fetches the remote repository file tree structure when a repo is connected.
 * Includes interactive hierarchical folder tree, file type icons, branch switching,
 * real-time search filtering, file content inspection, and workspace import.
 * Zero emojis - 100% FontAwesome icons with Crimson IDE styling.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import {
  GitHubService,
  RemoteTreeItem,
  RemoteTreeNode,
} from '../lib/githubService';
import { FileItem, LanguageId } from '../types';

export interface GitHubRemoteTreeSectionProps {
  isGitHubAuthenticated: boolean;
  connectedGitHubRepo?: string;
  gitBranch?: string;
  onOpenGitHubModal?: () => void;
  onOpenFileContent?: (fileName: string, content: string, language?: LanguageId) => void;
  onImportRemoteFiles?: (files: FileItem[], mode?: 'merge' | 'replace', targetFolder?: string) => void;
  onQuickPush?: () => void;
  onQuickPull?: () => void;
  isPushingRemote?: boolean;
  isPullingRemote?: boolean;
}

export const GitHubRemoteTreeSection: React.FC<GitHubRemoteTreeSectionProps> = ({
  isGitHubAuthenticated,
  connectedGitHubRepo = '',
  gitBranch = 'main',
  onOpenGitHubModal,
  onOpenFileContent,
  onImportRemoteFiles,
  onQuickPush,
  onQuickPull,
  isPushingRemote = false,
  isPullingRemote = false,
}) => {
  // Tree state
  const [treeItems, setTreeItems] = useState<RemoteTreeItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeFilterQuery, setTreeFilterQuery] = useState('');

  // Branch state
  const [selectedBranch, setSelectedBranch] = useState<string>(gitBranch || 'main');
  const [remoteBranches, setRemoteBranches] = useState<string[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Expanded folders set
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Set<string>>(new Set());

  // File preview / inspection state
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    size?: number;
    content?: string;
    isLoading: boolean;
    error?: string;
  } | null>(null);

  // Import / action states
  const [isImporting, setIsImporting] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!actionSuccessToast) return;
    const timer = setTimeout(() => setActionSuccessToast(null), 3500);
    return () => clearTimeout(timer);
  }, [actionSuccessToast]);

  // Sync selectedBranch with gitBranch when repo changes
  useEffect(() => {
    if (gitBranch) {
      setSelectedBranch(gitBranch);
    }
  }, [gitBranch]);

  // Load Remote Branches
  const loadBranches = useCallback(async (repoName: string) => {
    if (!repoName) return;
    setIsLoadingBranches(true);
    try {
      const branches = await GitHubService.fetchBranches(repoName);
      if (branches && branches.length > 0) {
        setRemoteBranches(branches);
        if (!branches.includes(selectedBranch)) {
          setSelectedBranch(branches[0]);
        }
      }
    } catch {
      // Fallback branches
      setRemoteBranches(['main', 'staging', 'dev']);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [selectedBranch]);

  // Load Remote Tree
  const loadRemoteTree = useCallback(
    async (repoName: string, branchName: string) => {
      if (!repoName) return;
      setIsLoadingTree(true);
      setTreeError(null);

      try {
        const items = await GitHubService.fetchRepoTree(repoName, branchName);
        setTreeItems(items);

        // Auto-expand top-level folders
        const topFolders = new Set<string>();
        for (const item of items) {
          if (item.type === 'tree' && !item.path.includes('/')) {
            topFolders.add(item.path);
          }
        }
        setExpandedFolderPaths(topFolders);
      } catch (err: any) {
        console.error('Failed fetching GitHub remote tree:', err);
        setTreeError(err.message || 'Unable to fetch remote repository file tree from GitHub.');
      } finally {
        setIsLoadingTree(false);
      }
    },
    []
  );

  // Fetch when authenticated and connected repo is present
  useEffect(() => {
    if (isGitHubAuthenticated && connectedGitHubRepo) {
      loadBranches(connectedGitHubRepo);
      loadRemoteTree(connectedGitHubRepo, selectedBranch);
    } else {
      setTreeItems([]);
      setTreeError(null);
      setPreviewFile(null);
    }
  }, [isGitHubAuthenticated, connectedGitHubRepo, selectedBranch, loadBranches, loadRemoteTree]);

  // Toggle folder expansion
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

  // Expand / Collapse all folders
  const handleExpandAll = () => {
    const allFolders = new Set<string>();
    for (const item of treeItems) {
      if (item.type === 'tree') {
        allFolders.add(item.path);
      }
    }
    setExpandedFolderPaths(allFolders);
  };

  const handleCollapseAll = () => {
    setExpandedFolderPaths(new Set());
  };

  // Filtered Tree Items & Hierarchy
  const filteredTreeHierarchy = useMemo(() => {
    if (!treeItems || treeItems.length === 0) return [];

    let itemsToBuild = treeItems;
    if (treeFilterQuery.trim()) {
      const q = treeFilterQuery.toLowerCase();
      // Find matching items
      const matchingPaths = new Set<string>();
      for (const item of treeItems) {
        const name = item.name || item.path.split('/').pop() || '';
        if (name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)) {
          matchingPaths.add(item.path);
          // Also include parent paths
          const segments = item.path.split('/');
          let current = '';
          for (let i = 0; i < segments.length - 1; i++) {
            current = current ? `${current}/${segments[i]}` : segments[i];
            matchingPaths.add(current);
          }
        }
      }
      itemsToBuild = treeItems.filter((item) => matchingPaths.has(item.path));
    }

    return GitHubService.buildRemoteTreeHierarchy(itemsToBuild);
  }, [treeItems, treeFilterQuery]);

  // Statistics
  const totalFilesCount = useMemo(() => {
    return treeItems.filter((t) => t.type === 'blob').length;
  }, [treeItems]);

  const totalFoldersCount = useMemo(() => {
    return treeItems.filter((t) => t.type === 'tree').length;
  }, [treeItems]);

  // Handle Inspect / Preview File
  const handleInspectFile = async (node: RemoteTreeNode) => {
    if (node.isFolder || !connectedGitHubRepo) return;

    setPreviewFile({
      path: node.path,
      name: node.name,
      size: node.size,
      isLoading: true,
    });

    try {
      const content = await GitHubService.fetchFileContent(connectedGitHubRepo, node.path, selectedBranch);
      setPreviewFile({
        path: node.path,
        name: node.name,
        size: node.size,
        content,
        isLoading: false,
      });
    } catch (err: any) {
      setPreviewFile({
        path: node.path,
        name: node.name,
        size: node.size,
        isLoading: false,
        error: err.message || 'Failed to fetch remote file content.',
      });
    }
  };

  // Handle Import Single File into Workspace
  const handleImportSingleFile = async (node: RemoteTreeNode) => {
    if (node.isFolder || !connectedGitHubRepo) return;

    try {
      const content = await GitHubService.fetchFileContent(connectedGitHubRepo, node.path, selectedBranch);
      const converted = GitHubService.convertRemoteFilesToFileItems([
        { path: node.path, name: node.name, content },
      ]);

      if (onImportRemoteFiles && converted.length > 0) {
        onImportRemoteFiles(converted, 'merge');
        setActionSuccessToast(`Imported "${node.name}" into workspace!`);
      } else if (onOpenFileContent) {
        onOpenFileContent(node.name, content);
        setActionSuccessToast(`Opened "${node.name}" in editor!`);
      }
    } catch (err: any) {
      console.error('Failed to import file:', err);
      setTreeError(err.message || `Failed to import ${node.name}.`);
    }
  };

  // Handle Clone / Import All Files
  const handleImportAllFiles = async () => {
    if (!connectedGitHubRepo || isImporting) return;

    setIsImporting(true);
    try {
      const files = await GitHubService.cloneRepository(connectedGitHubRepo, selectedBranch);
      const converted = GitHubService.convertRemoteFilesToFileItems(files);

      if (onImportRemoteFiles && converted.length > 0) {
        onImportRemoteFiles(converted, 'merge');
        setActionSuccessToast(`Successfully imported ${files.length} remote file(s) into workspace!`);
      }
    } catch (err: any) {
      console.error('Failed to import remote repository:', err);
      setTreeError(err.message || 'Failed to clone repository files into workspace.');
    } finally {
      setIsImporting(false);
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: RemoteTreeNode, depth = 0) => {
    const isFolder = node.isFolder;
    const isExpanded = expandedFolderPaths.has(node.path);
    const isSelected = previewFile?.path === node.path;
    const { icon: fileIcon, color: fileColor } = getFileIconConfig(node.name);

    return (
      <div key={node.path} className="select-none font-mono text-xs">
        <div
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              handleInspectFile(node);
            }
          }}
          className={`flex items-center justify-between py-1 px-1.5 rounded transition-colors group cursor-pointer ${
            isSelected
              ? 'bg-rose-950/70 text-rose-200 border border-rose-800/80'
              : 'hover:bg-[#151726] text-slate-300'
          }`}
          style={{ paddingLeft: `${Math.max(6, depth * 12 + 6)}px` }}
          title={`${node.path}${node.size ? ` (${formatFileSize(node.size)})` : ''}`}
        >
          {/* Left: icon + label */}
          <div className="flex items-center space-x-1.5 min-w-0 truncate mr-1">
            {isFolder ? (
              <>
                <FontAwesomeIcon
                  icon={isExpanded ? ICONS.chevronDown : ICONS.chevronRight}
                  className="text-[8px] text-slate-500 w-2 shrink-0 transition-transform"
                />
                <FontAwesomeIcon
                  icon={isExpanded ? ICONS.folderOpen : ICONS.folder}
                  className="text-amber-400 text-xs shrink-0"
                />
              </>
            ) : (
              <>
                <span className="w-2 shrink-0" />
                <FontAwesomeIcon icon={fileIcon} className={`${fileColor} text-xs shrink-0`} />
              </>
            )}

            <span
              className={`truncate text-[11px] ${
                isFolder ? 'font-semibold text-slate-200' : 'text-slate-300 group-hover:text-white'
              }`}
            >
              {node.name}
            </span>
          </div>

          {/* Right: size & action buttons */}
          <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100">
            {node.size !== undefined && (
              <span className="text-[9px] text-slate-500 font-normal hidden group-hover:inline-block">
                {formatFileSize(node.size)}
              </span>
            )}

            {isFolder ? (
              node.children && (
                <span className="text-[9px] text-slate-500 px-1 py-0.2 rounded bg-[#10121d]">
                  {node.children.length}
                </span>
              )
            ) : (
              <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Inspect button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInspectFile(node);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-300 rounded hover:bg-[#1e2030] cursor-pointer"
                  title={`Inspect remote ${node.name}`}
                >
                  <FontAwesomeIcon icon={ICONS.eye} className="text-[9px]" />
                </button>

                {/* Import button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportSingleFile(node);
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-300 rounded hover:bg-[#1e2030] cursor-pointer"
                  title={`Import ${node.name} to workspace`}
                >
                  <FontAwesomeIcon icon={ICONS.download} className="text-[9px]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Folder Children */}
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.length === 0 ? (
              <div
                className="py-0.5 text-[10px] text-slate-600 italic"
                style={{ paddingLeft: `${(depth + 1) * 12 + 10}px` }}
              >
                (empty directory)
              </div>
            ) : (
              node.children.map((child) => renderTreeNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  // CASE 1: Disconnected / Not Authenticated State
  if (!isGitHubAuthenticated || !connectedGitHubRepo) {
    return (
      <div className="p-4 space-y-4 text-center font-mono select-none">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#121422] border border-rose-900/50 flex items-center justify-center text-rose-400 shadow-md">
          <FontAwesomeIcon icon={ICONS.github} className="text-2xl" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-200">No GitHub Repository Connected</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto font-sans">
            Connect a GitHub repository to inspect its remote file tree structure, examine source code,
            and import repository files directly into your workspace.
          </p>
        </div>

        {onOpenGitHubModal && (
          <button
            type="button"
            id="github-remote-connect-btn"
            onClick={onOpenGitHubModal}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.github} className="text-sm" />
            <span>Connect GitHub Repository</span>
          </button>
        )}
      </div>
    );
  }

  // CASE 2: Connected Repository - File Tree Browser
  return (
    <div className="p-3 space-y-3 font-mono text-xs select-none">
      {/* Toast Feedback Notification */}
      {actionSuccessToast && (
        <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[11px] flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center space-x-1.5 truncate">
            <FontAwesomeIcon icon={ICONS.check} className="text-emerald-400 text-xs shrink-0" />
            <span className="truncate font-semibold">{actionSuccessToast}</span>
          </div>
          <button
            onClick={() => setActionSuccessToast(null)}
            className="text-emerald-400 hover:text-white p-0.5 cursor-pointer"
          >
            <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
          </button>
        </div>
      )}

      {/* Repository Context Card */}
      <div className="p-2.5 rounded-lg border border-[#222434] bg-[#0d0e17] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded bg-[#161826] border border-[#26283c] flex items-center justify-center text-slate-200 shrink-0">
              <FontAwesomeIcon icon={ICONS.github} className="text-xs" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200 text-xs truncate">
                  {connectedGitHubRepo}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                Remote Repository Tree
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {/* Refresh Tree Button */}
            <button
              type="button"
              id="refresh-github-tree-btn"
              onClick={() => loadRemoteTree(connectedGitHubRepo, selectedBranch)}
              disabled={isLoadingTree}
              className="p-1.5 rounded text-slate-400 hover:text-rose-300 hover:bg-[#1c1e2e] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh remote file tree from GitHub"
            >
              <FontAwesomeIcon
                icon={ICONS.sync}
                className={`text-[11px] ${isLoadingTree ? 'animate-spin text-rose-400' : ''}`}
              />
            </button>

            {/* Quick Push / Pull buttons if available */}
            {onQuickPull && (
              <button
                type="button"
                onClick={onQuickPull}
                disabled={isPullingRemote}
                className="px-2 py-1 rounded bg-[#161826] hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-[#26283c] text-[10px] flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                title="Pull latest changes from remote"
              >
                <FontAwesomeIcon
                  icon={ICONS.cloudDown}
                  className={isPullingRemote ? 'animate-bounce text-rose-400' : 'text-slate-400'}
                />
                <span className="hidden sm:inline">Pull</span>
              </button>
            )}

            {onQuickPush && (
              <button
                type="button"
                onClick={onQuickPush}
                disabled={isPushingRemote}
                className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[10px] flex items-center space-x-1 cursor-pointer disabled:opacity-50 font-semibold"
                title="Push workspace commits to remote"
              >
                <FontAwesomeIcon
                  icon={ICONS.cloudUp}
                  className={isPushingRemote ? 'animate-bounce text-rose-300' : 'text-rose-400'}
                />
                <span className="hidden sm:inline">Push</span>
              </button>
            )}

            {/* Configure / Modal button */}
            {onOpenGitHubModal && (
              <button
                type="button"
                onClick={onOpenGitHubModal}
                className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1c1e2e] cursor-pointer"
                title="Manage GitHub OAuth, Repositories & Import"
              >
                <FontAwesomeIcon icon={ICONS.settings} className="text-[11px]" />
              </button>
            )}
          </div>
        </div>

        {/* Branch Selector & Tree Statistics Row */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#1a1c2b] text-[10px]">
          <div className="flex items-center space-x-1.5">
            <FontAwesomeIcon icon={ICONS.git} className="text-rose-500 text-[10px]" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={isLoadingBranches || isLoadingTree}
              className="bg-[#121422] border border-[#25283c] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 outline-none focus:border-rose-500 cursor-pointer"
              title="Switch remote branch"
            >
              {remoteBranches.length > 0 ? (
                remoteBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))
              ) : (
                <option value={selectedBranch}>{selectedBranch}</option>
              )}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            <span>{totalFilesCount} files</span>
            <span>•</span>
            <span>{totalFoldersCount} folders</span>
          </div>
        </div>
      </div>

      {/* Search & Tree Controls Toolbar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1">
            <FontAwesomeIcon icon={ICONS.folder} className="text-[9px]" />
            <span>Remote File Tree</span>
          </span>

          <div className="flex items-center space-x-1 text-[9px]">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-[#202334] text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Expand all folders"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-1.5 py-0.5 rounded bg-[#161826] hover:bg-[#202334] text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Collapse all folders"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative flex items-center">
          <FontAwesomeIcon
            icon={ICONS.search}
            className="absolute left-2.5 text-slate-500 text-[10px] pointer-events-none"
          />
          <input
            type="text"
            value={treeFilterQuery}
            onChange={(e) => setTreeFilterQuery(e.target.value)}
            placeholder="Filter remote files (e.g. *.ts, App)..."
            className="w-full bg-[#121422] border border-[#23263b] focus:border-rose-500/80 rounded-md pl-7 pr-7 py-1 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
          />
          {treeFilterQuery && (
            <button
              type="button"
              onClick={() => setTreeFilterQuery('')}
              className="absolute right-2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
              title="Clear search"
            >
              <FontAwesomeIcon icon={ICONS.close} className="text-[9px]" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tree Container */}
      <div className="bg-[#0b0c13] border border-[#1e2030] rounded-lg p-1.5 min-h-[160px] max-h-[360px] overflow-y-auto">
        {isLoadingTree ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
            <FontAwesomeIcon icon={ICONS.sync} className="animate-spin text-rose-500 text-lg" />
            <span>Fetching remote repository tree...</span>
            <span className="text-[10px] text-slate-500">{connectedGitHubRepo} ({selectedBranch})</span>
          </div>
        ) : treeError ? (
          <div className="p-3 text-center space-y-2">
            <FontAwesomeIcon icon={ICONS.error} className="text-rose-500 text-base" />
            <div className="text-xs text-rose-300 font-semibold">{treeError}</div>
            <button
              type="button"
              onClick={() => loadRemoteTree(connectedGitHubRepo, selectedBranch)}
              className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[10px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredTreeHierarchy.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs space-y-1">
            <FontAwesomeIcon icon={ICONS.folderOpen} className="text-slate-600 text-base mb-1" />
            <div>{treeFilterQuery ? 'No remote files match your search filter.' : 'Remote repository appears empty.'}</div>
            {treeFilterQuery && (
              <button
                type="button"
                onClick={() => setTreeFilterQuery('')}
                className="text-rose-400 hover:underline text-[10px] cursor-pointer"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 divide-y divide-transparent">
            {filteredTreeHierarchy.map((node) => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* Import All Files Button */}
      {treeItems.length > 0 && (
        <div className="flex items-center space-x-2 pt-1">
          <button
            type="button"
            id="import-all-github-files-btn"
            onClick={handleImportAllFiles}
            disabled={isImporting || isLoadingTree}
            className="flex-1 py-1.5 rounded-lg bg-[#161826] hover:bg-rose-950 text-slate-200 hover:text-rose-200 border border-[#27293d] hover:border-rose-800/80 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Import all repository files into local workspace"
          >
            <FontAwesomeIcon
              icon={isImporting ? ICONS.sync : ICONS.download}
              className={`text-[10px] ${isImporting ? 'animate-spin text-rose-400' : 'text-slate-400'}`}
            />
            <span>{isImporting ? 'Cloning to Workspace...' : `Import All to Workspace (${totalFilesCount})`}</span>
          </button>
        </div>
      )}

      {/* Inline File Preview / Inspector Drawer */}
      {previewFile && (
        <div className="p-2.5 rounded-lg bg-[#0e101a] border border-rose-900/60 space-y-2 animate-fadeIn">
          {/* Preview Header */}
          <div className="flex items-center justify-between border-b border-[#202234] pb-1.5">
            <div className="flex items-center space-x-1.5 min-w-0">
              <FontAwesomeIcon
                icon={getFileIconConfig(previewFile.name).icon}
                className={`${getFileIconConfig(previewFile.name).color} text-xs shrink-0`}
              />
              <span className="font-semibold text-rose-300 text-[11px] truncate">
                {previewFile.name}
              </span>
              {previewFile.size !== undefined && (
                <span className="text-[9px] text-slate-500">
                  ({formatFileSize(previewFile.size)})
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              {/* Import to workspace */}
              <button
                type="button"
                onClick={() => {
                  if (previewFile.content !== undefined) {
                    const converted = GitHubService.convertRemoteFilesToFileItems([
                      { path: previewFile.path, name: previewFile.name, content: previewFile.content },
                    ]);
                    if (onImportRemoteFiles) {
                      onImportRemoteFiles(converted, 'merge');
                      setActionSuccessToast(`Imported "${previewFile.name}" into workspace!`);
                    }
                  }
                }}
                disabled={previewFile.isLoading || previewFile.content === undefined}
                className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                title="Import file into workspace"
              >
                <FontAwesomeIcon icon={ICONS.download} className="text-[9px]" />
                <span>Import</span>
              </button>

              {/* Open in editor */}
              {onOpenFileContent && (
                <button
                  type="button"
                  onClick={() => {
                    if (previewFile.content !== undefined) {
                      onOpenFileContent(previewFile.name, previewFile.content);
                    }
                  }}
                  disabled={previewFile.isLoading || previewFile.content === undefined}
                  className="px-2 py-0.5 rounded bg-[#181a28] hover:bg-[#222538] text-slate-200 border border-[#2a2d42] text-[10px] cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                  title="Open file in editor"
                >
                  <FontAwesomeIcon icon={ICONS.external} className="text-[9px]" />
                  <span>Open</span>
                </button>
              )}

              {/* Close preview */}
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                title="Close preview"
              >
                <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
              </button>
            </div>
          </div>

          {/* Preview Content Area */}
          {previewFile.isLoading ? (
            <div className="py-4 text-center text-slate-400 text-[11px] flex items-center justify-center space-x-2">
              <FontAwesomeIcon icon={ICONS.sync} className="animate-spin text-rose-400 text-xs" />
              <span>Fetching remote file content...</span>
            </div>
          ) : previewFile.error ? (
            <div className="p-2 text-rose-400 text-[11px] bg-rose-950/30 rounded border border-rose-900/40">
              {previewFile.error}
            </div>
          ) : (
            <div className="max-h-44 overflow-y-auto bg-[#07080d] p-2 rounded border border-[#181926] font-mono text-[10px] leading-relaxed text-slate-300 whitespace-pre">
              {previewFile.content || '(Empty file)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
