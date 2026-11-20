/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';
import { Rule, SourceLink } from '../rules/schema.js';
import { FailureGroup } from './grouper.js';

export interface Match {
  ruleId: string;
  failureIndex: number;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  why: string[];
  rule: Rule;
}

export interface FailureAnalysis {
  failure: Failure;
  matches: Array<{
    ruleId: string;
    title: string;
    explain: string;
    fix: string[];
    confidence: 'low' | 'medium' | 'high';
    sources: SourceLink[];
    why: string[];
  }>;
}

export interface ExplainOutput {
  schemaVersion: number;
  analyzed: number;
  explained: number;
  results: FailureAnalysis[];
  unmatched: Failure[];
  groups?: FailureGroup[];
}
