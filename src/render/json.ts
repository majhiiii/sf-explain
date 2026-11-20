/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { ExplainOutput, FailureAnalysis } from '../engine/types.js';
import { Failure } from '../types.js';

export function renderJson(results: FailureAnalysis[], unmatched: Failure[]): ExplainOutput {
  const explained = results.filter((r) => r.matches.length > 0).length;
  const totalAnalyzed = results.length + unmatched.length;

  return {
    schemaVersion: 1,
    analyzed: totalAnalyzed,
    explained,
    results,
    unmatched,
  };
}
