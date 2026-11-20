/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

export type RuleStatus = 'draft' | 'verified';
export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleConfidence = 'low' | 'medium' | 'high';

export type MatchField = 'source' | 'command' | 'name' | 'code' | 'message' | 'component.type' | 'file';

export interface MatchCondition {
  field: MatchField;
  equals?: string | number;
  contains?: string;
  regex?: string;
  glob?: string;
}

export interface WhenCondition {
  probe: string;
  includes?: string;
  excludes?: string;
  equals?: unknown;
}

export interface SourceLink {
  url: string;
  title?: string;
}

export interface Rule {
  id: string;
  title: string;
  status: RuleStatus;
  severity: RuleSeverity;
  confidence: RuleConfidence;
  appliesTo?: {
    cliVersion?: string;
  };
  match: {
    all?: MatchCondition[];
    any?: MatchCondition[];
  };
  when?: WhenCondition[];
  explain: string;
  fix: string[];
  sources: SourceLink[];
  tags?: string[];
}

export interface RulesPayload {
  checksum: string;
  rules: Rule[];
  generatedAt: string;
}
