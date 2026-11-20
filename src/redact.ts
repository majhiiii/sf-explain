/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

const SESSION_ID_REGEX = /00D[a-zA-Z0-9]{12,15}![a-zA-Z0-9._-]+/g;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi;
const ORG_ID_REGEX = /\b00D[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?\b/g;
const INSTANCE_URL_REGEX = /https?:\/\/[a-zA-Z0-9._-]+\.(?:salesforce\.com|my\.salesforce\.com|force\.com)\/?/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const WIN_USER_PATH_REGEX = /[a-zA-Z]:\\(?:Users|home)\\[a-zA-Z0-9._-]+/gi;
const UNIX_USER_PATH_REGEX = /\/(?:Users|home)\/[a-zA-Z0-9._-]+/gi;

export function redact(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    .replace(SESSION_ID_REGEX, '[REDACTED_SESSION_ID]')
    .replace(BEARER_TOKEN_REGEX, '$1[REDACTED_TOKEN]')
    .replace(ORG_ID_REGEX, '[REDACTED_ORG_ID]')
    .replace(INSTANCE_URL_REGEX, 'https://[REDACTED_INSTANCE].salesforce.com/')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(WIN_USER_PATH_REGEX, '[REDACTED_HOME]')
    .replace(UNIX_USER_PATH_REGEX, '[REDACTED_HOME]');
}

export function redactObject<T>(input: T): T {
  if (typeof input === 'string') {
    return redact(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    const redactedArray = input.map((item: unknown) => redactObject(item));
    return redactedArray as unknown as T;
  }

  if (input !== null && typeof input === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      output[key] = redactObject(val);
    }
    return output as unknown as T;
  }

  return input;
}
