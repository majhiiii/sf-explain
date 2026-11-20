/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';

interface RawApexTest {
  ApexClass?: {
    Name?: string;
  };
  Id?: string;
  Message?: string;
  MethodName?: string;
  Outcome?: string;
  StackTrace?: string;
}

interface RawApexTestResult {
  [key: string]: unknown;
  result?: {
    summary?: {
      outcome?: string;
      testsRan?: number;
    };
    tests?: RawApexTest[];
  };
  status?: number;
}

export class ApexTestResultAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(input: string | RawApexTestResult): Failure[] {
    let parsed: RawApexTestResult;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input) as RawApexTestResult;
      } catch {
        return [];
      }
    } else {
      parsed = input;
    }

    const tests = parsed.result?.tests ?? [];
    const failingTests = tests.filter((t) => t.Outcome === 'Fail');
    const exitCode = typeof parsed.status === 'number' ? parsed.status : 1;

    return failingTests.map((t) => {
      let line: number | undefined;
      let column: number | undefined;

      if (t.StackTrace) {
        const lineMatch = /line\s+(\d+)/i.exec(t.StackTrace);
        if (lineMatch) {
          line = Number.parseInt(lineMatch[1], 10);
        }
        const colMatch = /column\s+(\d+)/i.exec(t.StackTrace);
        if (colMatch) {
          column = Number.parseInt(colMatch[1], 10);
        }
      }

      const className = t.ApexClass?.Name;
      const methodName = t.MethodName;
      const fullName = className && methodName ? `${className}.${methodName}` : className ?? methodName;

      return {
        source: 'test',
        command: 'apex run test',
        message: t.Message ?? 'Apex test assertion failure',
        component: {
          type: 'ApexClass',
          name: fullName,
        },
        line,
        column,
        exitCode,
        raw: t,
      };
    });
  }
}
