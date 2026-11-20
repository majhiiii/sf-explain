/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { groupFailures } from '../../src/engine/grouper.js';
import { Failure } from '../../src/types.js';
import { FailureAnalysis } from '../../src/engine/types.js';

describe('Root Cause Grouper', () => {
  it('groups cascading syntax and semantic errors under the earliest syntax error in the same file', () => {
    const rootFailure: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/B2BCreditLimitService.cls',
      line: 159,
      column: 10,
      message: "Expecting '}' but was: ']'",
      raw: {},
    };

    const rootAnalysis: FailureAnalysis = {
      failure: rootFailure,
      matches: [
        {
          ruleId: 'apex-syntax-error',
          title: 'Apex Syntax or Tokenization Error',
          explain: 'Mismatched bracket or unexpected token.',
          fix: ['Fix bracket on line 159.'],
          confidence: 'high',
          sources: [{ url: 'https://developer.salesforce.com' }],
          why: ['Matched syntax error'],
        },
      ],
    };

    const cascading1: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/B2BCreditLimitService.cls',
      line: 164,
      column: 33,
      message: 'Variable does not exist: hierarchyAccountIds',
      raw: {},
    };

    const cascading2: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/B2BCreditLimitService.cls',
      line: 168,
      column: 32,
      message: "Unexpected token '='.",
      raw: {},
    };

    const cascading3: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/B2BCreditLimitService.cls',
      line: 168,
      column: 74,
      message: 'Method already defined: <init> void B2BCreditLimitService.<init>() from the type B2BCreditLimitService',
      raw: {},
    };

    const cascading4: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/B2BCreditLimitService.cls',
      line: 168,
      column: 35,
      message: 'Invalid constructor name: pendingAgg.size',
      raw: {},
    };

    const result = groupFailures([rootAnalysis], [cascading1, cascading2, cascading3, cascading4]);

    expect(result.groups).to.have.lengthOf(1);
    const group = result.groups[0];
    expect(group.rootCause.failure.line).to.equal(159);
    expect(group.rootCause.analysis).to.exist;
    expect(group.rootCause.analysis?.matches[0].ruleId).to.equal('apex-syntax-error');
    expect(group.cascading).to.have.lengthOf(4);
    expect(result.totalFailures).to.equal(5);
    expect(result.totalExplained).to.equal(1);
  });

  it('keeps failures from different files in distinct root cause groups', () => {
    const file1Failure: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/ServiceA.cls',
      line: 20,
      column: 5,
      message: "Expecting '}' but was: ';'",
      raw: {},
    };

    const file2Failure: Failure = {
      source: 'deploy',
      file: 'force-app/main/default/classes/ServiceB.cls',
      line: 55,
      column: 12,
      message: 'Variable does not exist: customConfig',
      raw: {},
    };

    const result = groupFailures([], [file1Failure, file2Failure]);

    expect(result.groups).to.have.lengthOf(2);
    expect(result.groups[0].rootCause.failure.file).to.equal('force-app/main/default/classes/ServiceA.cls');
    expect(result.groups[0].cascading).to.have.lengthOf(0);
    expect(result.groups[1].rootCause.failure.file).to.equal('force-app/main/default/classes/ServiceB.cls');
    expect(result.groups[1].cascading).to.have.lengthOf(0);
  });

  it('handles failures without file paths gracefully', () => {
    const orgFailure: Failure = {
      source: 'deploy',
      message: 'No default org set',
      raw: {},
    };

    const result = groupFailures([], [orgFailure]);

    expect(result.groups).to.have.lengthOf(1);
    expect(result.groups[0].rootCause.failure.message).to.equal('No default org set');
    expect(result.groups[0].cascading).to.have.lengthOf(0);
  });
});
