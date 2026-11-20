/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { normalizeInput } from '../adapters/index.js';
import { loadRules } from '../rules/loader.js';
import { Matcher } from '../engine/matcher.js';
import { ContextProbes } from '../engine/probes.js';
import { ExplainOutput, FailureAnalysis } from '../engine/types.js';
import { groupFailures } from '../engine/grouper.js';
import { Failure } from '../types.js';
import { renderHuman } from '../render/human.js';
import { renderJson } from '../render/json.js';
import { renderContribute } from '../render/contribute.js';
import { redactObject } from '../redact.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-explain', 'explain');

export default class Explain extends SfCommand<ExplainOutput> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly strict = false;

  public static readonly flags = {
    file: Flags.file({
      char: 'f',
      summary: messages.getMessage('flags.file.summary'),
      description: messages.getMessage('flags.file.description'),
      exists: true,
      required: false,
    }),
    contribute: Flags.boolean({
      char: 'c',
      summary: messages.getMessage('flags.contribute.summary'),
      description: messages.getMessage('flags.contribute.description'),
      required: false,
    }),
    'no-redact': Flags.boolean({
      summary: messages.getMessage('flags.no-redact.summary'),
      description: messages.getMessage('flags.no-redact.description'),
      required: false,
      default: false,
    }),
    'show-cascade': Flags.boolean({
      summary: messages.getMessage('flags.show-cascade.summary'),
      description: messages.getMessage('flags.show-cascade.description'),
      required: false,
      default: false,
    }),
  };

  public async run(): Promise<ExplainOutput> {
    const { flags, argv } = await this.parse(Explain);

    let rawInput: string;

    if (argv && argv.length > 0) {
      const { output, status } = this.runWrappedCommand(argv as string[]);
      if (status === 0 && !output.trim()) {
        this.log('Wrapped command completed successfully with no errors.');
        return renderJson([], []);
      }
      rawInput = output;
    } else if (flags.file) {
      rawInput = fs.readFileSync(flags.file, 'utf8');
    } else {
      rawInput = await this.readStdin();
    }

    if (!rawInput?.trim()) {
      this.error(messages.getMessage('error.no-input'), { exit: 1 });
    }

    const rawFailures = normalizeInput(rawInput);
    const failures = flags['no-redact'] ? rawFailures : rawFailures.map((f) => redactObject(f));

    if (flags.contribute) {
      // Contribution templates are always fully redacted for public issue sharing
      const redactedForContribute = rawFailures.map((f) => redactObject(f));
      const template = renderContribute(redactedForContribute);
      this.log(template);
      return renderJson([], redactedForContribute);
    }

    const rules = loadRules();
    const probes = new ContextProbes();
    const matcher = new Matcher(rules, probes);

    const results: FailureAnalysis[] = [];
    const unmatched: Failure[] = [];

    for (const [idx, failure] of failures.entries()) {
      const matches = matcher.findMatches(failure, idx);
      if (matches.length > 0) {
        results.push({
          failure,
          matches: matches.map((m) => ({
            ruleId: m.ruleId,
            title: m.rule.title,
            explain: m.rule.explain,
            fix: m.rule.fix,
            confidence: m.confidence,
            sources: m.rule.sources,
            why: m.why,
          })),
        });
      } else {
        unmatched.push(failure);
      }
    }

    const grouped = groupFailures(results, unmatched);
    const output = renderJson(results, unmatched, grouped.groups);

    this.log(renderHuman(grouped, { showCascade: flags['show-cascade'] }));

    return output;
  }

  // eslint-disable-next-line class-methods-use-this
  public runWrappedCommand(args: string[]): { output: string; status: number | null } {
    const finalArgs = [...args];
    const isSfCommand = finalArgs[0] === 'sf' || finalArgs[0] === 'sfdx';
    if (isSfCommand && !finalArgs.includes('--json')) {
      finalArgs.push('--json');
    }
    const cmdStr = finalArgs.join(' ');
    const result = spawnSync(cmdStr, {
      shell: true,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    return {
      output: combinedOutput,
      status: result.status,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  public async readStdin(): Promise<string> {
    if (process.stdin.isTTY) {
      return '';
    }

    return new Promise<string>((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk: string | Buffer) => {
        data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      });
      process.stdin.on('end', () => {
        resolve(data);
      });
      process.stdin.on('error', (err) => {
        reject(err);
      });
    });
  }
}
