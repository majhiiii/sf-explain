/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { MatchCondition, RuleConfidence } from '../rules/schema.js';
import { Match } from './types.js';

export function calculateScore(
  matchedConditions: MatchCondition[],
  confidence: RuleConfidence,
  probeBonusCount = 0
): number {
  let baseScore = 0.4;

  for (const cond of matchedConditions) {
    if (cond.equals !== undefined) {
      if (cond.field === 'name' || cond.field === 'code') {
        baseScore = Math.max(baseScore, 1.0);
      } else {
        baseScore = Math.max(baseScore, 0.7);
      }
    } else if (cond.regex !== undefined) {
      baseScore = Math.max(baseScore, 0.8);
    } else if (cond.contains !== undefined) {
      baseScore = Math.max(baseScore, 0.5);
    }
  }

  const scoreWithProbes = baseScore + probeBonusCount * 0.1;

  let cap = 1.0;
  if (confidence === 'low') {
    cap = 0.5;
  } else if (confidence === 'medium') {
    cap = 0.8;
  }

  return Math.min(scoreWithProbes, cap);
}

export function rankMatches(matches: Match[]): Match[] {
  return [...matches]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.why.length - a.why.length;
    })
    .slice(0, 3);
}
