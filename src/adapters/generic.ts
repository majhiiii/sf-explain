/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';

interface RawCliError {
  [key: string]: unknown;
  actions?: string[];
  code?: string | number;
  commandName?: string;
  context?: string;
  exitCode?: number;
  message?: string;
  name?: string;
  stack?: string;
  status?: number;
  warnings?: string[];
}

export class GenericErrorAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(input: string | RawCliError): Failure[] {
    let parsed: RawCliError;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input) as RawCliError;
      } catch {
        return [];
      }
    } else {
      parsed = input;
    }

    const exitCode =
      typeof parsed.exitCode === 'number'
        ? parsed.exitCode
        : typeof parsed.status === 'number'
        ? parsed.status
        : undefined;

    const failure: Failure = {
      source: 'generic',
      command: parsed.commandName ?? parsed.context,
      name: parsed.name,
      code: parsed.code !== undefined ? String(parsed.code) : undefined,
      message: parsed.message ?? '',
      exitCode,
      raw: parsed,
    };

    return [failure];
  }
}
