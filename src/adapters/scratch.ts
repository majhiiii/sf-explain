/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';

interface RawScratchResult {
  [key: string]: unknown;
  code?: string | number;
  exitCode?: number;
  message?: string;
  name?: string;
  result?: {
    errorCode?: string;
    message?: string;
  };
  status?: number;
}

export class ScratchOrgResultAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(input: string | RawScratchResult): Failure[] {
    let parsed: RawScratchResult;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input) as RawScratchResult;
      } catch {
        return [];
      }
    } else {
      parsed = input;
    }

    const exitCode =
      typeof parsed.exitCode === 'number' ? parsed.exitCode : typeof parsed.status === 'number' ? parsed.status : 1;

    const errorCode = parsed.result?.errorCode ?? (parsed.code !== undefined ? String(parsed.code) : undefined);
    const message = parsed.message ?? parsed.result?.message ?? 'Scratch org creation failed';

    return [
      {
        source: 'scratch-org',
        command: 'org create scratch',
        name: parsed.name,
        code: errorCode,
        message,
        exitCode,
        raw: parsed,
      },
    ];
  }
}
