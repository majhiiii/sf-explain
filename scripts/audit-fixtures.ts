/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface LeakRule {
  name: string;
  pattern: RegExp;
}

const LEAK_RULES: LeakRule[] = [
  {
    name: 'Salesforce Session ID',
    pattern: /00D[a-zA-Z0-9]{12,15}![a-zA-Z0-9._-]+/g,
  },
  {
    name: 'Live Bearer Token',
    pattern: /Bearer\s+(?!\[REDACTED)[a-zA-Z0-9._~+/-]{25,}=*/gi,
  },
  {
    name: 'Unmasked Live Org ID',
    // Flags 15 or 18 char Org ID unless it's an all-zero or obvious mock (e.g. 00D000000000000)
    pattern: /\b00D(?!000000000|0{12,15})[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?\b/g,
  },
  {
    name: 'Local User Directory Path',
    pattern: /(?:[a-zA-Z]:\\(?:Users|home)\\[a-zA-Z0-9._-]+|\/(?:Users|home)\/[a-zA-Z0-9._-]+)/gi,
  },
  {
    name: 'Private Key Block',
    pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
  },
  {
    name: 'Real Email Address (non-mock)',
    pattern: /[a-zA-Z0-9._%+-]+@(?!example\.com|test\.org|mycompany\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  },
];

export interface AuditResult {
  totalFiles: number;
  violations: Array<{
    file: string;
    line: number;
    ruleName: string;
    match: string;
  }>;
}

export function auditFixtures(fixturesDir = 'test/fixtures'): AuditResult {
  const result: AuditResult = {
    totalFiles: 0,
    violations: [],
  };

  const resolvedDir = path.resolve(fixturesDir);
  if (!fs.existsSync(resolvedDir)) {
    return result;
  }

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        result.totalFiles++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const leakRule of LEAK_RULES) {
            leakRule.pattern.lastIndex = 0;
            const match = leakRule.pattern.exec(line);
            if (match) {
              result.violations.push({
                file: path.relative(process.cwd(), fullPath),
                line: i + 1,
                ruleName: leakRule.name,
                match: match[0],
              });
            }
          }
        }
      }
    }
  }

  walk(resolvedDir);
  return result;
}

if (process.argv[1]?.endsWith('audit-fixtures.ts') || process.argv[1]?.endsWith('audit-fixtures.js')) {
  const audit = auditFixtures();
  if (audit.violations.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`\n❌ Privacy Audit Failed: ${audit.violations.length} sensitive patterns found in fixtures:`);
    for (const v of audit.violations) {
      // eslint-disable-next-line no-console
      console.error(`  - ${v.file}:${v.line} [${v.ruleName}] => "${v.match}"`);
    }
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log(`✅ Privacy Audit Passed: ${audit.totalFiles} fixture files verified, 0 leaks found.`);
  }
}
