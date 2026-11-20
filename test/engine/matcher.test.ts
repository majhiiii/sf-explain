/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { Matcher } from '../../src/engine/matcher.js';
import { Failure } from '../../src/types.js';
import { Rule } from '../../src/rules/schema.js';

describe('Matcher Engine', () => {
  const failure: Failure = {
    source: 'generic',
    command: 'OrgDisplayCommand',
    name: 'NamedOrgNotFoundError',
    code: 'NamedOrgNotFoundError',
    message: 'Parsing --target-org \n\tNo authorization information found for NonexistentOrg.',
    exitCode: 2,
    raw: {},
  };

  const sampleRule: Rule = {
    id: 'no-target-org-auth',
    title: 'Target Org Not Authorized',
    status: 'verified',
    severity: 'error',
    confidence: 'high',
    match: {
      all: [
        { field: 'name', equals: 'NamedOrgNotFoundError' },
        { field: 'message', contains: 'No authorization information found' },
      ],
    },
    explain: 'The target org is not authenticated.',
    fix: ['Run sf org login web to authenticate the org.'],
    sources: [{ url: 'https://developer.salesforce.com' }],
  };

  it('matches when all conditions are satisfied', () => {
    const matcher = new Matcher([sampleRule]);
    const matches = matcher.findMatches(failure, 0);

    expect(matches).to.have.lengthOf(1);
    expect(matches[0].ruleId).to.equal('no-target-org-auth');
    expect(matches[0].score).to.equal(1.0);
    expect(matches[0].why).to.have.lengthOf(2);
    expect(matches[0].why[0]).to.include("field 'name' equals 'NamedOrgNotFoundError'");
  });

  it('does not match when an "all" condition fails', () => {
    const nonMatchingRule: Rule = {
      ...sampleRule,
      id: 'other-rule',
      match: {
        all: [
          { field: 'name', equals: 'NamedOrgNotFoundError' },
          { field: 'command', equals: 'OtherCommand' },
        ],
      },
    };

    const matcher = new Matcher([nonMatchingRule]);
    const matches = matcher.findMatches(failure, 0);
    expect(matches).to.have.lengthOf(0);
  });

  it('matches when at least one "any" condition is satisfied', () => {
    const anyRule: Rule = {
      ...sampleRule,
      id: 'any-rule',
      match: {
        any: [
          { field: 'name', equals: 'WrongName' },
          { field: 'code', equals: 'NamedOrgNotFoundError' },
        ],
      },
    };

    const matcher = new Matcher([anyRule]);
    const matches = matcher.findMatches(failure, 0);
    expect(matches).to.have.lengthOf(1);
    expect(matches[0].ruleId).to.equal('any-rule');
  });

  it('supports regex matching (including (?i) case-insensitivity)', () => {
    const regexRule: Rule = {
      ...sampleRule,
      id: 'regex-rule',
      match: {
        all: [{ field: 'message', regex: '(?i)no authorization information' }],
      },
    };

    const matcher = new Matcher([regexRule]);
    const matches = matcher.findMatches(failure, 0);
    expect(matches).to.have.lengthOf(1);
  });
});
