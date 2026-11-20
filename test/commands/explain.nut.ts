/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('explain NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  after(async () => {
    await session?.clean();
  });

  it('should exit with error code 1 when no stdin input is provided', () => {
    const result = execCmd('explain', { ensureExitCode: 1 });
    expect(result.shellOutput.stderr).to.include('No input provided. Pipe the output of a failed sf command');
  });
});
