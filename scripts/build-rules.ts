/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { validateAllRules } from './validate-rules.js';
import { RulesPayload } from '../src/rules/schema.js';

export function buildRules(): void {
  const validation = validateAllRules();
  if (!validation.valid) {
    console.error('Cannot build rules: validation failed:');
    for (const err of validation.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const sortedRules = [...validation.rules].sort((a, b) => a.id.localeCompare(b.id));
  const rulesJson = JSON.stringify(sortedRules);
  const checksum = crypto.createHash('sha256').update(rulesJson, 'utf8').digest('hex');

  const payload: RulesPayload = {
    checksum,
    rules: sortedRules,
    generatedAt: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(payload, null, 2);

  // Write to dist/rules.json and lib/rules.json
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(path.join(distDir, 'rules.json'), payloadString, 'utf8');

  const libDir = path.resolve('lib');
  if (fs.existsSync(libDir)) {
    fs.writeFileSync(path.join(libDir, 'rules.json'), payloadString, 'utf8');
  }

  console.log(`Successfully built ${sortedRules.length} rules to dist/rules.json (checksum: ${checksum.slice(0, 8)}).`);
}

if (process.argv[1] && process.argv[1].endsWith('build-rules.ts')) {
  buildRules();
}
