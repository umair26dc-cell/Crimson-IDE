import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CodeLensItem, CodeReference } from '../types';
import { ICONS, getFileIconConfig } from '../lib/fontawesome';

interface ReferencesPeekWidgetProps {
  lens: CodeLensItem;
  onClose: () => void;
  onNavigateToReference: (fileId: string, line: number, col: number) => void;
  activeFileId: string;
}

export const ReferencesPeekWidget: React.FC<ReferencesPeekWidgetProps> = ({
  lens,
  onClose,
  onNavigateToReference,
  activeFileId,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filter references by query
  const filteredReferences = useMemo(() => {
    if (!filterQuery.trim()) return lens.references;
    const q = filterQuery.toLowerCase();
    return lens.references.filter(
      (ref) =>
        ref.fileName.toLowerCase().includes(q) ||
        ref.filePath.toLowerCase().includes(q) ||
        ref.lineText.toLowerCase().includes(q)
    );
  }, [lens.references, filterQuery]);

  // Group references by file
  const groupedReferences = useMemo(() => {
    const groups: Record<string, { fileId: string; filePath: string; fileName: string; refs: CodeReference[] }> = {};
    for (const ref of filteredReferences) {
      if (!groups[ref.fileId]) {
        groups[ref.fileId] = {
          fileId: ref.fileId,
          filePath: ref.filePath,
          fileName: ref.fileName,
          refs: [],
        };
      }
      groups[ref.fileId].refs.push(ref);
    }
    return Object.values(groups);
  }, [filteredReferences]);

  // Unique files count
  const fileCount = useMemo(() => {
    const set = new Set(lens.references.map((r) => r.fileId));
    return set.size;
  }, [lens.references]);

  // Copy all reference locations
  const handleCopyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = lens.references
      .map((r) => `${r.filePath}:${r.line}:${r.col}  ${r.lineText}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation within peek widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredReferences.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredReferences.length) % Math.max(1, filteredReferences.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredReferences[selectedIndex];
        if (selected) {
          onNavigateToReference(selected.fileId, selected.line, selected.col);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredReferences, selectedIndex, onClose, onNavigateToReference]);

  // Highlight matching symbol word in snippet
  const renderHighlightedSnippet = (text: string, targetWord: string) => {
    const parts = text.split(new RegExp(`(\\b${targetWord}\\b)`, 'gi'));
    return parts.map((part, i) => {
      if (part.toLowerCase() === targetWord.toLowerCase()) {
        return (
          <span key={i} className="font-bold text-rose-300 bg-rose-950/80 px-1 py-0.5 rounded border border-rose-700/60 shadow-sm">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="bg-[#10121d] border-2 border-rose-600/80 shadow-2xl rounded-xl overflow-hidden font-mono text-xs flex flex-col z-40 animate-fadeIn max-w-2xl w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="bg-[#161826] border-b border-[#26283b] px-3.5 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-md bg-rose-950/90 border border-rose-700/60 flex items-center justify-center text-rose-400 shrink-0 text-xs shadow-sm">
            <FontAwesomeIcon icon={ICONS.references} />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                {lens.symbolKind}
              </span>
              <span className="text-slate-100 font-bold text-xs truncate">
                {lens.symbolName}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-rose-300 font-semibold">{lens.referenceCount}</span> {lens.referenceCount === 1 ? 'reference' : 'references'} in{' '}
              <span className="text-slate-300 font-semibold">{fileCount}</span> {fileCount === 1 ? 'file' : 'files'}
            </div>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {/* Quick Filter */}
          <div className="relative">
            <input
              ref={filterInputRef}
              type="text"
              placeholder="Filter references..."
              value={filterQuery}
              onChange={(e) => {
                setFilterQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="bg-[#0b0c13] border border-[#25283b] focus:border-rose-500 rounded px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 w-36 outline-none"
            />
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopyAll}
            disabled={lens.references.length === 0}
            title="Copy all reference locations to clipboard"
            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-[#202235] rounded transition-colors disabled:opacity-40"
          >
            <FontAwesomeIcon icon={copied ? ICONS.circleCheck : ICONS.copy} className={copied ? 'text-emerald-400' : ''} />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close Peek Widget (Esc)"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#202235] rounded transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>
      </div>

      {/* References List Container */}
      <div
        ref={listContainerRef}
        className="max-h-80 overflow-y-auto p-2 space-y-3 divide-y divide-[#1e2030]"
      >
        {lens.references.length === 0 ? (
          <div className="p-6 text-center text-slate-400 space-y-2">
            <div className="text-rose-400/80 text-xl">
              <FontAwesomeIcon icon={ICONS.infoCircle} />
            </div>
            <div className="text-slate-300 font-semibold text-xs">No references found</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
              No usages of <code className="text-rose-300 font-bold">{lens.symbolName}</code> were found outside its declaration in this workspace. Call or import it in any file to see references update dynamically.
            </p>
          </div>
        ) : filteredReferences.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">
            No references matching filter &quot;{filterQuery}&quot;
          </div>
        ) : (
          groupedReferences.map((group) => {
            const fileIcon = getFileIconConfig(group.fileName);
            return (
              <div key={group.fileId} className="pt-2 first:pt-0 space-y-1">
                {/* File Header */}
                <div className="flex items-center justify-between px-2 py-1 rounded bg-[#141624] text-slate-300 text-[11px]">
                  <div className="flex items-center space-x-1.5 truncate">
                    <FontAwesomeIcon icon={fileIcon.icon} className={fileIcon.color} />
                    <span className="font-semibold text-slate-200">{group.fileName}</span>
                    <span className="text-slate-500 text-[10px] truncate">{group.filePath}</span>
                    {group.fileId === activeFileId && (
                      <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-800/40 px-1 rounded">
                        current file
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 bg-[#1e2034] px-1.5 py-0.5 rounded font-mono shrink-0">
                    {group.refs.length} {group.refs.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>

                {/* File Reference Items */}
                <div className="space-y-0.5 pl-2">
                  {group.refs.map((ref) => {
                    const globalIdx = filteredReferences.indexOf(ref);
                    const isSelected = globalIdx === selectedIndex;

                    return (
                      <button
                        key={ref.id}
                        onClick={() => onNavigateToReference(ref.fileId, ref.line, ref.col)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between group transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-950/70 border border-rose-600/70 text-slate-100 shadow-sm'
                            : 'hover:bg-[#181a29] text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                          <span className={`text-[10px] font-mono shrink-0 ${isSelected ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                            {ref.line}:{ref.col}
                          </span>
                          <span className="truncate text-xs font-mono text-slate-300 group-hover:text-white">
                            {renderHighlightedSnippet(ref.lineText, lens.symbolName)}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-rose-300 bg-rose-950 px-1 rounded border border-rose-800">
                            Jump ↵
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation Tip */}
      <div className="bg-[#0c0d14] border-t border-[#1c1e2c] px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 select-none">
        <div className="flex items-center space-x-2">
          <span>↑↓ Navigate</span>
          <span>•</span>
          <span>↵ Jump to Code</span>
          <span>•</span>
          <span>Esc Dismiss</span>
        </div>
        <div className="text-slate-400 font-mono">
          CsCode CodeLens Engine
        </div>
      </div>
    </div>
  );
};
