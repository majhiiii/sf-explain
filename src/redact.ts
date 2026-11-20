/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

const PRIVATE_KEY_REGEX = /(?:-----BEGIN (?:RSA )?PRIVATE KEY-----)[\s\S]*?(?:-----END (?:RSA )?PRIVATE KEY-----)/g;
const SESSION_ID_REGEX = /00D[a-zA-Z0-9]{12,15}![a-zA-Z0-9._-]+/g;
const JWT_TOKEN_REGEX = /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;
const BEARER_TOKEN_REGEX = /(Bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi;
const ORG_ID_REGEX = /\b00D[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?\b/g;
const NAMED_CREDENTIAL_REGEX = /\bcallout:[a-zA-Z0-9_.-]+/g;
const INSTANCE_URL_REGEX = /https?:\/\/[a-zA-Z0-9._-]+\.(?:salesforce\.com|my\.salesforce\.com|force\.com)\/?/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const WIN_USER_PATH_REGEX = /[a-zA-Z]:\\(?:Users|home)\\[a-zA-Z0-9._-]+/gi;
const UNIX_USER_PATH_REGEX = /\/(?:Users|home)\/[a-zA-Z0-9._-]+/gi;

const WIN_PROJECT_PREFIX_REGEX =
  /[a-zA-Z]:\\(?:(?!(?:force-app|src)\\)[^\\/:*?"<>|\r\n\s]+\\)+(?=(?:force-app|src)\\)/gi;
const UNIX_PROJECT_PREFIX_REGEX =
  /(?<=\s|^|["'(=:])\/(?:(?!(?:force-app|src)\/)[a-zA-Z0-9._-]+\/)+(?=(?:force-app|src)\/)/gi;

const WIN_GENERIC_PATH_REGEX =
  /[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n\s]+\\)+(?=[a-zA-Z0-9._-]+\.(?:cls|trigger|js|html|xml|json|page|component)\b)/gi;
const UNIX_GENERIC_PATH_REGEX =
  /(?<=\s|^|["'(=:])(?<!\[REDACTED_PATH\])\/(?:(?!(?:force-app|src)\/)[a-zA-Z0-9._-]+\/)+(?=[a-zA-Z0-9._-]+\.(?:cls|trigger|js|html|xml|json|page|component)\b)/gi;

const IP_REGEX =
  /(?<![vV\d])\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\b(?!\.\d)/g;
const CUSTOM_METADATA_REGEX = /\b[a-zA-Z0-9_]+__(?:c|r|mdt|b|e|kav|x|share|history|feed)\b/g;

export function redact(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    .replace(PRIVATE_KEY_REGEX, '[REDACTED_PRIVATE_KEY]')
    .replace(SESSION_ID_REGEX, '[REDACTED_SESSION_ID]')
    .replace(JWT_TOKEN_REGEX, '[REDACTED_JWT_TOKEN]')
    .replace(BEARER_TOKEN_REGEX, '$1[REDACTED_TOKEN]')
    .replace(ORG_ID_REGEX, '[REDACTED_ORG_ID]')
    .replace(NAMED_CREDENTIAL_REGEX, 'callout:[REDACTED_CREDENTIAL]')
    .replace(INSTANCE_URL_REGEX, 'https://[REDACTED_INSTANCE].salesforce.com/')
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(WIN_USER_PATH_REGEX, '[REDACTED_HOME]')
    .replace(UNIX_USER_PATH_REGEX, '[REDACTED_HOME]')
    .replace(WIN_PROJECT_PREFIX_REGEX, '[REDACTED_PATH]\\')
    .replace(UNIX_PROJECT_PREFIX_REGEX, '[REDACTED_PATH]/')
    .replace(WIN_GENERIC_PATH_REGEX, '[REDACTED_PATH]\\')
    .replace(UNIX_GENERIC_PATH_REGEX, '[REDACTED_PATH]/')
    .replace(IP_REGEX, '[REDACTED_IP]')
    .replace(CUSTOM_METADATA_REGEX, '[REDACTED_CUSTOM_METADATA]');
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
