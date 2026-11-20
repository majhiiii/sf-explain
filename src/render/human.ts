/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { FailureAnalysis } from '../engine/types.js';
import { Failure } from '../types.js';

export function renderHuman(results: FailureAnalysis[], unmatched: Failure[]): string {
  const totalAnalyzed = results.length + unmatched.length;
  const explainedCount = results.filter((r) => r.matches.length > 0).length;

  const lines: string[] = [];
  lines.push(
    `Analysis complete: ${totalAnalyzed} problem${totalAnalyzed === 1 ? '' : 's'} found, ${explainedCount} explained\n`
  );

  let itemNum = 1;

  for (const result of results) {
    const f = result.failure;
    const summary = f.message.split('\n')[0].trim();

    if (result.matches.length > 0) {
      const best = result.matches[0];
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

    lines.push('');
    itemNum++;
  }

  for (const uf of unmatched) {
    const summary = uf.message.split('\n')[0].trim();
    lines.push(`${itemNum}) ${summary}`);
    lines.push('   No matching rule. Want to add one? Run: sf explain --contribute\n');
    itemNum++;
  }

  return lines.join('\n').trimEnd();
}
