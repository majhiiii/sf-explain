/*
 * Copyright (c) 2026, sf-explain contributors
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { WhenCondition } from '../rules/schema.js';

export class ContextProbes {
  private projectRoot: string;
  private projectJsonCache?: Record<string, unknown> | null;
  private scratchDefCache?: Record<string, unknown> | null;

  public constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
  }

  public probe(key: string): unknown {
    try {
      if (key.startsWith('project.')) {
        const subKey = key.slice(8);
        const pjson = this.getProjectJson();
        return pjson ? pjson[subKey] : undefined;
      }

      if (key.startsWith('scratchDef.')) {
        const subKey = key.slice(11);
        const sdef = this.getScratchDef();
        return sdef ? sdef[subKey] : undefined;
      }

      if (key === 'forceignore.exists') {
        return fs.existsSync(path.join(this.projectRoot, '.forceignore'));
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  public evaluateCondition(condition: WhenCondition): boolean {
    const actual = this.probe(condition.probe);

    if (condition.includes !== undefined) {
      if (Array.isArray(actual)) {
        return actual.some((item) => String(item).toLowerCase() === condition.includes?.toLowerCase());
      }
      if (typeof actual === 'string') {
        return actual.toLowerCase().includes(condition.includes.toLowerCase());
      }
      return false;
    }

    if (condition.excludes !== undefined) {
      if (Array.isArray(actual)) {
        return !actual.some((item) => String(item).toLowerCase() === condition.excludes?.toLowerCase());
      }
      if (typeof actual === 'string') {
        return !actual.toLowerCase().includes(condition.excludes.toLowerCase());
      }
      return true;
    }

    if (condition.equals !== undefined) {
      return actual === condition.equals;
    }

    return false;
  }

  private getProjectJson(): Record<string, unknown> | null {
    if (this.projectJsonCache !== undefined) {
      return this.projectJsonCache;
    }
    const pjsonPath = path.join(this.projectRoot, 'sfdx-project.json');
    if (!fs.existsSync(pjsonPath)) {
      this.projectJsonCache = null;
      return null;
    }
    try {
      const content = fs.readFileSync(pjsonPath, 'utf8');
      this.projectJsonCache = JSON.parse(content) as Record<string, unknown>;
      return this.projectJsonCache;
    } catch {
      this.projectJsonCache = null;
      return null;
    }
  }

  private getScratchDef(): Record<string, unknown> | null {
    if (this.scratchDefCache !== undefined) {
      return this.scratchDefCache;
    }
    const candidates = [
      path.join(this.projectRoot, 'config', 'project-scratch-def.json'),
      path.join(this.projectRoot, 'project-scratch-def.json'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          const content = fs.readFileSync(cand, 'utf8');
          this.scratchDefCache = JSON.parse(content) as Record<string, unknown>;
          return this.scratchDefCache;
        } catch {
          // ignore error and continue
        }
      }
    }

    this.scratchDefCache = null;
    return null;
  }
}
