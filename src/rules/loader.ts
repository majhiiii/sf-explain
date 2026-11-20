/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rule, RulesPayload } from './schema.js';

let cachedRules: Rule[] | undefined;

export function loadRules(customPath?: string): Rule[] {
  if (cachedRules && !customPath) {
    return cachedRules;
  }

  const candidatePaths: string[] = [];
  if (customPath) {
    candidatePaths.push(path.resolve(customPath));
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  candidatePaths.push(path.resolve(currentDir, '..', '..', 'dist', 'rules.json'));
  candidatePaths.push(path.resolve(currentDir, '..', 'rules.json'));
  candidatePaths.push(path.resolve('dist', 'rules.json'));

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const payload = JSON.parse(raw) as RulesPayload;
      if (!customPath) {
        cachedRules = payload.rules;
      }
      return payload.rules;
    }
  }

  return [];
}
