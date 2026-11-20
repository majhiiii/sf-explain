/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import Explain from '../../src/commands/explain.js';

describe('explain command', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
  });

  afterEach(() => {
    $$.restore();
  });

  it('fails with actionable message when stdin is empty', async () => {
    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves('');

    try {
      await Explain.run([]);
      expect.fail('Should have thrown an error');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).to.include('No input provided. Pipe the output of a failed sf command');
    }
  });

  it('explains matching generic JSON failure from stdin', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/no-target-org-auth/positive-1.json');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    const result = await Explain.run([]);
    expect(result.schemaVersion).to.equal(1);
    expect(result.analyzed).to.equal(1);
    expect(result.explained).to.equal(1);
    expect(result.results).to.have.lengthOf(1);
    expect(result.results[0].matches[0].ruleId).to.equal('no-target-org-auth');

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Analysis complete: 1 problem found, 1 explained');
    expect(output).to.include('Rule:        no-target-org-auth');
    expect(output).to.include('Likely cause:');
    expect(output).to.include('Fix:');
    expect(output).to.include('Confidence:  high');
    expect(output).to.include('Why matched:');
  });

  it('explains failure loaded via --file flag', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/not-a-sfdx-project/positive-1.json');

    const result = await Explain.run(['--file', fixturePath]);
    expect(result.schemaVersion).to.equal(1);
    expect(result.explained).to.equal(1);
    expect(result.results[0].matches[0].ruleId).to.equal('not-a-sfdx-project');

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Rule:        not-a-sfdx-project');
  });

  it('explains failure from wrapped command when command fails', async () => {
    $$.SANDBOX.stub(Explain.prototype, 'runWrappedCommand').returns({
      output:
        'Error (InvalidProjectWorkspaceError): /home/user/project does not contain a valid Salesforce DX project.',
      status: 1,
    });

    const result = await Explain.run(['--', 'sf', 'project', 'deploy', 'start']);
    expect(result.schemaVersion).to.equal(1);
    expect(result.explained).to.equal(1);
    expect(result.results[0].matches[0].ruleId).to.equal('not-a-sfdx-project');
  });

  it('handles wrapped command success gracefully', async () => {
    $$.SANDBOX.stub(Explain.prototype, 'runWrappedCommand').returns({
      output: '',
      status: 0,
    });

    const result = await Explain.run(['--', 'sf', 'org', 'list']);
    expect(result.analyzed).to.equal(0);
    expect(result.explained).to.equal(0);

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Wrapped command completed successfully with no errors.');
  });

  it('reports unmatched failure with contribution prompt', async () => {
    const fixturePath = path.resolve('test/fixtures/text/nonexistent-flag.txt');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    const result = await Explain.run([]);
    expect(result.analyzed).to.equal(1);
    expect(result.explained).to.equal(0);
    expect(result.unmatched).to.have.lengthOf(1);

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('0 explained');
    expect(output).to.include('No matching rule. Want to add one? Run: sf explain --contribute');
  });

  it('generates redacted contribution template when --contribute is passed', async () => {
    const failureWithSecrets = JSON.stringify({
      name: 'CustomDeployError',
      message: 'Failed deploy for user admin@secretcompany.com in org 00DWC00000BtEyT2AV',
      exitCode: 1,
      status: 1,
    });

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(failureWithSecrets);

    await Explain.run(['--contribute']);

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Rule Contribution Template');
    expect(output).to.include('id: draft-');
    expect(output).to.include('status: draft');
    expect(output).to.include('confidence: medium');
    expect(output).to.include('[REDACTED_EMAIL]');
    expect(output).to.include('[REDACTED_ORG_ID]');
    expect(output).to.not.include('admin@secretcompany.com');
    expect(output).to.not.include('00DWC00000BtEyT2AV');
  });

  it('returns valid schemaVersion 1 JSON in json mode', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/not-a-sfdx-project/positive-1.json');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    const result = await Explain.run(['--json']);
    expect(result.schemaVersion).to.equal(1);
    expect(result.analyzed).to.equal(1);
    expect(result.explained).to.equal(1);
    expect(result.results[0].matches[0].ruleId).to.equal('not-a-sfdx-project');
    expect(result.unmatched).to.deep.equal([]);
  });

  it('collapses cascading compiler errors under a root syntax error and expands with --show-cascade', async () => {
    const multiErrorDeploy = JSON.stringify({
      status: 1,
      result: {
        details: {
          componentFailures: [
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              lineNumber: 10,
              columnNumber: 5,
              problem: "Expecting '}' but was: ']'",
            },
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              lineNumber: 12,
              columnNumber: 15,
              problem: 'Variable does not exist: totalAmount',
            },
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              lineNumber: 14,
              columnNumber: 20,
              problem: "Unexpected token '='.",
            },
          ],
        },
      },
    });

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(multiErrorDeploy);

    // Run without --show-cascade
    await Explain.run([]);

    let output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Analysis complete: 3 problems found (1 root cause, 2 cascading), 2 explained');
    expect(output).to.include("Expecting '}' but was: ']'");
    expect(output).to.include('⚠️  2 cascading errors hidden (run with --show-cascade to view all)');
    expect(output).to.not.include('Variable does not exist: totalAmount');

    // Reset stubs and run with --show-cascade
    sfCommandStubs.log.resetHistory();
    await Explain.run(['--show-cascade']);

    output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('Cascading errors (2):');
    expect(output).to.include('Variable does not exist: totalAmount');
    expect(output).to.include("Unexpected token '='.");
  });

  it('supports --no-redact to preserve raw identifiers when explicitly requested', async () => {
    const failureWithCustom = JSON.stringify({
      status: 1,
      result: {
        details: {
          componentFailures: [
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              lineNumber: 5,
              columnNumber: 1,
              problem: 'Field Custom_Tax_Rate__c does not exist on Account',
            },
          ],
        },
      },
    });

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(failureWithCustom);

    // Default: redacted
    const redactedResult = await Explain.run(['--json']);
    expect(redactedResult.unmatched[0].message).to.include('[REDACTED_CUSTOM_METADATA]');
    expect(redactedResult.unmatched[0].message).to.not.include('Custom_Tax_Rate__c');

    // With --no-redact
    const rawResult = await Explain.run(['--json', '--no-redact']);
    expect(rawResult.unmatched[0].message).to.include('Custom_Tax_Rate__c');
  });

  it('outputs clean markdown summary with --summary flag', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/no-target-org-auth/positive-1.json');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    await Explain.run(['--summary']);

    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('### 🔍 sf-explain Analysis');
    expect(output).to.include('**1 problem found**, **1 explained**.');
    expect(output).to.include('🔴 Root Cause 1:');
    expect(output).to.include('- **Rule:** `no-target-org-auth`');
    expect(output).to.include('- **Likely Cause:**');
    expect(output).to.include('- **Recommended Fix:**');
    expect(output).to.include('- **Source:**');
  });

  it('writes output to file with --output-file flag', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/no-target-org-auth/positive-1.json');
    const fixture = fs.readFileSync(fixturePath, 'utf8');
    const outputPath = path.resolve('tmp/test-output/result.md');

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    await Explain.run(['--summary', '--output-file', outputPath]);

    expect(fs.existsSync(outputPath)).to.be.true;
    const fileContent = fs.readFileSync(outputPath, 'utf8');
    expect(fileContent).to.include('### 🔍 sf-explain Analysis');
    expect(fileContent).to.include('- **Rule:** `no-target-org-auth`');

    fs.unlinkSync(outputPath);
  });

  it('filters failures using --severity-threshold flag', async () => {
    const mixedDeploy = JSON.stringify({
      status: 1,
      result: {
        details: {
          componentFailures: [
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              problemType: 'Warning',
              problem: 'Deprecated method called',
            },
            {
              componentType: 'ApexClass',
              fileName: 'force-app/main/default/classes/OrderService.cls',
              problemType: 'Error',
              problem: "Expecting '}' but was: ']'",
            },
          ],
        },
      },
    });

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(mixedDeploy);

    // With --severity-threshold error: only the error should remain
    const errorOnly = await Explain.run(['--json', '--severity-threshold', 'error']);
    expect(errorOnly.analyzed).to.equal(1);
    expect(errorOnly.results[0].matches[0].ruleId).to.equal('apex-syntax-error');

    // With --severity-threshold warning: both should remain
    const warningAndError = await Explain.run(['--json', '--severity-threshold', 'warning']);
    expect(warningAndError.analyzed).to.equal(2);
  });

  it('fails with exit 1 when --fail-on-unmatched is set and unmatched failures exist', async () => {
    const unknownFailure = JSON.stringify({
      status: 1,
      name: 'CompletelyUnknownInternalError',
      message: 'Some unrecognized internal error',
    });

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(unknownFailure);

    try {
      await Explain.run(['--fail-on-unmatched']);
      expect.fail('Should have thrown an error');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).to.include('failure(s) had no matching rule');
    }
  });

  it('succeeds with exit 0 when --fail-on-unmatched is set and all failures match', async () => {
    const fixturePath = path.resolve('test/fixtures/rules/no-target-org-auth/positive-1.json');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    $$.SANDBOX.stub(Explain.prototype, 'readStdin').resolves(fixture);

    const result = await Explain.run(['--fail-on-unmatched']);
    expect(result.explained).to.equal(1);
    expect(result.unmatched).to.have.lengthOf(0);
  });
});
