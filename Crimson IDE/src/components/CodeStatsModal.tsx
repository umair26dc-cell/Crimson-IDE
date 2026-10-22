import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { FileItem } from '../types';

interface CodeStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  allFiles: FileItem[];
  selectionText?: string;
}

export const CodeStatsModal: React.FC<CodeStatsModalProps> = ({
  isOpen,
  onClose,
  file,
  allFiles,
  selectionText = '',
}) => {
  if (!isOpen) return null;

  const content = file?.content || '';

  // Calculate detailed file metrics
  const stats = useMemo(() => {
    const lines = content.split('\n');
    const totalLines = lines.length;
    let blankLines = 0;
    let commentLines = 0;
    let codeLines = 0;
    let maxLineLength = 0;

    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed) {
        blankLines++;
      } else if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('<!--')
      ) {
        commentLines++;
      } else {
        codeLines++;
      }
      if (l.length > maxLineLength) {
        maxLineLength = l.length;
      }
    }

    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charsWithSpaces = content.length;
    const charsWithoutSpaces = content.replace(/\s/g, '').length;
    const bytes = new Blob([content]).size;
    const sizeFormatted = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    const readingTimeMins = Math.ceil(words / 200);

    // Workspace total stats
    let totalWorkspaceFiles = 0;
    let totalWorkspaceBytes = 0;

    function countFiles(nodes: FileItem[]) {
      for (const n of nodes) {
        if (!n.isFolder) {
          totalWorkspaceFiles++;
          if (n.content) {
            totalWorkspaceBytes += new Blob([n.content]).size;
          }
        }
        if (n.children) {
          countFiles(n.children);
        }
      }
    }
    countFiles(allFiles);

    const workspaceSizeFormatted =
      totalWorkspaceBytes < 1024
        ? `${totalWorkspaceBytes} B`
        : `${(totalWorkspaceBytes / 1024).toFixed(1)} KB`;

    return {
      totalLines,
      blankLines,
      commentLines,
      codeLines,
      maxLineLength,
      words,
      charsWithSpaces,
      charsWithoutSpaces,
      sizeFormatted,
      readingTimeMins,
      totalWorkspaceFiles,
      workspaceSizeFormatted,
    };
  }, [content, allFiles]);

  // Selection metrics if any text is highlighted
  const selectionStats = useMemo(() => {
    if (!selectionText) return null;
    const selLines = selectionText.split('\n').length;
    const selWords = selectionText.trim() ? selectionText.trim().split(/\s+/).length : 0;
    const selChars = selectionText.length;
    return { selLines, selWords, selChars };
  }, [selectionText]);

  // Download active file to user's computer
  const handleDownloadFile = () => {
    if (!file) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download entire workspace as a JSON project export
  const handleExportWorkspace = () => {
    const exportData = {
      project: 'CsCode Crimson Code Workspace',
      exportedAt: new Date().toISOString(),
      fileCount: stats.totalWorkspaceFiles,
      files: allFiles,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crimson-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-[#10111a] border border-rose-900/60 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-200 font-mono text-xs">
        {/* Header */}
        <div className="px-4 py-3 bg-[#151624] border-b border-[#23263a] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <FontAwesomeIcon icon={ICONS.chartBar} />
            <span>Code Statistics & File Inspector</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-rose-400 hover:bg-[#202234] rounded text-slate-400 transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Active File Banner */}
          {file ? (
            <div className="p-2.5 rounded-lg bg-[#0a0b12] border border-[#202232] flex items-center justify-between">
              <div>
                <div className="font-semibold text-rose-300">{file.name}</div>
                <div className="text-[10px] text-slate-400">{file.path}</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold uppercase">
                {file.language || 'text'}
              </span>
            </div>
          ) : (
            <div className="text-slate-400 italic text-center py-2">No active file selected</div>
          )}

          {/* Selection Stats (if active) */}
          {selectionStats && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-200">
              <div className="text-[10px] font-bold uppercase text-rose-300 mb-1 flex items-center space-x-1">
                <FontAwesomeIcon icon={ICONS.check} className="text-[9px]" />
                <span>Current Selection</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-[#11121d] p-1.5 rounded">
                  <div className="text-white font-bold">{selectionStats.selLines}</div>
                  <div className="text-[10px] text-slate-400">Lines</div>
                </div>
                <div className="bg-[#11121d] p-1.5 rounded">
                  <div className="text-white font-bold">{selectionStats.selWords}</div>
                  <div className="text-[10px] text-slate-400">Words</div>
                </div>
                <div className="bg-[#11121d] p-1.5 rounded">
                  <div className="text-white font-bold">{selectionStats.selChars}</div>
                  <div className="text-[10px] text-slate-400">Chars</div>
                </div>
              </div>
            </div>
          )}

          {/* Grid Stats */}
          {file && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Document Metrics
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-rose-400 font-bold text-sm">{stats.totalLines}</div>
                  <div className="text-[10px] text-slate-400">Total Lines</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-rose-300 font-bold text-sm">{stats.codeLines}</div>
                  <div className="text-[10px] text-slate-400">Code Lines</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-amber-400 font-bold text-sm">{stats.commentLines}</div>
                  <div className="text-[10px] text-slate-400">Comment Lines</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-slate-400 font-bold text-sm">{stats.blankLines}</div>
                  <div className="text-[10px] text-slate-400">Blank Lines</div>
                </div>

                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-white font-bold text-sm">{stats.words}</div>
                  <div className="text-[10px] text-slate-400">Words</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-white font-bold text-sm">{stats.charsWithSpaces}</div>
                  <div className="text-[10px] text-slate-400">Characters</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-emerald-400 font-bold text-sm">{stats.sizeFormatted}</div>
                  <div className="text-[10px] text-slate-400">File Size</div>
                </div>
                <div className="bg-[#141522] p-2 rounded border border-[#202232]">
                  <div className="text-rose-400 font-bold text-sm">~{stats.readingTimeMins}m</div>
                  <div className="text-[10px] text-slate-400">Read Time</div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Level Stats */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Workspace Overview
            </div>
            <div className="p-3 bg-[#0c0d15] rounded-lg border border-[#202232] flex items-center justify-between text-xs">
              <div>
                <span className="text-white font-bold">{stats.totalWorkspaceFiles}</span>
                <span className="text-slate-400 ml-1">total files in workspace</span>
              </div>
              <div className="text-rose-400 font-bold">
                {stats.workspaceSizeFormatted}
              </div>
            </div>
          </div>

          {/* Quick Actions: Export & Download */}
          <div className="pt-2 border-t border-[#23263a] flex flex-col sm:flex-row items-center justify-between gap-2">
            {file && (
              <button
                onClick={handleDownloadFile}
                className="w-full sm:w-auto px-3 py-1.5 rounded bg-[#181928] hover:bg-rose-950 text-slate-200 hover:text-rose-300 border border-[#25283c] hover:border-rose-800 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <FontAwesomeIcon icon={ICONS.download} className="text-rose-400" />
                <span>Download {file.name}</span>
              </button>
            )}

            <button
              onClick={handleExportWorkspace}
              className="w-full sm:w-auto px-3 py-1.5 rounded bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700/60 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.cubes} />
              <span>Export Workspace (JSON)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
