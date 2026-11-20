/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';
import { MatchCondition, Rule } from '../rules/schema.js';
import { Match } from './types.js';
import { calculateScore, rankMatches } from './scoring.js';
import { ContextProbes } from './probes.js';

export class Matcher {
  private rules: Rule[];
  private probes?: ContextProbes;

  public constructor(rules: Rule[], probes?: ContextProbes) {
    this.rules = rules;
    this.probes = probes;
  }

  public findMatches(failure: Failure, failureIndex: number): Match[] {
    const rawMatches: Match[] = [];

    for (const rule of this.rules) {
      const matchResult = this.evaluateRule(rule, failure);
      if (matchResult.matched) {
        let probeBonusCount = 0;
        const why = [...matchResult.why];

        if (rule.when && rule.when.length > 0 && this.probes) {
          for (const whenCond of rule.when) {
            if (this.probes.evaluateCondition(whenCond)) {
              probeBonusCount++;
              why.push(`probe '${whenCond.probe}' condition satisfied`);
            }
          }
        }

        const score = calculateScore(matchResult.matchedConditions, rule.confidence, probeBonusCount);
        rawMatches.push({
          ruleId: rule.id,
          failureIndex,
          score,
          confidence: rule.confidence,
          why,
          rule,
        });
      }
    }

    return rankMatches(rawMatches);
  }

  private evaluateRule(
    rule: Rule,
    failure: Failure
  ): { matched: boolean; matchedConditions: MatchCondition[]; why: string[] } {
    const matchedConditions: MatchCondition[] = [];
    const why: string[] = [];

    if (rule.match.all && rule.match.all.length > 0) {
      for (const cond of rule.match.all) {
        const condResult = this.evaluateCondition(cond, failure);
        if (!condResult.matched) {
          return { matched: false, matchedConditions: [], why: [] };
        }
        matchedConditions.push(cond);
        why.push(condResult.reason);
      }
    }

    if (rule.match.any && rule.match.any.length > 0) {
      let anyMatched = false;
      for (const cond of rule.match.any) {
        const condResult = this.evaluateCondition(cond, failure);
        if (condResult.matched) {
          anyMatched = true;
          matchedConditions.push(cond);
          why.push(condResult.reason);
        }
      }
      if (!anyMatched) {
        return { matched: false, matchedConditions: [], why: [] };
      }
    }

    const hasConditions = (rule.match.all?.length ?? 0) > 0 || (rule.match.any?.length ?? 0) > 0;
    return {
      matched: hasConditions,
      matchedConditions,
      why,
    };
  }

  private evaluateCondition(condition: MatchCondition, failure: Failure): { matched: boolean; reason: string } {
    const actualValue = this.getFieldValue(condition.field, failure);
    const actualStr = actualValue !== undefined ? String(actualValue) : '';

    if (condition.equals !== undefined) {
      const expectedStr = String(condition.equals);
      const isMatch = actualStr.toLowerCase() === expectedStr.toLowerCase();
      return {
        matched: isMatch,
        reason: `field '${condition.field}' equals '${expectedStr}'`,
      };
    }

    if (condition.contains !== undefined) {
      const isMatch = actualStr.toLowerCase().includes(condition.contains.toLowerCase());
      return {
        matched: isMatch,
        reason: `field '${condition.field}' contains '${condition.contains}'`,
      };
    }

    if (condition.regex !== undefined) {
      let pattern = condition.regex;
      let flags = '';
      if (pattern.startsWith('(?i)')) {
        flags = 'i';
        pattern = pattern.substring(4);
      }
      try {
        const re = new RegExp(pattern, flags);
        const isMatch = re.test(actualStr);
        return {
          matched: isMatch,
          reason: `field '${condition.field}' matched regex /${condition.regex}/`,
        };
      } catch {
        return { matched: false, reason: `invalid regex /${condition.regex}/` };
      }
    }

    if (condition.glob !== undefined) {
      const globPattern = condition.glob.replace(/\*/g, '.*');
      const re = new RegExp(`^${globPattern}$`, 'i');
      const isMatch = re.test(actualStr);
      return {
        matched: isMatch,
        reason: `field '${condition.field}' matched glob '${condition.glob}'`,
      };
    }

    return { matched: false, reason: 'no condition operator specified' };
  }

  // eslint-disable-next-line class-methods-use-this
  private getFieldValue(field: string, failure: Failure): string | number | undefined {
    switch (field) {
      case 'source':
        return failure.source;
      case 'command':
        return failure.command;
      case 'name':
        return failure.name;
      case 'code':
        return failure.code;
      case 'message':
        return failure.message;
      case 'component.type':
        return failure.component?.type;
      case 'file':
        return failure.file;
      default:
        return undefined;
    }
  }
}
