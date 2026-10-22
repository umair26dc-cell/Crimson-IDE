/**
 * Git History Engine & Data Structures for CsCode Crimson IDE
 * Provides topological commit sorting, branch lane calculation for D3.js,
 * parent/child link generation, merge commit tracking, and localStorage persistence.
 */

export interface GitAuthor {
  name: string;
  email: string;
}

export interface GitCommitNode {
  hash: string;
  shortHash: string;
  subject: string;
  body?: string;
  author: GitAuthor;
  date: string;
  timestamp: number;
  branch: string;
  parents: string[];
  isMerge?: boolean;
  isHead?: boolean;
  tags?: string[];
  filesChanged?: number;
  // Computed layout properties for D3
  x?: number;
  y?: number;
  lane?: number;
  color?: string;
}

export interface GitGraphLink {
  id: string;
  source: GitCommitNode;
  target: GitCommitNode;
  color: string;
  isMerge?: boolean;
}

export interface BranchInfo {
  name: string;
  color: string;
  lane: number;
  headHash: string;
  isCurrent: boolean;
}

export const BRANCH_PALETTES: Record<string, string> = {
  main: '#f43f5e', // Crimson Rose
  master: '#f43f5e',
  'feature/file-watcher': '#06b6d4', // Cyan
  'feature/eslint-rules': '#a855f7', // Purple
  'feature/syntax-engine': '#3b82f6', // Blue
  'hotfix/terminal-cursor': '#10b981', // Emerald
  'dev': '#f59e0b', // Amber
  default: '#ec4899', // Pink
};

export function getBranchColor(branchName: string, laneIndex = 0): string {
  if (BRANCH_PALETTES[branchName]) {
    return BRANCH_PALETTES[branchName];
  }
  if (branchName.startsWith('feature/')) return '#06b6d4';
  if (branchName.startsWith('hotfix/') || branchName.startsWith('fix/')) return '#10b981';
  if (branchName.startsWith('release/')) return '#a855f7';
  if (branchName.startsWith('dev')) return '#f59e0b';

  const fallbackColors = ['#f43f5e', '#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
  return fallbackColors[laneIndex % fallbackColors.length];
}

const GIT_HISTORY_STORAGE_KEY = 'crimson_git_commit_history';

export const INITIAL_GIT_COMMITS: GitCommitNode[] = [
  {
    hash: '9f81a24d081b37e96e95c1ef347a82b9e6f1a921',
    shortHash: '9f81a24',
    subject: 'feat: D3.js interactive Git History Graph in Source Control panel',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: 'Just now',
    timestamp: Date.now() - 1000 * 60 * 5,
    branch: 'main',
    parents: ['8e72b10'],
    isHead: true,
    tags: ['HEAD -> main', 'v1.4.0'],
    filesChanged: 3,
  },
  {
    hash: '8e72b10a91e5cfb34d7a89e021c3b4a5d6e7f890',
    shortHash: '8e72b10',
    subject: "Merge branch 'feature/eslint-rules' into main",
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '12 mins ago',
    timestamp: Date.now() - 1000 * 60 * 12,
    branch: 'main',
    parents: ['7a61d09', '6f50c82'],
    isMerge: true,
    tags: ['main'],
    filesChanged: 5,
  },
  {
    hash: '6f50c82a80d4bfa23c6d7e8f10b2a3c4d5e6f789',
    shortHash: '6f50c82',
    subject: 'feat: Custom ESLint rules studio with live regex sandbox tester',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '35 mins ago',
    timestamp: Date.now() - 1000 * 60 * 35,
    branch: 'feature/eslint-rules',
    parents: ['5e4fb71'],
    filesChanged: 4,
  },
  {
    hash: '5e4fb71a70c3aea12b5c6d7e09a1b2c3d4e5f678',
    shortHash: '5e4fb71',
    subject: 'feat: Workspace ignore patterns (.eslintignore) and rules severity selector',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '1 hour ago',
    timestamp: Date.now() - 1000 * 60 * 60,
    branch: 'feature/eslint-rules',
    parents: ['7a61d09'],
    filesChanged: 3,
  },
  {
    hash: '7a61d09a60b2ada01a4b5c6d98e0a1b2c3d4e5f6',
    shortHash: '7a61d09',
    subject: "Merge branch 'feature/file-watcher' into main",
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '2 hours ago',
    timestamp: Date.now() - 1000 * 60 * 120,
    branch: 'main',
    parents: ['4d3ea60', '3c2da59'],
    isMerge: true,
    filesChanged: 4,
  },
  {
    hash: '3c2da59a50a1aca90e3a4b5c87d9a0b1c2d3e4f5',
    shortHash: '3c2da59',
    subject: 'feat: File system watcher simulation with pulsing modified badges in explorer',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '3 hours ago',
    timestamp: Date.now() - 1000 * 60 * 180,
    branch: 'feature/file-watcher',
    parents: ['4d3ea60'],
    filesChanged: 4,
  },
  {
    hash: '4d3ea60a40e0aba89d2a3b4c76c8e9a0b1c2d3e4',
    shortHash: '4d3ea60',
    subject: 'feat: Git branch switcher in status bar with branch persistence',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '5 hours ago',
    timestamp: Date.now() - 1000 * 60 * 300,
    branch: 'main',
    parents: ['2b1c948'],
    filesChanged: 2,
  },
  {
    hash: '2b1c948a30d9aaa78c1e2a3b65b7d8e9a0b1c2d3',
    shortHash: '2b1c948',
    subject: 'feat: Terminal command history with arrow-key cycling and settings persistence',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: 'Yesterday',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    branch: 'main',
    parents: ['1a0b837'],
    filesChanged: 3,
  },
  {
    hash: '1a0b837a20c89a967b0d1a2a54a6c7d8e9a0b1c2',
    shortHash: '1a0b837',
    subject: 'feat: Syntax token color customizer with theme engine synchronization',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '2 days ago',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    branch: 'main',
    parents: ['0f9a726'],
    filesChanged: 3,
  },
  {
    hash: '0f9a726a10b78a856a9c0a1a4395b6c7d8e9a0b1',
    shortHash: '0f9a726',
    subject: 'Initial commit: CsCode Crimson IDE workspace architecture',
    author: { name: 'Developer', email: 'developer@workspace.local' },
    date: '3 days ago',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    branch: 'main',
    parents: [],
    tags: ['v1.0.0'],
    filesChanged: 12,
  },
];

export class GitHistoryEngine {
  public static loadCommits(): GitCommitNode[] {
    if (typeof localStorage === 'undefined') return INITIAL_GIT_COMMITS;
    try {
      const saved = localStorage.getItem(GIT_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load git history from storage:', e);
    }
    return INITIAL_GIT_COMMITS;
  }

  public static saveCommits(commits: GitCommitNode[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(GIT_HISTORY_STORAGE_KEY, JSON.stringify(commits));
    } catch (e) {
      console.error('Failed to save git history:', e);
    }
  }

  public static createCommit(
    message: string,
    currentBranch: string,
    filesCount = 1,
    existingCommits: GitCommitNode[] = INITIAL_GIT_COMMITS
  ): GitCommitNode[] {
    const parentCommit = existingCommits.find(
      (c) => c.branch === currentBranch && c.isHead
    ) || existingCommits.find((c) => c.branch === currentBranch) || existingCommits[0];

    const randomHex = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    const shortHash = randomHex.substring(0, 7);

    // Update existing commits to clear previous isHead on this branch
    const updatedPrev = existingCommits.map((c) => {
      if (c.branch === currentBranch && c.isHead) {
        return {
          ...c,
          isHead: false,
          tags: (c.tags || []).filter((t) => !t.startsWith('HEAD')),
        };
      }
      return c;
    });

    const newCommit: GitCommitNode = {
      hash: randomHex + '0123456789abcdef01234',
      shortHash,
      subject: message.trim(),
      author: { name: 'Developer', email: 'developer@workspace.local' },
      date: 'Just now',
      timestamp: Date.now(),
      branch: currentBranch,
      parents: parentCommit ? [parentCommit.hash] : [],
      isHead: true,
      tags: [`HEAD -> ${currentBranch}`],
      filesChanged: filesCount,
    };

    const nextList = [newCommit, ...updatedPrev];
    GitHistoryEngine.saveCommits(nextList);
    return nextList;
  }

  public static simulateMerge(
    sourceBranch: string,
    targetBranch: string,
    existingCommits: GitCommitNode[] = INITIAL_GIT_COMMITS
  ): GitCommitNode[] {
    const sourceHead = existingCommits.find((c) => c.branch === sourceBranch);
    const targetHead = existingCommits.find((c) => c.branch === targetBranch);

    if (!sourceHead || !targetHead) return existingCommits;

    const randomHex = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    const shortHash = randomHex.substring(0, 7);

    // Clear previous head on target branch
    const updatedPrev = existingCommits.map((c) => {
      if (c.branch === targetBranch && c.isHead) {
        return {
          ...c,
          isHead: false,
          tags: (c.tags || []).filter((t) => !t.startsWith('HEAD')),
        };
      }
      return c;
    });

    const mergeCommit: GitCommitNode = {
      hash: randomHex + 'merge000000000000000000',
      shortHash,
      subject: `Merge branch '${sourceBranch}' into ${targetBranch}`,
      author: { name: 'Developer', email: 'developer@workspace.local' },
      date: 'Just now',
      timestamp: Date.now(),
      branch: targetBranch,
      parents: [targetHead.hash, sourceHead.hash],
      isMerge: true,
      isHead: true,
      tags: [`HEAD -> ${targetBranch}`],
      filesChanged: 3,
    };

    const nextList = [mergeCommit, ...updatedPrev];
    GitHistoryEngine.saveCommits(nextList);
    return nextList;
  }

  /**
   * Creates a new branch pointing directly to a specific commit
   */
  public static createBranchFromCommit(
    branchName: string,
    commitHash: string,
    checkout = true,
    existingCommits: GitCommitNode[] = INITIAL_GIT_COMMITS
  ): { updatedCommits: GitCommitNode[]; targetCommit: GitCommitNode | null } {
    const cleanBranch = branchName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
    if (!cleanBranch) {
      return { updatedCommits: existingCommits, targetCommit: null };
    }

    const target = existingCommits.find(
      (c) => c.hash === commitHash || c.shortHash === commitHash || c.hash.startsWith(commitHash)
    );

    if (!target) {
      return { updatedCommits: existingCommits, targetCommit: null };
    }

    const updated = existingCommits.map((c) => {
      let isHead = c.isHead;
      let tags = c.tags ? [...c.tags] : [];

      if (checkout) {
        // If checking out, remove any existing HEAD tag
        if (isHead) {
          isHead = false;
          tags = tags.filter((t) => !t.startsWith('HEAD'));
        }
      }

      // If this is the target commit
      if (c.hash === target.hash) {
        if (checkout) {
          isHead = true;
          tags.push(`HEAD -> ${cleanBranch}`);
        } else {
          tags.push(cleanBranch);
        }
      }

      return {
        ...c,
        isHead,
        tags: Array.from(new Set(tags)),
      };
    });

    GitHistoryEngine.saveCommits(updated);
    return { updatedCommits: updated, targetCommit: target };
  }

  /**
   * Computes topological coordinates, lanes, and links for D3.js rendering
   */
  public static computeGraphLayout(
    commits: GitCommitNode[],
    activeBranch: string,
    laneWidth = 24,
    rowHeight = 44,
    paddingX = 20,
    paddingY = 24
  ): {
    nodes: GitCommitNode[];
    links: GitGraphLink[];
    branches: BranchInfo[];
    width: number;
    height: number;
  } {
    // 1. Establish distinct lanes for branches
    const branchLanes: Record<string, number> = {};
    const branchesFound: string[] = [];

    // Prioritize active branch and main
    if (activeBranch && !branchesFound.includes(activeBranch)) {
      branchesFound.push(activeBranch);
    }
    if (!branchesFound.includes('main')) {
      branchesFound.push('main');
    }

    commits.forEach((c) => {
      if (!branchesFound.includes(c.branch)) {
        branchesFound.push(c.branch);
      }
    });

    branchesFound.forEach((bName, idx) => {
      branchLanes[bName] = idx;
    });

    // 2. Position nodes
    const nodeMap = new Map<string, GitCommitNode>();

    const nodes: GitCommitNode[] = commits.map((commit, rowIdx) => {
      const lane = branchLanes[commit.branch] !== undefined ? branchLanes[commit.branch] : 0;
      const x = paddingX + lane * laneWidth;
      const y = paddingY + rowIdx * rowHeight;
      const color = getBranchColor(commit.branch, lane);
      const isHead = commit.branch === activeBranch && commit.isHead;

      const nodeObj: GitCommitNode = {
        ...commit,
        lane,
        x,
        y,
        color,
        isHead: isHead || commit.isHead,
      };

      nodeMap.set(commit.hash, nodeObj);
      nodeMap.set(commit.shortHash, nodeObj);
      nodeMap.set(commit.hash.slice(0, 7), nodeObj);
      return nodeObj;
    });

    // 3. Generate links between parents and children
    const links: GitGraphLink[] = [];

    nodes.forEach((node) => {
      node.parents.forEach((parentHash, pIdx) => {
        const parentNode = nodeMap.get(parentHash);
        if (parentNode) {
          const isMergeLink = pIdx > 0;
          links.push({
            id: `link-${node.shortHash}-${parentNode.shortHash}-${pIdx}`,
            source: node,
            target: parentNode,
            color: isMergeLink ? parentNode.color || node.color || '#f43f5e' : node.color || '#f43f5e',
            isMerge: isMergeLink,
          });
        }
      });
    });

    // 4. Summarize branch info
    const branchInfoList: BranchInfo[] = branchesFound.map((bName) => {
      const lane = branchLanes[bName] || 0;
      const head = commits.find((c) => c.branch === bName);
      return {
        name: bName,
        color: getBranchColor(bName, lane),
        lane,
        headHash: head ? head.shortHash : '---',
        isCurrent: bName === activeBranch,
      };
    });

    const maxLane = Math.max(0, ...Object.values(branchLanes));
    const width = Math.max(260, paddingX * 2 + (maxLane + 1) * laneWidth + 180);
    const height = Math.max(280, paddingY * 2 + nodes.length * rowHeight);

    return {
      nodes,
      links,
      branches: branchInfoList,
      width,
      height,
    };
  }

  /**
   * Returns a set of commit hashes including this commit and all its ancestor commits
   */
  public static getLineage(commitHash: string, commits: GitCommitNode[]): Set<string> {
    const ancestors = new Set<string>();
    const queue = [commitHash];
    ancestors.add(commitHash);

    const map = new Map<string, GitCommitNode>();
    for (const c of commits) {
      map.set(c.hash, c);
      map.set(c.shortHash, c);
      map.set(c.hash.slice(0, 7), c);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = map.get(current);
      if (node && node.parents) {
        for (const p of node.parents) {
          const pShort = p.slice(0, 7);
          if (!ancestors.has(pShort)) {
            ancestors.add(pShort);
            ancestors.add(p);
            queue.push(p);
          }
        }
      }
    }

    return ancestors;
  }
}
