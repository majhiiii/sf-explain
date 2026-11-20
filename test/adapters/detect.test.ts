import { expect } from 'chai';
import { detectAdapter } from '../../src/adapters/detect.js';

describe('detectAdapter', () => {
  it('detects generic JSON error payload', () => {
    const json = JSON.stringify({
      name: 'NamedOrgNotFoundError',
      message: 'No authorization information found',
      status: 2,
      exitCode: 2,
    });
    expect(detectAdapter(json)).to.equal('generic');
  });

  it('detects plain text error output', () => {
    const text = 'Error (2): Nonexistent flag: --foo\nSee more help with --help';
    expect(detectAdapter(text)).to.equal('text');
  });

  it('detects non-JSON arbitrary text as text', () => {
    const text = 'Something went completely wrong during build.';
    expect(detectAdapter(text)).to.equal('text');
  });

  it('handles leading and trailing whitespace around JSON', () => {
    const json = '   \n  {"message": "An error occurred", "status": 1}  \n ';
    expect(detectAdapter(json)).to.equal('generic');
  });
});
