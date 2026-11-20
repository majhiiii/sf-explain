/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

export type AdapterType = 'deploy' | 'test' | 'scratch-org' | 'generic' | 'text';

function isDeployPayload(result?: Record<string, unknown>): boolean {
  if (result?.details && typeof result.details === 'object') {
    const details = result.details as Record<string, unknown>;
    if (Array.isArray(details.componentFailures)) {
      return true;
    }
  }
  return Array.isArray(result?.componentFailures);
}

function isApexTestPayload(result?: Record<string, unknown>): boolean {
  return Array.isArray(result?.tests);
}

function isScratchOrgPayload(obj: Record<string, unknown>, result?: Record<string, unknown>): boolean {
  const nameStr = typeof obj.name === 'string' ? obj.name.toLowerCase() : '';
  const messageStr = typeof obj.message === 'string' ? obj.message.toLowerCase() : '';
  const resultMessage = typeof result?.message === 'string' ? result.message.toLowerCase() : '';
  const resultErrorCode = typeof result?.errorCode === 'string' ? result.errorCode : '';

  return (
    nameStr.includes('scratch') ||
    messageStr.includes('scratch org') ||
    resultMessage.includes('scratch org') ||
    resultErrorCode.includes('SIGNUP')
  );
}

export function detectAdapter(rawInput: string): AdapterType {
  const trimmed = rawInput.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const result = obj.result as Record<string, unknown> | undefined;

      if (isDeployPayload(result)) {
        return 'deploy';
      }
      if (isApexTestPayload(result)) {
        return 'test';
      }
      if (isScratchOrgPayload(obj, result)) {
        return 'scratch-org';
      }

      return 'generic';
    } catch {
      return 'text';
    }
  }
  return 'text';
}
