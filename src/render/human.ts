/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { FailureAnalysis } from '../engine/types.js';
import { Failure } from '../types.js';
import { GroupedAnalysis, groupFailures } from '../engine/grouper.js';

export interface HumanRenderOptions {
  showCascade?: boolean;
}

export function renderHuman(
  groupedOrResults: GroupedAnalysis | FailureAnalysis[],
  unmatchedOrOptions?: Failure[] | HumanRenderOptions,
  options?: HumanRenderOptions
): string {
  let grouped: GroupedAnalysis;
  let opts: HumanRenderOptions | undefined;

  if (Array.isArray(groupedOrResults)) {
    grouped = groupFailures(groupedOrResults, (unmatchedOrOptions as Failure[]) ?? []);
    opts = options;
  } else {
    grouped = groupedOrResults;
    opts = unmatchedOrOptions as HumanRenderOptions | undefined;
  }

  const totalCascading = grouped.groups.reduce((acc, g) => acc + g.cascading.length, 0);
  const rootCount = grouped.groups.length;

  const lines: string[] = [];
  if (totalCascading > 0) {
    lines.push(
      `Analysis complete: ${grouped.totalFailures} problems found (${rootCount} root cause${
        rootCount === 1 ? '' : 's'
      }, ${totalCascading} cascading), ${grouped.totalExplained} explained\n`
    );
  } else {
    lines.push(
      `Analysis complete: ${grouped.totalFailures} problem${grouped.totalFailures === 1 ? '' : 's'} found, ${
        grouped.totalExplained
      } explained\n`
    );
  }

  for (let idx = 0; idx < grouped.groups.length; idx++) {
    const group = grouped.groups[idx];
    const itemNum = idx + 1;
    const f = group.rootCause.failure;
    const summary = f.message.split('\n')[0].trim();

    if (group.rootCause.analysis && group.rootCause.analysis.matches.length > 0) {
      const best = group.rootCause.analysis.matches[0];
      lines.push(`${itemNum}) ${summary}`);
      lines.push(`   Rule:        ${best.ruleId}`);
      lines.push(`   Likely cause: ${best.explain.trim()}`);
      lines.push('   Fix:');
      for (const [stepIdx, step] of best.fix.entries()) {
        lines.push(`                ${stepIdx + 1}. ${step}`);
      }
      const sourceUrl = best.sources.length > 0 ? best.sources[0].url : 'N/A';
      lines.push(`   Confidence:  ${best.confidence}   Source: ${sourceUrl}`);
      if (best.why.length > 0) {
        lines.push(`   Why matched: ${best.why.join('; ')}`);
      }
    } else {
      lines.push(`${itemNum}) ${summary}`);
      lines.push('   No matching rule. Want to add one? Run: sf explain --contribute');
    }

    if (group.cascading.length > 0) {
      if (opts?.showCascade) {
        lines.push(`\n   Cascading errors (${group.cascading.length}):`);
        for (const casc of group.cascading) {
          lines.push(`     - ${casc.failure.message.split('\n')[0].trim()}`);
        }
      } else {
        lines.push(
          `\n   ⚠️  ${group.cascading.length} cascading error${
            group.cascading.length === 1 ? '' : 's'
          } hidden (run with --show-cascade to view all)`
        );
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
