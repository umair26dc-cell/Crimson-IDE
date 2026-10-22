/**
 * Line-by-line Diff Engine for CsCode Crimson Code
 * Computes additions, deletions, hunks, side-by-side alignments, and word-level intra-line diffs
 */

export type DiffLineType = 'unchanged' | 'added' | 'deleted';

export interface InlineChange {
  type: 'same' | 'added' | 'deleted';
  text: string;
}

export interface DiffLine {
  id: string;
  type: DiffLineType;
  text: string;
  oldLineNumber?: number; // 1-based line number in original file
  newLineNumber?: number; // 1-based line number in modified file
  inlineChanges?: InlineChange[];
}

export interface DiffHunk {
  id: string;
  header: string; // e.g., "@@ -1,7 +1,9 @@"
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface SideBySidePair {
  id: string;
  left?: DiffLine;  // original / deleted line
  right?: DiffLine; // modified / added line
  type: 'unchanged' | 'modified' | 'added' | 'deleted';
}

export interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
  totalChanges: number;
}

export interface FileDiffResult {
  lines: DiffLine[];
  hunks: DiffHunk[];
  sideBySidePairs: SideBySidePair[];
  stats: DiffStats;
  hasChanges: boolean;
}

/**
 * Computes word-level diff between an old line and a new line
 */
function computeWordDiff(oldText: string, newText: string): { oldInline: InlineChange[]; newInline: InlineChange[] } {
  const oldWords = oldText.match(/(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_])/g) || [oldText];
  const newWords = newText.match(/(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_])/g) || [newText];

  // LCS on words
  const m = oldWords.length;
  const n = newWords.length;
  
  if (m === 0 && n === 0) {
    return { oldInline: [], newInline: [] };
  }

  // Fast path for identical strings
  if (oldText === newText) {
    return {
      oldInline: [{ type: 'same', text: oldText }],
      newInline: [{ type: 'same', text: newText }]
    };
  }

  // For very long lines, fall back to simple diff
  if (m > 200 || n > 200) {
    return {
      oldInline: [{ type: 'deleted', text: oldText }],
      newInline: [{ type: 'added', text: newText }]
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const oldInline: InlineChange[] = [];
  const newInline: InlineChange[] = [];

  let i = m;
  let j = n;

  const oldChangesRev: InlineChange[] = [];
  const newChangesRev: InlineChange[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldChangesRev.push({ type: 'same', text: oldWords[i - 1] });
      newChangesRev.push({ type: 'same', text: newWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newChangesRev.push({ type: 'added', text: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      oldChangesRev.push({ type: 'deleted', text: oldWords[i - 1] });
      i--;
    }
  }

  oldChangesRev.reverse();
  newChangesRev.reverse();

  // Merge contiguous segments of the same type
  function mergeChanges(changes: InlineChange[]): InlineChange[] {
    const merged: InlineChange[] = [];
    for (const c of changes) {
      if (merged.length > 0 && merged[merged.length - 1].type === c.type) {
        merged[merged.length - 1].text += c.text;
      } else {
        merged.push({ ...c });
      }
    }
    return merged;
  }

  return {
    oldInline: mergeChanges(oldChangesRev),
    newInline: mergeChanges(newChangesRev),
  };
}

/**
 * Computes line-by-line diff between original text and modified text
 */
export function computeLineDiff(originalText: string = '', modifiedText: string = ''): FileDiffResult {
  // Normalize line endings
  const cleanOriginal = originalText.replace(/\r\n/g, '\n');
  const cleanModified = modifiedText.replace(/\r\n/g, '\n');

  // If both are completely identical
  if (cleanOriginal === cleanModified) {
    const lines = cleanOriginal ? cleanOriginal.split('\n') : [''];
    const diffLines: DiffLine[] = lines.map((text, idx) => ({
      id: `diff-${idx + 1}-${idx + 1}`,
      type: 'unchanged' as const,
      text,
      oldLineNumber: idx + 1,
      newLineNumber: idx + 1,
    }));

    const sideBySide: SideBySidePair[] = diffLines.map((l) => ({
      id: `sbs-${l.id}`,
      left: l,
      right: l,
      type: 'unchanged' as const,
    }));

    return {
      lines: diffLines,
      hunks: [],
      sideBySidePairs: sideBySide,
      stats: {
        additions: 0,
        deletions: 0,
        unchanged: diffLines.length,
        totalChanges: 0,
      },
      hasChanges: false,
    };
  }

  const oldLines = cleanOriginal === '' ? [] : cleanOriginal.split('\n');
  const newLines = cleanModified === '' ? [] : cleanModified.split('\n');

  let prefixCount = 0;
  while (
    prefixCount < oldLines.length &&
    prefixCount < newLines.length &&
    oldLines[prefixCount] === newLines[prefixCount]
  ) {
    prefixCount++;
  }

  let suffixCount = 0;
  while (
    suffixCount < oldLines.length - prefixCount &&
    suffixCount < newLines.length - prefixCount &&
    oldLines[oldLines.length - 1 - suffixCount] === newLines[newLines.length - 1 - suffixCount]
  ) {
    suffixCount++;
  }

  const midOld = oldLines.slice(prefixCount, oldLines.length - suffixCount);
  const midNew = newLines.slice(prefixCount, newLines.length - suffixCount);

  // Compute LCS on the middle portion
  const m = midOld.length;
  const n = midNew.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (midOld[i - 1] === midNew[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const midDiff: { type: DiffLineType; text: string; oldIdx?: number; newIdx?: number }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && midOld[i - 1] === midNew[j - 1]) {
      midDiff.push({
        type: 'unchanged',
        text: midOld[i - 1],
        oldIdx: prefixCount + i,
        newIdx: prefixCount + j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      midDiff.push({
        type: 'added',
        text: midNew[j - 1],
        newIdx: prefixCount + j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      midDiff.push({
        type: 'deleted',
        text: midOld[i - 1],
        oldIdx: prefixCount + i,
      });
      i--;
    }
  }

  midDiff.reverse();

  // Combine prefix, middle, suffix
  const allDiffLines: DiffLine[] = [];
  let currentOldLine = 1;
  let currentNewLine = 1;

  // 1. Prefix unchanged lines
  for (let p = 0; p < prefixCount; p++) {
    allDiffLines.push({
      id: `diff-${currentOldLine}-${currentNewLine}`,
      type: 'unchanged',
      text: oldLines[p],
      oldLineNumber: currentOldLine++,
      newLineNumber: currentNewLine++,
    });
  }

  // 2. Middle lines
  for (const item of midDiff) {
    if (item.type === 'unchanged') {
      allDiffLines.push({
        id: `diff-${currentOldLine}-${currentNewLine}`,
        type: 'unchanged',
        text: item.text,
        oldLineNumber: currentOldLine++,
        newLineNumber: currentNewLine++,
      });
    } else if (item.type === 'deleted') {
      allDiffLines.push({
        id: `diff-del-${currentOldLine}`,
        type: 'deleted',
        text: item.text,
        oldLineNumber: currentOldLine++,
      });
    } else if (item.type === 'added') {
      allDiffLines.push({
        id: `diff-add-${currentNewLine}`,
        type: 'added',
        text: item.text,
        newLineNumber: currentNewLine++,
      });
    }
  }

  // 3. Suffix unchanged lines
  const suffixStartOld = oldLines.length - suffixCount;
  for (let s = 0; s < suffixCount; s++) {
    allDiffLines.push({
      id: `diff-${currentOldLine}-${currentNewLine}`,
      type: 'unchanged',
      text: oldLines[suffixStartOld + s],
      oldLineNumber: currentOldLine++,
      newLineNumber: currentNewLine++,
    });
  }

  // Calculate word-level intra-line diff for adjacent deleted & added lines
  for (let idx = 0; idx < allDiffLines.length - 1; idx++) {
    const cur = allDiffLines[idx];
    const next = allDiffLines[idx + 1];
    if (cur.type === 'deleted' && next.type === 'added') {
      const { oldInline, newInline } = computeWordDiff(cur.text, next.text);
      cur.inlineChanges = oldInline;
      next.inlineChanges = newInline;
    }
  }

  // Compute Stats
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of allDiffLines) {
    if (line.type === 'added') additions++;
    else if (line.type === 'deleted') deletions++;
    else unchanged++;
  }

  const totalChanges = additions + deletions;
  const hasChanges = totalChanges > 0;

  // Compute Hunks (with 3 lines of context)
  const hunks = computeHunks(allDiffLines, 3);

  // Compute Side-by-Side pairs
  const sideBySidePairs = computeSideBySide(allDiffLines);

  return {
    lines: allDiffLines,
    hunks,
    sideBySidePairs,
    stats: {
      additions,
      deletions,
      unchanged,
      totalChanges,
    },
    hasChanges,
  };
}

/**
 * Groups lines into standard Git Diff hunks with context
 */
function computeHunks(diffLines: DiffLine[], contextSize: number = 3): DiffHunk[] {
  const changeIndices: number[] = [];
  diffLines.forEach((l, idx) => {
    if (l.type !== 'unchanged') {
      changeIndices.push(idx);
    }
  });

  if (changeIndices.length === 0) {
    return [];
  }

  // Create regions around each change
  const regions: { start: number; end: number }[] = [];
  for (const idx of changeIndices) {
    const start = Math.max(0, idx - contextSize);
    const end = Math.min(diffLines.length - 1, idx + contextSize);

    if (regions.length === 0) {
      regions.push({ start, end });
    } else {
      const last = regions[regions.length - 1];
      if (start <= last.end + 1) {
        last.end = Math.max(last.end, end);
      } else {
        regions.push({ start, end });
      }
    }
  }

  return regions.map((reg, hunkIdx) => {
    const lines = diffLines.slice(reg.start, reg.end + 1);

    let oldStart = 0;
    let oldCount = 0;
    let newStart = 0;
    let newCount = 0;

    for (const l of lines) {
      if (l.type === 'unchanged') {
        if (!oldStart && l.oldLineNumber) oldStart = l.oldLineNumber;
        if (!newStart && l.newLineNumber) newStart = l.newLineNumber;
        oldCount++;
        newCount++;
      } else if (l.type === 'deleted') {
        if (!oldStart && l.oldLineNumber) oldStart = l.oldLineNumber;
        oldCount++;
      } else if (l.type === 'added') {
        if (!newStart && l.newLineNumber) newStart = l.newLineNumber;
        newCount++;
      }
    }

    const header = `@@ -${oldStart || 1},${oldCount} +${newStart || 1},${newCount} @@`;

    return {
      id: `hunk-${hunkIdx + 1}`,
      header,
      oldStart: oldStart || 1,
      oldCount,
      newStart: newStart || 1,
      newCount,
      lines,
    };
  });
}

/**
 * Aligns diff lines into side-by-side (left/right) pairs
 */
function computeSideBySide(diffLines: DiffLine[]): SideBySidePair[] {
  const pairs: SideBySidePair[] = [];
  let i = 0;

  while (i < diffLines.length) {
    const cur = diffLines[i];

    if (cur.type === 'unchanged') {
      pairs.push({
        id: `sbs-${cur.id}`,
        left: cur,
        right: cur,
        type: 'unchanged',
      });
      i++;
    } else {
      // Gather contiguous deleted lines and added lines
      const delLines: DiffLine[] = [];
      const addLines: DiffLine[] = [];

      while (i < diffLines.length && diffLines[i].type === 'deleted') {
        delLines.push(diffLines[i]);
        i++;
      }

      while (i < diffLines.length && diffLines[i].type === 'added') {
        addLines.push(diffLines[i]);
        i++;
      }

      const maxLen = Math.max(delLines.length, addLines.length);
      for (let k = 0; k < maxLen; k++) {
        const left = delLines[k];
        const right = addLines[k];
        let pairType: 'unchanged' | 'modified' | 'added' | 'deleted' = 'modified';
        if (left && !right) pairType = 'deleted';
        else if (!left && right) pairType = 'added';

        pairs.push({
          id: `sbs-pair-${left?.id || 'none'}-${right?.id || 'none'}-${k}`,
          left,
          right,
          type: pairType,
        });
      }
    }
  }

  return pairs;
}
