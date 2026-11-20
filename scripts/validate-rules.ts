/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import { Rule } from '../src/rules/schema.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  rules: Rule[];
}

export function validateAllRules(rulesDir = 'rules', fixturesDir = 'test/fixtures/rules'): ValidationResult {
  const errors: string[] = [];
  const rules: Rule[] = [];
  const seenIds = new Set<string>();

  const resolvedRulesDir = path.resolve(rulesDir);
  if (!fs.existsSync(resolvedRulesDir)) {
    return { valid: false, errors: [`Rules directory not found: ${rulesDir}`], rules: [] };
  }

  const files = fs.readdirSync(resolvedRulesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  if (files.length === 0) {
    return { valid: false, errors: ['No rule files found in rules directory.'], rules: [] };
  }

  for (const file of files) {
    const filePath = path.join(resolvedRulesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    let rule: Rule;
    try {
      rule = YAML.parse(content) as Rule;
    } catch (err: unknown) {
      errors.push(`${file}: Failed to parse YAML: ${(err as Error).message}`);
      continue;
    }

    if (!rule || typeof rule !== 'object') {
      errors.push(`${file}: Rule content is empty or invalid.`);
      continue;
    }

    // Validate ID
    const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!rule.id || typeof rule.id !== 'string' || !kebabRegex.test(rule.id)) {
      errors.push(`${file}: Rule 'id' must be a kebab-case string (got: '${rule.id}').`);
    } else if (seenIds.has(rule.id)) {
      errors.push(`${file}: Duplicate rule ID '${rule.id}'.`);
    } else {
      seenIds.add(rule.id);
    }

    // Validate title
    if (!rule.title || typeof rule.title !== 'string') {
      errors.push(`${file}: Rule must have a non-empty string 'title'.`);
    }

    // Validate status
    if (rule.status !== 'draft' && rule.status !== 'verified') {
      errors.push(`${file}: Rule 'status' must be 'draft' or 'verified' (got: '${rule.status}').`);
    }

    // Validate severity
    if (rule.severity !== 'error' && rule.severity !== 'warning' && rule.severity !== 'info') {
      errors.push(`${file}: Rule 'severity' must be 'error', 'warning', or 'info' (got: '${rule.severity}').`);
    }

    // Validate confidence
    if (rule.confidence !== 'low' && rule.confidence !== 'medium' && rule.confidence !== 'high') {
      errors.push(`${file}: Rule 'confidence' must be 'low', 'medium', or 'high' (got: '${rule.confidence}').`);
    }

    // Confidence: high requires status: verified
    if (rule.confidence === 'high' && rule.status !== 'verified') {
      errors.push(`${file}: Rule with 'confidence: high' must have 'status: verified'.`);
    }

    // Validate explain and fix
    if (!rule.explain || typeof rule.explain !== 'string' || !rule.explain.trim()) {
      errors.push(`${file}: Rule must have an 'explain' description.`);
    }

    if (
      !Array.isArray(rule.fix) ||
      rule.fix.length === 0 ||
      !rule.fix.every((s) => typeof s === 'string' && s.trim())
    ) {
      errors.push(`${file}: Rule 'fix' must be a non-empty array of step strings.`);
    }

    // Validate sources
    if (!Array.isArray(rule.sources) || rule.sources.length === 0) {
      errors.push(`${file}: Rule 'sources' must contain at least one source link.`);
    } else {
      for (const [idx, src] of rule.sources.entries()) {
        if (!src.url || (!src.url.startsWith('http://') && !src.url.startsWith('https://'))) {
          errors.push(`${file}: Rule source[${idx}] must have a valid http/https URL (got: '${src.url}').`);
        }
      }
    }

    // Validate match conditions
    const hasAll = Array.isArray(rule.match?.all) && rule.match.all.length > 0;
    const hasAny = Array.isArray(rule.match?.any) && rule.match.any.length > 0;
    if (!hasAll && !hasAny) {
      errors.push(`${file}: Rule 'match' must contain conditions in 'all' or 'any'.`);
    }

    // Validate fixtures existence
    if (rule.id) {
      const posFixture = path.resolve(fixturesDir, rule.id, 'positive-1.json');
      const negFixture = path.resolve(fixturesDir, rule.id, 'negative-1.json');
      if (!fs.existsSync(posFixture)) {
        errors.push(`${file}: Missing positive fixture: ${path.relative(process.cwd(), posFixture)}`);
      }
      if (!fs.existsSync(negFixture)) {
        errors.push(`${file}: Missing negative fixture: ${path.relative(process.cwd(), negFixture)}`);
      }
    }

    rules.push(rule);
  }

  return {
    valid: errors.length === 0,
    errors,
    rules,
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate-rules.ts')) {
  const result = validateAllRules();
  if (!result.valid) {
    console.error('Rule validation failed with errors:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  } else {
    console.log(`All ${result.rules.length} rules validated successfully.`);
  }
}
