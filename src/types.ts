/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

export type FailureSource = 'deploy' | 'retrieve' | 'test' | 'scratch-org' | 'auth' | 'generic' | 'text';

export interface Failure {
  source: FailureSource;
  command?: string;
  name?: string;
  code?: string;
  message: string;
  component?: { type?: string; name?: string };
  file?: string;
  line?: number;
  column?: number;
  exitCode?: number;
  raw: unknown;
}
