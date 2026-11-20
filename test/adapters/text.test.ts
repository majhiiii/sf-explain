import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { PlainTextAdapter } from '../../src/adapters/text.js';

describe('PlainTextAdapter', () => {
  const adapter = new PlainTextAdapter();

  it('normalizes named-org-not-found plain text fixture', () => {
    const fixturePath = path.resolve('test/fixtures/text/named-org-not-found.txt');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('text');
    expect(failure.name).to.equal('NamedOrgNotFoundError');
    expect(failure.message).to.include('No authorization information found for NonexistentOrg');
  });

  it('normalizes invalid-workspace plain text fixture', () => {
    const fixturePath = path.resolve('test/fixtures/text/invalid-workspace.txt');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('text');
    expect(failure.name).to.equal('InvalidProjectWorkspaceError');
    expect(failure.message).to.include('does not contain a valid Salesforce DX project');
  });

  it('normalizes numeric error code from plain text', () => {
    const fixturePath = path.resolve('test/fixtures/text/nonexistent-flag.txt');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('text');
    expect(failure.exitCode).to.equal(2);
    expect(failure.message).to.include('Nonexistent flag: --foo');
  });

  it('handles arbitrary multiline error text', () => {
    const raw = 'Something unexpected crashed\nAdditional detail here';
    const failures = adapter.adapt(raw);

    expect(failures).to.have.lengthOf(1);
    const failure = failures[0];
    expect(failure.source).to.equal('text');
    expect(failure.message).to.equal('Something unexpected crashed\nAdditional detail here');
  });

  it('parses multiple component compile error lines from CLI terminal output including Windows drive paths', () => {
    const raw = `=== Deploy Errors (2) ===
ERROR: d:\\LwrPOC\\lwrPOC\\force-app\\main\\default\\classes\\OrderService.cls: Expecting '}' but was: ']' (159:10)
ERROR: d:\\LwrPOC\\lwrPOC\\force-app\\main\\default\\classes\\OrderService.cls: Variable does not exist: totalAmount (164:33)`;

    const failures = adapter.adapt(raw);
    expect(failures).to.have.lengthOf(2);
    expect(failures[0].file).to.equal('d:\\LwrPOC\\lwrPOC\\force-app\\main\\default\\classes\\OrderService.cls');
    expect(failures[0].component?.type).to.equal('ApexClass');
    expect(failures[0].component?.name).to.equal('OrderService');
    expect(failures[0].line).to.equal(159);
    expect(failures[0].column).to.equal(10);
    expect(failures[0].message).to.equal("Expecting '}' but was: ']'");

    expect(failures[1].line).to.equal(164);
    expect(failures[1].message).to.equal('Variable does not exist: totalAmount');
  });
});
