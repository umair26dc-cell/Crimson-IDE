/**
 * Git History Graph Component using D3.js
 * Interactive visual representation of branch merges, commits, forks, and HEAD pointers.
 * Includes pan/zoom, hover lineage tracing, merge commit visualization, branch filtering,
 * interactive merge simulation, creating branches from specific commit nodes, and full-screen modal expansion.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ICONS } from '../lib/fontawesome';
import {
  GitCommitNode,
  GitHistoryEngine,
  BranchInfo,
  getBranchColor,
} from '../lib/gitHistory';

interface GitHistoryGraphProps {
  commits: GitCommitNode[];
  activeBranch: string;
  branches?: string[];
  onSelectCommit?: (commit: GitCommitNode) => void;
  onSwitchBranch?: (branch: string) => void;
  onSimulateMerge?: (sourceBranch: string, targetBranch: string) => void;
  onCreateBranchFromCommit?: (branchName: string, commitHash: string, checkout?: boolean) => void;
  className?: string;
}

export const GitHistoryGraph: React.FC<GitHistoryGraphProps> = ({
  commits,
  activeBranch,
  branches = ['main'],
  onSelectCommit,
  onSwitchBranch,
  onSimulateMerge,
  onCreateBranchFromCommit,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Expanded Modal SVG Ref
  const modalSvgRef = useRef<SVGSVGElement | null>(null);

  const [selectedCommit, setSelectedCommit] = useState<GitCommitNode | null>(null);
  const [hoveredCommit, setHoveredCommit] = useState<GitCommitNode | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'graph' | 'compact'>('graph');

  // Interactive Merge Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [sourceMergeBranch, setSourceMergeBranch] = useState<string>('');
  const [targetMergeBranch, setTargetMergeBranch] = useState<string>(activeBranch);
  const [mergeCommitNote, setMergeCommitNote] = useState<string>('');

  // Interactive Create Branch from Commit Modal
  const [isNewBranchModalOpen, setIsNewBranchModalOpen] = useState(false);
  const [branchBaseCommit, setBranchBaseCommit] = useState<GitCommitNode | null>(null);
  const [newBranchName, setNewBranchName] = useState('feature/');
  const [checkoutImmediately, setCheckoutImmediately] = useState(true);
  const [branchNameError, setBranchNameError] = useState<string | null>(null);

  // Full Screen / Expanded Modal
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open the Create Branch dialog prefilled with selected/target commit
  const handleOpenNewBranchModal = useCallback((commit: GitCommitNode) => {
    setBranchBaseCommit(commit);
    setNewBranchName('feature/');
    setBranchNameError(null);
    setCheckoutImmediately(true);
    setIsNewBranchModalOpen(true);
  }, []);

  const handleCreateBranchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!branchBaseCommit) return;

    const cleanName = newBranchName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
    if (!cleanName) {
      setBranchNameError('Please provide a valid branch name.');
      return;
    }

    if (branches.includes(cleanName)) {
      setBranchNameError(`Branch '${cleanName}' already exists. Choose a unique name.`);
      return;
    }

    onCreateBranchFromCommit?.(cleanName, branchBaseCommit.hash, checkoutImmediately);
    showToast(`Branch '${cleanName}' created at commit ${branchBaseCommit.shortHash}!`);
    setIsNewBranchModalOpen(false);
  };

  // Filter commits based on branch filter & search query
  const displayedCommits = useMemo(() => {
    let list = commits;
    if (filterBranch !== 'all') {
      list = list.filter((c) => c.branch === filterBranch || (c.isMerge && c.parents.length > 1));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.shortHash.toLowerCase().includes(q) ||
          c.author.name.toLowerCase().includes(q) ||
          c.branch.toLowerCase().includes(q)
      );
    }
    return list;
  }, [commits, filterBranch, searchQuery]);

  // Compute graph layout (lanes, coordinates, links)
  const layout = useMemo(() => {
    return GitHistoryEngine.computeGraphLayout(displayedCommits, activeBranch, 26, 42, 20, 24);
  }, [displayedCommits, activeBranch]);

  // Expanded layout with more generous spacing for modal
  const expandedLayout = useMemo(() => {
    return GitHistoryEngine.computeGraphLayout(displayedCommits, activeBranch, 36, 48, 28, 28);
  }, [displayedCommits, activeBranch]);

  // Compute active lineage set (all ancestors of hovered or selected commit)
  const activeLineageHashes = useMemo(() => {
    const target = hoveredCommit || selectedCommit;
    if (!target) return null;
    return GitHistoryEngine.getLineage(target.shortHash, displayedCommits);
  }, [hoveredCommit, selectedCommit, displayedCommits]);

  // D3 Render Function
  const renderD3Graph = useCallback(
    (
      targetSvg: SVGSVGElement | null,
      currentLayout: typeof layout,
      isWide = false
    ) => {
      if (!targetSvg) return;

      const svg = d3.select(targetSvg);
      svg.selectAll('*').remove();

      const { height, nodes, links, branches: branchList } = currentLayout;

      // Definitions: Gradients, Filters, Arrow Markers
      const defs = svg.append('defs');

      // Styles & Keyframe Animations
      defs.append('style').text(`
        @keyframes headPulse {
          0% { r: 6px; opacity: 0.9; stroke-width: 2px; }
          50% { r: 10px; opacity: 0.35; stroke-width: 4px; }
          100% { r: 6px; opacity: 0.9; stroke-width: 2px; }
        }
        @keyframes mergeDash {
          to { stroke-dashoffset: -18; }
        }
        .head-ring {
          animation: headPulse 2.2s infinite ease-in-out;
        }
        .merge-flow {
          animation: mergeDash 1.2s linear infinite;
        }
        .node-group {
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
          cursor: pointer;
        }
        .node-group:hover circle.main-node {
          transform: scale(1.25);
          filter: drop-shadow(0 0 8px rgba(244, 63, 94, 0.85));
        }
      `);

      // Merge Arrow Marker
      defs
        .append('marker')
        .attr('id', 'merge-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 1.5 L 8 5 L 0 8.5 z')
        .attr('fill', '#a855f7');

      // Subtle Glow Filter
      const filter = defs.append('filter').attr('id', 'crimson-glow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
      filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'blur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Main Zoomable Root Container Group
      const g = svg.append('g').attr('class', 'graph-root');

      // Zoom Behavior
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 2.8])
        .on('zoom', (event) => {
          g.attr('transform', event.transform.toString());
          if (!isWide) {
            setZoomLevel(Math.round(event.transform.k * 100) / 100);
          }
        });

      svg.call(zoom);

      // Initial placement: translated slightly from border
      svg.call(zoom.transform, d3.zoomIdentity.translate(8, 8).scale(1));

      // 1. Draw Lane Tracks (Background vertical guides for each branch)
      const lanesGroup = g.append('g').attr('class', 'lanes-layer');
      const laneStep = isWide ? 36 : 26;
      const padX = isWide ? 28 : 20;

      branchList.forEach((b) => {
        const laneX = padX + b.lane * laneStep;

        // Vertical branch lane guide
        lanesGroup
          .append('line')
          .attr('x1', laneX)
          .attr('y1', 12)
          .attr('x2', laneX)
          .attr('y2', height - 12)
          .attr('stroke', b.color)
          .attr('stroke-width', 1.2)
          .attr('stroke-dasharray', '2, 6')
          .attr('opacity', 0.22);
      });

      // 2. Draw Links (Bézier curves representing commit lineage and branch merges)
      const linksGroup = g.append('g').attr('class', 'links-layer');

      linksGroup
        .selectAll('path.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class', (d) => (d.isMerge ? 'link merge-link' : 'link regular-link'))
        .attr('d', (d) => {
          const x1 = d.source.x || 0;
          const y1 = d.source.y || 0;
          const x2 = d.target.x || 0;
          const y2 = d.target.y || 0;

          // Straight line if in identical lane
          if (x1 === x2) {
            return `M ${x1} ${y1} L ${x2} ${y2}`;
          }

          // Smooth cubic Bézier curve for branch divergence and merge
          const cp1y = y1 + (y2 - y1) * 0.38;
          const cp2y = y1 + (y2 - y1) * 0.62;
          return `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
        })
        .attr('fill', 'none')
        .attr('stroke', (d) => {
          if (d.isMerge) return '#a855f7'; // Distinctive purple for branch merge link
          return d.color || '#f43f5e';
        })
        .attr('stroke-width', (d) => {
          const isPartOfLineage =
            activeLineageHashes &&
            activeLineageHashes.has(d.source.shortHash) &&
            activeLineageHashes.has(d.target.shortHash);
          if (isPartOfLineage) return 3.2;
          return d.isMerge ? 2.2 : 2.5;
        })
        .attr('stroke-dasharray', (d) => (d.isMerge ? '5, 4' : 'none'))
        .attr('marker-end', (d) => (d.isMerge ? 'url(#merge-arrow)' : 'none'))
        .attr('opacity', (d) => {
          if (!activeLineageHashes) return d.isMerge ? 0.95 : 0.8;
          const isPartOfLineage =
            activeLineageHashes.has(d.source.shortHash) &&
            activeLineageHashes.has(d.target.shortHash);
          return isPartOfLineage ? 1 : 0.2;
        });

      // 3. Draw Nodes (Commits and Merges)
      const nodesGroup = g.append('g').attr('class', 'nodes-layer');

      const nodeG = nodesGroup
        .selectAll('g.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node node-group')
        .attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`)
        .attr('opacity', (d) => {
          if (!activeLineageHashes) return 1;
          return activeLineageHashes.has(d.shortHash) ? 1 : 0.25;
        })
        .on('mouseenter', (_, d) => setHoveredCommit(d))
        .on('mouseleave', () => setHoveredCommit(null))
        .on('click', (_, d) => {
          setSelectedCommit(d);
          onSelectCommit?.(d);
        })
        .on('dblclick', (e, d) => {
          e.stopPropagation();
          handleOpenNewBranchModal(d);
        });

      // Outer Selection Ring (when node is clicked)
      nodeG
        .filter((d) => selectedCommit?.shortHash === d.shortHash)
        .append('circle')
        .attr('r', 11)
        .attr('fill', 'none')
        .attr('stroke', '#fda4af')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3, 2');

      // HEAD Outer Radar Pulse Ring
      nodeG
        .filter((d) => Boolean(d.isHead))
        .append('circle')
        .attr('class', 'head-ring')
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', (d) => d.color || '#f43f5e')
        .attr('stroke-width', 2);

      // MERGE COMMIT VISUALIZATION (Hexagonal / Diamond Halo)
      nodeG
        .filter((d) => Boolean(d.isMerge))
        .append('rect')
        .attr('x', -7.5)
        .attr('y', -7.5)
        .attr('width', 15)
        .attr('height', 15)
        .attr('rx', 3)
        .attr('transform', 'rotate(45)')
        .attr('fill', '#2e1065')
        .attr('stroke', '#a855f7')
        .attr('stroke-width', 2);

      // MERGE COMMIT INNER INTERSECTION ICON
      nodeG
        .filter((d) => Boolean(d.isMerge))
        .append('path')
        .attr('d', 'M -3 -3 L 3 3 M -3 3 L 3 -3')
        .attr('stroke', '#f3e8ff')
        .attr('stroke-width', 1.8);

      // REGULAR COMMIT MAIN CIRCLE
      nodeG
        .filter((d) => !d.isMerge)
        .append('circle')
        .attr('class', 'main-node')
        .attr('r', (d) => (d.isHead ? 6.5 : 5.5))
        .attr('fill', '#090a10')
        .attr('stroke', (d) => d.color || '#f43f5e')
        .attr('stroke-width', (d) => (d.isHead ? 3 : 2));

      // REGULAR COMMIT INNER CORE
      nodeG
        .filter((d) => !d.isMerge)
        .append('circle')
        .attr('r', 2)
        .attr('fill', (d) => d.color || '#f43f5e');

      // 4. Draw Labels & Tag Badges
      const labelsGroup = g.append('g').attr('class', 'labels-layer');
      const labelOffsetX = isWide ? 18 : 14;

      const labelG = labelsGroup
        .selectAll('g.label')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'label')
        .attr('transform', (d) => `translate(${(d.x || 0) + labelOffsetX}, ${(d.y || 0) + 4})`)
        .attr('opacity', (d) => {
          if (!activeLineageHashes) return 1;
          return activeLineageHashes.has(d.shortHash) ? 1 : 0.35;
        })
        .style('cursor', 'pointer')
        .on('mouseenter', (_, d) => setHoveredCommit(d))
        .on('mouseleave', () => setHoveredCommit(null))
        .on('click', (_, d) => {
          setSelectedCommit(d);
          onSelectCommit?.(d);
        })
        .on('dblclick', (e, d) => {
          e.stopPropagation();
          handleOpenNewBranchModal(d);
        });

      // Render Badges, Hash, and Subject
      labelG.each(function (d) {
        const gEl = d3.select(this);
        let currX = 0;

        // Merge Badge
        if (d.isMerge) {
          const mergeText = 'MERGE ⑂';
          const w = mergeText.length * 5.2 + 8;
          gEl
            .append('rect')
            .attr('x', currX)
            .attr('y', -11)
            .attr('width', w)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', '#3b0764')
            .attr('stroke', '#a855f7')
            .attr('stroke-width', 0.9);

          gEl
            .append('text')
            .attr('x', currX + 4)
            .attr('y', 0)
            .attr('fill', '#e9d5ff')
            .attr('font-size', '8.5px')
            .attr('font-family', 'ui-monospace, monospace')
            .attr('font-weight', 'bold')
            .text(mergeText);

          currX += w + 4;
        }

        // HEAD Badge
        if (d.isHead) {
          const headText = `HEAD -> ${d.branch}`;
          const w = headText.length * 5.2 + 8;
          gEl
            .append('rect')
            .attr('x', currX)
            .attr('y', -11)
            .attr('width', w)
            .attr('height', 14)
            .attr('rx', 3)
            .attr('fill', '#4c0519')
            .attr('stroke', '#e11d48')
            .attr('stroke-width', 0.9);

          gEl
            .append('text')
            .attr('x', currX + 4)
            .attr('y', 0)
            .attr('fill', '#fda4af')
            .attr('font-size', '8.5px')
            .attr('font-family', 'ui-monospace, monospace')
            .attr('font-weight', 'bold')
            .text(headText);

          currX += w + 4;
        } else if (d.tags && d.tags.length > 0) {
          d.tags.forEach((tag) => {
            const w = tag.length * 5.2 + 8;
            gEl
              .append('rect')
              .attr('x', currX)
              .attr('y', -11)
              .attr('width', w)
              .attr('height', 14)
              .attr('rx', 3)
              .attr('fill', '#1e1b4b')
              .attr('stroke', '#4338ca')
              .attr('stroke-width', 0.9);

            gEl
              .append('text')
              .attr('x', currX + 4)
              .attr('y', 0)
              .attr('fill', '#c7d2fe')
              .attr('font-size', '8.5px')
              .attr('font-family', 'ui-monospace, monospace')
              .text(tag);

            currX += w + 4;
          });
        }

        // Short Hash
        gEl
          .append('text')
          .attr('x', currX)
          .attr('y', 0)
          .attr('fill', selectedCommit?.shortHash === d.shortHash ? '#fda4af' : '#94a3b8')
          .attr('font-size', '9.5px')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', 'bold')
          .text(d.shortHash);

        currX += 48;

        // Subject Text
        const maxLen = isWide ? 65 : 28;
        const truncatedSubject = d.subject.length > maxLen ? `${d.subject.slice(0, maxLen)}...` : d.subject;
        gEl
          .append('text')
          .attr('x', currX)
          .attr('y', 0)
          .attr('fill', selectedCommit?.shortHash === d.shortHash ? '#ffe4e6' : '#e2e8f0')
          .attr('font-size', '10.5px')
          .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
          .attr('font-weight', selectedCommit?.shortHash === d.shortHash ? '600' : '400')
          .text(truncatedSubject);
      });
    },
    [activeLineageHashes, selectedCommit, onSelectCommit, handleOpenNewBranchModal]
  );

  // Re-render D3 whenever layout, selection, or lineage changes
  useEffect(() => {
    renderD3Graph(svgRef.current, layout, false);
  }, [layout, renderD3Graph]);

  // Re-render Modal SVG when expanded modal opens
  useEffect(() => {
    if (isExpandedModalOpen && modalSvgRef.current) {
      renderD3Graph(modalSvgRef.current, expandedLayout, true);
    }
  }, [isExpandedModalOpen, expandedLayout, renderD3Graph]);

  // Zoom Helpers
  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(350)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity.translate(8, 8).scale(1));
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(200).call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(200).call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.8);
  };

  // Center Graph on HEAD node
  const handleCenterOnHead = () => {
    const headNode = layout.nodes.find((n) => n.isHead);
    if (!headNode || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const targetY = -(headNode.y || 0) + 60;
    svg
      .transition()
      .duration(450)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity.translate(8, Math.min(8, targetY)).scale(1)
      );
  };

  // Trigger Simulate Merge Action
  const handleExecuteMerge = () => {
    if (!sourceMergeBranch || sourceMergeBranch === targetMergeBranch) {
      showToast('Please select a different branch to merge.');
      return;
    }

    onSimulateMerge?.(sourceMergeBranch, targetMergeBranch);
    showToast(`Branch '${sourceMergeBranch}' merged into '${targetMergeBranch}'!`);
    setIsMergeModalOpen(false);
  };

  const handleOpenMergeModal = (preselectedSource?: string) => {
    const fallback = branches.find((b) => b !== activeBranch) || branches[0] || 'main';
    setSourceMergeBranch(preselectedSource || fallback);
    setTargetMergeBranch(activeBranch);
    setMergeCommitNote(`Merge branch '${preselectedSource || fallback}' into ${activeBranch}`);
    setIsMergeModalOpen(true);
  };

  return (
    <div className={`space-y-2 select-none font-sans text-xs ${className}`}>
      {/* Toast Notice */}
      {toastMessage && (
        <div className="p-2 rounded bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <FontAwesomeIcon icon={ICONS.close} />
          </button>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#202230]">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-rose-300 font-semibold text-xs flex items-center space-x-1.5">
            <FontAwesomeIcon icon={ICONS.git} className="text-rose-500" />
            <span>Git History Graph</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-mono">
            {displayedCommits.length} commits
          </span>
        </div>

        {/* View Toggle, Simulate Merge, and Expand buttons */}
        <div className="flex items-center space-x-1 font-mono text-[10px]">
          <button
            onClick={() => handleOpenMergeModal()}
            className="px-2 py-0.8 rounded bg-[#181a28] hover:bg-purple-950 text-purple-300 hover:text-purple-200 border border-purple-900/60 transition-colors cursor-pointer flex items-center space-x-1 font-semibold"
            title="Simulate merging a branch into active branch"
          >
            <FontAwesomeIcon icon={ICONS.gitCompare} className="text-[9px]" />
            <span>Merge...</span>
          </button>

          <button
            onClick={() => setIsExpandedModalOpen(true)}
            className="p-1 rounded bg-[#141522] hover:bg-[#202234] text-slate-400 hover:text-slate-200 border border-[#26283c] transition-colors cursor-pointer"
            title="Expand Full Graph Inspector Modal"
          >
            <FontAwesomeIcon icon={ICONS.expand} className="text-[10px]" />
          </button>
        </div>
      </div>

      {/* Controls Bar: Branch Filter & Zoom Buttons */}
      <div className="flex items-center justify-between gap-1.5 text-[11px] font-mono">
        {/* Branch Filter dropdown */}
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="bg-[#0f1018] border border-[#242636] rounded px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-rose-500 flex-1 max-w-[140px]"
        >
          <option value="all">All Branches ({layout.branches.length})</option>
          {layout.branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} {b.isCurrent ? '(HEAD)' : ''}
            </option>
          ))}
        </select>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-0.5 bg-[#0f1018] border border-[#242636] rounded px-1 py-0.5 text-[10px] text-slate-400">
          <button
            onClick={handleZoomIn}
            className="px-1.5 hover:text-rose-300 cursor-pointer"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={handleResetZoom}
            className="px-1.5 hover:text-rose-300 text-[9px] cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={handleZoomOut}
            className="px-1.5 hover:text-rose-300 cursor-pointer"
            title="Zoom Out (-)"
          >
            -
          </button>
          <button
            onClick={handleCenterOnHead}
            className="px-1.5 hover:text-rose-300 cursor-pointer text-rose-400"
            title="Center view on HEAD commit"
          >
            <FontAwesomeIcon icon={ICONS.target} className="text-[9px]" />
          </button>
        </div>

        {/* View mode toggle */}
        <button
          onClick={() => setViewMode((prev) => (prev === 'graph' ? 'compact' : 'graph'))}
          className={`px-1.5 py-0.8 rounded text-[10px] transition-colors cursor-pointer ${
            viewMode === 'graph'
              ? 'bg-rose-950 text-rose-300 border border-rose-800'
              : 'bg-[#151620] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle between Interactive D3 Graph & Timeline list"
        >
          {viewMode === 'graph' ? 'D3' : 'List'}
        </button>
      </div>

      {/* Branch Legend Track Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
        {layout.branches.map((b) => (
          <div
            key={b.name}
            onClick={() => onSwitchBranch?.(b.name)}
            className={`px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0 border cursor-pointer transition-colors ${
              b.isCurrent
                ? 'bg-rose-950/80 text-rose-200 border-rose-600 font-semibold'
                : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border-[#222434]'
            }`}
            title={`Click to switch workspace branch to '${b.name}'`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
            <span className="truncate max-w-[110px]">{b.name}</span>
            {b.isCurrent && <span className="text-[8px] text-rose-400">★</span>}
          </div>
        ))}
      </div>

      {/* Main SVG D3 Graph Canvas */}
      {viewMode === 'graph' ? (
        <div
          ref={containerRef}
          className="relative w-full h-64 bg-[#08090e] border border-[#1e202f] rounded-xl overflow-hidden shadow-inner group"
        >
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          />

          {/* Interactive Hover Tooltip */}
          {hoveredCommit && (
            <div
              className="absolute top-2 right-2 pointer-events-none p-2.5 rounded-lg bg-[#11121d]/95 border border-rose-900/80 shadow-2xl font-mono text-[10px] text-slate-200 z-10 max-w-[240px] animate-fadeIn"
              style={{ backdropFilter: 'blur(4px)' }}
            >
              <div className="flex items-center justify-between text-rose-300 font-bold mb-0.5">
                <span>{hoveredCommit.shortHash}</span>
                <span className="text-slate-400 font-normal">{hoveredCommit.date}</span>
              </div>
              <div className="text-slate-300 font-sans text-[11px] leading-tight line-clamp-2">
                {hoveredCommit.subject}
              </div>
              <div className="mt-1 pt-1 border-t border-[#222436] flex items-center justify-between text-[9px] text-slate-400">
                <span className="text-rose-400 truncate max-w-[110px]">{hoveredCommit.branch}</span>
                <span className="text-slate-500">Double-click to branch</span>
              </div>
            </div>
          )}

          {/* Canvas Bottom Overlay Tip */}
          <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-slate-500 bg-black/60 px-1.5 py-0.5 rounded border border-white/[0.05]">
            Drag to pan &bull; Double-click to branch
          </div>
        </div>
      ) : (
        /* Compact Timeline List View */
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {displayedCommits.map((c) => (
            <div
              key={c.shortHash}
              onClick={() => setSelectedCommit(c)}
              className={`p-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                selectedCommit?.shortHash === c.shortHash
                  ? 'bg-rose-950/60 border-rose-700 text-rose-100'
                  : 'bg-[#10111a] border-[#1d1f2d] hover:bg-[#161724] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBranchColor(c.branch) }} />
                  <span className="text-rose-400 font-bold">{c.shortHash}</span>
                  {c.isHead && (
                    <span className="px-1 rounded bg-rose-900 text-rose-200 text-[8px] font-bold">
                      HEAD
                    </span>
                  )}
                  {c.isMerge && (
                    <span className="px-1 rounded bg-purple-900 text-purple-200 text-[8px]">
                      MERGE
                    </span>
                  )}
                  <span className="text-slate-400 truncate max-w-[90px]">{c.branch}</span>
                </div>
                <span className="text-slate-500 text-[10px]">{c.date}</span>
              </div>
              <p className="text-[11px] truncate mt-1 text-slate-200 font-sans">{c.subject}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selected Commit Details Inspector */}
      {selectedCommit && (
        <div className="p-3 rounded-xl border border-rose-900/60 bg-[#11121e] space-y-2 animate-fadeIn font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#222436] pb-1.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-300">{selectedCommit.shortHash}</span>
              {selectedCommit.isHead && (
                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                  HEAD
                </span>
              )}
              {selectedCommit.isMerge && (
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px]">
                  Branch Merge
                </span>
              )}
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {selectedCommit.branch}
              </span>
            </div>
            <button
              onClick={() => setSelectedCommit(null)}
              className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} className="text-xs" />
            </button>
          </div>

          <div className="text-slate-200 text-xs font-sans font-medium line-clamp-2 leading-relaxed">
            {selectedCommit.subject}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-[#1c1d2c]">
            <div>
              <span className="text-slate-500">Author:</span> {selectedCommit.author.name}
            </div>
            <div>
              <span className="text-slate-500">Committed:</span> {selectedCommit.date}
            </div>
            <div>
              <span className="text-slate-500">Files:</span> {selectedCommit.filesChanged || 1} modified
            </div>
            <div>
              <span className="text-slate-500">Parents:</span>{' '}
              {selectedCommit.parents.length > 0
                ? selectedCommit.parents.map((p) => p.slice(0, 7)).join(', ')
                : 'Root (Initial)'}
            </div>
          </div>

          {/* Action Buttons: Create Branch from this Commit & Checkout */}
          <div className="flex items-center space-x-2 pt-1 border-t border-[#1c1d2c]">
            <button
              onClick={() => handleOpenNewBranchModal(selectedCommit)}
              className="flex-1 py-1.5 rounded-lg bg-[#181a28] hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-rose-900/60 text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              title={`Create a new branch starting from commit ${selectedCommit.shortHash}`}
            >
              <FontAwesomeIcon icon={ICONS.git} className="text-[10px]" />
              <span>Branch from Commit</span>
            </button>

            {selectedCommit.branch !== activeBranch && (
              <button
                onClick={() => onSwitchBranch?.(selectedCommit.branch)}
                className="py-1.5 px-3 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1"
                title={`Checkout branch '${selectedCommit.branch}'`}
              >
                <span>Checkout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Create Branch from Commit Modal */}
      {isNewBranchModalOpen && branchBaseCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn font-mono">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/70 bg-[#0e0f19] text-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#222436]">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 text-xs">
                  <FontAwesomeIcon icon={ICONS.git} />
                </div>
                <div>
                  <span className="font-bold text-slate-100 text-sm">Create New Branch from Commit</span>
                  <div className="text-[10px] text-slate-400">
                    Base: <strong className="text-rose-400">{branchBaseCommit.shortHash}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsNewBranchModalOpen(false)}
                className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
              >
                <FontAwesomeIcon icon={ICONS.close} />
              </button>
            </div>

            {/* Base Commit Summary Card */}
            <div className="p-3 rounded-xl bg-[#090a10] border border-[#202234] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-rose-400">{branchBaseCommit.shortHash}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#171926] text-slate-300 text-[10px]">
                  Branch: {branchBaseCommit.branch}
                </span>
              </div>
              <p className="text-slate-200 font-sans text-xs leading-relaxed line-clamp-2">
                {branchBaseCommit.subject}
              </p>
              <div className="text-[10px] text-slate-500 pt-0.5">
                By {branchBaseCommit.author.name} &bull; {branchBaseCommit.date}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBranchSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  New Branch Name:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. feature/my-new-feature"
                  value={newBranchName}
                  onChange={(e) => {
                    setNewBranchName(e.target.value);
                    if (branchNameError) setBranchNameError(null);
                  }}
                  className="w-full bg-[#07080d] border border-[#282b40] rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-rose-500 font-mono"
                  required
                />

                {/* Quick Presets */}
                <div className="flex items-center space-x-1.5 mt-2 text-[10px]">
                  <span className="text-slate-500">Presets:</span>
                  {['feature/', 'bugfix/', 'hotfix/', 'exp/'].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => setNewBranchName(prefix)}
                      className="px-1.5 py-0.5 rounded bg-[#171926] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#26283c] transition-colors cursor-pointer"
                    >
                      {prefix}
                    </button>
                  ))}
                </div>

                {branchNameError && (
                  <p className="text-rose-400 text-[11px] mt-1.5">{branchNameError}</p>
                )}
              </div>

              {/* Checkout Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={checkoutImmediately}
                  onChange={(e) => setCheckoutImmediately(e.target.checked)}
                  className="accent-rose-500 rounded"
                />
                <span>Checkout new branch immediately (<code className="text-rose-400">git checkout -b</code>)</span>
              </label>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#1f2132]">
                <button
                  type="button"
                  onClick={() => setIsNewBranchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181a28] hover:bg-[#202234] text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBranchName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-rose-950/50"
                >
                  <FontAwesomeIcon icon={ICONS.git} />
                  <span>Create Branch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulate Branch Merge Modal */}
      {isMergeModalOpen && (
        <div className="p-3.5 rounded-xl border border-purple-800/80 bg-[#121122] space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#282642]">
            <span className="font-semibold text-purple-300 text-xs flex items-center space-x-2">
              <FontAwesomeIcon icon={ICONS.gitCompare} className="text-purple-400" />
              <span>Simulate Branch Merge</span>
            </span>
            <button
              onClick={() => setIsMergeModalOpen(false)}
              className="text-slate-400 hover:text-purple-300 p-0.5 cursor-pointer"
            >
              <FontAwesomeIcon icon={ICONS.close} />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            Merge changes from a source branch into the target branch (<strong className="text-rose-400">{targetMergeBranch}</strong>):
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Source Branch (From):</label>
              <select
                value={sourceMergeBranch}
                onChange={(e) => {
                  setSourceMergeBranch(e.target.value);
                  setMergeCommitNote(`Merge branch '${e.target.value}' into ${targetMergeBranch}`);
                }}
                className="w-full bg-[#0a0b12] border border-[#2b2d42] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500"
              >
                {branches
                  .filter((b) => b !== targetMergeBranch)
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Target Branch (Into):</label>
              <select
                value={targetMergeBranch}
                onChange={(e) => {
                  setTargetMergeBranch(e.target.value);
                  setMergeCommitNote(`Merge branch '${sourceMergeBranch}' into ${e.target.value}`);
                }}
                className="w-full bg-[#0a0b12] border border-[#2b2d42] rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-purple-500"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === activeBranch ? '(current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">Merge Commit Message:</label>
            <input
              type="text"
              value={mergeCommitNote}
              onChange={(e) => setMergeCommitNote(e.target.value)}
              className="w-full bg-[#0a0b12] border border-[#2b2d42] rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              onClick={() => setIsMergeModalOpen(false)}
              className="px-2.5 py-1 rounded bg-[#1c1e2d] text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteMerge}
              disabled={!sourceMergeBranch || sourceMergeBranch === targetMergeBranch}
              className="px-3.5 py-1 rounded bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-purple-950/50"
            >
              <FontAwesomeIcon icon={ICONS.check} />
              <span>Execute Merge</span>
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN EXPANDED GRAPH MODAL */}
      {isExpandedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-fadeIn font-mono">
          <div className="w-full max-w-5xl h-[80vh] flex flex-col rounded-2xl border border-rose-900/70 bg-[#0a0b12] text-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f2132] bg-[#10111d] shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-800 flex items-center justify-center text-rose-400">
                  <FontAwesomeIcon icon={ICONS.git} className="text-base" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100 text-sm">Interactive Git History Graph</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800 text-rose-300">
                      D3.js Visualization
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Panoramic visual representation of branch merges, commits, and parents.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenMergeModal()}
                  className="px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.gitCompare} />
                  <span>Simulate Merge...</span>
                </button>

                <button
                  onClick={() => setIsExpandedModalOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={ICONS.close} />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-5 py-2.5 border-b border-[#1a1c2a] bg-[#0c0d16] flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center space-x-2 flex-1 max-w-sm">
                <FontAwesomeIcon icon={ICONS.search} className="text-slate-500 text-[10px]" />
                <input
                  type="text"
                  placeholder="Search commits by message, author, or SHA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#131422] border border-[#232538] rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-rose-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300 text-xs">
                    <FontAwesomeIcon icon={ICONS.close} />
                  </button>
                )}
              </div>

              {/* Branch filter pills */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setFilterBranch('all')}
                  className={`px-2 py-0.8 rounded text-[11px] transition-colors cursor-pointer ${
                    filterBranch === 'all'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                      : 'bg-[#151622] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({commits.length})
                </button>
                {layout.branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setFilterBranch(b.name)}
                    className={`px-2 py-0.8 rounded text-[11px] flex items-center space-x-1 transition-colors cursor-pointer ${
                      filterBranch === b.name
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                        : 'bg-[#151622] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Canvas & Inspector Split Pane */}
            <div className="flex-1 flex overflow-hidden">
              {/* Canvas Area */}
              <div className="flex-1 relative bg-[#07080d] overflow-hidden">
                <svg
                  ref={modalSvgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  style={{ touchAction: 'none' }}
                />
                <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-0.5 rounded border border-white/[0.05]">
                  Drag to pan &bull; Double-click node to branch
                </div>
              </div>

              {/* Inspector Sidebar */}
              <div className="w-80 border-l border-[#1f2132] bg-[#0e0f19] p-4 flex flex-col justify-between overflow-y-auto shrink-0">
                {selectedCommit ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#222436]">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-rose-300 text-sm">{selectedCommit.shortHash}</span>
                        {selectedCommit.isHead && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                            HEAD
                          </span>
                        )}
                        {selectedCommit.isMerge && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px]">
                            MERGE
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Commit Message</div>
                      <p className="text-slate-200 text-xs font-sans font-medium leading-relaxed bg-[#131422] p-2.5 rounded-lg border border-[#202234]">
                        {selectedCommit.subject}
                      </p>
                    </div>

                    <div className="space-y-2 text-[11px] text-slate-400 bg-[#131422] p-2.5 rounded-lg border border-[#202234]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Branch:</span>
                        <span className="text-rose-400 font-semibold">{selectedCommit.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Author:</span>
                        <span className="text-slate-200">{selectedCommit.author.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Timestamp:</span>
                        <span className="text-slate-200">{selectedCommit.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Parents:</span>
                        <span className="text-slate-300">
                          {selectedCommit.parents.length > 0
                            ? selectedCommit.parents.map((p) => p.slice(0, 7)).join(', ')
                            : 'Root'}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Branch from this Commit & Checkout */}
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => handleOpenNewBranchModal(selectedCommit)}
                        className="w-full py-2 rounded-lg bg-[#181a28] hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-rose-900/60 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
                        title={`Create a new branch starting at commit ${selectedCommit.shortHash}`}
                      >
                        <FontAwesomeIcon icon={ICONS.git} />
                        <span>Branch from this Commit</span>
                      </button>

                      {selectedCommit.branch !== activeBranch && (
                        <button
                          onClick={() => {
                            onSwitchBranch?.(selectedCommit.branch);
                            showToast(`Switched to branch '${selectedCommit.branch}'`);
                          }}
                          className="w-full py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <span>Checkout branch &lsquo;{selectedCommit.branch}&rsquo;</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-slate-500 p-4">
                    <FontAwesomeIcon icon={ICONS.git} className="text-3xl text-slate-600" />
                    <span className="text-xs font-semibold text-slate-400">Select a Commit</span>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Click any node or label in the graph to inspect commit history, parent branches, or create a new branch.
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-[#1f2132] flex justify-end">
                  <button
                    onClick={() => setIsExpandedModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-[#181a28] hover:bg-[#222436] text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
