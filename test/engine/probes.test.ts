/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { ContextProbes } from '../../src/engine/probes.js';
import { WhenCondition } from '../../src/rules/schema.js';

describe('ContextProbes', () => {
  const tmpDir = path.resolve('tmp/test-probes');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reads sfdx-project.json attributes safely', () => {
    const projectJson = {
      sourceApiVersion: '62.0',
      packageDirectories: [{ path: 'force-app', default: true }],
    };
    fs.writeFileSync(path.join(tmpDir, 'sfdx-project.json'), JSON.stringify(projectJson), 'utf8');

    const probes = new ContextProbes(tmpDir);
    const apiVersion = probes.probe('project.sourceApiVersion');
    expect(apiVersion).to.equal('62.0');
  });

  it('reads scratch definition features and evaluates when condition', () => {
    const configDir = path.join(tmpDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    const scratchDef = {
      orgName: 'Demo',
      features: ['Communities'],
    };
    fs.writeFileSync(path.join(configDir, 'project-scratch-def.json'), JSON.stringify(scratchDef), 'utf8');

    const probes = new ContextProbes(tmpDir);
    const condition1: WhenCondition = {
      probe: 'scratchDef.features',
      includes: 'Communities',
    };
    const condition2: WhenCondition = {
      probe: 'scratchDef.features',
      excludes: 'Sites',
    };

    expect(probes.evaluateCondition(condition1)).to.be.true;
    expect(probes.evaluateCondition(condition2)).to.be.true;
  });

  it('detects .forceignore presence', () => {
    const probesBefore = new ContextProbes(tmpDir);
    expect(probesBefore.probe('forceignore.exists')).to.be.false;

    fs.writeFileSync(path.join(tmpDir, '.forceignore'), '# ignore\n', 'utf8');
    const probesAfter = new ContextProbes(tmpDir);
    expect(probesAfter.probe('forceignore.exists')).to.be.true;
  });

  it('fails silently without throwing when files are missing', () => {
    const emptyProbes = new ContextProbes(tmpDir);
    expect(emptyProbes.probe('scratchDef.features')).to.be.undefined;
    expect(emptyProbes.probe('project.sourceApiVersion')).to.be.undefined;
  });
});
