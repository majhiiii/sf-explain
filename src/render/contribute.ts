/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';
import { redactObject } from '../redact.js';

export function renderContribute(failures: Failure[]): string {
  if (failures.length === 0) {
    return 'No failures found to contribute.';
  }

  const sections: string[] = [];

  for (const [idx, rawFailure] of failures.entries()) {
    const redactedFailure = redactObject(rawFailure);
    const firstLine = redactedFailure.message.split('\n')[0].trim().replace(/['"]/g, '');
    const cleanSnippet = firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
    const ruleSlug = (redactedFailure.name ?? redactedFailure.source ?? 'custom-error')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const ruleId = `draft-${ruleSlug || 'error'}-${idx + 1}`;

    const matchConditions: string[] = [];
    matchConditions.push(`    - field: source\n      equals: ${redactedFailure.source}`);
    if (redactedFailure.name) {
      matchConditions.push(`    - field: name\n      equals: ${redactedFailure.name}`);
    }
    if (redactedFailure.code) {
      matchConditions.push(`    - field: code\n      equals: "${redactedFailure.code}"`);
    }
    matchConditions.push(`    - field: message\n      contains: "${cleanSnippet}"`);

    const yamlSkeleton = `id: ${ruleId}
title: ${redactedFailure.name ?? 'Describe the error briefly'}
status: draft
severity: error
confidence: medium
match:
  all:
${matchConditions.join('\n')}
explain: >
  Describe the root cause of this failure in one or two clear sentences.
fix:
  - Step 1: Explain the concrete fix or workaround.
  - Step 2: Provide the exact command or setting change.
sources:
  - url: https://developer.salesforce.com/docs/atlas.en-us...
    title: Official Documentation or Known Issue URL
tags: [${redactedFailure.source}]`;

    const failureJson = JSON.stringify(redactedFailure, null, 2);

    sections.push(`## Rule Contribution Template ${failures.length > 1 ? `#${idx + 1}` : ''}

### 1. Redacted Failure
\`\`\`json
${failureJson}
\`\`\`

### 2. Pre-filled Rule Skeleton (\`rules/${ruleId}.yml\`)
\`\`\`yaml
${yamlSkeleton}
\`\`\`

### 3. Submission Checklist
- [ ] Save the rule to \`rules/${ruleId}.yml\` (change status to \`verified\` once verified with doc sources)
- [ ] Add at least one positive fixture: \`test/fixtures/rules/${ruleId}/positive-1.json\`
- [ ] Add at least one negative fixture: \`test/fixtures/rules/${ruleId}/negative-1.json\`
- [ ] Verify validation passes: \`yarn rules:validate\`
- [ ] Verify all tests pass: \`yarn test\`
- [ ] Submit a PR or open a GitHub issue!`);
  }

  return sections.join('\n\n---\n\n');
}
