/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { ApexTestResultAdapter } from '../../src/adapters/test.js';

describe('ApexTestResultAdapter', () => {
  const adapter = new ApexTestResultAdapter();

  it('normalizes apex test failures from test result JSON', () => {
    const fixturePath = path.resolve('test/fixtures/test/apex-test-failure.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('test');
    expect(failure.message).to.include('Assertion Failed: Expected status active but got pending');
    expect(failure.component?.type).to.equal('ApexClass');
    expect(failure.component?.name).to.equal('SampleServiceTest.testExecute');
    expect(failure.line).to.equal(42);
    expect(failure.column).to.equal(1);
    expect(failure.exitCode).to.equal(1);
  });
});
