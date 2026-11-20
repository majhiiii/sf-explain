/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { calculateScore, rankMatches } from '../../src/engine/scoring.js';
import { Match } from '../../src/engine/types.js';
import { Rule } from '../../src/rules/schema.js';

describe('Scoring Engine', () => {
  const dummyRule: Rule = {
    id: 'test-rule',
    title: 'Test Rule',
    status: 'verified',
    severity: 'error',
    confidence: 'high',
    match: {
      all: [{ field: 'name', equals: 'NamedOrgNotFoundError' }],
    },
    explain: 'Explain text',
    fix: ['Fix 1'],
    sources: [{ url: 'https://example.com' }],
  };

  it('calculates 1.0 base score for equals on name or code', () => {
    const score = calculateScore([{ field: 'name', equals: 'NamedOrgNotFoundError' }], 'high', 0);
    expect(score).to.equal(1.0);
  });

  it('calculates 0.8 base score for regex', () => {
    const score = calculateScore([{ field: 'message', regex: '.*not found.*' }], 'high', 0);
    expect(score).to.equal(0.8);
  });

  it('calculates 0.5 base score for contains', () => {
    const score = calculateScore([{ field: 'message', contains: 'not found' }], 'high', 0);
    expect(score).to.equal(0.5);
  });

  it('caps score at rule confidence level', () => {
    const mediumScore = calculateScore([{ field: 'name', equals: 'NamedOrgNotFoundError' }], 'medium', 0);
    expect(mediumScore).to.equal(0.8);

    const lowScore = calculateScore([{ field: 'name', equals: 'NamedOrgNotFoundError' }], 'low', 0);
    expect(lowScore).to.equal(0.5);
  });

  it('adds +0.1 for probe conditions up to the confidence cap', () => {
    const score = calculateScore([{ field: 'message', contains: 'not found' }], 'high', 2);
    // 0.5 base + 0.2 probes = 0.7
    expect(score).to.be.closeTo(0.7, 0.001);
  });

  it('ranks matches by score descending and then by specificity', () => {
    const match1: Match = {
      ruleId: 'rule-1',
      failureIndex: 0,
      score: 0.5,
      confidence: 'low',
      why: ['message contains not found'],
      rule: { ...dummyRule, id: 'rule-1' },
    };
    const match2: Match = {
      ruleId: 'rule-2',
      failureIndex: 0,
      score: 1.0,
      confidence: 'high',
      why: ['name equals NamedOrgNotFoundError'],
      rule: { ...dummyRule, id: 'rule-2' },
    };
    const match3: Match = {
      ruleId: 'rule-3',
      failureIndex: 0,
      score: 0.8,
      confidence: 'medium',
      why: ['regex matched'],
      rule: { ...dummyRule, id: 'rule-3' },
    };

    const ranked = rankMatches([match1, match2, match3]);
    expect(ranked[0].ruleId).to.equal('rule-2');
    expect(ranked[1].ruleId).to.equal('rule-3');
    expect(ranked[2].ruleId).to.equal('rule-1');
  });

  it('limits results to top 3 matches per failure', () => {
    const matches: Match[] = [0.1, 0.4, 0.9, 0.7, 0.5].map((score, idx) => ({
      ruleId: `rule-${idx}`,
      failureIndex: 0,
      score,
      confidence: 'high',
      why: ['why'],
      rule: { ...dummyRule, id: `rule-${idx}` },
    }));

    const ranked = rankMatches(matches);
    expect(ranked).to.have.lengthOf(3);
    expect(ranked[0].score).to.equal(0.9);
  });
});
