import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { GenericErrorAdapter } from '../../src/adapters/generic.js';

describe('GenericErrorAdapter', () => {
  const adapter = new GenericErrorAdapter();

  it('normalizes named-org-not-found fixture correctly', () => {
    const fixturePath = path.resolve('test/fixtures/generic/named-org-not-found.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('generic');
    expect(failure.name).to.equal('NamedOrgNotFoundError');
    expect(failure.code).to.equal('NamedOrgNotFoundError');
    expect(failure.exitCode).to.equal(2);
    expect(failure.message).to.include('No authorization information found for NonexistentOrg');
    expect(failure.command).to.equal('OrgDisplayCommand');
  });

  it('normalizes invalid-workspace fixture correctly', () => {
    const fixturePath = path.resolve('test/fixtures/generic/invalid-workspace.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('generic');
    expect(failure.name).to.equal('InvalidProjectWorkspaceError');
    expect(failure.exitCode).to.equal(1);
    expect(failure.message).to.include('does not contain a valid Salesforce DX project');
  });

  it('normalizes nonexistent-flag fixture correctly', () => {
    const fixturePath = path.resolve('test/fixtures/generic/nonexistent-flag.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('generic');
    expect(failure.code).to.equal('2');
    expect(failure.message).to.include('Nonexistent flag: --foo');
  });

  it('handles JSON object input directly', () => {
    const failures = adapter.adapt({ message: 'Custom error', status: 1 });
    expect(failures).to.have.lengthOf(1);
    expect(failures[0].message).to.equal('Custom error');
    expect(failures[0].exitCode).to.equal(1);
  });
});
