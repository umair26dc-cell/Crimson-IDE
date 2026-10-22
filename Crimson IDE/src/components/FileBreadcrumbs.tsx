/**
 * File Breadcrumbs Component
 * Displays the current file's hierarchy in the editor header and enables
 * quick navigation by clicking on folder segments to browse and jump to files.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { FileItem } from '../types';

export type BreadcrumbSeparatorStyle = 'chevron' | 'double-chevron' | 'slash' | 'arrow' | 'dot' | 'diamond';

export interface FileBreadcrumbsProps {
  activeFile: FileItem | null;
  files: FileItem[];
  onOpenFile: (fileId: string) => void;
  onRevealInExplorer?: (fileId: string) => void;
  workspaceName?: string;
  className?: string;
  onOpenStats?: (file: FileItem) => void;
  onRunCode?: (file: FileItem) => void;
  isRunningCode?: boolean;
  separatorStyle?: BreadcrumbSeparatorStyle;
  onSeparatorStyleChange?: (style: BreadcrumbSeparatorStyle) => void;
}

// Alias for backwards compatibility
export type BreadcrumbsProps = FileBreadcrumbsProps;

interface BreadcrumbSegment {
  id: string;
  name: string;
  fullPath: string;
  isFolder: boolean;
  isRoot?: boolean;
  folderNode?: FileItem | null;
  children: FileItem[]; // Immediate items in this directory
}

/**
 * Helper to find immediate children for a given folder path,
 * supporting nested folder trees and flat or hybrid workspace file lists.
 */
function getImmediateChildrenForPath(files: FileItem[], folderPath: string): FileItem[] {
  if (!folderPath) {
    return files;
  }

  const normTarget = folderPath.replace(/^\/+|\/+$/g, '');

  // 1. Try finding matching folder in nested tree
  const findFolderInTree = (nodes: FileItem[], target: string): FileItem | null => {
    for (const node of nodes) {
      const normNodePath = (node.path || '').replace(/^\/+|\/+$/g, '');
      if (node.isFolder && (normNodePath === target || node.name === target)) {
        return node;
      }
      if (node.children) {
        const found = findFolderInTree(node.children, target);
        if (found) return found;
      }
    }
    return null;
  };

  const folder = findFolderInTree(files, normTarget);
  if (folder?.children && folder.children.length > 0) {
    return folder.children;
  }

  // 2. Fallback: match by path prefix across all items
  const prefix = normTarget ? `${normTarget}/` : '';
  const childMap = new Map<string, FileItem>();

  const scan = (nodes: FileItem[]) => {
    for (const item of nodes) {
      const normItemPath = (item.path || '').replace(/^\/+|\/+$/g, '');
      if (normItemPath.startsWith(prefix) && normItemPath !== normTarget) {
        const remainder = normItemPath.slice(prefix.length);
        const slashIdx = remainder.indexOf('/');
        if (slashIdx === -1) {
          // Direct child file or folder
          childMap.set(item.name, item);
        } else {
          // Direct subfolder
          const subfolderName = remainder.slice(0, slashIdx);
          const subfolderPath = `${normTarget}/${subfolderName}`;
          if (!childMap.has(subfolderName)) {
            childMap.set(subfolderName, {
              id: `virtual-folder-${subfolderPath}`,
              name: subfolderName,
              path: subfolderPath,
              isFolder: true,
              children: [],
            });
          }
        }
      }
      if (item.children) scan(item.children);
    }
  };
  scan(files);

  return Array.from(childMap.values());
}

/**
 * Searches the files tree to find the matching FileItem folder node
 */
function findFolderNodeByPath(files: FileItem[], folderPath: string): FileItem | null {
  const normTarget = folderPath.replace(/^\/+|\/+$/g, '');
  for (const node of files) {
    const normNodePath = (node.path || '').replace(/^\/+|\/+$/g, '');
    if (node.isFolder && (normNodePath === normTarget || node.name === normTarget)) {
      return node;
    }
    if (node.children) {
      const found = findFolderNodeByPath(node.children, folderPath);
      if (found) return found;
    }
  }
  return null;
}

export const FileBreadcrumbs: React.FC<FileBreadcrumbsProps> = ({
  activeFile,
  files,
  onOpenFile,
  onRevealInExplorer,
  workspaceName = 'workspace',
  className = '',
  onOpenStats,
  onRunCode,
  isRunningCode = false,
  separatorStyle,
  onSeparatorStyleChange,
}) => {
  // Dropdown quick navigation state
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ left: number; top: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [browsingFolder, setBrowsingFolder] = useState<FileItem | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Customizable Separator Icon state (with persistence in localStorage)
  const [currentSeparatorStyle, setCurrentSeparatorStyle] = useState<BreadcrumbSeparatorStyle>(() => {
    if (separatorStyle) return separatorStyle;
    const saved = localStorage.getItem('cscode_breadcrumb_separator') as BreadcrumbSeparatorStyle | null;
    return saved || 'chevron';
  });
  const [isSeparatorPickerOpen, setIsSeparatorPickerOpen] = useState(false);
  const separatorPickerRef = useRef<HTMLDivElement>(null);

  // Sync external prop if updated
  useEffect(() => {
    if (separatorStyle && separatorStyle !== currentSeparatorStyle) {
      setCurrentSeparatorStyle(separatorStyle);
    }
  }, [separatorStyle, currentSeparatorStyle]);

  // Handle separator picker outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (separatorPickerRef.current && !separatorPickerRef.current.contains(e.target as Node)) {
        setIsSeparatorPickerOpen(false);
      }
    };
    if (isSeparatorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSeparatorPickerOpen]);

  const handleSelectSeparatorStyle = (style: BreadcrumbSeparatorStyle) => {
    setCurrentSeparatorStyle(style);
    try {
      localStorage.setItem('cscode_breadcrumb_separator', style);
    } catch {
      // Ignore storage errors
    }
    if (onSeparatorStyleChange) {
      onSeparatorStyleChange(style);
    }
    setIsSeparatorPickerOpen(false);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemsListRef = useRef<HTMLDivElement>(null);

  // Parse path into hierarchical breadcrumb segments
  const segments: BreadcrumbSegment[] = useMemo(() => {
    if (!activeFile) {
      return [
        {
          id: 'root',
          name: workspaceName,
          fullPath: '',
          isFolder: true,
          isRoot: true,
          children: files,
        },
      ];
    }

    const pathParts = activeFile.path.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [];

    // Root workspace segment
    result.push({
      id: 'root',
      name: workspaceName,
      fullPath: '',
      isFolder: true,
      isRoot: true,
      children: files,
    });

    let accumulatedPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLast = i === pathParts.length - 1;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      const folderNode = !isLast ? findFolderNodeByPath(files, accumulatedPath) : null;
      const children = getImmediateChildrenForPath(
        files,
        isLast ? (i > 0 ? pathParts.slice(0, i).join('/') : '') : accumulatedPath
      );

      if (isLast) {
        // Active file segment
        result.push({
          id: activeFile.id,
          name: part,
          fullPath: accumulatedPath,
          isFolder: false,
          folderNode: null,
          children, // Siblings in parent folder
        });
      } else {
        // Intermediate directory segment
        result.push({
          id: folderNode?.id || `folder-${accumulatedPath}`,
          name: part,
          fullPath: accumulatedPath,
          isFolder: true,
          folderNode,
          children,
        });
      }
    }

    return result;
  }, [activeFile, files, workspaceName]);

  // Immediate parent folder segment
  const immediateParentIndex = useMemo(() => {
    if (segments.length > 2) {
      return segments.length - 2;
    }
    if (segments.length === 2) {
      return 0; // Root workspace is direct parent
    }
    return null;
  }, [segments]);

  const immediateParentSegment = immediateParentIndex !== null ? segments[immediateParentIndex] : null;

  // Handle clicking on a breadcrumb segment for quick navigation
  const handleSegmentClick = useCallback((index: number) => {
    if (activeSegmentIndex === index) {
      setActiveSegmentIndex(null);
      setBrowsingFolder(null);
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }

    const segment = segments[index];
    if (segment) {
      // Reveal folder in Explorer sidebar tree for immediate visual feedback
      const targetFolderId = segment.folderNode?.id || segment.fullPath || (segment.isRoot ? 'root' : segment.id);
      if (targetFolderId && targetFolderId !== 'root' && onRevealInExplorer) {
        onRevealInExplorer(targetFolderId);
      }
    }

    const btn = segmentRefs.current[index];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropdownPosition({
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 320)),
        top: rect.bottom + 4,
      });
    }

    setActiveSegmentIndex(index);
    setBrowsingFolder(null);
    setSearchQuery('');
    setSelectedIndex(0);
  }, [activeSegmentIndex, segments, onRevealInExplorer]);

  // Navigate Up one folder level in hierarchy
  const handleNavigateUp = useCallback(() => {
    if (immediateParentIndex !== null) {
      handleSegmentClick(immediateParentIndex);
    }
  }, [immediateParentIndex, handleSegmentClick]);

  // Global Alt+Up shortcut listener to navigate up to parent folder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handleNavigateUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigateUp]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveSegmentIndex(null);
        setBrowsingFolder(null);
        setSearchQuery('');
        setSelectedIndex(0);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSegmentIndex(null);
        setBrowsingFolder(null);
        setSearchQuery('');
        setSelectedIndex(0);
      }
    };

    if (activeSegmentIndex !== null) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSegmentIndex]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (activeSegmentIndex !== null) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [activeSegmentIndex, browsingFolder]);

  // Active directory items to display in dropdown
  const currentSegment = activeSegmentIndex !== null ? segments[activeSegmentIndex] : null;

  const currentDisplayItems: FileItem[] = useMemo(() => {
    if (!currentSegment) return [];
    if (browsingFolder) {
      return getImmediateChildrenForPath(files, browsingFolder.path);
    }
    return currentSegment.children || [];
  }, [currentSegment, browsingFolder, files]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    let items = currentDisplayItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }

    // Folders first, then files alphabetically
    return [...items].sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });
  }, [currentDisplayItems, searchQuery]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, searchQuery]);

  // Scroll selected item into view in dropdown
  useEffect(() => {
    if (itemsListRef.current) {
      const itemEl = itemsListRef.current.children[selectedIndex] as HTMLElement;
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Dropdown keyboard navigation (Up, Down, Enter, Backspace)
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredItems[selectedIndex];
      if (target) {
        if (target.isFolder) {
          setBrowsingFolder(target);
          setSearchQuery('');
          setSelectedIndex(0);
        } else {
          onOpenFile(target.id);
          setActiveSegmentIndex(null);
          setBrowsingFolder(null);
          setSearchQuery('');
        }
      }
    } else if (e.key === 'Backspace' && searchQuery === '' && browsingFolder) {
      e.preventDefault();
      setBrowsingFolder(null);
      setSelectedIndex(0);
    }
  };

  // Copy path helper
  const handleCopyPath = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Render customizable crimson separator icon
  const renderSeparatorIcon = (sizeClass = 'text-[9px]') => {
    switch (currentSeparatorStyle) {
      case 'double-chevron':
        return (
          <span className="font-black text-rose-500 hover:text-rose-400 select-none tracking-tighter transition-colors drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] text-[10px]">
            »
          </span>
        );
      case 'slash':
        return (
          <span className="font-mono font-bold text-rose-500/90 hover:text-rose-400 select-none transition-colors drop-shadow-[0_0_5px_rgba(244,63,94,0.5)] text-[11px]">
            /
          </span>
        );
      case 'arrow':
        return (
          <span className="font-black text-rose-400 hover:text-rose-300 select-none transition-colors drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] text-[9px]">
            →
          </span>
        );
      case 'dot':
        return (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] hover:bg-rose-400 inline-block transition-all" />
        );
      case 'diamond':
        return (
          <span className="text-rose-500 hover:text-rose-400 select-none transition-colors drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] text-[8px]">
            ◆
          </span>
        );
      case 'chevron':
      default:
        return (
          <FontAwesomeIcon
            icon={ICONS.chevronRight}
            className={`${sizeClass} text-rose-500 hover:text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] transition-colors shrink-0`}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      id="file-breadcrumbs"
      data-testid="file-breadcrumbs"
      role="navigation"
      aria-label="File Breadcrumbs"
      className={`h-7 px-3 bg-[#0c0d13] border-b border-[#1b1c26] flex items-center justify-between text-xs font-mono select-none shrink-0 relative ${className}`}
    >
      {/* Left: Quick "Navigate Up" Action + Breadcrumb Path Segments */}
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 max-w-[calc(100%-160px)]">
        {/* Quick Navigate Up to Parent Button */}
        {immediateParentSegment && (
          <button
            type="button"
            onClick={handleNavigateUp}
            title={`Navigate up to parent folder: ${immediateParentSegment.name} (Alt+Up)`}
            className="flex items-center justify-center w-5 h-5 mr-1 rounded hover:bg-white/[0.06] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 group"
            data-testid="breadcrumb-navigate-up-btn"
          >
            <FontAwesomeIcon
              icon={ICONS.arrowUp}
              className="text-[10px] text-slate-400 group-hover:text-rose-300 transition-transform group-hover:-translate-y-0.5"
            />
          </button>
        )}

        {/* Path Hierarchy Segments */}
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const isDropdownActive = activeSegmentIndex === index;

          let icon = ICONS.folder;
          let iconColor = 'text-amber-400/90';

          if (segment.isRoot) {
            icon = ICONS.cubes;
            iconColor = 'text-rose-500';
          } else if (!segment.isFolder && activeFile) {
            const fileConfig = getFileIconConfig(segment.name, activeFile.language);
            icon = fileConfig.icon;
            iconColor = fileConfig.color;
          }

          return (
            <React.Fragment key={`${segment.id}-${index}`}>
              {index > 0 && (
                <span
                  className="px-1 text-slate-600 flex items-center justify-center shrink-0 select-none"
                  data-testid={`breadcrumb-separator-${index}`}
                  aria-hidden="true"
                >
                  {renderSeparatorIcon('text-[8px]')}
                </span>
              )}

              <button
                ref={(el) => {
                  segmentRefs.current[index] = el;
                }}
                onClick={() => handleSegmentClick(index)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (segment.isFolder || segment.isRoot) {
                    const targetId = segment.folderNode?.id || segment.fullPath || (segment.isRoot ? 'root' : segment.id);
                    if (targetId && targetId !== 'root' && onRevealInExplorer) {
                      onRevealInExplorer(targetId);
                    }
                  }
                }}
                title={
                  segment.isRoot
                    ? 'Root Workspace: Click to browse top-level items'
                    : segment.isFolder
                    ? `Folder: ${segment.fullPath} (Click for quick navigation, double-click to reveal in explorer)`
                    : `Active File: ${segment.name} (Click for sibling files)`
                }
                data-testid={`breadcrumb-segment-${index}`}
                data-segment-type={segment.isFolder ? 'folder' : 'file'}
                data-segment-path={segment.fullPath}
                className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  isDropdownActive
                    ? 'bg-rose-950/70 text-rose-200 font-medium ring-1 ring-rose-500/40'
                    : isLast
                    ? 'text-slate-200 hover:text-white hover:bg-white/[0.08] font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
                }`}
                aria-haspopup="true"
                aria-expanded={isDropdownActive}
              >
                <FontAwesomeIcon icon={icon} className={`text-[10px] shrink-0 ${iconColor}`} />
                <span className="truncate max-w-[180px]">{segment.name}</span>
                <FontAwesomeIcon
                  icon={ICONS.chevronDown}
                  className={`text-[7px] transition-transform opacity-50 ${
                    isDropdownActive ? 'rotate-180 text-rose-400 opacity-100' : 'text-slate-500'
                  }`}
                />
              </button>
            </React.Fragment>
          );
        })}

        {!activeFile && (
          <span className="text-slate-500 italic text-[11px] ml-1">No active document</span>
        )}
      </div>

      {/* Right: Active Document Quick Actions */}
      <div className="flex items-center space-x-1 text-slate-400 shrink-0 ml-2">
        {activeFile && (
          <>
            {/* Quick Copy Relative Path */}
            <button
              type="button"
              onClick={() => handleCopyPath(activeFile.path, 'Copied!')}
              title={`Copy path: ${activeFile.path}`}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:text-slate-200 hover:bg-white/[0.06] text-slate-400 transition-colors cursor-pointer text-[10px]"
              data-testid="breadcrumb-copy-path-btn"
            >
              <FontAwesomeIcon
                icon={copyFeedback ? ICONS.check : ICONS.copy}
                className={copyFeedback ? 'text-emerald-400 text-[9px]' : 'text-slate-500 text-[9px]'}
              />
              <span className="text-[10px]">{copyFeedback || 'Copy'}</span>
            </button>

            {/* Quick Reveal in Explorer */}
            {onRevealInExplorer && (
              <button
                type="button"
                onClick={() => onRevealInExplorer(activeFile.id)}
                title="Reveal in File Explorer"
                className="w-5 h-5 flex items-center justify-center hover:text-slate-200 hover:bg-white/[0.06] rounded text-slate-400 transition-colors cursor-pointer"
                data-testid="breadcrumb-reveal-explorer-btn"
              >
                <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[9px]" />
              </button>
            )}
          </>
        )}

        {/* Separator Style Customizer Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSeparatorPickerOpen((prev) => !prev);
          }}
          title={`Customize Breadcrumbs Separator (Current: ${currentSeparatorStyle})`}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
            isSeparatorPickerOpen
              ? 'bg-rose-950 text-rose-200'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]'
          }`}
          data-testid="breadcrumb-separator-customizer-btn"
        >
          <span className="text-[9px] leading-none">{renderSeparatorIcon('text-[9px]')}</span>
        </button>
      </div>

      {/* Customizable Separator Icon Picker Popover */}
      {isSeparatorPickerOpen && (
        <div
          ref={separatorPickerRef}
          className="absolute top-8 right-12 z-50 bg-[#12131b] border border-rose-800/80 rounded-lg shadow-2xl p-2.5 text-xs w-64 select-none animate-fadeIn backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#25283c]">
            <div className="font-semibold text-rose-300 font-mono text-[11px] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
              <span>Breadcrumb Separator</span>
            </div>
            <button
              onClick={() => setIsSeparatorPickerOpen(false)}
              className="text-slate-400 hover:text-rose-400 text-[10px] p-0.5"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-sans mb-2">
            Select the separator glyph displayed between folder levels in the Crimson editor:
          </div>

          <div className="space-y-1">
            {[
              { id: 'chevron', label: 'Chevron', glyph: '›', desc: 'Sleek angled bracket' },
              { id: 'double-chevron', label: 'Double Chevron', glyph: '»', desc: 'Fast-forward chevron' },
              { id: 'slash', label: 'Forward Slash', glyph: '/', desc: 'UNIX file path style' },
              { id: 'arrow', label: 'Directional Arrow', glyph: '→', desc: 'Flow path arrow' },
              { id: 'dot', label: 'Glowing Ruby Dot', glyph: '•', desc: 'Subtle neon bead' },
              { id: 'diamond', label: 'Crimson Diamond', glyph: '◆', desc: 'Geometric gem marker' },
            ].map((item) => {
              const isSelected = currentSeparatorStyle === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSeparatorStyle(item.id as BreadcrumbSeparatorStyle)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors font-mono cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/90 text-rose-200 border border-rose-600/80 shadow-sm'
                      : 'text-slate-300 hover:bg-[#1a1c29] hover:text-white border border-transparent'
                  }`}
                >
                  <span className="flex items-center space-x-2.5">
                    <span className="w-6 text-center text-rose-400 font-bold text-sm flex items-center justify-center">
                      {item.id === 'dot' ? (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] inline-block" />
                      ) : (
                        item.glyph
                      )}
                    </span>
                    <div>
                      <div className="text-[11px] font-medium leading-none">{item.label}</div>
                      <div className="text-[9px] text-slate-400 font-sans mt-0.5">{item.desc}</div>
                    </div>
                  </span>
                  {isSelected && (
                    <span className="text-[9px] text-rose-300 bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-700/60 font-sans font-semibold">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Breadcrumb Hierarchy Dropdown for Quick Navigation */}
      {activeSegmentIndex !== null && currentSegment && dropdownPosition && (
        <div
          ref={dropdownRef}
          onKeyDown={handleDropdownKeyDown}
          style={{
            position: 'fixed',
            left: `${dropdownPosition.left}px`,
            top: `${dropdownPosition.top}px`,
          }}
          className="z-50 w-80 max-w-[92vw] bg-[#0f1017] border border-[#232536] shadow-2xl rounded-lg p-1.5 text-xs font-mono select-none animate-in fade-in zoom-in-95 duration-100"
          data-testid="breadcrumb-dropdown"
        >
          {/* Header Bar */}
          <div className="px-2 py-1.5 border-b border-[#1c1e2b] flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-1.5 truncate text-slate-300">
              <FontAwesomeIcon
                icon={
                  browsingFolder
                    ? ICONS.folderOpen
                    : currentSegment.isRoot
                    ? ICONS.cubes
                    : currentSegment.isFolder
                    ? ICONS.folder
                    : ICONS.fileLines
                }
                className={
                  browsingFolder
                    ? 'text-amber-400'
                    : currentSegment.isRoot
                    ? 'text-rose-500'
                    : currentSegment.isFolder
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }
              />
              <span className="font-semibold text-rose-300 truncate">
                {browsingFolder ? browsingFolder.path : currentSegment.fullPath || workspaceName}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-1">
              {onRevealInExplorer && (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = browsingFolder
                      ? (browsingFolder.id || browsingFolder.path)
                      : (currentSegment.folderNode?.id || currentSegment.fullPath || currentSegment.id);
                    if (targetId && targetId !== 'root') {
                      onRevealInExplorer(targetId);
                      setActiveSegmentIndex(null);
                    }
                  }}
                  title="Reveal and expand this folder in Explorer sidebar"
                  className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-300 hover:bg-white/[0.06] flex items-center space-x-1 transition-colors cursor-pointer"
                  data-testid="breadcrumb-header-reveal-btn"
                >
                  <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[9px]" />
                  <span>Reveal</span>
                </button>
              )}
              <span className="text-[10px] text-slate-500 font-mono">
                {currentDisplayItems.length} items
              </span>
            </div>
          </div>

          {/* Subfolder Drill-down Back Button */}
          {browsingFolder && (
            <div className="p-1 border-b border-[#1a1b24]">
              <button
                onClick={() => {
                  setBrowsingFolder(null);
                  setSelectedIndex(0);
                }}
                className="w-full flex items-center space-x-1.5 px-2 py-1 rounded bg-[#161722] hover:bg-[#1e202f] text-rose-300 text-[11px] transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.arrowLeft} className="text-[9px]" />
                <span>Back to {currentSegment.name} (Backspace)</span>
              </button>
            </div>
          )}

          {/* Quick Filter Search */}
          {currentDisplayItems.length > 2 && (
            <div className="p-1 border-b border-[#1a1b24]">
              <div className="flex items-center bg-[#0b0c12] border border-[#232536] focus-within:border-rose-500/70 rounded px-2 py-1 space-x-1.5">
                <FontAwesomeIcon icon={ICONS.search} className="text-slate-500 text-[10px]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter files & folders... (↑↓ to select)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-[11px] outline-none"
                  data-testid="breadcrumb-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-500 hover:text-slate-300 text-[10px]"
                  >
                    <FontAwesomeIcon icon={ICONS.close} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Item List for Quick Navigation */}
          <div ref={itemsListRef} className="max-h-64 overflow-y-auto divide-y divide-[#151622] py-0.5">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px] italic">
                {searchQuery ? 'No matching items' : 'Folder is empty'}
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isCurrentActive = activeFile && item.id === activeFile.id;
                const isSelected = selectedIndex === idx;

                if (item.isFolder) {
                  const childCount = item.children ? item.children.length : 0;
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#181a26] text-white ring-1 ring-rose-500/40'
                          : 'hover:bg-[#141520] text-slate-300 hover:text-amber-300'
                      }`}
                      onClick={() => {
                        // Drill down into subfolder in this dropdown
                        setBrowsingFolder(item);
                        setSearchQuery('');
                        setSelectedIndex(0);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      data-testid={`breadcrumb-item-${item.id}`}
                      data-item-type="folder"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FontAwesomeIcon icon={ICONS.folder} className="text-amber-400 text-[11px] shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {childCount > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {childCount} {childCount === 1 ? 'item' : 'items'}
                          </span>
                        )}
                        {onRevealInExplorer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRevealInExplorer(item.id || item.path || item.name);
                              setActiveSegmentIndex(null);
                            }}
                            title={`Reveal folder "${item.name}" in Explorer sidebar`}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-300 text-slate-400 rounded transition-opacity"
                            data-testid={`breadcrumb-reveal-folder-${item.id}`}
                          >
                            <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[9px]" />
                          </button>
                        )}
                        <FontAwesomeIcon
                          icon={ICONS.chevronRight}
                          className="text-[9px] text-slate-600 group-hover:text-amber-400 ml-1 transition-colors"
                        />
                      </div>
                    </div>
                  );
                }

                // File Item - click to quickly navigate and open in editor
                const iconConfig = getFileIconConfig(item.name, item.language);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onOpenFile(item.id);
                      setActiveSegmentIndex(null);
                      setBrowsingFolder(null);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#181a26] text-white ring-1 ring-rose-500/40'
                        : isCurrentActive
                        ? 'text-rose-400 font-semibold bg-[#141522]'
                        : 'text-slate-300 hover:text-white hover:bg-[#141520]'
                    }`}
                    data-testid={`breadcrumb-item-${item.id}`}
                    data-item-type="file"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FontAwesomeIcon
                        icon={iconConfig.icon}
                        className={`text-[11px] shrink-0 ${iconConfig.color}`}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {isCurrentActive && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold uppercase shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Actions Footer for active segment */}
          <div className="pt-1.5 mt-1 border-t border-[#1a1b24] flex items-center justify-between px-1.5 text-[10px] text-slate-400">
            <span className="text-slate-500">
              {currentSegment.isFolder ? 'Click folder to drill down' : 'Select file to navigate'}
            </span>
            <div className="flex items-center space-x-1.5">
              {currentSegment.isFolder && onRevealInExplorer && (
                <button
                  onClick={() => {
                    const targetId = currentSegment.folderNode?.id || currentSegment.id;
                    onRevealInExplorer(targetId);
                    setActiveSegmentIndex(null);
                  }}
                  title="Reveal and expand this folder in the workspace explorer sidebar"
                  className="hover:text-rose-300 hover:underline cursor-pointer flex items-center space-x-1"
                  data-testid="breadcrumb-dropdown-reveal-btn"
                >
                  <FontAwesomeIcon icon={ICONS.folderOpen} className="text-[9px]" />
                  <span>Reveal Folder</span>
                </button>
              )}
              {currentSegment.fullPath && (
                <button
                  onClick={() => handleCopyPath(currentSegment.fullPath, 'Path Copied!')}
                  className="hover:text-rose-300 hover:underline cursor-pointer ml-1"
                  data-testid="breadcrumb-dropdown-copy-btn"
                >
                  Copy Path
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as default and Breadcrumbs
export const Breadcrumbs = FileBreadcrumbs;
export default FileBreadcrumbs;
