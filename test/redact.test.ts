/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { redact, redactObject } from '../src/redact.js';

describe('Redaction Module', () => {
  it('redacts 15 and 18 character Salesforce Org IDs', () => {
    const input15 = 'Failed in org 00DWC00000BtEyT during deploy.';
    const input18 = 'Connected to target org 00DWC00000BtEyT2AV successfully.';

    expect(redact(input15)).to.equal('Failed in org [REDACTED_ORG_ID] during deploy.');
    expect(redact(input18)).to.equal('Connected to target org [REDACTED_ORG_ID] successfully.');
  });

  it('redacts Salesforce session IDs and Bearer tokens', () => {
    const sessionText = 'Session 00DWC00000BtEyT2AV!AQEAQFn7_FakeSessionToken_xyz123 was revoked.';
    const bearerText = 'Authorization: Bearer 00Dxx!secretToken123Value456==';

    expect(redact(sessionText)).to.include('[REDACTED_SESSION_ID]');
    expect(redact(bearerText)).to.include('[REDACTED_TOKEN]');
  });

  it('redacts email addresses and usernames formatted as emails', () => {
    const text = 'User admin@company.example.com encountered an error for dev.user+test@sub.org.net.';
    const redacted = redact(text);

    expect(redacted).to.not.include('admin@company.example.com');
    expect(redacted).to.not.include('dev.user+test@sub.org.net');
    expect(redacted).to.include('[REDACTED_EMAIL]');
  });

  it('redacts Salesforce instance URLs', () => {
    const text = 'Failed at https://mycompany--qa.sandbox.my.salesforce.com/services/data';
    const redacted = redact(text);

    expect(redacted).to.not.include('mycompany--qa');
    expect(redacted).to.include('https://[REDACTED_INSTANCE].salesforce.com/');
  });

  it('redacts user home directory paths from stacks', () => {
    const winPath = 'at C:\\Users\\johndoe\\projects\\app\\force-app\\main.cls:10:5';
    const unixPath = 'at /Users/janedoe/projects/app/force-app/main.cls:10:5';

    expect(redact(winPath)).to.include('[REDACTED_HOME]');
    expect(redact(winPath)).to.not.include('johndoe');
    expect(redact(unixPath)).to.include('[REDACTED_HOME]');
    expect(redact(unixPath)).to.not.include('janedoe');
  });

  it('recursively redacts sensitive strings in nested objects', () => {
    const nested = {
      username: 'dev@test.org',
      orgId: '00DWC00000BtEyT2AV',
      details: {
        instanceUrl: 'https://testinstance.my.salesforce.com/',
        errors: ['Error at /Users/developer/project: org 00DWC00000BtEyT2AV'],
      },
    };

    const cleaned = redactObject(nested);
    expect(cleaned.username).to.equal('[REDACTED_EMAIL]');
    expect(cleaned.orgId).to.equal('[REDACTED_ORG_ID]');
    expect(cleaned.details.instanceUrl).to.equal('https://[REDACTED_INSTANCE].salesforce.com/');
    expect(cleaned.details.errors[0]).to.include('[REDACTED_HOME]');
    expect(cleaned.details.errors[0]).to.include('[REDACTED_ORG_ID]');
  });
});
