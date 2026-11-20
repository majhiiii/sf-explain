/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { validateAllRules } from '../../scripts/validate-rules.js';
import { Matcher } from '../../src/engine/matcher.js';
import { normalizeInput } from '../../src/adapters/index.js';

describe('Rules Validation & Fixtures Test', () => {
  const result = validateAllRules();

  it('validates all rules meet the schema and authoring standard', () => {
    expect(result.errors).to.deep.equal([]);
    expect(result.valid).to.be.true;
    expect(result.rules.length).to.be.at.least(5);
  });

  for (const rule of result.rules) {
    describe(`Rule: ${rule.id}`, () => {
      const matcher = new Matcher([rule]);

      it('matches its positive fixture', () => {
        const posPath = path.resolve('test/fixtures/rules', rule.id, 'positive-1.json');
        const content = fs.readFileSync(posPath, 'utf8');
        const failures = normalizeInput(content);

        expect(failures).to.have.lengthOf(1);
        const matches = matcher.findMatches(failures[0], 0);
        expect(matches).to.have.lengthOf.at.least(1, `Rule ${rule.id} failed to match positive fixture`);
        expect(matches[0].ruleId).to.equal(rule.id);
      });

      it('does NOT match its negative fixture', () => {
        const negPath = path.resolve('test/fixtures/rules', rule.id, 'negative-1.json');
        const content = fs.readFileSync(negPath, 'utf8');
        const failures = normalizeInput(content);

        expect(failures).to.have.lengthOf(1);
        const matches = matcher.findMatches(failures[0], 0);
        expect(matches).to.have.lengthOf(0, `Rule ${rule.id} unexpectedly matched negative fixture`);
      });
    });
  }
});
