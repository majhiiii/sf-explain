/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { ScratchOrgResultAdapter } from '../../src/adapters/scratch.js';

describe('ScratchOrgResultAdapter', () => {
  const adapter = new ScratchOrgResultAdapter();

  it('normalizes scratch org failure JSON payload', () => {
    const fixturePath = path.resolve('test/fixtures/scratch/scratch-limit-error.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('scratch-org');
    expect(failure.name).to.equal('RemoteOrgSignupFailed');
    expect(failure.code).to.equal('SIGNUP_LIMIT_EXCEEDED');
    expect(failure.message).to.include('Daily scratch org signup limit reached');
    expect(failure.exitCode).to.equal(1);
  });
});
