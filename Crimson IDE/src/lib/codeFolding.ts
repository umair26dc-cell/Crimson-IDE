/**
 * Indentation-Based Code Folding Engine for CsCode Crimson Code
 * Automatically calculates foldable code blocks based on indentation levels,
 * supports nested blocks, multi-level folding, fold all / unfold all,
 * and maintains accurate synchronization between visible lines and raw file content.
 */

export interface FoldRange {
  startLine: number; // 1-indexed line where the fold starts (the header line)
  endLine: number;   // 1-indexed line where the fold ends (inclusive)
  indent: number;    // number of spaces of indentation of the header line
  level: number;     // hierarchical nesting level (1 = top level, 2, 3...)
  childLinesCount: number; // endLine - startLine
  previewText?: string;    // snippet preview of the collapsed content
}

export interface VisibleLineInfo {
  realLineNumber: number; // 1-indexed line number in original file
  text: string;           // text content of the line
  isFoldHeader: boolean;  // whether this line starts a foldable block
  isCollapsed: boolean;   // whether this line is currently collapsed
  foldRange?: FoldRange;  // the fold range info if isFoldHeader is true
  visibleIndex: number;   // 0-indexed position in visible list
}

export interface FoldComputationResult {
  visibleLines: VisibleLineInfo[];
  hiddenLinesCount: number;
  visibleToRealIndex: number[]; // vIdx -> 0-indexed line in linesArray
  realToVisibleIndex: Map<number, number>; // 1-indexed realLine -> vIdx
  visibleContent: string;
}

/**
 * Calculates indentation level of a string in spaces (expanding tabs)
 */
export function getLineIndentation(line: string, tabSize: number = 2): number | null {
  if (!line.trim()) {
    return null; // Empty or whitespace-only line
  }

  let spaces = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === ' ') {
      spaces += 1;
    } else if (char === '\t') {
      spaces += tabSize;
    } else {
      break;
    }
  }
  return spaces;
}

/**
 * Computes all foldable code blocks based on indentation levels.
 * Returns a map of startLine (1-indexed) -> FoldRange.
 */
export function computeFoldRanges(lines: string[], tabSize: number = 2): Map<number, FoldRange> {
  const foldRanges = new Map<number, FoldRange>();
  const totalLines = lines.length;
  if (totalLines <= 1) return foldRanges;

  // Precompute indentation for each line
  const indents: (number | null)[] = new Array(totalLines);
  for (let i = 0; i < totalLines; i++) {
    indents[i] = getLineIndentation(lines[i], tabSize);
  }

  // Identify distinct indentation levels to assign 1-based hierarchy levels
  const distinctIndents = Array.from(
    new Set(indents.filter((ind): ind is number => ind !== null))
  ).sort((a, b) => a - b);

  const indentToLevel = new Map<number, number>();
  distinctIndents.forEach((ind, idx) => {
    indentToLevel.set(ind, idx + 1);
  });

  for (let i = 0; i < totalLines; i++) {
    const currentIndent = indents[i];
    if (currentIndent === null) continue; // Skip blank lines as fold headers

    const lineNum = i + 1; // 1-indexed
    let lastValidChild = -1;

    // Look ahead to find children whose indentation is strictly greater than currentIndent
    for (let j = i + 1; j < totalLines; j++) {
      const nextIndent = indents[j];

      if (nextIndent === null) {
        // Blank line: can be part of the block if followed by deeper or same-level block
        continue;
      }

      if (nextIndent > currentIndent) {
        lastValidChild = j;
      } else {
        // Line has indentation less than or equal to current line -> block terminates
        break;
      }
    }

    // A block is foldable if it has at least one child line
    if (lastValidChild > i) {
      const endLine = lastValidChild + 1; // 1-indexed
      const childCount = endLine - lineNum;

      if (childCount >= 1) {
        // Generate snippet preview (first non-empty child line trimmed)
        let preview = '';
        for (let k = i + 1; k <= lastValidChild && k < i + 4; k++) {
          const trimmed = lines[k].trim();
          if (trimmed) {
            preview = preview ? `${preview} ... ${trimmed}` : trimmed;
            if (preview.length > 50) break;
          }
        }
        if (preview.length > 50) {
          preview = preview.substring(0, 47) + '...';
        }

        foldRanges.set(lineNum, {
          startLine: lineNum,
          endLine,
          indent: currentIndent,
          level: indentToLevel.get(currentIndent) || 1,
          childLinesCount: childCount,
          previewText: preview,
        });
      }
    }
  }

  return foldRanges;
}

/**
 * Computes visible lines given the set of collapsed start lines and fold ranges.
 */
export function computeVisibleLines(
  lines: string[],
  collapsedLines: Set<number>,
  foldRanges: Map<number, FoldRange>
): FoldComputationResult {
  const visibleLines: VisibleLineInfo[] = [];
  const visibleToRealIndex: number[] = [];
  const realToVisibleIndex = new Map<number, number>();

  let hiddenLinesCount = 0;
  let activeFoldEnd = 0; // 1-indexed end line of current active collapsed fold

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;

    if (lineNum <= activeFoldEnd) {
      // Line is hidden inside a collapsed block
      hiddenLinesCount++;
      continue;
    }

    // Line is visible
    const foldRange = foldRanges.get(lineNum);
    const isFoldHeader = !!foldRange;
    const isCollapsed = isFoldHeader && collapsedLines.has(lineNum);

    if (isCollapsed && foldRange) {
      // Extend activeFoldEnd to cover this block
      activeFoldEnd = Math.max(activeFoldEnd, foldRange.endLine);
    }

    const vIdx = visibleLines.length;
    visibleLines.push({
      realLineNumber: lineNum,
      text: lines[i],
      isFoldHeader,
      isCollapsed,
      foldRange,
      visibleIndex: vIdx,
    });

    visibleToRealIndex.push(i);
    realToVisibleIndex.set(lineNum, vIdx);
  }

  const visibleContent = visibleLines.map((v) => v.text).join('\n');

  return {
    visibleLines,
    hiddenLinesCount,
    visibleToRealIndex,
    realToVisibleIndex,
    visibleContent,
  };
}

/**
 * Find the innermost fold range enclosing or starting at a given line
 */
export function findEnclosingFold(
  foldRanges: Map<number, FoldRange>,
  targetLine: number
): FoldRange | null {
  let closest: FoldRange | null = null;
  let minSpan = Infinity;

  foldRanges.forEach((range) => {
    if (targetLine >= range.startLine && targetLine <= range.endLine) {
      const span = range.endLine - range.startLine;
      if (span < minSpan) {
        minSpan = span;
        closest = range;
      }
    }
  });

  return closest;
}

/**
 * Returns a new Set with all fold ranges collapsed
 */
export function collapseAllFolds(foldRanges: Map<number, FoldRange>): Set<number> {
  const newSet = new Set<number>();
  foldRanges.forEach((_, startLine) => {
    newSet.add(startLine);
  });
  return newSet;
}

/**
 * Returns a new Set with folds at or deeper than targetLevel collapsed
 */
export function collapseFoldsByLevel(
  foldRanges: Map<number, FoldRange>,
  targetLevel: number
): Set<number> {
  const newSet = new Set<number>();
  foldRanges.forEach((range, startLine) => {
    if (range.level >= targetLevel) {
      newSet.add(startLine);
    }
  });
  return newSet;
}
