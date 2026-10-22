/**
 * Dedicated Git Diff View Modal Component for CsCode Crimson IDE
 * Highlights line additions and deletions side-by-side for the active file
 * compared against the last commit (HEAD / baseline).
 * Supports synchronized scrolling, intra-line word diffs, hunk jumping,
 * copying raw patches, and reverting file to last commit.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { FileItem, UserSettings } from '../types';
import { computeLineDiff, DiffLine, DiffHunk, SideBySidePair, FileDiffResult } from '../lib/diffEngine';
import { GitCommitNode } from '../lib/gitHistory';

export interface GitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  lastCommit?: GitCommitNode | null;
  gitBranch?: string;
  onUpdateContent?: (fileId: string, newContent: string) => void;
  onRevertFile?: (fileId: string) => void;
  userSettings?: UserSettings;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  isOpen,
  onClose,
  file,
  lastCommit,
  gitBranch = 'main',
  onUpdateContent,
  onRevertFile,
  userSettings,
}) => {
  // Modal layout configuration
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeHunkIndex, setActiveHunkIndex] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showConfirmRevert, setShowConfirmRevert] = useState<boolean>(false);

  // Synchronized scroll refs for side-by-side comparison
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const unifiedScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingSync = useRef<boolean>(false);
  const hunkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Compare originalContent (last commit) vs current working content
  const committedContent = useMemo(() => {
    if (!file) return '';
    return file.originalContent !== undefined ? file.originalContent : (file.content || '');
  }, [file?.originalContent, file?.content, file]);

  const activeContent = useMemo(() => {
    return file?.content || '';
  }, [file?.content]);

  // Compute Line & Side-by-Side Diff
  const diffResult: FileDiffResult = useMemo(() => {
    return computeLineDiff(committedContent, activeContent);
  }, [committedContent, activeContent]);

  const { stats, hunks, lines, sideBySidePairs, hasChanges } = diffResult;

  // Jump to specific hunk
  const scrollToHunk = useCallback((index: number) => {
    if (hunks.length === 0) return;
    const targetIdx = Math.max(0, Math.min(index, hunks.length - 1));
    setActiveHunkIndex(targetIdx);
    const targetHunk = hunks[targetIdx];
    if (targetHunk) {
      const el = hunkRefs.current.get(targetHunk.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [hunks]);

  const handleNextHunk = () => {
    if (hunks.length === 0) return;
    const nextIdx = (activeHunkIndex + 1) % hunks.length;
    scrollToHunk(nextIdx);
  };

  const handlePrevHunk = () => {
    if (hunks.length === 0) return;
    const prevIdx = (activeHunkIndex - 1 + hunks.length) % hunks.length;
    scrollToHunk(prevIdx);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextHunk();
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevHunk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeHunkIndex, hunks]);

  // Synchronized scrolling for split view
  const handleLeftScroll = () => {
    if (isScrollingSync.current) return;
    isScrollingSync.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrollingSync.current = false;
    });
  };

  const handleRightScroll = () => {
    if (isScrollingSync.current) return;
    isScrollingSync.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrollingSync.current = false;
    });
  };

  // Copy patch formatted diff
  const handleCopyPatch = () => {
    if (!file) return;
    let patch = `--- a/${file.path || file.name} (last commit: ${lastCommit?.shortHash || 'HEAD'})\n+++ b/${file.path || file.name} (working tree)\n`;
    for (const h of hunks) {
      patch += `${h.header}\n`;
      for (const l of h.lines) {
        const prefix = l.type === 'added' ? '+' : l.type === 'deleted' ? '-' : ' ';
        patch += `${prefix}${l.text}\n`;
      }
    }
    navigator.clipboard.writeText(patch);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Revert file to last commit
  const handleRevert = () => {
    if (!file) return;
    if (onRevertFile) {
      onRevertFile(file.id);
    } else if (onUpdateContent && file.originalContent !== undefined) {
      onUpdateContent(file.id, file.originalContent);
    }
    setShowConfirmRevert(false);
  };

  if (!isOpen || !file) return null;

  const iconConfig = getFileIconConfig(file.name, file.language);

  // Render inline character/word changes
  const renderLineContent = (line: DiffLine) => {
    if (line.inlineChanges && line.inlineChanges.length > 0) {
      return (
        <span>
          {line.inlineChanges.map((change, i) => {
            if (change.type === 'added') {
              return (
                <span
                  key={i}
                  className="bg-emerald-500/30 text-emerald-200 font-semibold rounded-xs px-0.5 border border-emerald-500/40"
                >
                  {change.text}
                </span>
              );
            }
            if (change.type === 'deleted') {
              return (
                <span
                  key={i}
                  className="bg-rose-500/35 text-rose-200 line-through rounded-xs px-0.5 border border-rose-500/40"
                >
                  {change.text}
                </span>
              );
            }
            return <span key={i}>{change.text}</span>;
          })}
        </span>
      );
    }
    return <span>{line.text}</span>;
  };

  return (
    <div
      id="git-diff-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#0d0e15] border border-[#232536] shadow-2xl rounded-xl flex flex-col overflow-hidden text-slate-200 font-sans transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-6xl h-[88vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="h-12 bg-[#090a10] border-b border-[#1b1c28] px-4 flex items-center justify-between shrink-0">
          {/* Left: Active File Info & Diff Badges */}
          <div className="flex items-center space-x-3 truncate min-w-0">
            <div className="flex items-center space-x-2 truncate">
              <FontAwesomeIcon icon={ICONS.gitCompare} className="text-rose-400 text-sm shrink-0" />
              <FontAwesomeIcon icon={iconConfig.icon} className={`text-xs shrink-0 ${iconConfig.color}`} />
              <span className="font-mono text-sm font-semibold text-slate-100 truncate">{file.name}</span>
              <span className="text-slate-500 text-xs font-mono hidden md:inline truncate">
                ({file.path})
              </span>
            </div>

            {/* Git Branch & Commit Target */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-[#141622] border border-[#222436] text-[11px] font-mono text-slate-300">
              <FontAwesomeIcon icon={ICONS.git} className="text-[10px] text-rose-400" />
              <span>{gitBranch}</span>
              <span className="text-slate-600">vs</span>
              <span className="text-rose-300 font-semibold">
                {lastCommit?.shortHash ? `Commit ${lastCommit.shortHash}` : 'HEAD (Last Commit)'}
              </span>
            </div>

            {/* Changes Counters (+Additions / -Deletions) */}
            <div className="flex items-center space-x-1 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-bold">
                +{stats.additions}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300 font-bold">
                -{stats.deletions}
              </span>
            </div>
          </div>

          {/* Right: Actions & View Modes */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Toggle: Side-by-Side vs Unified */}
            <div className="flex items-center bg-[#131420] border border-[#222538] rounded-md p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                title="Side-by-Side Split View"
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'split'
                    ? 'bg-rose-950 text-rose-200 border border-rose-700/80 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.splitVertical} className="text-[10px]" />
                <span className="hidden sm:inline">Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                title="Unified Inline View"
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'unified'
                    ? 'bg-rose-950 text-rose-200 border border-rose-700/80 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={ICONS.list} className="text-[10px]" />
                <span className="hidden sm:inline">Unified</span>
              </button>
            </div>

            {/* Hunk Navigation */}
            {hunks.length > 0 && (
              <div className="hidden lg:flex items-center space-x-1 bg-[#131420] border border-[#222538] rounded-md px-1.5 py-0.5 text-xs font-mono">
                <span className="text-slate-400 text-[11px] px-1">
                  Hunk {activeHunkIndex + 1}/{hunks.length}
                </span>
                <button
                  type="button"
                  onClick={handlePrevHunk}
                  title="Previous Change Hunk (Alt+Up)"
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.arrowUp} className="text-[9px]" />
                </button>
                <button
                  type="button"
                  onClick={handleNextHunk}
                  title="Next Change Hunk (Alt+Down)"
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.arrowDown} className="text-[9px]" />
                </button>
              </div>
            )}

            {/* Copy Patch Action */}
            <button
              type="button"
              onClick={handleCopyPatch}
              title="Copy Git Diff Patch to clipboard"
              className="px-2.5 py-1 rounded-md bg-[#131420] hover:bg-white/[0.06] border border-[#222538] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-mono flex items-center space-x-1.5"
            >
              <FontAwesomeIcon icon={isCopied ? ICONS.check : ICONS.copy} className={isCopied ? 'text-emerald-400' : 'text-slate-400'} />
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Patch'}</span>
            </button>

            {/* Revert Changes to Last Commit */}
            {hasChanges && (
              <div className="relative">
                {showConfirmRevert ? (
                  <div className="flex items-center space-x-1 bg-rose-950 border border-rose-700 rounded-md p-0.5 animate-fadeIn">
                    <span className="text-[11px] font-mono text-rose-200 px-1.5">Discard edits?</span>
                    <button
                      type="button"
                      onClick={handleRevert}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmRevert(false)}
                      className="px-1.5 py-0.5 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmRevert(true)}
                    title="Discard working changes and restore file to last commit"
                    className="px-2.5 py-1 rounded-md bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer text-xs font-mono flex items-center space-x-1.5"
                  >
                    <FontAwesomeIcon icon={ICONS.rotateLeft} className="text-[10px]" />
                    <span className="hidden md:inline">Revert to Commit</span>
                  </button>
                )}
              </div>
            )}

            {/* Fullscreen / Restore Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Restore Modal Size' : 'Maximize Diff Modal'}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={isFullscreen ? ICONS.compress : ICONS.expand} className="text-xs" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Diff Modal (Esc)"
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} className="text-sm" />
            </button>
          </div>
        </div>

        {/* Sub-Header: Commit Information Banner */}
        {lastCommit && (
          <div className="bg-[#0b0c13] border-b border-[#181926] px-4 py-1.5 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-slate-500">Base Commit:</span>
              <span className="text-rose-400 font-semibold">{lastCommit.shortHash}</span>
              <span className="text-slate-300 truncate">&ldquo;{lastCommit.subject}&rdquo;</span>
              <span className="text-slate-500 hidden md:inline">by {lastCommit.author.name}</span>
            </div>
            <div className="text-[11px] text-slate-500 shrink-0 ml-2">
              {lastCommit.date}
            </div>
          </div>
        )}

        {/* Main Diff Content Container */}
        <div className="flex-1 overflow-hidden relative bg-[#090a10]">
          {!hasChanges ? (
            /* Clean Working Tree State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 text-lg mb-3 shadow-lg">
                <FontAwesomeIcon icon={ICONS.circleCheck} />
              </div>
              <h3 className="text-base font-semibold text-slate-200 font-mono">Working Tree is Clean</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md font-sans">
                Active file &ldquo;<strong className="text-rose-300 font-mono">{file.name}</strong>&rdquo; matches the last commit state. There are no uncommitted additions or deletions.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-4 py-1.5 rounded-md bg-[#161724] hover:bg-[#202234] border border-[#2b2d42] text-xs font-mono text-slate-300 transition-colors cursor-pointer"
              >
                Close Diff Modal
              </button>
            </div>
          ) : viewMode === 'split' ? (
            /* =========================================================================
             * SIDE-BY-SIDE (SPLIT) DIFF VIEW (Primary Default)
             * Left: Last Commit (HEAD) with deletions highlighted in red/rose
             * Right: Working Tree (Active File) with additions highlighted in green/emerald
             * ========================================================================= */
            <div className="h-full flex flex-col">
              {/* Column Labels */}
              <div className="grid grid-cols-2 bg-[#0d0e17] border-b border-[#1a1b28] text-xs font-mono shrink-0 select-none">
                <div className="px-4 py-1.5 border-r border-[#1a1b28] flex items-center justify-between text-rose-300/90 bg-rose-950/15">
                  <div className="flex items-center space-x-2 truncate">
                    <FontAwesomeIcon icon={ICONS.git} className="text-rose-400 text-xs" />
                    <span className="font-semibold truncate">
                      Last Commit (HEAD: {lastCommit?.shortHash || 'Baseline'})
                    </span>
                  </div>
                  <span className="text-[11px] text-rose-400 font-bold">-{stats.deletions} lines</span>
                </div>

                <div className="px-4 py-1.5 flex items-center justify-between text-emerald-300/90 bg-emerald-950/15">
                  <div className="flex items-center space-x-2 truncate">
                    <FontAwesomeIcon icon={ICONS.file} className="text-emerald-400 text-xs" />
                    <span className="font-semibold truncate">
                      Working Tree ({file.name})
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">+{stats.additions} lines</span>
                </div>
              </div>

              {/* Synchronously Scrolled Split Panes */}
              <div className="flex-1 grid grid-cols-2 divide-x divide-[#1a1b28] overflow-hidden font-mono text-xs">
                {/* LEFT PANE: Last Commit (HEAD) */}
                <div
                  ref={leftScrollRef}
                  onScroll={handleLeftScroll}
                  className="overflow-auto h-full scrollbar-thin select-text"
                >
                  <div className="min-w-full inline-block">
                    {sideBySidePairs.map((pair, idx) => {
                      const line = pair.left;
                      const isDeleted = line?.type === 'deleted';

                      if (!line) {
                        // Empty placeholder line to align with addition on right
                        return (
                          <div
                            key={`left-empty-${idx}`}
                            className="flex h-5.5 leading-5.5 bg-[#0a0a10]/50 border-b border-transparent select-none"
                            aria-hidden="true"
                          >
                            <div className="w-12 shrink-0 bg-[#07080d]/50 border-r border-[#161724]" />
                            <div className="w-6 shrink-0 text-center text-transparent">-</div>
                            <div className="flex-1 px-2 text-transparent">-</div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`left-line-${line.id}-${idx}`}
                          className={`flex h-5.5 leading-5.5 border-b border-transparent ${
                            isDeleted
                              ? 'bg-rose-950/45 text-rose-200 border-l-2 border-rose-500'
                              : 'text-slate-300 hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Left Line Number Gutter */}
                          <div
                            className={`w-12 shrink-0 pr-2 text-right select-none font-mono text-[11px] border-r border-[#1a1b28] ${
                              isDeleted ? 'bg-rose-950/70 text-rose-300 font-bold' : 'bg-[#090a10] text-slate-600'
                            }`}
                          >
                            {line.oldLineNumber}
                          </div>

                          {/* Left Sign Marker (-) */}
                          <div
                            className={`w-6 shrink-0 text-center select-none text-[11px] font-bold ${
                              isDeleted ? 'text-rose-400' : 'text-slate-700'
                            }`}
                          >
                            {isDeleted ? '-' : ' '}
                          </div>

                          {/* Line Text with Intra-line Highlighting */}
                          <div className="flex-1 px-2 whitespace-pre overflow-x-visible">
                            {renderLineContent(line)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT PANE: Working Tree (Active File) */}
                <div
                  ref={rightScrollRef}
                  onScroll={handleRightScroll}
                  className="overflow-auto h-full scrollbar-thin select-text"
                >
                  <div className="min-w-full inline-block">
                    {sideBySidePairs.map((pair, idx) => {
                      const line = pair.right;
                      const isAdded = line?.type === 'added';

                      if (!line) {
                        // Empty placeholder line to align with deletion on left
                        return (
                          <div
                            key={`right-empty-${idx}`}
                            className="flex h-5.5 leading-5.5 bg-[#0a0a10]/50 border-b border-transparent select-none"
                            aria-hidden="true"
                          >
                            <div className="w-12 shrink-0 bg-[#07080d]/50 border-r border-[#161724]" />
                            <div className="w-6 shrink-0 text-center text-transparent">+</div>
                            <div className="flex-1 px-2 text-transparent">+</div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`right-line-${line.id}-${idx}`}
                          className={`flex h-5.5 leading-5.5 border-b border-transparent ${
                            isAdded
                              ? 'bg-emerald-950/45 text-emerald-200 border-l-2 border-emerald-500'
                              : 'text-slate-300 hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Right Line Number Gutter */}
                          <div
                            className={`w-12 shrink-0 pr-2 text-right select-none font-mono text-[11px] border-r border-[#1a1b28] ${
                              isAdded ? 'bg-emerald-950/70 text-emerald-300 font-bold' : 'bg-[#090a10] text-slate-600'
                            }`}
                          >
                            {line.newLineNumber}
                          </div>

                          {/* Right Sign Marker (+) */}
                          <div
                            className={`w-6 shrink-0 text-center select-none text-[11px] font-bold ${
                              isAdded ? 'text-emerald-400' : 'text-slate-700'
                            }`}
                          >
                            {isAdded ? '+' : ' '}
                          </div>

                          {/* Line Text with Intra-line Highlighting */}
                          <div className="flex-1 px-2 whitespace-pre overflow-x-visible">
                            {renderLineContent(line)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
             * UNIFIED INLINE DIFF VIEW
             * Single continuous column with @@ hunks and additions/deletions in sequence
             * ========================================================================= */
            <div
              ref={unifiedScrollRef}
              className="h-full overflow-auto font-mono text-xs select-text scrollbar-thin"
            >
              <div className="min-w-full inline-block">
                {hunks.map((hunk, hIdx) => (
                  <div
                    key={hunk.id}
                    ref={(el) => {
                      if (el) hunkRefs.current.set(hunk.id, el);
                    }}
                    className="border-b border-[#181926]"
                  >
                    {/* Hunk Header */}
                    <div className="sticky top-0 z-10 bg-[#12131e] border-y border-[#202235] px-4 py-1 text-[11px] font-bold text-rose-300 font-mono flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={ICONS.hashtag} className="text-rose-400 text-[10px]" />
                        <span>{hunk.header}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] font-normal">
                        Hunk {hIdx + 1} of {hunks.length}
                      </span>
                    </div>

                    {/* Hunk Lines */}
                    {hunk.lines.map((line) => {
                      const isAdded = line.type === 'added';
                      const isDeleted = line.type === 'deleted';

                      return (
                        <div
                          key={line.id}
                          className={`flex h-5.5 leading-5.5 border-l-2 ${
                            isAdded
                              ? 'bg-emerald-950/45 text-emerald-200 border-emerald-500'
                              : isDeleted
                              ? 'bg-rose-950/45 text-rose-200 border-rose-500'
                              : 'text-slate-300 hover:bg-white/[0.02] border-transparent'
                          }`}
                        >
                          {/* Old Line Number */}
                          <div className="w-12 shrink-0 pr-2 text-right select-none text-[11px] text-slate-600 bg-[#090a10] border-r border-[#1a1b28]">
                            {line.oldLineNumber || ''}
                          </div>

                          {/* New Line Number */}
                          <div className="w-12 shrink-0 pr-2 text-right select-none text-[11px] text-slate-600 bg-[#090a10] border-r border-[#1a1b28]">
                            {line.newLineNumber || ''}
                          </div>

                          {/* Marker (+ / - / space) */}
                          <div
                            className={`w-6 shrink-0 text-center select-none text-[11px] font-bold ${
                              isAdded ? 'text-emerald-400' : isDeleted ? 'text-rose-400' : 'text-slate-700'
                            }`}
                          >
                            {isAdded ? '+' : isDeleted ? '-' : ' '}
                          </div>

                          {/* Line Content */}
                          <div className="flex-1 px-2 whitespace-pre overflow-x-visible">
                            {renderLineContent(line)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="h-9 bg-[#090a10] border-t border-[#1b1c28] px-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center space-x-3 text-[11px]">
            <span>
              <strong className="text-slate-200">{stats.totalChanges}</strong> total line change{stats.totalChanges === 1 ? '' : 's'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold">+{stats.additions} added</span>
            <span className="text-rose-400 font-semibold">-{stats.deletions} deleted</span>
            <span className="text-slate-500 hidden sm:inline">({stats.unchanged} unchanged)</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="hidden sm:inline text-slate-500">
              Navigation: <kbd className="px-1 py-0.5 rounded bg-[#161724] border border-[#232536] text-[10px]">Alt+↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[#161724] border border-[#232536] text-[10px]">Alt+↓</kbd>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-[#161724] hover:bg-[#202234] border border-[#2b2d42] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitDiffModal;
