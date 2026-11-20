/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';
import { FailureAnalysis } from './types.js';

export interface ExplainedItem {
  failure: Failure;
  analysis?: FailureAnalysis;
}

export interface FailureGroup {
  rootCause: ExplainedItem;
  cascading: ExplainedItem[];
  isSyntaxCascade?: boolean;
}

export interface GroupedAnalysis {
  groups: FailureGroup[];
  totalFailures: number;
  totalExplained: number;
}

const SYNTAX_ERROR_PATTERN = /(?:Expecting\s+.*?\s+but\s+was:|Unexpected\s+token|Extra\s+'.*?'|Illegal\s+token)/i;

const CASCADE_ERROR_PATTERNS = [
  /Variable does not exist:/i,
  /Method does not exist:/i,
  /Invalid constructor name:/i,
  /Method already defined:/i,
  /Method must have a body/i,
  /Missing return statement/i,
  /Unexpected token/i,
  /Expecting\s+.*?\s+but\s+was:/i,
  /Extra\s+'.*?'/i,
];

function isSyntaxError(item: ExplainedItem): boolean {
  if (item.analysis?.matches.some((m) => m.ruleId === 'apex-syntax-error')) {
    return true;
  }
  return SYNTAX_ERROR_PATTERN.test(item.failure.message);
}

function isCascadeCandidate(item: ExplainedItem): boolean {
  return CASCADE_ERROR_PATTERNS.some((pattern) => pattern.test(item.failure.message));
}

export function groupFailures(results: FailureAnalysis[], unmatched: Failure[]): GroupedAnalysis {
  const allItems: ExplainedItem[] = [];

  for (const analysis of results) {
    allItems.push({ failure: analysis.failure, analysis });
  }

  for (const failure of unmatched) {
    allItems.push({ failure });
  }

  const groups: FailureGroup[] = [];

  // Separate items that have an associated file from file-less items
  const fileItemsMap = new Map<string, ExplainedItem[]>();
  const noFileItems: ExplainedItem[] = [];

  for (const item of allItems) {
    if (item.failure.file) {
      const fileKey = item.failure.file;
      const list = fileItemsMap.get(fileKey) ?? [];
      list.push(item);
      fileItemsMap.set(fileKey, list);
    } else {
      noFileItems.push(item);
    }
  }

  // File-less failures are standalone groups
  for (const item of noFileItems) {
    groups.push({
      rootCause: item,
      cascading: [],
    });
  }

  // Process failures grouped by file
  for (const [, itemsInFile] of fileItemsMap) {
    if (itemsInFile.length === 1) {
      groups.push({
        rootCause: itemsInFile[0],
        cascading: [],
      });
      continue;
    }

    // Sort items by line number ascending
    itemsInFile.sort((a, b) => (a.failure.line ?? 0) - (b.failure.line ?? 0));

    // Look for earliest syntax error in the file
    const syntaxIndex = itemsInFile.findIndex((item) => isSyntaxError(item));

    if (syntaxIndex !== -1) {
      const rootItem = itemsInFile[syntaxIndex];
      const cascading: ExplainedItem[] = [];
      const remaining: ExplainedItem[] = [];

      for (let i = 0; i < itemsInFile.length; i++) {
        if (i === syntaxIndex) {
          continue;
        }

        const candidate = itemsInFile[i];
        if (isCascadeCandidate(candidate)) {
          cascading.push(candidate);
        } else {
          remaining.push(candidate);
        }
      }

      groups.push({
        rootCause: rootItem,
        cascading,
        isSyntaxCascade: true,
      });

      // Any remaining items that don't match cascade patterns are separate
      for (const rem of remaining) {
        groups.push({
          rootCause: rem,
          cascading: [],
        });
      }
    } else {
      // No syntax error found; first error in file is root, rest check for cascading
      const rootItem = itemsInFile[0];
      const cascading: ExplainedItem[] = [];
      const remaining: ExplainedItem[] = [];

      for (let i = 1; i < itemsInFile.length; i++) {
        const candidate = itemsInFile[i];
        if (isCascadeCandidate(candidate)) {
          cascading.push(candidate);
        } else {
          remaining.push(candidate);
        }
      }

      groups.push({
        rootCause: rootItem,
        cascading,
      });

      for (const rem of remaining) {
        groups.push({
          rootCause: rem,
          cascading: [],
        });
      }
    }
  }

  return {
    groups,
    totalFailures: allItems.length,
    totalExplained: results.length,
  };
}
