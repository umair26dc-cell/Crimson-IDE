/**
 * Workspace Files Management
 * Clean workspace utilities for CsCode Crimson Code
 */

import { FileItem } from '../types';

export const CLEAN_STARTER_FILES: FileItem[] = [];

export const INITIAL_FILES: FileItem[] = [];

/**
 * Generates a clean empty workspace
 */
export function getEmptyWorkspace(): FileItem[] {
  return [];
}

/**
 * Flattens all file paths into a list for fast search and indexing
 */
export function getAllFilesList(items: FileItem[]): FileItem[] {
  const result: FileItem[] = [];
  function recurse(nodes: FileItem[]) {
    for (const node of nodes) {
      if (!node.isFolder) {
        result.push(node);
      }
      if (node.children) {
        recurse(node.children);
      }
    }
  }
  recurse(items);
  return result;
}

/**
 * Finds a file by ID or Path in nested structure
 */
export function findFileById(items: FileItem[], id: string): FileItem | null {
  for (const node of items) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFileById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
