/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';

export class PlainTextAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(rawInput: string): Failure[] {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return [];
    }

    // Match patterns like "Error (NamedOrgNotFoundError): ..." or "Error (2): ..."
    const errorWithParensRegex = /Error\s*\(([^)]+)\):\s*([\s\S]+)/m;
    const match = errorWithParensRegex.exec(trimmed);

    if (match) {
      const codeOrName = match[1].trim();
      const isNumeric = /^\d+$/.test(codeOrName);
      const remainingMessage = match[2].trim();

      const failure: Failure = {
        source: 'text',
        name: isNumeric ? undefined : codeOrName,
        code: isNumeric ? codeOrName : undefined,
        exitCode: isNumeric ? Number.parseInt(codeOrName, 10) : undefined,
        message: remainingMessage,
        raw: rawInput,
      };
      return [failure];
    }

    // Fallback: match "Error:\s*(.*)" or general plain text
    const errorPrefixRegex = /Error:\s*([\s\S]+)/m;
    const prefixMatch = errorPrefixRegex.exec(trimmed);
    const message = prefixMatch ? prefixMatch[1].trim() : trimmed;

    return [
      {
        source: 'text',
        message,
        raw: rawInput,
      },
    ];
  }
}
