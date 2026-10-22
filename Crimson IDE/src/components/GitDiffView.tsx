/**
 * Git Diff View Component for CsCode Crimson Code
 * Shows line-by-line additions and deletions for the currently active file.
 * Supports Unified view and Side-by-Side (Split) diff view, intra-line word diffs,
 * hunk jumping, baseline switching, and revert-to-HEAD capabilities.
 * 100% FontAwesome iconography - Zero emojis!
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';
import { FileItem, UserSettings } from '../types';
import { computeLineDiff, DiffLine, DiffHunk, SideBySidePair, FileDiffResult } from '../lib/diffEngine';
import { syntaxEngine } from '../lib/syntaxHighlighter';

interface GitDiffViewProps {
  file: FileItem;
  onClose: () => void;
  onOpenModal?: () => void;
  onUpdateContent?: (fileId: string, newContent: string) => void;
  onRevertFile?: (fileId: string) => void;
  userSettings: UserSettings;
}

export const GitDiffView: React.FC<GitDiffViewProps> = ({
  file,
  onClose,
  onOpenModal,
  onUpdateContent,
  onRevertFile,
  userSettings,
}) => {
  // Diff View Configuration
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [filterMode, setFilterMode] = useState<'all' | 'hunks'>('all');
  const [baselineMode, setBaselineMode] = useState<'head' | 'empty'>('head');
  const [activeHunkIndex, setActiveHunkIndex] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showConfirmRevert, setShowConfirmRevert] = useState<boolean>(false);

  // References for synchronized scrolling in split view
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const unifiedScrollRef = useRef<HTMLDivElement>(null);
  const hunkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const originalContent = useMemo(() => {
    if (baselineMode === 'empty') return '';
    return file.originalContent !== undefined ? file.originalContent : (file.content || '');
  }, [file.originalContent, file.content, baselineMode]);

  const currentContent = useMemo(() => {
    return file.content || '';
  }, [file.content]);

  // Compute Diff
  const diffResult: FileDiffResult = useMemo(() => {
    return computeLineDiff(originalContent, currentContent);
  }, [originalContent, currentContent]);

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
  }, [onClose, activeHunkIndex, hunks]);

  // Synchronized scrolling for split view
  const handleLeftScroll = () => {
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    }
  };

  const handleRightScroll = () => {
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }
  };

  // Copy raw patch to clipboard
  const handleCopyPatch = () => {
    let patch = `--- a/${file.path || file.name}\n+++ b/${file.path || file.name}\n`;
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

  // Revert all changes in file
  const handleRevert = () => {
    if (onRevertFile) {
      onRevertFile(file.id);
    } else if (onUpdateContent && file.originalContent !== undefined) {
      onUpdateContent(file.id, file.originalContent);
    }
    setShowConfirmRevert(false);
  };

  const iconConfig = getFileIconConfig(file.name, file.language);

  // Render inline character/word changes or syntax
  const renderLineContent = (line: DiffLine, lang: string) => {
    if (line.inlineChanges && line.inlineChanges.length > 0) {
      return (
        <span className="font-mono text-xs whitespace-pre">
          {line.inlineChanges.map((change, cIdx) => {
            if (change.type === 'added') {
              return (
                <span
                  key={cIdx}
                  className="bg-emerald-600/40 text-emerald-200 font-semibold rounded-[2px] px-0.5 underline decoration-emerald-400/60"
                >
                  {change.text}
                </span>
              );
            }
            if (change.type === 'deleted') {
              return (
                <span
                  key={cIdx}
                  className="bg-rose-600/40 text-rose-200 line-through rounded-[2px] px-0.5 decoration-rose-400/60"
                >
                  {change.text}
                </span>
              );
            }
            return <span key={cIdx}>{change.text}</span>;
          })}
        </span>
      );
    }

    // Normal line or standard diff line
    if (line.type === 'unchanged') {
      const highlighted = syntaxEngine.highlightCode(line.text || ' ', lang);
      return (
        <span
          className="font-mono text-xs whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
        />
      );
    }

    return (
      <span className="font-mono text-xs whitespace-pre">
        {line.text || ' '}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0d13] text-slate-200 select-none">
      {/* 1. Header Toolbar */}
      <div className="h-10 bg-[#10111a] border-b border-[#212332] px-3 flex items-center justify-between shrink-0 select-none">
        {/* Left: File Info & Diff Badges */}
        <div className="flex items-center space-x-2.5 truncate">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <FontAwesomeIcon icon={iconConfig.icon} className={iconConfig.color} />
            <span className="font-semibold text-slate-100">{file.name}</span>
            <span className="text-[11px] text-slate-500 hidden md:inline truncate max-w-[180px]">
              ({file.path})
            </span>
          </div>

          {/* Git Branch / Target Indicator */}
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#161824] border border-[#26283b] text-[10px] font-mono text-slate-400">
            <FontAwesomeIcon icon={ICONS.git} className="text-rose-400 text-[9px]" />
            <span className="text-rose-300 font-semibold">Working Tree</span>
            <span className="text-slate-600">↔</span>
            <span className="text-slate-300">{baselineMode === 'head' ? 'HEAD' : 'Empty'}</span>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center space-x-1 text-xs font-mono">
            <span
              title={`${stats.additions} additions`}
              className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-[11px] font-bold flex items-center space-x-0.5"
            >
              <FontAwesomeIcon icon={ICONS.plus} className="text-[9px]" />
              <span>{stats.additions}</span>
            </span>
            <span
              title={`${stats.deletions} deletions`}
              className="px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-400 text-[11px] font-bold flex items-center space-x-0.5"
            >
              <FontAwesomeIcon icon={ICONS.minus} className="text-[9px]" />
              <span>{stats.deletions}</span>
            </span>
            {stats.totalChanges === 0 && (
              <span className="text-[11px] text-slate-500 italic">No changes</span>
            )}
          </div>
        </div>

        {/* Right: Actions, Modes & Controls */}
        <div className="flex items-center space-x-1.5 text-xs font-mono shrink-0">
          {/* Hunk Navigator */}
          {hunks.length > 0 && (
            <div className="flex items-center bg-[#151724] border border-[#27293d] rounded p-0.5 text-slate-400 mr-1">
              <button
                onClick={handlePrevHunk}
                title="Previous Change (Alt+Up)"
                className="p-1 hover:text-rose-400 hover:bg-[#1f2233] rounded transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.arrowUp} className="text-[10px]" />
              </button>
              <span className="px-1.5 text-[10px] text-slate-300">
                {activeHunkIndex + 1}/{hunks.length}
              </span>
              <button
                onClick={handleNextHunk}
                title="Next Change (Alt+Down)"
                className="p-1 hover:text-rose-400 hover:bg-[#1f2233] rounded transition-colors cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.arrowDown} className="text-[10px]" />
              </button>
            </div>
          )}

          {/* View Mode Toggle: Unified vs Split */}
          <div className="flex items-center bg-[#151724] border border-[#27293d] rounded p-0.5 text-xs">
            <button
              onClick={() => setViewMode('unified')}
              title="Unified Diff View"
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              title="Side-by-Side (Split) Diff View"
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>
          </div>

          {/* Filter Mode: All lines vs Hunks only */}
          {hunks.length > 0 && (
            <button
              onClick={() => setFilterMode((prev) => (prev === 'all' ? 'hunks' : 'all'))}
              title={`Switch display: ${filterMode === 'all' ? 'Changes only' : 'Full file'}`}
              className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer hidden lg:inline-flex items-center space-x-1 ${
                filterMode === 'hunks'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-[#151724] text-slate-400 hover:text-slate-200 border border-[#27293d]'
              }`}
            >
              <span>{filterMode === 'hunks' ? 'Hunks Only' : 'Full File'}</span>
            </button>
          )}

          {/* Baseline Switcher Dropdown Toggle */}
          <button
            onClick={() => setBaselineMode((prev) => (prev === 'head' ? 'empty' : 'head'))}
            title={`Toggle Comparison Baseline: Currently ${baselineMode === 'head' ? 'vs HEAD' : 'vs Empty'}`}
            className="px-2 py-1 rounded bg-[#151724] hover:bg-[#1e2030] border border-[#27293d] text-slate-300 hover:text-rose-300 text-[11px] transition-colors cursor-pointer hidden sm:flex items-center space-x-1"
          >
            <FontAwesomeIcon icon={ICONS.gitCompare} className="text-[10px] text-rose-400" />
            <span>vs {baselineMode === 'head' ? 'HEAD' : 'Empty'}</span>
          </button>

          {/* Copy Patch */}
          {hasChanges && (
            <button
              onClick={handleCopyPatch}
              title="Copy Git Diff Patch"
              className="px-2 py-1 rounded bg-[#151724] hover:bg-[#1e2030] border border-[#27293d] text-slate-300 hover:text-rose-300 text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={isCopied ? ICONS.check : ICONS.copy} className={isCopied ? 'text-emerald-400' : ''} />
              <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Patch'}</span>
            </button>
          )}

          {/* Revert to HEAD action */}
          {hasChanges && (
            <div className="relative">
              {showConfirmRevert ? (
                <div className="flex items-center space-x-1 bg-rose-950/90 border border-rose-700 rounded px-1.5 py-0.5">
                  <span className="text-[10px] text-rose-200">Discard all?</span>
                  <button
                    onClick={handleRevert}
                    className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirmRevert(false)}
                    className="px-1.5 py-0.5 rounded bg-[#242738] text-slate-300 text-[10px]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmRevert(true)}
                  title="Discard changes and restore to HEAD"
                  className="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-white text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={ICONS.rotateLeft} className="text-[10px]" />
                  <span className="hidden md:inline">Discard</span>
                </button>
              )}
            </div>
          )}

          {/* Pop-out to Dedicated Diff Modal */}
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              title="Open in Dedicated Git Diff Modal (Side-by-Side vs Last Commit)"
              className="px-2 py-1 rounded bg-[#151724] hover:bg-[#1e2030] border border-[#27293d] text-slate-300 hover:text-rose-300 text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={ICONS.expand} className="text-[10px] text-rose-400" />
              <span className="hidden sm:inline">Diff Modal</span>
            </button>
          )}

          {/* Close Diff / Back to Editor */}
          <button
            onClick={onClose}
            title="Close Git Diff and Return to Editor (Escape)"
            className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FontAwesomeIcon icon={ICONS.close} className="text-[10px]" />
            <span>Editor</span>
          </button>
        </div>
      </div>

      {/* 2. Main Diff View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* State A: Clean / No Changes */}
        {!hasChanges ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1b1c2b] to-[#12131d] border border-rose-950/80 flex items-center justify-center text-rose-400 text-2xl shadow-xl">
              <FontAwesomeIcon icon={ICONS.check} />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-200">No Changes Detected</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                The working tree file <span className="text-rose-300 font-bold">{file.name}</span> is
                identical to the committed revision (HEAD).
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setBaselineMode('empty')}
                className="px-3 py-1.5 rounded-lg bg-[#161825] hover:bg-rose-950 border border-[#272a3e] hover:border-rose-700 text-rose-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Inspect All Lines vs Empty
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-md"
              >
                Return to Editor
              </button>
            </div>
          </div>
        ) : viewMode === 'unified' ? (
          /* State B: Unified Diff View */
          <div
            ref={unifiedScrollRef}
            className="flex-1 overflow-auto bg-[#0a0b10] font-mono text-xs select-text"
            style={{ fontSize: `${userSettings.fontSize || 13}px`, lineHeight: '24px' }}
          >
            {filterMode === 'hunks' ? (
              // Display Hunks Only
              hunks.map((hunk, hIdx) => (
                <div
                  key={hunk.id}
                  ref={(el) => {
                    if (el) hunkRefs.current.set(hunk.id, el);
                    else hunkRefs.current.delete(hunk.id);
                  }}
                  className="mb-4 border border-[#1e202f] rounded-lg overflow-hidden mx-3 my-2 shadow-lg"
                >
                  {/* Hunk Header */}
                  <div className="bg-[#121420] border-b border-[#222538] px-3 py-1 text-slate-400 text-[11px] font-mono flex items-center justify-between select-none">
                    <span className="text-rose-400 font-bold">{hunk.header}</span>
                    <span className="text-[10px] text-slate-400">
                      Change {hIdx + 1} of {hunks.length}
                    </span>
                  </div>

                  {/* Hunk Lines */}
                  {hunk.lines.map((line) => (
                    <div
                      key={line.id}
                      className={`flex items-center min-w-full ${
                        line.type === 'added'
                          ? 'bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                          : line.type === 'deleted'
                          ? 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-200 border-l-2 border-rose-500'
                          : 'hover:bg-white/[0.02] text-slate-300 border-l-2 border-transparent'
                      }`}
                      style={{ height: '24px', lineHeight: '24px' }}
                    >
                      {/* Old Line Number */}
                      <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                        {line.oldLineNumber || ''}
                      </span>
                      {/* New Line Number */}
                      <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                        {line.newLineNumber || ''}
                      </span>
                      {/* Diff Prefix Sign */}
                      <span
                        className={`w-6 text-center select-none font-bold shrink-0 ${
                          line.type === 'added'
                            ? 'text-emerald-400'
                            : line.type === 'deleted'
                            ? 'text-rose-400'
                            : 'text-slate-600'
                        }`}
                      >
                        {line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' '}
                      </span>
                      {/* Code Content */}
                      <div className="flex-1 pl-2 pr-4 overflow-x-auto whitespace-pre font-mono">
                        {renderLineContent(line, file.language || 'typescript')}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              // Display All Lines
              lines.map((line) => (
                <div
                  key={line.id}
                  className={`flex items-center min-w-full ${
                    line.type === 'added'
                      ? 'bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                      : line.type === 'deleted'
                      ? 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-200 border-l-2 border-rose-500'
                      : 'hover:bg-white/[0.02] text-slate-300 border-l-2 border-transparent'
                  }`}
                  style={{ height: '24px', lineHeight: '24px' }}
                >
                  {/* Old Line Number */}
                  <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                    {line.oldLineNumber || ''}
                  </span>
                  {/* New Line Number */}
                  <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                    {line.newLineNumber || ''}
                  </span>
                  {/* Diff Prefix Sign */}
                  <span
                    className={`w-6 text-center select-none font-bold shrink-0 ${
                      line.type === 'added'
                        ? 'text-emerald-400'
                        : line.type === 'deleted'
                        ? 'text-rose-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' '}
                  </span>
                  {/* Code Content */}
                  <div className="flex-1 pl-2 pr-4 overflow-x-auto whitespace-pre font-mono">
                    {renderLineContent(line, file.language || 'typescript')}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* State C: Side-by-Side (Split) Diff View */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Original (HEAD / Baseline) */}
            <div className="flex-1 flex flex-col border-r border-[#202232] overflow-hidden">
              <div className="h-6 bg-[#0e0f17] border-b border-[#1f2130] px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
                <span className="text-rose-400 font-semibold flex items-center space-x-1">
                  <FontAwesomeIcon icon={ICONS.git} className="text-[10px]" />
                  <span>Original (HEAD)</span>
                </span>
                <span className="text-[10px] text-slate-400">-{stats.deletions} removed</span>
              </div>
              <div
                ref={leftScrollRef}
                onScroll={handleLeftScroll}
                className="flex-1 overflow-auto bg-[#0a0b10] font-mono text-xs select-text"
                style={{ fontSize: `${userSettings.fontSize || 13}px`, lineHeight: '24px' }}
              >
                {sideBySidePairs.map((pair) => {
                  const left = pair.left;
                  if (!left) {
                    // Blank space when line was added on the right
                    return (
                      <div
                        key={pair.id}
                        className="flex items-center min-w-full bg-[#0e0f16]/60 border-l-2 border-transparent"
                        style={{ height: '24px', lineHeight: '24px' }}
                      >
                        <span className="w-12 text-right pr-2 text-slate-700 select-none text-[11px] shrink-0 font-mono">
                          •
                        </span>
                        <span className="w-5 text-center select-none font-mono text-slate-700 shrink-0" />
                        <div className="flex-1 pl-2" />
                      </div>
                    );
                  }

                  const isDeleted = left.type === 'deleted';
                  return (
                    <div
                      key={pair.id}
                      className={`flex items-center min-w-full ${
                        isDeleted
                          ? 'bg-rose-950/30 hover:bg-rose-950/45 text-rose-200 border-l-2 border-rose-500'
                          : 'hover:bg-white/[0.02] text-slate-300 border-l-2 border-transparent'
                      }`}
                      style={{ height: '24px', lineHeight: '24px' }}
                    >
                      <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                        {left.oldLineNumber || ''}
                      </span>
                      <span
                        className={`w-5 text-center select-none font-bold shrink-0 ${
                          isDeleted ? 'text-rose-400' : 'text-slate-600'
                        }`}
                      >
                        {isDeleted ? '-' : ' '}
                      </span>
                      <div className="flex-1 pl-2 pr-3 overflow-x-auto whitespace-pre font-mono">
                        {renderLineContent(left, file.language || 'typescript')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Working Tree (Modified) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-6 bg-[#0e0f17] border-b border-[#1f2130] px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <FontAwesomeIcon icon={ICONS.pen} className="text-[10px]" />
                  <span>Working Tree (Current)</span>
                </span>
                <span className="text-[10px] text-slate-400">+{stats.additions} added</span>
              </div>
              <div
                ref={rightScrollRef}
                onScroll={handleRightScroll}
                className="flex-1 overflow-auto bg-[#0a0b10] font-mono text-xs select-text"
                style={{ fontSize: `${userSettings.fontSize || 13}px`, lineHeight: '24px' }}
              >
                {sideBySidePairs.map((pair) => {
                  const right = pair.right;
                  if (!right) {
                    // Blank space when line was deleted on the left
                    return (
                      <div
                        key={pair.id}
                        className="flex items-center min-w-full bg-[#0e0f16]/60 border-l-2 border-transparent"
                        style={{ height: '24px', lineHeight: '24px' }}
                      >
                        <span className="w-12 text-right pr-2 text-slate-700 select-none text-[11px] shrink-0 font-mono">
                          •
                        </span>
                        <span className="w-5 text-center select-none font-mono text-slate-700 shrink-0" />
                        <div className="flex-1 pl-2" />
                      </div>
                    );
                  }

                  const isAdded = right.type === 'added';
                  return (
                    <div
                      key={pair.id}
                      className={`flex items-center min-w-full ${
                        isAdded
                          ? 'bg-emerald-950/30 hover:bg-emerald-950/45 text-emerald-200 border-l-2 border-emerald-500'
                          : 'hover:bg-white/[0.02] text-slate-300 border-l-2 border-transparent'
                      }`}
                      style={{ height: '24px', lineHeight: '24px' }}
                    >
                      <span className="w-12 text-right pr-2 text-slate-400 select-none text-[11px] shrink-0 font-mono">
                        {right.newLineNumber || ''}
                      </span>
                      <span
                        className={`w-5 text-center select-none font-bold shrink-0 ${
                          isAdded ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        {isAdded ? '+' : ' '}
                      </span>
                      <div className="flex-1 pl-2 pr-3 overflow-x-auto whitespace-pre font-mono">
                        {renderLineContent(right, file.language || 'typescript')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Status Bar for Git Diff */}
      <div className="h-6 bg-[#0a0b0f] border-t border-[#1c1e2b] px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-300">{file.name}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            {stats.additions} additions, {stats.deletions} deletions across {hunks.length}{' '}
            {hunks.length === 1 ? 'hunk' : 'hunks'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-slate-400 hidden sm:inline">
            Press <kbd className="px-1 py-0.5 rounded bg-[#1b1d2a] text-slate-300 text-[10px]">Escape</kbd> to return to editor
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-rose-400 font-semibold capitalize">{viewMode} Mode</span>
        </div>
      </div>
    </div>
  );
};
