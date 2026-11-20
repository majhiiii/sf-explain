/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { ExplainedItem, GroupedAnalysis } from '../engine/grouper.js';
import { Failure } from '../types.js';
import { AnalysisMatch } from '../engine/types.js';

export interface SummaryRenderOptions {
  showCascade?: boolean;
}

function formatLocation(f: Failure): string | undefined {
  if (!f.file) {
    return undefined;
  }
  if (f.line && f.column) {
    return `${f.file}:${f.line}:${f.column}`;
  }
  if (f.line) {
    return `${f.file}:${f.line}`;
  }
  return f.file;
}

function formatMatchedRootCause(itemNum: number, f: Failure, best: AnalysisMatch): string[] {
  const summary = f.message.split('\n')[0].trim();
  const lines: string[] = [`#### 🔴 Root Cause ${itemNum}: \`${summary}\``];

  const loc = formatLocation(f);
  if (loc) {
    lines.push(`- **Location:** \`${loc}\``);
  }
  if (f.component?.type || f.component?.name) {
    const compStr = [f.component.type, f.component.name].filter(Boolean).join(' / ');
    lines.push(`- **Component:** \`${compStr}\``);
  }
  lines.push(`- **Rule:** \`${best.ruleId}\` (${best.confidence} confidence)`);
  lines.push(`- **Likely Cause:** ${best.explain.trim()}`);
  lines.push('- **Recommended Fix:**');
  for (const [stepIdx, step] of best.fix.entries()) {
    lines.push(`  ${stepIdx + 1}. ${step}`);
  }
  if (best.sources.length > 0) {
    const src = best.sources[0];
    const srcTitle = src.title ?? src.url;
    lines.push(`- **Source:** [${srcTitle}](${src.url})`);
  }
  return lines;
}

function formatUnmatchedRootCause(itemNum: number, f: Failure): string[] {
  const summary = f.message.split('\n')[0].trim();
  const lines: string[] = [`#### ❓ Issue ${itemNum}: \`${summary}\``];
  const loc = formatLocation(f);
  if (loc) {
    lines.push(`- **Location:** \`${loc}\``);
  }
  lines.push('- **Status:** No matching rule.');
  lines.push('- **Contribute:** Run `sf explain --contribute` to scaffold a community rule.');
  return lines;
}

function formatCascadingErrors(cascading: ExplainedItem[], showCascade?: boolean): string[] {
  if (cascading.length === 0) {
    return [];
  }
  const lines: string[] = [''];
  if (showCascade) {
    lines.push('<details>');
    lines.push(`<summary><b>Cascading Errors (${cascading.length})</b></summary>\n`);
    for (const casc of cascading) {
      lines.push(`- \`${casc.failure.message.split('\n')[0].trim()}\``);
    }
    lines.push('\n</details>');
  } else {
    lines.push(
      `> ⚠️ **${cascading.length} cascading error${
        cascading.length === 1 ? '' : 's'
      } hidden.** Run with \`--show-cascade\` to display all.`
    );
  }
  return lines;
}

export function renderSummary(grouped: GroupedAnalysis, options?: SummaryRenderOptions): string {
  const totalCascading = grouped.groups.reduce((acc, g) => acc + g.cascading.length, 0);
  const rootCount = grouped.groups.length;

  const lines: string[] = ['### 🔍 sf-explain Analysis\n'];

  if (totalCascading > 0) {
    lines.push(
      `**${grouped.totalFailures} problems found** (${rootCount} root cause${
        rootCount === 1 ? '' : 's'
      }, ${totalCascading} cascading), **${grouped.totalExplained} explained**.\n`
    );
  } else {
    lines.push(
      `**${grouped.totalFailures} problem${grouped.totalFailures === 1 ? '' : 's'} found**, **${
        grouped.totalExplained
      } explained**.\n`
    );
  }

  for (let idx = 0; idx < grouped.groups.length; idx++) {
    const group = grouped.groups[idx];
    const itemNum = idx + 1;
    const f = group.rootCause.failure;

    lines.push('---');
    lines.push('');

    if (group.rootCause.analysis && group.rootCause.analysis.matches.length > 0) {
      const best = group.rootCause.analysis.matches[0];
      lines.push(...formatMatchedRootCause(itemNum, f, best));
    } else {
      lines.push(...formatUnmatchedRootCause(itemNum, f));
    }

    lines.push(...formatCascadingErrors(group.cascading, options?.showCascade));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
