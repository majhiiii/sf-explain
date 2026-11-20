/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Failure } from '../types.js';
import { detectAdapter } from './detect.js';
import { GenericErrorAdapter } from './generic.js';
import { PlainTextAdapter } from './text.js';
import { DeployResultAdapter } from './deploy.js';
import { ApexTestResultAdapter } from './test.js';
import { ScratchOrgResultAdapter } from './scratch.js';

export function normalizeInput(rawInput: string): Failure[] {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return [];
  }

  const detected = detectAdapter(trimmed);
  switch (detected) {
    case 'deploy':
      return new DeployResultAdapter().adapt(trimmed);
    case 'test':
      return new ApexTestResultAdapter().adapt(trimmed);
    case 'scratch-org':
      return new ScratchOrgResultAdapter().adapt(trimmed);
    case 'generic':
      return new GenericErrorAdapter().adapt(trimmed);
    case 'text':
    default:
      return new PlainTextAdapter().adapt(trimmed);
  }
}
