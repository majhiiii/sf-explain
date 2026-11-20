/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';

interface RawComponentFailure {
  columnNumber?: number;
  componentType?: string;
  fileName?: string;
  fullName?: string;
  lineNumber?: number;
  problem?: string;
  problemType?: string;
  success?: boolean;
}

interface RawDeployResult {
  [key: string]: unknown;
  result?: {
    componentFailures?: RawComponentFailure[];
    details?: {
      componentFailures?: RawComponentFailure[];
    };
    errorMessage?: string;
  };
  status?: number;
}

export class DeployResultAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(input: string | RawDeployResult): Failure[] {
    let parsed: RawDeployResult;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input) as RawDeployResult;
      } catch {
        return [];
      }
    } else {
      parsed = input;
    }

    const failuresList = parsed.result?.details?.componentFailures ?? parsed.result?.componentFailures ?? [];

    const exitCode = typeof parsed.status === 'number' ? parsed.status : 1;

    if (failuresList.length === 0 && parsed.result?.errorMessage) {
      return [
        {
          source: 'deploy',
          command: 'project deploy start',
          message: parsed.result.errorMessage,
          exitCode,
          raw: parsed,
        },
      ];
    }

    return failuresList.map((cf) => ({
      source: 'deploy',
      command: 'project deploy start',
      message: cf.problem ?? 'Component deployment failed',
      component: {
        type: cf.componentType,
        name: cf.fullName,
      },
      file: cf.fileName,
      line: cf.lineNumber,
      column: cf.columnNumber,
      exitCode,
      raw: cf,
    }));
  }
}
