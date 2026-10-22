/**
 * Code Minimap Component for Large File Navigation
 * Positioned to the right of the line numbers/diagnostics code gutter.
 * Features:
 * - Scalable overview visualization with customizable scale factor (0.5x to 2.5x zoom in / zoom out)
 * - Real-time canvas miniature rendering with syntax-aware tinting and dynamic line metrics
 * - High-visibility visual indicators for search matches (canvas glow bands + overview ruler ticks + toolbar counters)
 * - High-visibility visual indicators for diagnostic warnings & errors (canvas bands + overview ruler pins + toolbar counters)
 * - Interactive draggable viewport slider (lens) with line-accurate synchronization
 * - Click-to-jump and click-and-drag scrubbing across large files with coordinate transform
 * - Hover line preview ruler and contextual issue / search match tooltip
 * - Quick-jump navigation (Next/Prev Search Match, Next/Prev Error or Warning, Home, End)
 * - 100% FontAwesome iconography (Zero emojis)
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import { Diagnostic, SearchMatch } from '../types';
import { tokenizeForMinimap } from '../lib/syntaxHighlighter';

interface CodeMinimapProps {
  lines: string[];
  fileContent: string;
  language?: string;
  currentLine: number;
  diagnostics: Diagnostic[];
  searchMatches?: SearchMatch[];
  searchQuery?: string;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scaleFactor?: number;
  onUpdateScale?: (newScale: number) => void;
  onScrollTo: (scrollTop: number) => void;
  onScrollLine: (lineNumber: number) => void;
  crimsonShade?: 'classic' | 'ruby' | 'neon' | 'garnet';
}

export const CodeMinimap: React.FC<CodeMinimapProps> = ({
  lines,
  fileContent,
  language = 'typescript',
  currentLine,
  diagnostics,
  searchMatches = [],
  searchQuery = '',
  scrollTop,
  scrollHeight,
  clientHeight,
  scaleFactor = 1.0,
  onUpdateScale,
  onScrollTo,
  onScrollLine,
  crimsonShade = 'ruby',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Minimap width setting: compact (60px), standard (92px), expanded (132px)
  const [minimapWidth, setMinimapWidth] = useState<'compact' | 'standard' | 'expanded'>('standard');
  const widthPx = minimapWidth === 'compact' ? 60 : minimapWidth === 'expanded' ? 132 : 92;

  // Prism.js syntax highlighting toggle
  const [syntaxHighlightingEnabled, setSyntaxHighlightingEnabled] = useState<boolean>(true);

  // Track dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Hover state for line scrubbing & tooltips
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(400);

  // Clamped scale factor (0.5x to 2.5x)
  const scale = Math.max(0.5, Math.min(2.5, scaleFactor || 1.0));

  // Compute Prism-powered syntax highlighted tokens per line
  const minimapLineData = useMemo(() => {
    const rawCode = fileContent || lines.join('\n');
    return tokenizeForMinimap(rawCode, language, crimsonShade);
  }, [fileContent, lines, language, crimsonShade]);

  // Separate diagnostics by severity
  const errors = useMemo(() => diagnostics.filter((d) => d.severity === 'error'), [diagnostics]);
  const warnings = useMemo(() => diagnostics.filter((d) => d.severity === 'warning'), [diagnostics]);

  // Lookup maps for fast line checking
  const errorByLine = useMemo(() => {
    const map = new Map<number, Diagnostic>();
    errors.forEach((d) => map.set(d.line, d));
    return map;
  }, [errors]);

  const warningByLine = useMemo(() => {
    const map = new Map<number, Diagnostic>();
    warnings.forEach((d) => map.set(d.line, d));
    return map;
  }, [warnings]);

  const searchMatchesByLine = useMemo(() => {
    const map = new Map<number, SearchMatch[]>();
    searchMatches.forEach((m) => {
      const arr = map.get(m.line) || [];
      arr.push(m);
      map.set(m.line, arr);
    });
    return map;
  }, [searchMatches]);

  // Theme accent colors based on crimson shade
  const themeColors = useMemo(() => {
    switch (crimsonShade) {
      case 'classic':
        return {
          sliderBorder: 'border-rose-500/70',
          sliderBg: 'bg-rose-500/15',
          cursorLine: '#f43f5e',
          keyword: '#fb7185',
          accent: 'text-rose-400',
        };
      case 'neon':
        return {
          sliderBorder: 'border-pink-500/70',
          sliderBg: 'bg-pink-500/15',
          cursorLine: '#ec4899',
          keyword: '#f472b6',
          accent: 'text-pink-400',
        };
      case 'garnet':
        return {
          sliderBorder: 'border-rose-600/70',
          sliderBg: 'bg-rose-600/15',
          cursorLine: '#e11d48',
          keyword: '#f43f5e',
          accent: 'text-rose-500',
        };
      case 'ruby':
      default:
        return {
          sliderBorder: 'border-red-500/70',
          sliderBg: 'bg-red-500/15',
          cursorLine: '#ef4444',
          keyword: '#f87171',
          accent: 'text-red-400',
        };
    }
  }, [crimsonShade]);

  // Measure container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalLines = Math.max(lines.length, 1);

  // Editor scroll metrics
  const effectiveScrollHeight = Math.max(scrollHeight, clientHeight + 1);
  const maxEditorScroll = Math.max(1, effectiveScrollHeight - clientHeight);
  const scrollRatio = Math.min(1, Math.max(0, scrollTop / maxEditorScroll));

  // Virtual height calculations with zoom scale factor
  const baseLineStep = containerHeight / totalLines;
  const lineStep = Math.max(0.7, baseLineStep * scale);
  const totalMinimapHeight = Math.max(containerHeight, totalLines * lineStep);
  const maxMinimapScroll = Math.max(0, totalMinimapHeight - containerHeight);
  const minimapScrollY = scrollRatio * maxMinimapScroll;

  // Viewport lens (slider) calculations with sub-pixel continuous precision
  const editorLineHeight = 24;
  const exactTopLine = scrollTop / editorLineHeight;
  const exactVisibleLines = clientHeight / editorLineHeight;
  const rawSliderTop = exactTopLine * lineStep - minimapScrollY;
  const rawSliderHeight = Math.max(22, exactVisibleLines * lineStep);
  const sliderTop = Math.max(0, Math.min(containerHeight - rawSliderHeight, rawSliderTop));
  const sliderHeight = Math.min(containerHeight, rawSliderHeight);

  // Render miniature code and indicators on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = widthPx;
    const displayHeight = containerHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Subtle right rail separator
    ctx.strokeStyle = '#141622';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(displayWidth - 7, 0);
    ctx.lineTo(displayWidth - 7, displayHeight);
    ctx.stroke();

    if (totalLines === 0) return;

    ctx.save();
    ctx.translate(0, -minimapScrollY);

    const drawLineHeight = Math.max(1, Math.min(5, lineStep * 0.85));

    // 1. Render Search Match full-width background highlight stripes
    if (searchMatches.length > 0) {
      ctx.fillStyle = 'rgba(234, 179, 8, 0.45)'; // Vibrant golden highlight
      searchMatches.forEach((match) => {
        const y = (match.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, displayWidth - 7, Math.max(2.5, lineStep));
      });

      // Accent tick on left edge for search matches
      ctx.fillStyle = '#facc15';
      searchMatches.forEach((match) => {
        const y = (match.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, 3, Math.max(2.5, lineStep));
      });
    }

    // 2. Render Diagnostic Error & Warning full-width background stripes
    if (warnings.length > 0) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.40)'; // Amber warning stripe
      warnings.forEach((warn) => {
        const y = (warn.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, displayWidth - 7, Math.max(2.5, lineStep));
      });

      ctx.fillStyle = '#f59e0b';
      warnings.forEach((warn) => {
        const y = (warn.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, 3.5, Math.max(2.5, lineStep));
      });
    }

    if (errors.length > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.50)'; // Red error stripe
      errors.forEach((err) => {
        const y = (err.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, displayWidth - 7, Math.max(2.5, lineStep));
      });

      ctx.fillStyle = '#f43f5e';
      errors.forEach((err) => {
        const y = (err.line - 1) * lineStep;
        if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;
        ctx.fillRect(0, y, 3.5, Math.max(2.5, lineStep));
      });
    }

    // 3. Draw Syntax-Highlighted Miniature Code Representation using Prism Themes
    const availableWidth = displayWidth - 9; // Leave room for right rail overview ruler
    const maxChars = minimapWidth === 'expanded' ? 100 : minimapWidth === 'compact' ? 55 : 80;
    const charWidth = Math.max(0.65, Math.min(2.5, (availableWidth * 0.72) / maxChars * Math.min(1.4, scale)));

    minimapLineData.forEach((lineData, idx) => {
      const y = idx * lineStep;
      if (y + lineStep < minimapScrollY || y > minimapScrollY + displayHeight) return;

      if (lineData.segments.length === 0) return;

      const yOffset = y + (lineStep - drawLineHeight) / 2;

      if (!syntaxHighlightingEnabled) {
        // Plain structural bar fallback
        const indent = Math.min(availableWidth * 0.45, Math.max(3, lineData.indent * charWidth));
        const barWidth = Math.max(3, Math.min(availableWidth - indent, (lineData.totalLength - lineData.indent) * charWidth));
        ctx.fillStyle = '#64748b';
        ctx.fillRect(indent, yOffset, barWidth, drawLineHeight);
        return;
      }

      // Render Prism.js syntax token micro-segments
      for (const seg of lineData.segments) {
        const x = 3 + seg.charStart * charWidth;
        if (x >= availableWidth) break;

        const rawWidth = (seg.charEnd - seg.charStart) * charWidth;
        const width = Math.max(1.2, Math.min(availableWidth - x, rawWidth - (charWidth > 1.2 ? 0.35 : 0)));

        ctx.fillStyle = seg.color;

        if (scale >= 1.5 && drawLineHeight >= 2.8 && width >= 3) {
          ctx.beginPath();
          ctx.roundRect(x, yOffset, width, drawLineHeight, 0.8);
          ctx.fill();
        } else {
          ctx.fillRect(x, yOffset, width, drawLineHeight);
        }
      }
    });

    // 4. Draw Current Cursor Line tick
    if (currentLine >= 1 && currentLine <= totalLines) {
      const cursorY = (currentLine - 1) * lineStep;
      ctx.fillStyle = themeColors.cursorLine;
      ctx.fillRect(0, cursorY, displayWidth - 7, Math.max(1.8, drawLineHeight * 1.3));
    }

    ctx.restore();
  }, [
    lines,
    totalLines,
    minimapLineData,
    syntaxHighlightingEnabled,
    minimapWidth,
    widthPx,
    containerHeight,
    themeColors,
    currentLine,
    lineStep,
    minimapScrollY,
    scale,
    searchMatches,
    errors,
    warnings,
  ]);

  // Line calculation from Client Y coordinate (accounting for zoom scale and minimap scroll)
  const getLineFromClientY = useCallback(
    (clientY: number): { line: number; relY: number } => {
      if (!containerRef.current) return { line: 1, relY: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const mapY = relY + minimapScrollY;
      const ratio = totalMinimapHeight > 0 ? mapY / totalMinimapHeight : 0;
      const calculatedLine = Math.min(
        totalLines,
        Math.max(1, Math.round(1 + ratio * (totalLines - 1)))
      );
      return { line: calculatedLine, relY };
    },
    [totalLines, minimapScrollY, totalMinimapHeight]
  );

  // Surface Pointer Down
  const handleSurfacePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { line, relY } = getLineFromClientY(e.clientY);
    setIsDragging(true);
    setHoveredLine(line);
    setHoverY(relY);
    onScrollLine(line);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture is unsupported
    }
  };

  // Surface Pointer Move
  const handleSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { line, relY } = getLineFromClientY(e.clientY);
    setHoveredLine(line);
    setHoverY(relY);

    if (isDragging) {
      onScrollLine(line);
    }
  };

  // Surface Pointer Up / End Drag
  const handleSurfacePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already released
      }
    }
  };

  const handleSurfacePointerLeave = () => {
    if (!isDragging) {
      setHoveredLine(null);
      setHoverY(null);
    }
  };

  // Global window listeners when dragging to ensure seamless tracking even outside container
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      const { line, relY } = getLineFromClientY(e.clientY);
      setHoveredLine(line);
      setHoverY(relY);
      onScrollLine(line);
    };

    const onGlobalPointerUp = () => {
      setIsDragging(false);
      setHoveredLine(null);
      setHoverY(null);
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  }, [isDragging, getLineFromClientY, onScrollLine]);

  // Quick Navigation Helpers
  const handleJumpTop = () => onScrollLine(1);
  const handleJumpBottom = () => onScrollLine(totalLines);

  const handleNextDiagnostic = () => {
    if (diagnostics.length === 0) return;
    const next = diagnostics.find((d) => d.line > currentLine) || diagnostics[0];
    if (next) onScrollLine(next.line);
  };

  const handlePrevDiagnostic = () => {
    if (diagnostics.length === 0) return;
    const prev = [...diagnostics].reverse().find((d) => d.line < currentLine) || diagnostics[diagnostics.length - 1];
    if (prev) onScrollLine(prev.line);
  };

  const handleNextSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const next = searchMatches.find((m) => m.line > currentLine) || searchMatches[0];
    if (next) onScrollLine(next.line);
  };

  const handlePrevSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = [...searchMatches].reverse().find((m) => m.line < currentLine) || searchMatches[searchMatches.length - 1];
    if (prev) onScrollLine(prev.line);
  };

  // Scale handlers
  const handleZoomIn = () => {
    if (!onUpdateScale) return;
    const newScale = Math.min(2.5, Math.round((scale + 0.25) * 100) / 100);
    onUpdateScale(newScale);
  };

  const handleZoomOut = () => {
    if (!onUpdateScale) return;
    const newScale = Math.max(0.5, Math.round((scale - 0.25) * 100) / 100);
    onUpdateScale(newScale);
  };

  const handleResetScale = () => {
    if (!onUpdateScale) return;
    onUpdateScale(1.0);
  };

  // Hovered line content & diagnostics
  const hoveredLineContent = useMemo(() => {
    if (!hoveredLine || hoveredLine > lines.length) return '';
    return lines[hoveredLine - 1]?.trim() || '';
  }, [hoveredLine, lines]);

  const hoveredDiagnostic = useMemo(() => {
    if (!hoveredLine) return null;
    return errorByLine.get(hoveredLine) || warningByLine.get(hoveredLine) || null;
  }, [hoveredLine, errorByLine, warningByLine]);

  const hoveredSearchMatches = useMemo(() => {
    if (!hoveredLine) return null;
    return searchMatchesByLine.get(hoveredLine) || null;
  }, [hoveredLine, searchMatchesByLine]);

  return (
    <div
      id="ccode-editor-minimap"
      className="relative flex flex-col bg-[#090a10] border-r border-[#1a1b26] select-none shrink-0 overflow-visible z-20 group transition-all duration-150"
      style={{ width: `${widthPx}px` }}
    >
      {/* Top Minimap Toolbar / Information Bar */}
      <div className="h-6 bg-[#0c0d14] border-b border-[#181a24] px-1 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0 select-none">
        <div className="flex items-center space-x-1 truncate" title={`Document: ${totalLines} lines • Prism ${crimsonShade} syntax theme (Zoom: ${scale.toFixed(1)}x)`}>
          <span className="font-semibold text-slate-300">Map</span>
          <span className="text-[9px] text-slate-400">({totalLines})</span>
        </div>

        {/* Action Buttons & Zoom Controls */}
        <div className="flex items-center space-x-0.5">
          {/* Syntax Highlighting Toggle (Prism Themes) */}
          <button
            onClick={() => setSyntaxHighlightingEnabled((prev) => !prev)}
            title={`Prism.js Syntax Highlighting: ${syntaxHighlightingEnabled ? `Enabled (${crimsonShade} theme)` : 'Disabled (Plain outline)'}. Click to toggle.`}
            className={`p-0.5 rounded transition-colors text-[9px] flex items-center ${
              syntaxHighlightingEnabled
                ? 'text-rose-400 hover:text-rose-300 bg-rose-950/60 border border-rose-800/60'
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#191a26]'
            }`}
          >
            <FontAwesomeIcon icon={ICONS.palette} />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out Minimap (0.5x min)"
            className="p-0.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#191a26] rounded transition-colors text-[9px]"
          >
            <FontAwesomeIcon icon={ICONS.minus} />
          </button>

          {/* Scale Factor Badge (Click to reset to 1.0x) */}
          <button
            onClick={handleResetScale}
            title={`Current zoom: ${scale.toFixed(1)}x. Click to reset to 1.0x`}
            className="px-1 py-0.2 rounded text-[8px] font-bold bg-[#141622] hover:bg-rose-950/80 text-rose-300 transition-colors"
          >
            {scale.toFixed(1)}x
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            title="Zoom In Minimap (2.5x max)"
            className="p-0.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#191a26] rounded transition-colors text-[9px]"
          >
            <FontAwesomeIcon icon={ICONS.plus} />
          </button>

          {/* Search match counter badge & next match button */}
          {searchMatches.length > 0 && (
            <button
              onClick={handleNextSearchMatch}
              title={`Next Search Match (${searchMatches.length} matches)`}
              className="p-0.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/60 rounded transition-colors text-[9px] flex items-center space-x-0.5"
            >
              <FontAwesomeIcon icon={ICONS.search} />
              <span className="text-[8px] font-bold">{searchMatches.length}</span>
            </button>
          )}

          {/* Diagnostic issues badge & next issue button */}
          {diagnostics.length > 0 && (
            <button
              onClick={handleNextDiagnostic}
              title={`Next Issue (${errors.length} errors, ${warnings.length} warnings)`}
              className={`p-0.5 rounded transition-colors text-[9px] flex items-center space-x-0.5 ${
                errors.length > 0
                  ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/60'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/60'
              }`}
            >
              <FontAwesomeIcon icon={errors.length > 0 ? ICONS.error : ICONS.warning} />
              <span className="text-[8px] font-bold">{diagnostics.length}</span>
            </button>
          )}

          {/* Width toggle */}
          <button
            onClick={() => {
              setMinimapWidth((prev) =>
                prev === 'compact' ? 'standard' : prev === 'standard' ? 'expanded' : 'compact'
              );
            }}
            title={`Toggle Minimap Width (${minimapWidth})`}
            className="p-0.5 hover:text-slate-200 hover:bg-[#191a26] rounded transition-colors text-[9px]"
          >
            <FontAwesomeIcon icon={ICONS.sliders} />
          </button>
        </div>
      </div>

      {/* Minimap Body / Canvas Stage with Surface Clicking and Dragging */}
      <div
        ref={containerRef}
        onWheel={(e) => {
          e.preventDefault();
          if (onScrollTo) {
            const maxScroll = Math.max(0, scrollHeight - clientHeight);
            onScrollTo(Math.max(0, Math.min(maxScroll, scrollTop + e.deltaY)));
          }
        }}
        onPointerDown={handleSurfacePointerDown}
        onPointerMove={handleSurfacePointerMove}
        onPointerUp={handleSurfacePointerUp}
        onPointerCancel={handleSurfacePointerUp}
        onPointerLeave={handleSurfacePointerLeave}
        className={`flex-1 relative overflow-hidden select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        {/* Rendered Canvas Preview */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

        {/* Viewport Lens / Slider with Silky Glide CSS Transitions */}
        <div
          id="minimap-viewport-slider"
          className={`absolute left-0 right-2 border ${themeColors.sliderBorder} ${
            isDragging
              ? 'bg-rose-500/25 border-rose-400 shadow-rose-500/20 shadow-md is-dragging'
              : `${themeColors.sliderBg} hover:border-rose-400/80`
          } rounded-xs shadow-lg backdrop-blur-[1px] minimap-viewport-slider z-20 pointer-events-none will-change-transform`}
          style={{
            top: 0,
            transform: `translate3d(0, ${sliderTop}px, 0)`,
            height: `${sliderHeight}px`,
            transition: isDragging
              ? 'none'
              : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), height 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
          }}
        >
          {/* Subtle drag handle indicators */}
          <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-rose-400/70" />
          <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-rose-400/70" />
        </div>

        {/* Overview Ruler (Right Rail): Visual Indicators for Search Matches */}
        {searchMatches.map((match, i) => {
          const matchY = (match.line - 1) * lineStep - minimapScrollY;
          if (matchY < -6 || matchY > containerHeight + 6) return null;
          return (
            <div
              key={`search-tick-${match.fileId}-${match.line}-${i}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onScrollLine(match.line);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onScrollLine(match.line);
              }}
              title={`Search match at Line ${match.line}: "${match.lineText || match.matchText || ''}"`}
              className="absolute right-0 w-2.5 h-1.5 bg-yellow-400 border border-yellow-200 shadow-sm shadow-yellow-400/90 rounded-xs z-28 cursor-pointer transition-[top,transform] duration-150 ease-out hover:scale-150 hover:w-3.5 pointer-events-auto"
              style={{ top: `${matchY}px` }}
            />
          );
        })}

        {/* Overview Ruler (Right Rail): Visual Indicators for Diagnostic Warnings & Errors */}
        {diagnostics.map((diag, i) => {
          const diagY = (diag.line - 1) * lineStep - minimapScrollY;
          if (diagY < -8 || diagY > containerHeight + 8) return null;
          const isError = diag.severity === 'error';

          return (
            <div
              key={`diag-pin-${diag.id || i}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                onScrollLine(diag.line);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onScrollLine(diag.line);
              }}
              title={`[${isError ? 'Error' : 'Warning'}] Line ${diag.line}: ${diag.message}`}
              className={`absolute right-0.5 w-2.5 h-2.5 rounded-full z-30 transform -translate-y-1/2 cursor-pointer transition-[top,transform] duration-150 ease-out hover:scale-150 pointer-events-auto flex items-center justify-center ${
                isError
                  ? 'bg-rose-500 border border-rose-300 shadow-md shadow-rose-500/90'
                  : 'bg-amber-400 border border-amber-200 shadow-md shadow-amber-400/90'
              }`}
              style={{ top: `${diagY}px` }}
            >
              <div className="w-1 h-1 bg-white/90 rounded-full" />
            </div>
          );
        })}

        {/* Cursor Position Marker */}
        {currentLine >= 1 && currentLine <= totalLines && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10 transition-[top] duration-150 ease-out"
            style={{
              top: `${(currentLine - 1) * lineStep - minimapScrollY}px`,
            }}
          >
            <div className="h-[2px] bg-rose-500 shadow-sm shadow-rose-500/60 w-full" />
          </div>
        )}

        {/* Hover / Drag Line Guide & Tooltip */}
        {hoveredLine && hoverY !== null && (
          <>
            <div
              className={`absolute left-0 right-0 h-[1.5px] ${
                isDragging ? 'bg-rose-400 shadow-sm shadow-rose-400/80' : 'bg-rose-400/80'
              } pointer-events-none z-30`}
              style={{ top: `${hoverY}px` }}
            />
            <div
              className="absolute left-full ml-2 z-40 bg-[#11131c] border border-rose-700/90 px-2.5 py-1.5 rounded-md shadow-2xl pointer-events-none whitespace-nowrap text-[11px] font-mono text-slate-200 flex flex-col space-y-1 animate-fadeIn"
              style={{
                top: `${Math.min(Math.max(4, hoverY - 18), Math.max(4, containerHeight - 80))}px`,
              }}
            >
              <div className="flex items-center space-x-1.5 text-rose-300 font-bold">
                <FontAwesomeIcon icon={ICONS.target} className="text-[10px]" />
                <span>Line {hoveredLine}</span>
                {isDragging && <span className="text-[9px] text-rose-400/80 font-normal ml-1">(Scrubbing)</span>}
              </div>

              {/* Diagnostic pill if this line has an issue */}
              {hoveredDiagnostic && (
                <div
                  className={`flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    hoveredDiagnostic.severity === 'error'
                      ? 'bg-rose-950/90 text-rose-300 border border-rose-700'
                      : 'bg-amber-950/90 text-amber-300 border border-amber-700'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={hoveredDiagnostic.severity === 'error' ? ICONS.error : ICONS.warning}
                    className="text-[9px]"
                  />
                  <span className="truncate max-w-[200px]">{hoveredDiagnostic.message}</span>
                </div>
              )}

              {/* Search match pill if this line has matches */}
              {hoveredSearchMatches && hoveredSearchMatches.length > 0 && (
                <div className="flex items-center space-x-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-950/90 text-yellow-300 border border-yellow-700">
                  <FontAwesomeIcon icon={ICONS.search} className="text-[9px]" />
                  <span>Search Match: {hoveredSearchMatches.length} match(es)</span>
                </div>
              )}

              {/* Line content preview */}
              {hoveredLineContent ? (
                <div className="text-slate-300 max-w-[260px] truncate text-[10px] bg-[#0c0d14] px-1.5 py-0.5 rounded border border-[#1e2030]">
                  {hoveredLineContent}
                </div>
              ) : (
                <div className="text-slate-500 italic text-[9px]">(empty line)</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Minimap Bottom Status Bar */}
      <div className="h-4 bg-[#090a10] border-t border-[#141620] px-1 flex items-center justify-between text-[8px] font-mono text-slate-400 shrink-0 select-none">
        <span>{scale.toFixed(1)}x</span>
        <span>Ln {currentLine}</span>
        <span>{Math.round(scrollRatio * 100)}%</span>
      </div>
    </div>
  );
};
