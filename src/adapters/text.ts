/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure, Severity } from '../types.js';

const COMPONENT_ERROR_REGEX = /^(ERROR|WARNING):\s+([a-zA-Z]:[\\/][^:]+|[^:]+):\s*(.*?)(?:\s+\((\d+):(\d+)\))?$/;

function extractComponentMetadata(filePath: string): { type?: string; name?: string } | undefined {
  const baseName = filePath.split(/[\\/]/).pop() ?? '';
  if (baseName.endsWith('.cls')) {
    return { type: 'ApexClass', name: baseName.replace(/\.cls$/, '') };
  }
  if (baseName.endsWith('.trigger')) {
    return { type: 'ApexTrigger', name: baseName.replace(/\.trigger$/, '') };
  }
  if (filePath.includes('/lwc/') || filePath.includes('\\lwc\\')) {
    return { type: 'LightningComponentBundle' };
  }
  return undefined;
}

function parseComponentErrors(lines: string[]): Failure[] {
  const failures: Failure[] = [];

  for (const line of lines) {
    const lineMatch = COMPONENT_ERROR_REGEX.exec(line.trim());
    if (lineMatch) {
      const prefix = lineMatch[1];
      const filePath = lineMatch[2].trim();
      const msg = lineMatch[3].trim();
      const lineNum = lineMatch[4] ? Number.parseInt(lineMatch[4], 10) : undefined;
      const colNum = lineMatch[5] ? Number.parseInt(lineMatch[5], 10) : undefined;
      const severity: Severity = prefix === 'WARNING' ? 'warning' : 'error';

      failures.push({
        source: 'deploy',
        severity,
        message: msg,
        file: filePath,
        line: lineNum,
        column: colNum,
        component: extractComponentMetadata(filePath),
        raw: line,
      });
    }
  }

  return failures;
}

export class PlainTextAdapter {
  // eslint-disable-next-line class-methods-use-this
  public adapt(rawInput: string): Failure[] {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return [];
    }

    const cleaned = trimmed
      .split('\n')
      .filter((l) => !/^[─━═\-_=~]{3,}/.test(l.trim()))
      .join('\n')
      .trim();

    const lines = cleaned.split('\n');
    const componentFailures = parseComponentErrors(lines);

    if (componentFailures.length > 0) {
      return componentFailures;
    }

    // Match patterns like "Error (NamedOrgNotFoundError): ..." or "Error (2): ..."
    const errorWithParensRegex = /Error\s*\(([^)]+)\):\s*([\s\S]+)/m;
    const match = errorWithParensRegex.exec(cleaned || trimmed);

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
    const prefixMatch = errorPrefixRegex.exec(cleaned || trimmed);
    const message = prefixMatch ? prefixMatch[1].trim() : cleaned || trimmed;

    return [
      {
        source: 'text',
        message,
        raw: rawInput,
      },
    ];
  }
}
