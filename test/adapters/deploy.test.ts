/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { DeployResultAdapter } from '../../src/adapters/deploy.js';

describe('DeployResultAdapter', () => {
  const adapter = new DeployResultAdapter();

  it('normalizes component failures from deploy result JSON', () => {
    const fixturePath = path.resolve('test/fixtures/deploy/component-failure.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('deploy');
    expect(failure.message).to.include(
      "Entity of type 'CustomField' named 'Account.NonexistentField__c' cannot be found"
    );
    expect(failure.component?.type).to.equal('CustomField');
    expect(failure.component?.name).to.equal('Account.NonexistentField__c');
    expect(failure.file).to.equal('force-app/main/default/objects/Account/fields/NonexistentField__c.field-meta.xml');
    expect(failure.line).to.equal(15);
    expect(failure.column).to.equal(4);
    expect(failure.exitCode).to.equal(1);
  });
});
