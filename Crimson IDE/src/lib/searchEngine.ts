/**
 * Workspace Global Search & Replace Engine
 * Fast multi-file search with case sensitivity, whole word, regex,
 * glob filtering (include/exclude), single match replacement,
 * and workspace-wide atomic replacement.
 */

import { FileItem, SearchMatch, SearchOptions } from '../types';
import { getAllFilesList } from './defaultFiles';

export interface SearchResultsSummary {
  matches: SearchMatch[];
  durationMs: number;
  searchedFilesCount: number;
  totalMatchesCount: number;
  error?: string;
}

/**
 * Escapes special characters for use in RegExp
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tests if a file path matches a comma-separated glob pattern list
 * Supports: *.ts, src/**, components/*, /tests/, etc.
 */
export function matchesGlobPattern(filePath: string, fileName: string, patternListStr: string): boolean {
  if (!patternListStr || !patternListStr.trim()) return false;

  const patterns = patternListStr
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (patterns.length === 0) return false;

  const normalizedPath = filePath.replace(/\\/g, '/');

  return patterns.some((pattern) => {
    let pat = pattern.replace(/\\/g, '/');
    const isNegated = pat.startsWith('!');
    if (isNegated) pat = pat.slice(1);

    // Exact extension shortcut e.g. *.ts
    if (pat.startsWith('*.') && !pat.includes('/')) {
      const ext = pat.slice(2).toLowerCase();
      const match = fileName.toLowerCase().endsWith('.' + ext);
      return isNegated ? !match : match;
    }

    // Convert glob wildcard to regular expression
    let regexStr = pat
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars except * and ?
      .replace(/\*\*/g, '§§GLOBSTAR§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§GLOBSTAR§§/g, '.*')
      .replace(/\?/g, '.');

    // If pattern doesn't start with / or .*, allow matching anywhere in path
    if (!regexStr.startsWith('^') && !regexStr.startsWith('.*')) {
      regexStr = '(?:^|/)' + regexStr;
    }
    if (!regexStr.endsWith('$') && !regexStr.endsWith('.*')) {
      regexStr = regexStr + '(?:$|/)';
    }

    try {
      const re = new RegExp(regexStr, 'i');
      const match = re.test(normalizedPath) || re.test(fileName);
      return isNegated ? !match : match;
    } catch {
      // Fallback simple substring
      const match = normalizedPath.toLowerCase().includes(pat.toLowerCase());
      return isNegated ? !match : match;
    }
  });
}

/**
 * Filters a list of files based on include and exclude glob patterns, and file type extension
 */
export function filterFilesByPatterns(
  files: FileItem[],
  includePattern?: string,
  excludePattern?: string,
  fileType?: string
): FileItem[] {
  return files.filter((file) => {
    // File type filter (e.g. '.ts', '.py', '.css')
    if (fileType && fileType !== 'all' && fileType.trim()) {
      const normalized = fileType.trim().toLowerCase();
      const types = normalized
        .split(/[,;\s]+/)
        .map((t) => (t.startsWith('.') ? t : '.' + t));
      const fileNameLower = file.name.toLowerCase();
      const matchesType = types.some((t) => fileNameLower.endsWith(t));
      if (!matchesType) {
        return false;
      }
    }

    // Exclude takes highest precedence
    if (excludePattern && excludePattern.trim()) {
      if (matchesGlobPattern(file.path, file.name, excludePattern.trim())) {
        return false;
      }
    }

    // Include pattern
    if (includePattern && includePattern.trim()) {
      if (!matchesGlobPattern(file.path, file.name, includePattern.trim())) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Constructs a RegExp for searching based on query and search options
 */
export function buildSearchRegExp(
  query: string,
  options: SearchOptions
): { regex: RegExp | null; error?: string } {
  if (!query) {
    return { regex: null };
  }

  let pattern = query;
  if (!options.useRegex) {
    pattern = escapeRegExp(query);
  }

  if (options.matchWholeWord) {
    pattern = `\\b(?:${pattern})\\b`;
  }

  const flags = options.matchCase ? 'g' : 'gi';

  try {
    const regex = new RegExp(pattern, flags);
    return { regex };
  } catch (err: any) {
    return {
      regex: null,
      error: err?.message || 'Invalid regular expression',
    };
  }
}

/**
 * Calculates a 0-100 relevance score for a search match against the query
 */
export function calculateMatchRelevance(
  match: {
    lineText: string;
    matchStart: number;
    matchEnd: number;
    fileName: string;
    filePath: string;
    matchText?: string;
  },
  query: string
): number {
  if (!query || !query.trim()) return 50;

  let score = 40; // Base score for match

  const matchedStr = match.matchText || match.lineText.slice(match.matchStart, match.matchEnd);
  const lineText = match.lineText;
  const fileName = match.fileName;

  // 1. Exact case match (+15)
  if (matchedStr === query) {
    score += 15;
  }

  // 2. Whole word / identifier boundary check (+15 for both, +8 for one)
  const isLeftBoundary =
    match.matchStart === 0 ||
    /[\s\(\)\[\]\{\}\<\>\,\.\;\:\'\"\`\=\+\-\*\/\!\?\&\|\\]/.test(lineText[match.matchStart - 1]);
  const isRightBoundary =
    match.matchEnd >= lineText.length ||
    /[\s\(\)\[\]\{\}\<\>\,\.\;\:\'\"\`\=\+\-\*\/\!\?\&\|\\]/.test(lineText[match.matchEnd]);

  if (isLeftBoundary && isRightBoundary) {
    score += 15;
  } else if (isLeftBoundary || isRightBoundary) {
    score += 8;
  }

  // 3. File name match (+20 for exact name match, +12 for substring)
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const queryLower = query.toLowerCase();
  const nameLower = nameWithoutExt.toLowerCase();

  if (nameLower === queryLower) {
    score += 20;
  } else if (fileName.toLowerCase().includes(queryLower)) {
    score += 12;
  }

  // 4. Code definition / declaration context (+12)
  const trimmedLine = lineText.trim();
  const isDeclaration =
    /^(export\s+)?(default\s+)?(function|class|interface|type|const|let|var|enum|def|struct|fn)\b/.test(
      trimmedLine
    ) || /^(import|from|require)\b/.test(trimmedLine);

  if (isDeclaration) {
    score += 10;
    // Extra boost if it's the symbol being declared
    const afterKeyword = trimmedLine.replace(
      /^(export\s+)?(default\s+)?(function|class|interface|type|const|let|var|enum)\s+/,
      ''
    );
    if (afterKeyword.toLowerCase().startsWith(queryLower)) {
      score += 5;
    }
  }

  // 5. Line conciseness bonus (+5 if under 80 chars, -10 if minified/over 300 chars)
  if (trimmedLine.length > 0 && trimmedLine.length < 80) {
    score += 5;
  } else if (lineText.length > 300) {
    score -= 10;
  }

  // 6. Proximity to start of line (+5 if near beginning)
  if (match.matchStart < 25) {
    score += 5;
  }

  return Math.min(100, Math.max(15, Math.round(score)));
}

/**
 * Executes a high-performance global search across all workspace files
 */
export function executeWorkspaceSearch(
  files: FileItem[],
  query: string,
  options: SearchOptions
): SearchResultsSummary {
  const startTime = performance.now();

  if (!query || !query.trim()) {
    return {
      matches: [],
      durationMs: 0,
      searchedFilesCount: 0,
      totalMatchesCount: 0,
    };
  }

  const { regex, error } = buildSearchRegExp(query, options);
  if (error || !regex) {
    return {
      matches: [],
      durationMs: Math.round(performance.now() - startTime),
      searchedFilesCount: 0,
      totalMatchesCount: 0,
      error,
    };
  }

  const allFiles = getAllFilesList(files);
  const eligibleFiles = filterFilesByPatterns(
    allFiles,
    options.includePattern,
    options.excludePattern,
    options.fileType
  );
  const results: SearchMatch[] = [];

  for (const file of eligibleFiles) {
    if (!file.content) continue;

    const lines = file.content.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineText = lines[lineIndex];
      if (!lineText) continue;

      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(lineText)) !== null) {
        const matchLength = match[0].length;
        if (matchLength === 0) {
          regex.lastIndex++;
          continue;
        }

        const matchStart = match.index;
        const matchEnd = matchStart + matchLength;
        const col = matchStart + 1;

        const score = calculateMatchRelevance(
          {
            lineText,
            matchStart,
            matchEnd,
            fileName: file.name,
            filePath: file.path,
            matchText: match[0],
          },
          query
        );

        results.push({
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          line: lineIndex + 1,
          col,
          lineText,
          matchStart,
          matchEnd,
          matchText: match[0],
          score,
        });

        // Prevent infinite loops if regex doesn't advance
        if (regex.lastIndex <= matchStart) {
          regex.lastIndex = matchStart + 1;
        }
      }
    }
  }

  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    matches: results,
    durationMs,
    searchedFilesCount: eligibleFiles.length,
    totalMatchesCount: results.length,
  };
}

/**
 * Smart casing helper: preserves uppercase or title case if preserveCase is enabled
 */
export function applyPreserveCase(originalMatch: string, replacement: string): string {
  if (!replacement) return replacement;

  // ALL UPPERCASE: FOO -> BAR
  if (originalMatch === originalMatch.toUpperCase() && originalMatch !== originalMatch.toLowerCase()) {
    return replacement.toUpperCase();
  }

  // Title Case / Capitalized: Foo -> Bar
  const isTitleCase =
    originalMatch.charAt(0) === originalMatch.charAt(0).toUpperCase() &&
    originalMatch.slice(1) === originalMatch.slice(1).toLowerCase();

  if (isTitleCase) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  // All Lowercase: foo -> bar
  if (originalMatch === originalMatch.toLowerCase() && originalMatch !== originalMatch.toUpperCase()) {
    return replacement.toLowerCase();
  }

  return replacement;
}

/**
 * Replaces a single specific match occurrence inside a file's content
 */
export function replaceSingleMatchInContent(
  content: string,
  match: SearchMatch,
  replacementText: string,
  preserveCase = false
): string {
  const lines = content.split('\n');
  const lineIdx = match.line - 1;
  if (lineIdx < 0 || lineIdx >= lines.length) return content;

  const line = lines[lineIdx];
  const before = line.substring(0, match.matchStart);
  const target = line.substring(match.matchStart, match.matchEnd);
  const after = line.substring(match.matchEnd);

  const effectiveReplacement = preserveCase ? applyPreserveCase(target, replacementText) : replacementText;
  lines[lineIdx] = before + effectiveReplacement + after;

  return lines.join('\n');
}

/**
 * Replaces all occurrences matching query and options in a file's content
 */
export function replaceAllInContent(
  content: string,
  query: string,
  replacementText: string,
  options: SearchOptions
): { newContent: string; count: number } {
  const { regex, error } = buildSearchRegExp(query, options);
  if (error || !regex) {
    return { newContent: content, count: 0 };
  }

  let count = 0;
  const newContent = content.replace(regex, (matched) => {
    count++;
    return options.preserveCase ? applyPreserveCase(matched, replacementText) : replacementText;
  });

  return { newContent, count };
}

/**
 * Replaces occurrences across the entire workspace tree (or in a single specific file).
 * Returns updated immutable file list, set of modified file IDs, and total count replaced.
 */
export function replaceInWorkspace(
  files: FileItem[],
  query: string,
  replacementText: string,
  options: SearchOptions,
  targetFileId?: string
): {
  updatedFiles: FileItem[];
  affectedFileIds: Set<string>;
  replacedCount: number;
} {
  const affectedFileIds = new Set<string>();
  let totalReplaced = 0;

  function processTree(nodes: FileItem[]): FileItem[] {
    return nodes.map((node) => {
      if (node.isFolder) {
        return {
          ...node,
          children: node.children ? processTree(node.children) : [],
        };
      }

      // If targetFileId is specified, only replace in that file
      if (targetFileId && node.id !== targetFileId) {
        return node;
      }

      // If file doesn't match include/exclude/fileType filters, skip it
      if (!targetFileId) {
        if (options.fileType && options.fileType !== 'all' && options.fileType.trim()) {
          const normalized = options.fileType.trim().toLowerCase();
          const types = normalized
            .split(/[,;\s]+/)
            .map((t) => (t.startsWith('.') ? t : '.' + t));
          const fileNameLower = node.name.toLowerCase();
          if (!types.some((t) => fileNameLower.endsWith(t))) {
            return node;
          }
        }
        if (options.excludePattern && matchesGlobPattern(node.path, node.name, options.excludePattern)) {
          return node;
        }
        if (options.includePattern && !matchesGlobPattern(node.path, node.name, options.includePattern)) {
          return node;
        }
      }

      if (node.content) {
        const { newContent, count } = replaceAllInContent(node.content, query, replacementText, options);
        if (count > 0) {
          totalReplaced += count;
          affectedFileIds.add(node.id);
          return {
            ...node,
            content: newContent,
          };
        }
      }

      return node;
    });
  }

  const updatedFiles = processTree(files);

  return {
    updatedFiles,
    affectedFileIds,
    replacedCount: totalReplaced,
  };
}

/**
 * Injects high-visibility visual search occurrence highlights (<mark class="...">)
 * into syntax-highlighted code HTML.
 * Preserves Prism syntax tokens and HTML structure without breaking tags or entity encodings,
 * and highlights the currently active match with a distinct prominent focus style.
 */
export function injectSearchHighlightsIntoHtml(
  html: string,
  rawText: string,
  query: string,
  options: {
    matchCase?: boolean;
    matchWholeWord?: boolean;
    useRegex?: boolean;
  } = {},
  activeMatchIdx: number = 0
): { html: string; totalMatches: number } {
  if (!query || !query.trim() || !html) {
    return { html, totalMatches: 0 };
  }

  // 1. Build regular expression matching query
  let regex: RegExp;
  try {
    let pattern = query;
    if (!options.useRegex) {
      pattern = escapeRegExp(pattern);
    }
    if (options.matchWholeWord) {
      pattern = `\\b(?:${pattern})\\b`;
    }
    const flags = options.matchCase ? 'g' : 'gi';
    regex = new RegExp(pattern, flags);
  } catch {
    return { html, totalMatches: 0 };
  }

  // 2. Find all match ranges in rawText
  const matches: { start: number; end: number; text: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((m = regex.exec(rawText)) !== null) {
    const matchLen = m[0].length;
    if (matchLen === 0) {
      regex.lastIndex++;
      continue;
    }
    matches.push({
      start: m.index,
      end: m.index + matchLen,
      text: m[0],
      index: matches.length,
    });
  }

  if (matches.length === 0) {
    return { html, totalMatches: 0 };
  }

  // 3. Split HTML into tags and text chunks
  const tagRegex = /(<[^>]+>)/g;
  const parts = html.split(tagRegex);

  let currentRawOffset = 0;
  const resultParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // HTML tag - preserve directly
    if (part.startsWith('<') && part.endsWith('>')) {
      resultParts.push(part);
      continue;
    }

    // Decode entities in text segment to measure against rawText
    const decodedSegment = part
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');

    const segRawStart = currentRawOffset;
    const segRawEnd = currentRawOffset + decodedSegment.length;
    currentRawOffset = segRawEnd;

    // Check if any match overlaps with this segment
    const overlapping = matches.filter(
      (match) => match.start < segRawEnd && match.end > segRawStart
    );

    if (overlapping.length === 0) {
      resultParts.push(part);
      continue;
    }

    if (part === decodedSegment) {
      let segmentHtml = '';
      let lastSliceIdx = 0;

      for (const match of overlapping) {
        const localMatchStart = Math.max(0, match.start - segRawStart);
        const localMatchEnd = Math.min(part.length, match.end - segRawStart);

        if (localMatchStart > lastSliceIdx) {
          segmentHtml += part.substring(lastSliceIdx, localMatchStart);
        }

        const matchSubstring = part.substring(localMatchStart, localMatchEnd);
        const isCurrentActive = match.index === activeMatchIdx;

        const highlightClass = isCurrentActive
          ? 'editor-search-match-active bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.95)] z-20 rounded-[2px]'
          : 'editor-search-match bg-amber-500/40 text-amber-100 ring-1 ring-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.4)] rounded-[2px] font-semibold';

        segmentHtml += `<mark class="${highlightClass} px-[1px] py-[0.5px] inline select-text transition-colors duration-100">${matchSubstring}</mark>`;
        lastSliceIdx = localMatchEnd;
      }

      if (lastSliceIdx < part.length) {
        segmentHtml += part.substring(lastSliceIdx);
      }

      resultParts.push(segmentHtml);
    } else {
      // Segment with HTML entities
      let segmentHtml = part;
      for (const match of overlapping) {
        const encodedMatchText = match.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const isCurrentActive = match.index === activeMatchIdx;
        const highlightClass = isCurrentActive
          ? 'editor-search-match-active bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.95)] z-20 rounded-[2px]'
          : 'editor-search-match bg-amber-500/40 text-amber-100 ring-1 ring-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.4)] rounded-[2px] font-semibold';

        const escaped = escapeRegExp(encodedMatchText);
        const re = new RegExp(escaped, options.matchCase ? 'g' : 'gi');
        segmentHtml = segmentHtml.replace(
          re,
          (mStr) =>
            `<mark class="${highlightClass} px-[1px] py-[0.5px] inline select-text transition-colors duration-100">${mStr}</mark>`
        );
      }
      resultParts.push(segmentHtml);
    }
  }

  return {
    html: resultParts.join(''),
    totalMatches: matches.length,
  };
}
