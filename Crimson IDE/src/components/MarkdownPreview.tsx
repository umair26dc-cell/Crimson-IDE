import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';

interface MarkdownPreviewProps {
  content: string;
  fileName?: string;
  onClose?: () => void;
  className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  fileName = 'README.md',
  onClose,
  className = '',
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Simple Markdown Parser into React Nodes
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;
      const header = tableRows[0];
      const body = tableRows.slice(1).filter((r) => !r.every((c) => /^-+$/.test(c.trim())));

      elements.push(
        <div key={`table-${elements.length}`} className="my-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-[#252838]">
            <thead>
              <tr className="bg-[#161824] border-b border-[#252838]">
                {header.map((col, idx) => (
                  <th key={idx} className="p-2 font-semibold text-rose-300 border-r border-[#252838] last:border-r-0">
                    {parseInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-[#1c1e2a] hover:bg-[#12131e]">
                  {row.map((col, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-300 border-r border-[#1c1e2a] last:border-r-0">
                      {parseInline(col.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    const parseInline = (text: string): React.ReactNode => {
      // Inline Code: `code`
      const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g);

      return parts.map((part, pIdx) => {
        if (!part) return null;
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code
              key={pIdx}
              className="px-1.5 py-0.5 rounded bg-[#181926] text-rose-300 font-mono text-[11px] border border-rose-950"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return <em key={pIdx} className="italic text-slate-300">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
          return <del key={pIdx} className="line-through text-slate-500">{part.slice(2, -2)}</del>;
        }
        // Link: [text](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <a
              key={pIdx}
              href={linkMatch[2]}
              target="_blank"
              rel="noreferrer"
              className="text-rose-400 hover:text-rose-300 underline font-medium"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return part;
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block toggles
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const fullCode = codeBlockContent.join('\n');
          const codeId = `code-blk-${i}`;
          elements.push(
            <div key={codeId} className="my-3 rounded-lg overflow-hidden border border-[#23263a] bg-[#0c0d14]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#141520] border-b border-[#202232] text-[11px] text-slate-400 font-mono">
                <span className="uppercase text-rose-400 text-[10px] font-bold">
                  {codeBlockLang || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(fullCode, codeId)}
                  className="flex items-center space-x-1 hover:text-rose-300 transition-colors"
                >
                  <FontAwesomeIcon icon={copiedCodeId === codeId ? ICONS.check : ICONS.copy} className={copiedCodeId === codeId ? 'text-emerald-400' : ''} />
                  <span>{copiedCodeId === codeId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
                {fullCode}
              </pre>
            </div>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          flushTable();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cols = line.split('|').slice(1, -1);
        tableRows.push(cols);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`sp-${i}`} className="h-3" />);
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-white mt-4 pb-2 border-b border-rose-900/60 font-sans tracking-tight">
            {parseInline(line.slice(2))}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-semibold text-rose-200 mt-4 pb-1.5 border-b border-[#222434] font-sans">
            {parseInline(line.slice(3))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-sm font-semibold text-rose-300 mt-3 font-sans">
            {parseInline(line.slice(4))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="text-xs font-semibold text-slate-300 mt-2 font-sans">
            {parseInline(line.slice(5))}
          </h4>
        );
        continue;
      }

      // Horizontal Rule
      if (/^(\*\*\*|---|___)$/.test(line.trim())) {
        elements.push(<hr key={`hr-${i}`} className="my-4 border-[#252838]" />);
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`bq-${i}`}
            className="pl-3 py-1 my-2 border-l-2 border-rose-500 bg-[#171826]/60 rounded-r text-slate-300 italic text-xs leading-relaxed"
          >
            {parseInline(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Task List items
      if (/^[-*]\s+\[([ xX])\]\s+/.test(line)) {
        const checked = line.includes('[x]') || line.includes('[X]');
        const text = line.replace(/^[-*]\s+\[([ xX])\]\s+/, '');
        elements.push(
          <div key={`task-${i}`} className="flex items-center space-x-2 my-1 text-xs">
            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${checked ? 'bg-rose-600 border-rose-500 text-white' : 'border-[#33364c] bg-[#11121c]'}`}>
              {checked && <FontAwesomeIcon icon={ICONS.check} />}
            </span>
            <span className={checked ? 'line-through text-slate-500' : 'text-slate-300'}>
              {parseInline(text)}
            </span>
          </div>
        );
        continue;
      }

      // Bullet List
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-xs text-slate-300 leading-relaxed my-0.5">
            {parseInline(line.slice(2))}
          </li>
        );
        continue;
      }

      // Numbered List
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="ml-4 flex items-start space-x-1.5 text-xs text-slate-300 leading-relaxed my-0.5">
            <span className="font-mono text-rose-400 font-semibold">{numMatch[1]}.</span>
            <span>{parseInline(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Standard Paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1">
          {parseInline(line)}
        </p>
      );
    }

    flushTable();
    return elements;
  };

  return (
    <div className={`flex flex-col h-full bg-[#0d0e15] border-l border-[#1f212f] text-slate-200 select-text overflow-hidden ${className}`}>
      {/* Markdown Preview Header */}
      <div className="h-8 px-3 bg-[#11121c] border-b border-[#202232] flex items-center justify-between text-xs font-mono select-none shrink-0">
        <div className="flex items-center space-x-2 text-rose-400 font-semibold">
          <FontAwesomeIcon icon={ICONS.bookOpen} className="text-xs" />
          <span>Markdown Live Preview</span>
          <span className="text-[10px] text-slate-500 font-normal truncate max-w-[120px]">
            {fileName}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close Preview"
            className="p-1 hover:text-rose-400 hover:bg-[#1a1b28] rounded text-xs transition-colors"
          >
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        )}
      </div>

      {/* Rendered Markdown Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl space-y-0.5">
        {content.trim() ? (
          renderMarkdown(content)
        ) : (
          <div className="text-center py-10 text-slate-500 text-xs italic font-mono">
            Empty markdown document. Start typing to preview formatted output.
          </div>
        )}
      </div>
    </div>
  );
};
